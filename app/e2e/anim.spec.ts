import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Thú 3D cử động thật (trang kiểm tra `?demo=world&habitat=...`): mỗi khu chụp một ảnh
 * `test-results/shots/anim-<khu>.png` để bố mẹ xem đội hình, kiểm tra các con thật sự di chuyển,
 * không ra khỏi khung, và chạm một con thì nó dừng lại phản ứng rồi đi tiếp.
 */

mkdirSync('test-results/shots', { recursive: true });

type Snap = Record<string, { x: number; y: number; z: number; yaw: number; mode: string; sx: number; sy: number }>;

async function snap(page: Page): Promise<Snap> {
  return page.evaluate(() => {
    const w = window as Window & { __behocWander?: () => Snap };
    return w.__behocWander ? w.__behocWander() : {};
  });
}

async function openHabitat(page: Page, habitat: string) {
  await page.goto(`./?demo=world&habitat=${habitat}&e2e=1`);
  const demo = page.getByTestId('world-demo');
  await expect(demo).toHaveAttribute('data-habitat', habitat);
  await expect(demo).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  return demo;
}

for (const habitat of ['meadow', 'pond', 'forest', 'sea', 'sky']) {
  test(`khu ${habitat}: thú di chuyển, ở trong khung, chụp ảnh`, async ({ page }) => {
    test.setTimeout(120_000); // WebGL phần mềm: vài khung hình/giây
    const demo = await openHabitat(page, habitat);
    await page.waitForTimeout(800);
    const a = await snap(page);
    await page.waitForTimeout(3000);
    const b = await snap(page);
    await page.screenshot({ path: `test-results/shots/anim-${habitat}.png` });

    const ids = Object.keys(a);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const size = (await demo.locator('canvas').first().boundingBox())!;
    let moved = 0;
    for (const id of ids) {
      if (Math.hypot(b[id].x - a[id].x, b[id].y - a[id].y, b[id].z - a[id].z) > 0.1) moved++;
      for (const s of [a, b]) {
        expect(s[id].sx, `${id} trong khung (x)`).toBeGreaterThan(0);
        expect(s[id].sx, `${id} trong khung (x)`).toBeLessThan(size.width);
        expect(s[id].sy, `${id} trong khung (y)`).toBeGreaterThan(0);
        expect(s[id].sy, `${id} trong khung (y)`).toBeLessThan(size.height);
      }
    }
    // Phần lớn đàn đang đi/bơi/bay (vài con có thể đang nghỉ, ăn)
    expect(moved, 'số con đang di chuyển').toBeGreaterThanOrEqual(Math.ceil(ids.length / 2));
  });
}

test('chạm một con đang đi thì nó dừng, phản ứng, rồi đi tiếp', async ({ page }) => {
  test.setTimeout(120_000);
  const demo = await openHabitat(page, 'forest');
  const canvas = (await demo.locator('canvas').first().boundingBox())!;
  let target = '';
  let s: Snap = {};
  // Chọn con đang đi, không bị con nào đứng trước (gần camera hơn) che điểm chạm
  await expect(async () => {
    s = await snap(page);
    const ids = Object.keys(s);
    target =
      ids.find(
        (id) =>
          s[id].mode === 'walk' &&
          ids.every((o) => o === id || s[o].z <= s[id].z || Math.hypot(s[o].sx - s[id].sx, s[o].sy - s[id].sy) > 200),
      ) ?? '';
    expect(target).not.toBe('');
  }).toPass({ timeout: 20_000 });

  await page.mouse.click(canvas.x + s[target].sx, canvas.y + s[target].sy);
  const id = target.replace(/-\d+$/, '');
  await expect(demo).toHaveAttribute('data-last-tap', id, { timeout: 3000 });
  const r1 = (await snap(page))[target];
  expect(r1.mode).toBe('react');
  await page.waitForTimeout(500);
  const r2 = (await snap(page))[target];
  expect(r2.mode).toBe('react');
  expect(r2.x).toBe(r1.x);
  expect(r2.z).toBe(r1.z);
  await expect.poll(async () => (await snap(page))[target].mode, { timeout: 15_000 }).not.toBe('react');
  await expect
    .poll(async () => {
      const c = (await snap(page))[target];
      return Math.hypot(c.x - r2.x, c.z - r2.z);
    }, { timeout: 15_000 })
    .toBeGreaterThan(0.1);
});
