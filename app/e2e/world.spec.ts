import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

/**
 * "Khám phá thế giới": 5 khu (đồng cỏ, ao hồ, rừng, biển, trời) nối nhau, kéo ngang một ngón hoặc bấm mũi tên
 * để đi qua lại. Chụp từng khu `test-results/shots/world-<khu>.png`, kéo trên iPad và iPhone dọc (khung xoay),
 * chạm một con vật nghe đúng tiếng kêu thật rồi tên.
 */

mkdirSync('test-results/shots', { recursive: true });

const HABITATS = ['meadow', 'pond', 'forest', 'sea', 'sky'];
type Snap = Record<string, { x: number; y: number; z: number; mode: string; sx: number; sy: number }>;

async function openWorld(page: Page): Promise<Locator> {
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: 'Thế giới thú' }).click();
  await pickGame(page, 'world');
  const game = page.getByTestId('game-world');
  await expect(game).toHaveAttribute('data-habitat', 'meadow');
  await expect(game).toHaveAttribute('data-ready', 'true', { timeout: 40_000 });
  return game;
}

async function snap(page: Page): Promise<Snap> {
  return page.evaluate(() => {
    const w = window as Window & { __behocWander?: () => Snap };
    return w.__behocWander ? w.__behocWander() : {};
  });
}

test('vào trò, bấm mũi tên đi qua 5 khu, mỗi khu đọc tên và chụp ảnh', async ({ page }) => {
  test.setTimeout(240_000); // WebGL phần mềm: vài khung hình/giây
  const game = await openWorld(page);
  await expect(game).toHaveAttribute('data-last-say', 'world.hello');
  await expect(page.getByRole('button', { name: 'Sang trái' })).toHaveCount(0);
  const right = page.getByRole('button', { name: 'Sang phải' });
  const box = (await right.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(120);
  expect(box.height).toBeGreaterThanOrEqual(120);
  // chừa góc trên bên phải 144px cho cổng phụ huynh
  expect(box.y).toBeGreaterThan(144);

  for (let i = 0; i < HABITATS.length; i++) {
    const h = HABITATS[i];
    if (i > 0) {
      await page.getByRole('button', { name: 'Sang phải' }).click();
      await expect(game).toHaveAttribute('data-habitat', h);
      await expect(game).toHaveAttribute('data-last-say', `world.${h}`, { timeout: 15_000 });
      await expect(game).toHaveAttribute('data-ready', 'true', { timeout: 40_000 });
    }
    await expect(page.getByTestId('world-dots')).toHaveAttribute('data-current', String(i));
    await page.waitForTimeout(1500);
    // mọi con trong khu nằm trong khung hình
    const s = await snap(page);
    const ids = Object.keys(s);
    expect(ids.length, h).toBeGreaterThanOrEqual(4);
    for (const id of ids) {
      expect(s[id].sx, `${h}/${id} x`).toBeGreaterThan(0);
      expect(s[id].sx, `${h}/${id} x`).toBeLessThan(1194);
      expect(s[id].sy, `${h}/${id} y`).toBeGreaterThan(0);
      expect(s[id].sy, `${h}/${id} y`).toBeLessThan(834);
    }
    await page.screenshot({ path: `test-results/shots/world-${h}.png` });
  }
  // cuối dải: không còn mũi tên phải, mũi tên trái đưa về khu trước
  await expect(page.getByRole('button', { name: 'Sang phải' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sang trái' }).click();
  await expect(game).toHaveAttribute('data-habitat', 'sea');
});

/** Kéo bằng chuột theo toạ độ màn hình, nhiều bước như ngón tay thật */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  }
  await page.mouse.up();
}

test('iPad: kéo ngang sang khu bên cạnh; kéo quá đầu dải thì nảy về', async ({ page }) => {
  test.setTimeout(120_000);
  const game = await openWorld(page);
  // đầu dải: kéo sang phải (muốn về khu trước) thì vẫn ở đồng cỏ
  await drag(page, { x: 400, y: 640 }, { x: 900, y: 640 });
  await page.waitForTimeout(800);
  await expect(game).toHaveAttribute('data-habitat', 'meadow');
  // kéo sang trái: tới ao hồ
  await drag(page, { x: 900, y: 640 }, { x: 350, y: 640 });
  await expect(game).toHaveAttribute('data-habitat', 'pond');
  await expect(game).toHaveAttribute('data-last-say', 'world.pond', { timeout: 15_000 });
  // kéo ngắn rồi thả: quay về khu cũ
  await drag(page, { x: 600, y: 640 }, { x: 520, y: 640 }, 4);
  await page.waitForTimeout(800);
  await expect(game).toHaveAttribute('data-habitat', 'pond');
});

test.describe('iPhone dọc 430×932 (khung xoay 90°)', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo theo chiều ngang của khung (dọc màn hình) sang khu bên cạnh', async ({ page }) => {
    test.setTimeout(120_000);
    const game = await openWorld(page);
    // Khung 1194×834 xoay 90° theo chiều kim đồng hồ: x của khung chạy từ trên xuống dưới màn hình
    const scale = Math.min(932 / 1194, 430 / 834);
    const toScreen = (sx: number, sy: number) => ({ x: 430 / 2 - (sy - 834 / 2) * scale, y: 932 / 2 + (sx - 1194 / 2) * scale });
    await drag(page, toScreen(900, 620), toScreen(300, 620));
    await expect(game).toHaveAttribute('data-habitat', 'pond');
    await page.screenshot({ path: 'test-results/shots/world-iphone-portrait.png' });
  });
});

test('chạm một con vật: nó phản ứng, nghe tiếng kêu thật rồi tên', async ({ page }) => {
  test.setTimeout(120_000);
  const game = await openWorld(page);
  const canvas = (await game.locator('canvas').first().boundingBox())!;
  let target = '';
  let s: Snap = {};
  // chọn con không bị con khác (gần camera hơn) che điểm chạm, và không nằm dưới nút
  await expect(async () => {
    s = await snap(page);
    const ids = Object.keys(s);
    target =
      ids.find(
        (id) =>
          s[id].sx > 200 &&
          s[id].sx < 1000 &&
          s[id].sy > 180 &&
          s[id].sy < 720 &&
          ids.every((o) => o === id || s[o].z <= s[id].z || Math.hypot(s[o].sx - s[id].sx, s[o].sy - s[id].sy) > 220),
      ) ?? '';
    expect(target).not.toBe('');
  }).toPass({ timeout: 20_000 });

  const id = target.replace(/-\d+$/, '');
  const sound = page.waitForRequest((r) => r.url().includes(`/audio/sfx/animal-${id}.mp3`), { timeout: 10_000 });
  await page.mouse.click(canvas.x + s[target].sx, canvas.y + s[target].sy);
  await expect(game).toHaveAttribute('data-last-tap', id, { timeout: 3000 });
  await expect(game).toHaveAttribute('data-last-say', `animal.${id}-sound`);
  expect((await snap(page))[target].mode).toBe('react');
  await sound;
  await expect(game).toHaveAttribute('data-last-say', `animal.${id}`, { timeout: 5000 });
});
