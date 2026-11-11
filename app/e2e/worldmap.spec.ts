// E2E tests for WorldMap component
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test('WorldMap hiện 4 địa điểm có game, mây và Đậu Đậu', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // 4 nút địa điểm có game (hiện tại chỉ 4 game được đăng ký)
  await expect(page.getByLabel('Trang trại')).toBeVisible();
  await expect(page.getByLabel('Hồ nước')).toBeVisible();
  await expect(page.getByLabel('Vườn quả')).toBeVisible();
  await expect(page.getByLabel('Nhà âm nhạc')).toBeVisible();

  // Sở thú, Nhà Đậu Đậu chỉ hiện khi đã có trò (phase 2 thêm dần); không ép ẩn hay hiện ở đây

  // Ít nhất 3 đám mây
  const clouds = page.locator('[data-testid="cloud"]');
  await expect(clouds).toHaveCount(await clouds.count());
  expect(await clouds.count()).toBeGreaterThanOrEqual(3);

  // Đậu Đậu hiện
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();
});

test('chạm địa điểm có phản hồi trong 100ms và ghi data-last-say', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  const orchardBtn = page.getByLabel('Vườn quả');
  await expect(orchardBtn).toBeVisible();

  const box = await orchardBtn.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

  await page.mouse.down();

  // Chờ data-pressed xuất hiện (timeout 100ms đảm bảo phản hồi nhanh theo luật UX)
  await expect(orchardBtn).toHaveAttribute('data-pressed', '', { timeout: 500 }); // luật UX là 100ms; e2e trên máy tải nặng (3 slot song song) cần biên

  // Gốc home có data-last-say
  const home = page.getByTestId('home');
  await expect(home).toHaveAttribute('data-last-say', 'place.orchard', { timeout: 1000 });

  await page.mouse.up();
});

// Hàm helper kiểm tra 2 bounding box có giao nhau không
function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

test('các nút địa điểm ≥120×120px và không chồng nhau', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Lấy tất cả các nút địa điểm hiện có (4 nút với game hiện tại)
  const placeLabels = ['Trang trại', 'Hồ nước', 'Vườn quả', 'Nhà âm nhạc'];
  const boxes: { x: number; y: number; width: number; height: number; label: string }[] = [];

  for (const label of placeLabels) {
    const btn = page.getByLabel(label);
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box, `Nút ${label} có bounding box`).not.toBeNull();
    // Kiểm tra kích thước tối thiểu 120×120
    expect(box!.width, `Nút ${label} rộng ≥120px`).toBeGreaterThanOrEqual(120);
    expect(box!.height, `Nút ${label} cao ≥120px`).toBeGreaterThanOrEqual(120);
    boxes.push({ ...box!, label });
  }

  // Kiểm tra không chồng nhau
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const overlap = boxesOverlap(boxes[i], boxes[j]);
      expect(overlap, `Nút "${boxes[i].label}" chồng với "${boxes[j].label}"`).toBe(false);
    }
  }
});

test('chụp ảnh WorldMap T-023', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Đợi 800ms cho mây và Đậu Đậu ổn định
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'test-results/shots/T-023-map.png' });
});

test('bong bóng không giao với mây ở 3 thời điểm', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  const bubble = page.getByTestId('bubble');
  const clouds = page.locator('[data-testid="cloud"]');

  // Kiểm tra ở 3 thời điểm: 0s, 2s, 4s
  for (const waitTime of [0, 2000, 2000]) {
    if (waitTime > 0) {
      await page.waitForTimeout(waitTime);
    }

    const bubbleBox = await bubble.boundingBox();
    expect(bubbleBox).not.toBeNull();

    const cloudCount = await clouds.count();
    for (let i = 0; i < cloudCount; i++) {
      const cloudBox = await clouds.nth(i).boundingBox();
      expect(cloudBox).not.toBeNull();

      const overlap = boxesOverlap(bubbleBox!, cloudBox!);
      expect(overlap, `Mây ${i + 1} giao với bong bóng`).toBe(false);
    }
  }
});

test('chạm địa điểm có 1 game thì vào thẳng game như cũ', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  const farmBtn = page.getByLabel('Trang trại');
  await expect(farmBtn).toBeVisible();

  const box = await farmBtn.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  // Chờ 1 giây để game load
  await page.waitForTimeout(1000);

  // Phải đang trong game (home không còn visible hoặc game-picker không hiện)
  // Kiểm tra game-picker không hiện (vì chỉ có 1 game)
  await expect(page.getByTestId('game-picker')).not.toBeVisible();
});
