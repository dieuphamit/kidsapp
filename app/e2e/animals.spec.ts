import { test, expect } from '@playwright/test';
import { pickGame } from './pick.js';
import { expectAnimalsWander, expectTapStopsWalker } from './wander.js';
import { mkdirSync, existsSync } from 'node:fs';

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test('chạm Trang trại mở game animals', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chạm nút Trang trại
  await page.getByLabel('Thế giới thú').click();
  await pickGame(page, 'animals');

  // Game animals hiện trong 10s
  await expect(page.getByTestId('game-animals')).toBeVisible({ timeout: 10000 });
});

test('chụp ảnh trang trại sau khi model load xong', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Trang trại hiện trước khi click
  const farmBtn = page.getByLabel('Thế giới thú');
  await expect(farmBtn).toBeVisible({ timeout: 10000 });

  // Chạm nút Trang trại
  await farmBtn.click();
  await pickGame(page, 'animals');

  // Chờ game hiện và ready
  const gameEl = page.getByTestId('game-animals');
  await expect(gameEl).toBeVisible({ timeout: 10000 });
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

  // Đợi thêm cho model ổn định
  await page.waitForTimeout(500);

  // Chụp ảnh trang trại
  await page.screenshot({ path: 'test-results/shots/T-008-farm.png' });
});

test('cham con bo nghe animal.cow roi animal.cow-sound (via hook)', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Trang trại hiện
  const farmBtn = page.getByLabel('Thế giới thú');
  await expect(farmBtn).toBeVisible({ timeout: 10000 });

  // Chạm nút Trang trại
  await farmBtn.click();
  await pickGame(page, 'animals');

  // Chờ game hiện và ready
  const gameEl = page.getByTestId('game-animals');
  await expect(gameEl).toBeVisible({ timeout: 10000 });
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

  // Gọi hook để tap con bò
  await page.evaluate(() => {
    const w = window as Window & { __behocTap?: (id: string) => void };
    if (w.__behocTap) {
      w.__behocTap('cow');
    }
  });

  // Kiểm tra data-last-say = animal.cow
  await expect(gameEl).toHaveAttribute('data-last-say', 'animal.cow', { timeout: 3000 });

  // Chụp ảnh ngay sau khi chạm (thấy bò đang nhảy)
  await page.screenshot({ path: 'test-results/shots/T-008-tap.png' });

  // Chờ timeout 1300ms fire → data-last-say = animal.cow-sound
  await expect(gameEl).toHaveAttribute('data-last-say', 'animal.cow-sound', { timeout: 3000 });
});

test('chạm thật vào canvas có phản hồi', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chạm nút Trang trại
  await page.getByLabel('Thế giới thú').click();
  await pickGame(page, 'animals');

  // Chờ game hiện và ready
  const gameEl = page.getByTestId('game-animals');
  await expect(gameEl).toBeVisible({ timeout: 10000 });
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

  // Lưu giá trị ban đầu của data-last-say
  const initialLastSay = await gameEl.getAttribute('data-last-say');

  // Chạm thật vào giữa canvas (nơi có con vật)
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('No viewport');

  // Con bò ở hàng trước, x = -0.5 (khoảng 45% từ trái)
  const cowX = viewport.width * 0.45;
  const cowY = viewport.height * 0.58;

  await page.mouse.click(cowX, cowY);

  // Chờ data-last-say thay đổi (khác giá trị ban đầu) trong 5s
  await expect(async () => {
    const currentLastSay = await gameEl.getAttribute('data-last-say');
    expect(currentLastSay).not.toBe(initialLastSay);
  }).toPass({ timeout: 5000 });
});

test('nút Về nhà có kích thước đủ lớn và hoạt động', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chạm nút Trang trại
  await page.getByLabel('Thế giới thú').click();
  await pickGame(page, 'animals');

  // Chờ game hiện
  await expect(page.getByTestId('game-animals')).toBeVisible({ timeout: 10000 });

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

test('con vật đi dạo qua lại, chạm con đang đi thì nó dừng lại rồi đi tiếp', async ({ page }) => {
  test.setTimeout(120_000); // WebGL phần mềm: vài khung hình/giây
  await page.goto('./?e2e=1');
  await page.getByLabel('Thế giới thú').click();
  await pickGame(page, 'animals');
  const gameEl = page.getByTestId('game-animals');
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 15000 });

  const [first] = await expectAnimalsWander(page, gameEl, 'wander-farm', 3);
  // Bò đứng yên ở hàng trước (test chạm thật phía trên dựa vào chỗ đó)
  expect(first.cow.mode).toBe('idle');

  await expectTapStopsWalker(page, gameEl);
});
