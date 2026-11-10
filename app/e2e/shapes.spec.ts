// E2E tests for Shapes game - T-009
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

test.describe('Shapes game (Màu và hình)', () => {
  test('từ bản đồ chạm Hồ nước mở game shapes', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondButton = page.getByLabel('Hồ nước');
    await expect(pondButton).toBeVisible();
    await pondButton.tap();

    // Đợi game shapes hiện (timeout 10s theo hướng dẫn)
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định rồi chụp ảnh
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'test-results/shots/T-009-pond.png' });
  });

  test('chạm khối qua e2e hook nghe color rồi shape', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Gọi hook __behocTap để chạm circle
    await page.evaluate(() => {
      (window as unknown as { __behocTap: (id: string) => void }).__behocTap('circle');
    });

    // Kiểm tra data-last-say khớp /^color\./ (timeout 3s theo hướng dẫn)
    await expect(gameEl).toHaveAttribute('data-last-say', /^color\./, { timeout: 3000 });

    // Sau đó data-last-say khớp /^shape\./ (timeout 3s)
    await expect(gameEl).toHaveAttribute('data-last-say', /^shape\./, { timeout: 3000 });
  });

  test('chạm thật vào canvas có phản hồi', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Lấy giá trị ban đầu của data-last-say
    const initialSay = await gameEl.getAttribute('data-last-say');

    // Chạm vào giữa canvas (khoảng 40% chiều rộng, 45% chiều cao)
    const viewport = page.viewportSize()!;
    const x = viewport.width * 0.4;
    const y = viewport.height * 0.45;
    await page.mouse.click(x, y);

    // Đợi data-last-say đổi khác giá trị ban đầu (timeout 5s theo hướng dẫn)
    await expect(async () => {
      const currentSay = await gameEl.getAttribute('data-last-say');
      expect(currentSay).not.toBe(initialSay);
    }).toPass({ timeout: 5000 });
  });

  test('nút Về nhà quay lại màn hình chính', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    await expect(page.getByTestId('game-shapes')).toBeVisible({ timeout: 10000 });

    // Chạm nút Về nhà
    const backButton = page.getByRole('button', { name: 'Về nhà' });
    await expect(backButton).toBeVisible();
    await backButton.tap();

    // Kiểm tra quay lại home
    await expect(page.getByTestId('home')).toBeVisible();
  });
});
