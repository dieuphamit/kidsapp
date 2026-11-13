// Performance tests: FPS >= 50 cho các scene 3D và 2.5D
import { test, expect, type Page } from '@playwright/test';
import { pickGame } from './pick.js';
import { mkdirSync } from 'node:fs';

test.setTimeout(60_000);

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

/**
 * Chromium headless trên máy không có GPU vẽ WebGL bằng phần mềm (SwiftShader/llvmpipe):
 * fps khi đó chỉ 4–10 dù scene nhẹ, không phản ánh iPad. Khi đó chỉ ghi số đo (annotation
 * `fps-software-gl`) mà không chặn; có GPU thật thì vẫn đòi ≥ 50.
 */
async function isSoftwareGl(page: Page): Promise<boolean> {
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
  test.info().annotations.push({ type: 'gl-renderer', description: renderer });
  return /swiftshader|llvmpipe|software|none/i.test(renderer);
}

async function checkFps(page: Page, fps: number, label: string) {
  if (await isSoftwareGl(page)) {
    test.info().annotations.push({ type: 'fps-software-gl', description: `${label}: ${fps} (không chặn, GL phần mềm)` });
    return;
  }
  expect(fps, `FPS ${label}: ${fps}`).toBeGreaterThanOrEqual(50);
}

test.describe('Performance tests', () => {
  test('bản đồ (WorldMap) - FPS >= 50', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    await checkFps(page, fps, 'bản đồ');

    await page.screenshot({ path: 'test-results/shots/T-016-worldmap-perf.png' });
  });

  test('Trang trại (game-animals) - FPS >= 50', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Trang trại
    const farmBtn = page.getByLabel('Thế giới thú');
    await expect(farmBtn).toBeVisible({ timeout: 10000 });
    await farmBtn.click();
    await pickGame(page, 'animals');

    // Chờ game hiện và model cow.glb load xong
    const gameEl = page.getByTestId('game-animals');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 30000 });

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    await checkFps(page, fps, 'Trang trại');

    await page.screenshot({ path: 'test-results/shots/T-016-farm-perf.png' });
  });

  test('Hồ nước (game-shapes) - FPS >= 50', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondBtn = page.getByLabel('Vườn quả');
    await expect(pondBtn).toBeVisible({ timeout: 10000 });
    await pondBtn.click();
    await pickGame(page, 'shapes');

    // Chờ game hiện và sẵn sàng
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 30000 });

    const fps = await measureFps(page);
    test.info().annotations.push({ type: 'fps', description: `${fps}` });

    await checkFps(page, fps, 'Hồ nước');

    await page.screenshot({ path: 'test-results/shots/T-016-pond-perf.png' });
  });

  test('Vườn quả (game-counting 2.5D) - FPS >= 50', async ({ page }) => {
    // Đếm số đổi món theo lượt (E3): ép chủ đề trái cây, mức vừa để có "Quả 1..3"
    await page.goto('./?e2e=1&level=medium&topic=fruits');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Vườn quả
    const orchardBtn = page.getByLabel('Vườn quả');
    await expect(orchardBtn).toBeVisible({ timeout: 10000 });
    await orchardBtn.tap();
    await pickGame(page, 'counting');

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

    await checkFps(page, fps, 'Vườn quả');

    await page.screenshot({ path: 'test-results/shots/T-016-orchard-perf.png' });
  });

  test('Ban nhạc thú chạy vòng lặp 10 giây không lỗi trang', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./?e2e=1&picker=music&level=medium');
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('pick-band').click();
    const game = page.getByTestId('game-band');
    await expect(game).toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(() => !!(window as unknown as { __behocBand?: unknown }).__behocBand);
    // Đủ 4 ô để mỗi nhịp đều phát tiếng kêu
    await page.evaluate(() => {
      const band = (window as unknown as { __behocBand: { put(i: number, id: string): void } }).__behocBand;
      ['dog', 'cow', 'duck', 'pig'].forEach((id, i) => band.put(i, id));
    });
    await expect(game).toHaveAttribute('data-beat', /[0-3]/, { timeout: 5000 });
    await page.waitForTimeout(10_000);
    // Vòng lặp vẫn chạy sau 10 giây
    await expect(game).toHaveAttribute('data-beat', /[0-3]/);
    expect(errors).toEqual([]);
  });
});
