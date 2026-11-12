// E2E: Chuỗi hạt quy luật (T-038)
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

declare global {
  interface Window {
    __behocPattern?: {
      answer(): string;
      pick(id: string): void;
    };
  }
}

mkdirSync('test-results/shots', { recursive: true });

/** Đặt tuổi bé qua idb-keyval (store mặc định) trước khi vào app. */
async function setAge(page: Page, ageMonths: number) {
  await page.goto('./?e2e=1');
  await page.evaluate(async (age) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('keyval');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put({ lang: 'vi', ageMonths: age, sessionMinutes: 15 }, 'behoc.settings');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, ageMonths);
}

async function openPattern(page: Page, ageMonths = 48) {
  await setAge(page, ageMonths);
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await page.getByRole('button', { name: 'Vườn quả' }).tap();
  await pickGame(page, 'pattern');
  const game = page.getByTestId('game-pattern');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid="game-pattern"] [data-bead]').first()).toBeVisible();
  return game;
}

test.describe('Chuỗi hạt quy luật', () => {
  test('Vườn quả → Chuỗi hạt: chào, đọc chuỗi, hỏi tiếp; chụp T-038-pattern.png', async ({ page }) => {
    const game = await openPattern(page);
    await expect(game).toHaveAttribute('data-last-say', 'pattern.hello');
    await expect(game).toHaveAttribute('data-level', 'AB');
    // Đọc chuỗi rồi hỏi "Tiếp theo là quả gì?"
    await expect(game).toHaveAttribute('data-last-say', /^fruit\./, { timeout: 5000 });
    await expect(game).toHaveAttribute('data-last-say', 'pattern.next', { timeout: 8000 });

    // 5 hạt + 1 ô ?, 3 nút lựa chọn đủ lớn
    await expect(page.locator('[data-bead]')).toHaveCount(5);
    await expect(page.getByTestId('pattern-slot')).toBeVisible();
    const choices = page.locator('[data-choice] button');
    await expect(choices).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const box = await choices.nth(i).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(160);
      expect(box!.height).toBeGreaterThanOrEqual(160);
    }
    await page.screenshot({ path: 'test-results/shots/T-038-pattern.png' });
  });

  test('chọn chưa đúng → không thành pattern.yay, quả lăn về và đọc lại chuỗi', async ({ page }) => {
    const game = await openPattern(page);
    await expect(game).toHaveAttribute('data-last-say', 'pattern.next', { timeout: 8000 });
    const answer = await page.evaluate(() => window.__behocPattern!.answer());
    const wrong = await page
      .locator('[data-choice]')
      .evaluateAll((els, a) => els.map((e) => e.getAttribute('data-choice')).find((id) => id !== a)!, answer);

    await page.locator(`[data-choice="${wrong}"] button`).tap();
    await expect(page.locator(`[data-choice="${wrong}"]`)).toHaveAttribute('data-rolling', '');
    // Đọc lại chuỗi rồi hỏi lại; không bao giờ nói pattern.yay
    const says: string[] = [];
    for (let i = 0; i < 30; i++) {
      says.push((await game.getAttribute('data-last-say')) ?? '');
      await page.waitForTimeout(250);
    }
    expect(says).not.toContain('pattern.yay');
    expect(says.some((s) => s.startsWith('fruit.'))).toBe(true);
    await expect(game).toHaveAttribute('data-last-say', 'pattern.next', { timeout: 6000 });
    // Ô ? vẫn trống, quả về chỗ
    await expect(page.getByTestId('pattern-slot')).not.toHaveAttribute('data-filled', /.+/);
    await expect(page.locator('[data-choice] button')).toHaveCount(3);
  });

  test('chọn đúng 3 lần → pattern.yay, data-level đổi; chụp T-038-level.png', async ({ page }) => {
    const game = await openPattern(page);
    await expect(game).toHaveAttribute('data-level', 'AB');
    for (let i = 0; i < 3; i++) {
      const round = await game.getAttribute('data-round');
      const answer = await page.evaluate(() => window.__behocPattern!.answer());
      await page.locator(`[data-choice="${answer}"] button`).tap();
      await expect(game).toHaveAttribute('data-last-say', 'pattern.yay', { timeout: 3000 });
      await expect(page.getByTestId('pattern-slot')).toHaveAttribute('data-filled', answer);
      await expect(game).not.toHaveAttribute('data-round', round!, { timeout: 5000 });
    }
    await expect(game).toHaveAttribute('data-level', 'AAB');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/shots/T-038-level.png' });
  });

  test('qua hook: pick sai rồi pick đúng', async ({ page }) => {
    const game = await openPattern(page);
    const answer = await page.evaluate(() => window.__behocPattern!.answer());
    const wrong = await page
      .locator('[data-choice]')
      .evaluateAll((els, a) => els.map((e) => e.getAttribute('data-choice')).find((id) => id !== a)!, answer);
    await page.evaluate((id) => window.__behocPattern!.pick(id), wrong);
    await page.waitForTimeout(300);
    await expect(game).not.toHaveAttribute('data-last-say', 'pattern.yay');
    await page.evaluate((id) => window.__behocPattern!.pick(id), answer);
    await expect(game).toHaveAttribute('data-last-say', 'pattern.yay', { timeout: 3000 });
  });

  test('kéo quả đúng vào ô ? → pattern.yay', async ({ page }) => {
    const game = await openPattern(page);
    const answer = await page.evaluate(() => window.__behocPattern!.answer());
    await dragTo(page, page.locator(`[data-choice="${answer}"] button`), page.getByTestId('pattern-slot'));
    await expect(game).toHaveAttribute('data-last-say', 'pattern.yay', { timeout: 3000 });
  });

  test('bé 30 tháng vẫn vào được, bắt đầu từ AB', async ({ page }) => {
    const game = await openPattern(page, 30);
    await expect(game).toHaveAttribute('data-level', 'AB');
  });
});

test.describe('iPhone dọc: kéo hạt', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo quả đúng vào ô ? → pattern.yay', async ({ page }) => {
    const game = await openPattern(page);
    const answer = await page.evaluate(() => window.__behocPattern!.answer());
    await dragTo(page, page.locator(`[data-choice="${answer}"] button`), page.getByTestId('pattern-slot'));
    await expect(game).toHaveAttribute('data-last-say', 'pattern.yay', { timeout: 3000 });
  });
});

async function dragTo(page: Page, from: ReturnType<Page['locator']>, to: ReturnType<Page['locator']>) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  const sx = a.x + a.width / 2;
  const sy = a.y + a.height / 2;
  const ex = b.x + b.width / 2;
  const ey = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(sx + ((ex - sx) * i) / 10, sy + ((ey - sy) * i) / 10);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}
