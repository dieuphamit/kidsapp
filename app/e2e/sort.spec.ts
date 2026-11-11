// E2E tests for Sort game (Xếp quả theo màu) - T-029
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Type declaration for E2E hook
type FruitColor = 'red' | 'yellow' | 'green';
declare global {
  interface Window {
    __behocSort?: {
      fruits(): { id: string; color: FruitColor }[];
      drop(i: number, color: FruitColor): void;
    };
  }
}

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test.describe('Sort game (Xếp quả theo màu)', () => {
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
    const sortBtn = page.getByLabel('Xếp quả theo màu');
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
    await page.getByLabel('Xếp quả theo màu').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Lấy thông tin quả qua e2e hook
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());

    // Tìm quả đỏ và thử thả vào giỏ vàng
    const redIdx = fruits.findIndex((f) => f.color === 'red');
    expect(redIdx).toBeGreaterThanOrEqual(0);

    const initialCount = fruits.length;

    // Thử thả sai
    await page.evaluate(
      ({ idx }) => window.__behocSort!.drop(idx, 'yellow'),
      { idx: redIdx }
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
    await page.getByLabel('Xếp quả theo màu').tap();
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
    await page.getByLabel('Xếp quả theo màu').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Lấy quả đầu tiên và tìm giỏ đúng màu
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());
    const firstFruit = fruits[0];

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

    // Kiểm tra quả đã được xếp (data-last-say là fruit.<id>-color)
    await expect(gameEl).toHaveAttribute(
      'data-last-say',
      `fruit.${firstFruit.id}-color`,
      { timeout: 2000 }
    );
  });

  test('nút Về nhà quay lại home', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game sort
    await page.getByLabel('Vườn quả').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
    await page.getByLabel('Xếp quả theo màu').tap();
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
    await page.getByLabel('Xếp quả theo màu').tap();
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
    await page.getByLabel('Xếp quả theo màu').tap();
    const gameEl = page.getByTestId('game-sort');
    await expect(gameEl).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Lấy thông tin quả
    const fruits = await page.evaluate(() => window.__behocSort!.fruits());
    const firstFruit = fruits[0];

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
    await expect(gameEl).toHaveAttribute(
      'data-last-say',
      `fruit.${firstFruit.id}-color`,
      { timeout: 2000 }
    );

    await page.screenshot({ path: 'test-results/shots/T-029-mobile-drag.png' });
  });
});
