import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

test.describe('Shapes game (Màu và hình)', () => {
  test('từ bản đồ chạm Hồ nước mở được game', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondButton = page.getByLabel('Hồ nước');
    await expect(pondButton).toBeVisible();
    await pondButton.tap();

    // Đợi game shapes hiện
    await expect(page.getByTestId('game-shapes')).toBeVisible({ timeout: 2000 });

    // Đợi scene ổn định rồi chụp ảnh
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'test-results/shots/T-009-pond.png' });
  });

  test('chạm khối đầu tiên nghe color rồi shape', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    await expect(page.getByTestId('game-shapes')).toBeVisible({ timeout: 2000 });

    // Đợi scene load xong
    await page.waitForTimeout(500);

    // Chạm khối đầu tiên bên trái (khoảng 25% chiều rộng, 45% chiều cao)
    const viewport = page.viewportSize()!;
    const x = viewport.width * 0.22;
    const y = viewport.height * 0.45;

    await page.mouse.click(x, y);

    // Kiểm tra data-last-say khớp /^color\./
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toHaveAttribute('data-last-say', /^color\./, { timeout: 500 });

    // Sau 1.2s, data-last-say khớp /^shape\./
    await page.waitForTimeout(1200);
    await expect(gameEl).toHaveAttribute('data-last-say', /^shape\./);
  });

  test('nút Về nhà quay lại màn hình chính', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    await expect(page.getByTestId('game-shapes')).toBeVisible({ timeout: 2000 });

    // Chạm nút Về nhà
    const backButton = page.getByRole('button', { name: 'Về nhà' });
    await expect(backButton).toBeVisible();
    await backButton.tap();

    // Kiểm tra quay lại home
    await expect(page.getByTestId('home')).toBeVisible();
  });
});
