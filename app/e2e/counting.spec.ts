import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const shotsDir = join(process.cwd(), 'test-results', 'shots');

test.beforeAll(() => {
  if (!existsSync(shotsDir)) {
    mkdirSync(shotsDir, { recursive: true });
  }
});

test.describe('Counting game', () => {
  test('chạm Vườn quả mở game counting, chụp T-013-tree.png', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    const orchardBtn = page.getByLabel('Vườn quả');
    await expect(orchardBtn).toBeVisible();
    await orchardBtn.tap();

    // Game counting hiện
    const gameRoot = page.getByTestId('game-counting');
    await expect(gameRoot).toBeVisible();

    // Đợi 600ms cho ổn định
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/T-013-tree.png' });
  });

  test('10 nút quả đều ≥120×120', async ({ page }) => {
    await page.goto('./');
    const orchardBtn = page.getByLabel('Vườn quả');
    await orchardBtn.tap();
    await expect(page.getByTestId('game-counting')).toBeVisible();

    for (let i = 1; i <= 10; i++) {
      const fruitBtn = page.getByLabel(`Quả ${i}`);
      await expect(fruitBtn).toBeVisible();
      const box = await fruitBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(120);
      expect(box!.height).toBeGreaterThanOrEqual(120);
    }
  });

  test('chạm quả 3 → number.1, chạm quả 7 → number.2, chụp T-013-basket.png', async ({ page }) => {
    await page.goto('./');
    const orchardBtn = page.getByLabel('Vườn quả');
    await orchardBtn.tap();
    const gameRoot = page.getByTestId('game-counting');
    await expect(gameRoot).toBeVisible();

    // Chạm quả 3
    const fruit3 = page.getByLabel('Quả 3');
    await fruit3.tap();
    await expect(gameRoot).toHaveAttribute('data-last-say', 'number.1');

    // Chạm quả 7
    await page.waitForTimeout(150);
    const fruit7 = page.getByLabel('Quả 7');
    await fruit7.tap();
    await expect(gameRoot).toHaveAttribute('data-last-say', 'number.2');

    // Chụp ảnh giỏ có 2 quả
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'test-results/shots/T-013-basket.png' });
  });

  test('hái đủ 10 quả → number.10, sau 1.5s → count.done', async ({ page }) => {
    await page.goto('./');
    const orchardBtn = page.getByLabel('Vườn quả');
    await orchardBtn.tap();
    const gameRoot = page.getByTestId('game-counting');
    await expect(gameRoot).toBeVisible();

    // Hái 10 quả
    for (let i = 1; i <= 10; i++) {
      const fruit = page.getByLabel(`Quả ${i}`);
      await fruit.tap();
      await page.waitForTimeout(150);
    }

    await expect(gameRoot).toHaveAttribute('data-last-say', 'number.10');

    // Sau 1.5s → count.done
    await expect(gameRoot).toHaveAttribute('data-last-say', 'count.done', { timeout: 2000 });
  });

  test('nút Về nhà trở về home', async ({ page }) => {
    await page.goto('./');
    const orchardBtn = page.getByLabel('Vườn quả');
    await orchardBtn.tap();
    await expect(page.getByTestId('game-counting')).toBeVisible();

    const backBtn = page.getByRole('button', { name: 'Về nhà' });
    await expect(backBtn).toBeVisible();
    await backBtn.tap();

    await expect(page.getByTestId('home')).toBeVisible();
  });
});
