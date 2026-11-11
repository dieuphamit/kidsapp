// E2E tests for GamePicker component
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test('picker hiện khi mở với e2e hook và chụp ảnh T-023-picker', async ({ page }) => {
  // Mở picker cho farm bằng hook e2e
  await page.goto('./?e2e=1&picker=farm');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });

  // Tiêu đề là tên địa điểm
  await expect(page.getByRole('heading', { name: 'Trang trại' })).toBeVisible();

  // Có nút quay lại (BackHome)
  await expect(page.getByLabel('Đậu Đậu')).toBeVisible();

  // Chụp ảnh picker
  await page.screenshot({ path: 'test-results/shots/T-023-picker.png' });
});

test('picker có data-last-say sau khi mount', async ({ page }) => {
  await page.goto('./?e2e=1&picker=farm');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });

  // Kiểm tra data-last-say
  const picker = page.getByTestId('game-picker');
  await expect(picker).toHaveAttribute('data-last-say', 'ui.pick-game', { timeout: 1000 });
});

test('nút game trong picker có kích thước ≥120px', async ({ page }) => {
  await page.goto('./?e2e=1&picker=farm');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });

  // Tìm nút game "Con vật"
  const gameBtn = page.getByLabel('Con vật');
  await expect(gameBtn).toBeVisible();

  const box = await gameBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(120);
  expect(box!.height).toBeGreaterThanOrEqual(120);
});

test('chạm nút quay lại thì về bản đồ', async ({ page }) => {
  await page.goto('./?e2e=1&picker=farm');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });

  // Chạm nút quay lại
  const backBtn = page.getByLabel('Đậu Đậu');
  await expect(backBtn).toBeVisible();

  const box = await backBtn.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  // Chờ về bản đồ
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 2000 });
  await expect(page.getByTestId('game-picker')).not.toBeVisible();
});

test('chạm nút game trong picker thì vào game sau 400ms', async ({ page }) => {
  await page.goto('./?e2e=1&picker=farm');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });

  // Chạm nút game
  const gameBtn = page.getByLabel('Con vật');
  await expect(gameBtn).toBeVisible();

  const box = await gameBtn.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  // Chờ vào game (picker biến mất)
  await page.waitForTimeout(600);
  await expect(page.getByTestId('game-picker')).not.toBeVisible();
  // home cũng không hiện vì đang trong game
  await expect(page.getByTestId('home')).not.toBeVisible();
});
