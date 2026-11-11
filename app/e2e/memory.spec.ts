import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const shotsDir = join(process.cwd(), 'test-results', 'shots');

test.beforeAll(() => {
  if (!existsSync(shotsDir)) {
    mkdirSync(shotsDir, { recursive: true });
  }
});

test.describe('Memory game - T-025', () => {
  test('từ Nhà Đậu Đậu vào game Memory, lật 1 cặp đúng, lật hết', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Nhà Đậu Đậu
    const houseBtn = page.getByLabel('Nhà Đậu Đậu');
    await expect(houseBtn).toBeVisible({ timeout: 10000 });
    await houseBtn.click();

    // Game memory hiện trong 10s
    const gameEl = page.getByTestId('game-memory');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi 2.5s cho preview hiện rồi ẩn
    await page.waitForTimeout(2500);

    // Chụp T-025-preview.png lúc đang xem ngửa (trước khi úp)
    // Re-navigate để chụp đúng lúc preview
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();
    await page.getByLabel('Nhà Đậu Đậu').click();
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Chờ preview hiện (500ms sau hello) + 500ms buffer
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/shots/T-025-preview.png' });

    // Chờ úp lại
    await page.waitForTimeout(2000);

    // Lấy id thẻ qua reveal()
    const ids = await page.evaluate(() => {
      const w = window as Window & { __behocMemory?: { reveal(): string[] } };
      return w.__behocMemory?.reveal() ?? [];
    });

    expect(ids.length).toBeGreaterThanOrEqual(4);

    // Tìm cặp đầu tiên
    const firstId = ids[0];
    const secondIdx = ids.findIndex((id, i) => i > 0 && id === firstId);
    expect(secondIdx).toBeGreaterThan(0);

    // Lật thẻ đầu tiên
    const cards = page.locator('[data-testid="game-memory"] [data-flipped]');
    await cards.nth(0).click();
    await page.waitForTimeout(300);

    // Lật thẻ thứ hai giống
    await cards.nth(secondIdx).click();

    // Chờ memory.match
    await expect(gameEl).toHaveAttribute('data-last-say', 'memory.match', { timeout: 5000 });

    // Chụp T-025-play.png
    await page.screenshot({ path: 'test-results/shots/T-025-play.png' });

    // Lật tất cả các cặp còn lại
    const revealed = await page.evaluate(() => {
      const w = window as Window & { __behocMemory?: { reveal(): string[] } };
      return w.__behocMemory?.reveal() ?? [];
    });

    // Build pairs map
    const pairs = new Map<string, number[]>();
    for (let i = 0; i < revealed.length; i++) {
      const id = revealed[i];
      const arr = pairs.get(id) ?? [];
      arr.push(i);
      pairs.set(id, arr);
    }

    // Đã lật cặp đầu, lật các cặp còn lại
    for (const [id, indices] of pairs) {
      if (id === firstId) continue; // đã lật

      // Đợi processing xong
      await page.waitForTimeout(500);

      await cards.nth(indices[0]).click();
      await page.waitForTimeout(400);
      await cards.nth(indices[1]).click();
      await page.waitForTimeout(500);
    }

    // Chờ memory.done
    await expect(gameEl).toHaveAttribute('data-last-say', 'memory.done', { timeout: 10000 });
  });

  test('đặt memory.level=4 qua idb → 12 thẻ, mọi thẻ ≥130px', async ({ page }) => {
    // Đặt level 4 vào idb trước khi vào game
    await page.goto('./?e2e=1');

    // Use native IndexedDB API (idb-keyval default store)
    await page.evaluate(async () => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('keyval-store', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('keyval');
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          store.put(4, 'memory.level');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    // Reload và vào game
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    const houseBtn = page.getByLabel('Nhà Đậu Đậu');
    await expect(houseBtn).toBeVisible({ timeout: 10000 });
    await houseBtn.click();

    const gameEl = page.getByTestId('game-memory');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi preview + check level
    await page.waitForTimeout(1000);
    await expect(gameEl).toHaveAttribute('data-level', '4', { timeout: 5000 });

    // Chụp T-025-6pairs.png
    await page.screenshot({ path: 'test-results/shots/T-025-6pairs.png' });

    // Đếm thẻ: phải có 12 thẻ
    const cards = page.locator('[data-testid="game-memory"] [data-flipped]');
    await expect(cards).toHaveCount(12);

    // Kiểm tra mọi thẻ ≥ 130px
    const boxes = await cards.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );

    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(130);
      expect(box.height).toBeGreaterThanOrEqual(130);
    }

    // Kiểm tra tất cả thẻ nằm trong viewport
    const viewport = page.viewportSize()!;
    const allBoxes = await cards.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      })
    );

    for (const box of allBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
      expect(box.bottom).toBeLessThanOrEqual(viewport.height);
    }

    // Clean up
    await page.evaluate(async () => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('keyval-store', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          store.delete('memory.level');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
  });

  test('nút Về nhà có kích thước đủ lớn và hoạt động', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game Memory
    await page.getByLabel('Nhà Đậu Đậu').click();
    await expect(page.getByTestId('game-memory')).toBeVisible({ timeout: 10000 });

    // Kiểm tra nút Về nhà có kích thước ≥ 120x120
    const backBtn = page.getByLabel('Về nhà');
    await expect(backBtn).toBeVisible();

    const box = await backBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeGreaterThanOrEqual(120);

    // Chạm nút Về nhà → về lại home
    await backBtn.click();
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 3000 });
  });
});
