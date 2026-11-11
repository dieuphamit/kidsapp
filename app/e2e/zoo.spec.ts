import { test, expect } from '@playwright/test';
import { pickGame } from './pick.js';
import { expectAnimalsWander, expectTapStopsWalker } from './wander.js';
import { mkdirSync, existsSync } from 'node:fs';

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test('vào Sở thú từ Home qua picker và chụp ảnh', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Sở thú hiện
  const zooBtn = page.getByLabel('Sở thú');
  await expect(zooBtn).toBeVisible({ timeout: 10000 });

  // Chạm nút Sở thú
  await zooBtn.click();
  await pickGame(page, 'zoo3d');

  // Nếu có GamePicker, chọn game zoo3d
  const picker = page.getByTestId('game-picker');
  const hasPicker = await picker.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasPicker) {
    // Chờ picker hiện rồi chọn game zoo3d
    const zooGame = page.getByLabel('Các bạn ở sở thú');
    await expect(zooGame).toBeVisible({ timeout: 5000 });
    await zooGame.click();
  }

  // Chờ game hiện và ready
  const gameEl = page.getByTestId('game-zoo');
  await expect(gameEl).toBeVisible({ timeout: 10000 });
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 15000 });

  // Đợi thêm cho model ổn định
  await page.waitForTimeout(500);

  // Chụp ảnh sở thú
  await page.screenshot({ path: 'test-results/shots/T-024-zoo.png' });
});

test('chạm thú nghe animal.<id> rồi animal.<id>-sound (via hook)', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Sở thú hiện
  const zooBtn = page.getByLabel('Sở thú');
  await expect(zooBtn).toBeVisible({ timeout: 10000 });
  await zooBtn.click();
  await pickGame(page, 'zoo3d');

  // Nếu có GamePicker, chọn game zoo3d
  const picker = page.getByTestId('game-picker');
  const hasPicker = await picker.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasPicker) {
    const zooGame = page.getByLabel('Các bạn ở sở thú');
    await expect(zooGame).toBeVisible({ timeout: 5000 });
    await zooGame.click();
  }

  // Chờ game hiện và ready
  const gameEl = page.getByTestId('game-zoo');
  await expect(gameEl).toBeVisible({ timeout: 10000 });
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 15000 });

  // Lấy danh sách con thú đang hiện
  const visibleAnimals = await gameEl.getAttribute('data-visible-animals');
  expect(visibleAnimals).toBeTruthy();
  const animalIds = visibleAnimals!.split(',');
  expect(animalIds.length).toBe(6);

  // Chọn con đầu tiên để tap
  const firstAnimalId = animalIds[0];

  // Gọi hook để tap con thú
  await page.evaluate((id) => {
    const w = window as Window & { __behocTap?: (id: string) => void };
    if (w.__behocTap) {
      w.__behocTap(id);
    }
  }, firstAnimalId);

  // Kiểm tra data-last-say = animal.<id>
  await expect(gameEl).toHaveAttribute('data-last-say', `animal.${firstAnimalId}`, { timeout: 3000 });

  // Chờ timeout 1300ms fire → data-last-say = animal.<id>-sound
  await expect(gameEl).toHaveAttribute('data-last-say', `animal.${firstAnimalId}-sound`, { timeout: 3000 });
});

test('nút Về nhà có kích thước đủ lớn và hoạt động', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Chờ nút Sở thú hiện
  const zooBtn = page.getByLabel('Sở thú');
  await expect(zooBtn).toBeVisible({ timeout: 10000 });
  await zooBtn.click();
  await pickGame(page, 'zoo3d');

  // Nếu có GamePicker, chọn game zoo3d
  const picker = page.getByTestId('game-picker');
  const hasPicker = await picker.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasPicker) {
    const zooGame = page.getByLabel('Các bạn ở sở thú');
    await expect(zooGame).toBeVisible({ timeout: 5000 });
    await zooGame.click();
  }

  // Chờ game hiện
  await expect(page.getByTestId('game-zoo')).toBeVisible({ timeout: 10000 });

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

test('thú đi dạo qua lại theo làn, chạm con đang đi thì nó dừng lại rồi đi tiếp', async ({ page }) => {
  test.setTimeout(120_000); // WebGL phần mềm: vài khung hình/giây
  // seed=5: hươu cao cổ, gấu túi, vẹt (nhảy lò cò) đi dạo; hổ, gấu, cánh cụt đứng yên
  await page.goto('./?e2e=1&seed=5');
  await page.getByLabel('Sở thú').click();
  await pickGame(page, 'zoo3d');
  const gameEl = page.getByTestId('game-zoo');
  await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(gameEl).toHaveAttribute('data-visible-animals', 'parrot,giraffe,koala,tiger,bear,penguin');

  const [first] = await expectAnimalsWander(page, gameEl, 'wander-zoo', 2);
  expect(first.giraffe.z, 'con cao nhất đi làn sau cùng').toBeLessThan(first.koala.z);

  await expectTapStopsWalker(page, gameEl);
});
