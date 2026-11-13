// E2E tests for Sort game (Xếp vào giỏ) - T-029, E2
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Type declaration for E2E hook ("color" là giỏ đúng: màu, animal/fruit hoặc big/small)
type FruitColor = string;
declare global {
  interface Window {
    __behocSort?: {
      fruits(): { id: string; color: FruitColor }[];
      baskets(): FruitColor[];
      mode(): 'colors' | 'kinds' | 'sizes';
      sayFor(i: number): string;
      drop(i: number, color: FruitColor): void;
    };
  }
}

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test.describe('Sort game (Xếp vào giỏ)', () => {
  test('Vườn quả → picker → Xếp quả; chụp T-029-sort.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm Vườn quả
    const orchardBtn = page.getByLabel('Vườn quả');
    await expect(orchardBtn).toBeVisible();
    await orchardBtn.tap();

    // Picker hiện
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });

    // Chạm Xếp quả theo màu
    const sortBtn = page.getByLabel('Xếp vào giỏ');
    await expect(sortBtn).toBeVisible();
    await sortBtn.tap();

    // Game sort hiện
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });

    // Đợi ổn định
    await page.waitForTimeout(800);

    // Chụp ảnh
    await page.screenshot({ path: 'test-results/shots/T-029-sort.png' });
  });

  test('thả sai → không đổi remaining', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByLabel('Vườn quả').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp vào giỏ').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Lấy thông tin quả qua e2e hook
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());

    // Lấy quả đầu và một giỏ sai của nó
    const baskets = await page.evaluate(() => window.__behocSort!.baskets());
    const wrong = baskets.find((c) => c !== fruits[0].color);
    expect(wrong).toBeTruthy();

    const initialCount = fruits.length;

    // Thử thả sai
    await page.evaluate(
      ({ color }) => window.__behocSort!.drop(0, color),
      { color: wrong! }
    );

    // Remaining không đổi
    const fruitsAfter = await page.evaluate(() => window.__behocSort!.fruits());
    expect(fruitsAfter.length).toBe(initialCount);
  });

  test('thả đúng hết → sort.done; chụp T-029-done.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByLabel('Vườn quả').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp vào giỏ').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Thả tất cả quả đúng màu
    let fruits = await page.evaluate(() => window.__behocSort!.fruits());
    for (let i = 0; i < fruits.length; i++) {
      const f = fruits[i];
      await page.evaluate(
        ({ idx, color }) => window.__behocSort!.drop(idx, color),
        { idx: i, color: f.color }
      );
      await page.waitForTimeout(200);
    }

    // Đợi sort.done
    await expect(gameEl).toHaveAttribute('data-last-say', 'sort.done', { timeout: 3000 });

    // Chụp ảnh
    await page.screenshot({ path: 'test-results/shots/T-029-done.png' });
  });

  test('kéo thật bằng page.mouse', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByLabel('Vườn quả').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp vào giỏ').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Lấy quả đầu tiên và tìm giỏ đúng màu
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());
    const firstFruit = fruits[0];
    // Câu nói khi thả đúng: fruit.<id>-color (theo màu), tên hình (thú/quả), sort.big/small (to/nhỏ)
    const expectedSay = await page.evaluate(() => window.__behocSort!.sayFor(0));

    // Tìm vị trí quả đầu tiên
    const fruitEl = page.getByLabel('Quả 1');
    await expect(fruitEl).toBeVisible();
    const fruitBox = await fruitEl.boundingBox();
    expect(fruitBox).not.toBeNull();

    // Tìm giỏ đúng màu
    const basketEl = page.locator(`[data-color="${firstFruit.color}"]`);
    await expect(basketEl).toBeVisible();
    const basketBox = await basketEl.boundingBox();
    expect(basketBox).not.toBeNull();

    // Kéo từ quả đến giỏ
    const startX = fruitBox!.x + fruitBox!.width / 2;
    const startY = fruitBox!.y + fruitBox!.height / 2;
    const endX = basketBox!.x + basketBox!.width / 2;
    const endY = basketBox!.y + basketBox!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Di chuyển từng bước để simulation drag
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        startX + (endX - startX) * (i / steps),
        startY + (endY - startY) * (i / steps)
      );
      await page.waitForTimeout(30);
    }
    await page.mouse.up();

    // Kiểm tra quả đã được xếp (nói câu của thả đúng)
    await expect(gameEl).toHaveAttribute('data-last-say', expectedSay, { timeout: 2000 });
  });

  test('nút Về nhà quay lại home', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByLabel('Vườn quả').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp vào giỏ').tap();
    await expect(page.getByTestId('game-sort')).toBeVisible({ timeout: 5000 });

    // Chạm Về nhà
    const backBtn = page.getByRole('button', { name: 'Về nhà' });
    await expect(backBtn).toBeVisible();
    await backBtn.tap();

    // Quay lại home
    await expect(page.getByTestId('home')).toBeVisible();
  });

  test('các quả có kích thước ≥120px', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByLabel('Vườn quả').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp vào giỏ').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Lấy số quả
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());

    // Kiểm tra từng quả
    for (let i = 1; i <= fruits.length; i++) {
      const fruitEl = page.getByLabel(`Quả ${i}`);
      await expect(fruitEl).toBeVisible();
      const box = await fruitEl.boundingBox();
      expect(box, `Quả ${i}`).not.toBeNull();
      expect(box!.width, `Quả ${i} rộng`).toBeGreaterThanOrEqual(120);
      expect(box!.height, `Quả ${i} cao`).toBeGreaterThanOrEqual(120);
    }
  });
});

// Test kéo trên iPhone dọc (theo yêu cầu trong CLAUDE.md)
test.describe('iPhone dọc: kéo quả', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo quả vào giỏ đúng màu', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByRole('button', { name: 'Vườn quả' }).tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp vào giỏ').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Lấy thông tin quả
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());
    const firstFruit = fruits[0];
    // Câu nói khi thả đúng: fruit.<id>-color (theo màu), tên hình (thú/quả), sort.big/small (to/nhỏ)
    const expectedSay = await page.evaluate(() => window.__behocSort!.sayFor(0));

    // Tìm vị trí quả đầu tiên
    const fruitEl = page.getByLabel('Quả 1');
    await expect(fruitEl).toBeVisible();
    const fruitBox = await fruitEl.boundingBox();
    expect(fruitBox).not.toBeNull();

    // Tìm giỏ đúng màu
    const basketEl = page.locator(`[data-color="${firstFruit.color}"]`);
    await expect(basketEl).toBeVisible();
    const basketBox = await basketEl.boundingBox();
    expect(basketBox).not.toBeNull();

    // Kéo
    const startX = fruitBox!.x + fruitBox!.width / 2;
    const startY = fruitBox!.y + fruitBox!.height / 2;
    const endX = basketBox!.x + basketBox!.width / 2;
    const endY = basketBox!.y + basketBox!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        startX + (endX - startX) * (i / steps),
        startY + (endY - startY) * (i / steps)
      );
      await page.waitForTimeout(30);
    }
    await page.mouse.up();

    // Kiểm tra
    await expect(gameEl).toHaveAttribute('data-last-say', expectedSay, { timeout: 2000 });

    await page.screenshot({ path: 'test-results/shots/T-029-mobile-drag.png' });
  });
});
