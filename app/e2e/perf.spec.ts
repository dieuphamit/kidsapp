// Performance tests: FPS >= 50 cho các scene 3D và 2.5D
import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

/**
 * Đo FPS bằng cách đếm requestAnimationFrame trong khoảng thời gian cho trước.
 * Chờ 2s khởi động trước khi bắt đầu đo.
 */
async function measureFps(page: Page, ms = 3000): Promise<number> {
  const fps = await page.evaluate(async (measureMs) => {
    // Chờ 2s khởi động
    await new Promise((r) => setTimeout(r, 2000));

    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();

      function countFrame() {
        frameCount++;
        if (performance.now() - startTime < measureMs) {
          requestAnimationFrame(countFrame);
        } else {
          const elapsed = performance.now() - startTime;
          resolve((frameCount / elapsed) * 1000);
        }
      }

      requestAnimationFrame(countFrame);
    });
  }, ms);

  return Math.round(fps);
}

test.describe('Performance tests', () => {
  test('bản đồ (WorldMap) - FPS >= 50', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    expect(fps, `FPS bản đồ: ${fps}`).toBeGreaterThanOrEqual(50);

    await page.screenshot({ path: 'test-results/shots/T-016-worldmap-perf.png' });
  });

  test('Trang trại (game-animals) - FPS >= 50', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Trang trại
    const farmBtn = page.getByLabel('Trang trại');
    await expect(farmBtn).toBeVisible({ timeout: 10000 });
    await farmBtn.click();

    // Chờ game hiện và model cow.glb load xong
    const gameEl = page.getByTestId('game-animals');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    expect(fps, `FPS Trang trại: ${fps}`).toBeGreaterThanOrEqual(50);

    await page.screenshot({ path: 'test-results/shots/T-016-farm-perf.png' });
  });

  test('Hồ nước (game-shapes) - FPS >= 50', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondBtn = page.getByLabel('Hồ nước');
    await expect(pondBtn).toBeVisible({ timeout: 10000 });
    await pondBtn.click();

    // Chờ game hiện và sẵn sàng
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    expect(fps, `FPS Hồ nước: ${fps}`).toBeGreaterThanOrEqual(50);

    await page.screenshot({ path: 'test-results/shots/T-016-pond-perf.png' });
  });

  test('Vườn quả (game-counting 2.5D) - FPS >= 50', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Vườn quả
    const orchardBtn = page.getByLabel('Vườn quả');
    await expect(orchardBtn).toBeVisible({ timeout: 10000 });
    await orchardBtn.tap();

    // Chờ game hiện
    const gameEl = page.getByTestId('game-counting');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Chạm 3 quả liên tiếp
    for (let i = 1; i <= 3; i++) {
      const fruit = page.getByLabel(`Quả ${i}`, { exact: true });
      await fruit.tap();
      await page.waitForTimeout(150);
    }

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    expect(fps, `FPS Vườn quả: ${fps}`).toBeGreaterThanOrEqual(50);

    await page.screenshot({ path: 'test-results/shots/T-016-orchard-perf.png' });
  });
});
