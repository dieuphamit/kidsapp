import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// E2E tests for animals game
test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

test('chạm Trang trại mở game animals', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chạm nút Trang trại
  await page.getByLabel('Trang trại').click();

  // Game animals hiện trong 5s
  await expect(page.getByTestId('game-animals')).toBeVisible({ timeout: 5000 });
});

test('chụp ảnh trang trại sau khi model load xong', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Trang trại hiện trước khi click (tăng timeout cho 3D scene load)
  const farmBtn = page.getByLabel('Trang trại');
  await expect(farmBtn).toBeVisible({ timeout: 10000 });

  // Bắt đầu chờ response trước khi click
  const responsePromise = page.waitForResponse((r) => r.url().includes('cow.glb'));

  // Chạm nút Trang trại
  await farmBtn.click();

  // Chờ game hiện
  await expect(page.getByTestId('game-animals')).toBeVisible({ timeout: 10000 });

  // Chờ cow.glb load xong
  await responsePromise;

  // Đợi thêm 1.5s cho model ổn định
  await page.waitForTimeout(1500);

  // Chụp ảnh trang trại
  await page.screenshot({ path: 'test-results/shots/T-008-farm.png' });
});

test('chạm con bò nghe animal.cow rồi animal.cow-sound', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Trang trại hiện (tăng timeout cho 3D scene load)
  const farmBtn = page.getByLabel('Trang trại');
  await expect(farmBtn).toBeVisible({ timeout: 10000 });

  // Bắt đầu chờ response trước khi click
  const responsePromise = page.waitForResponse((r) => r.url().includes('cow.glb'));

  // Chạm nút Trang trại
  await farmBtn.click();

  // Chờ game hiện
  const gameEl = page.getByTestId('game-animals');
  await expect(gameEl).toBeVisible({ timeout: 10000 });

  // Chờ cow.glb load xong
  await responsePromise;

  // Đợi thêm cho model ổn định
  await page.waitForTimeout(1000);

  // Con bò ở hàng trước, x = -0.5 (gần giữa hơi lệch trái)
  // Với camera position [0, 4.2, 13], target [0, 0.8, 0], fov 40
  // Tính toán tọa độ dựa vào viewport 1180x820 (iPad)
  // Bò ở khoảng 45% chiều ngang, 58% chiều dọc (ước lượng)
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('No viewport');

  const cowX = viewport.width * 0.45;
  const cowY = viewport.height * 0.58;

  // Chạm vào con bò
  await page.mouse.click(cowX, cowY);

  // Kiểm tra data-last-say = animal.cow NGAY sau khi click (trước khi timeout 1300ms fire)
  await expect(gameEl).toHaveAttribute('data-last-say', 'animal.cow', { timeout: 500 });

  // Chụp ảnh ngay sau khi chạm (thấy bò đang nhảy)
  await page.screenshot({ path: 'test-results/shots/T-008-tap.png' });

  // Chờ 1.4s (để timeout 1300ms fire) → data-last-say = animal.cow-sound
  await page.waitForTimeout(1400);
  await expect(gameEl).toHaveAttribute('data-last-say', 'animal.cow-sound', { timeout: 500 });
});

test('nút Về nhà có kích thước đủ lớn và hoạt động', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chạm nút Trang trại
  await page.getByLabel('Trang trại').click();

  // Chờ game hiện
  await expect(page.getByTestId('game-animals')).toBeVisible({ timeout: 5000 });

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
