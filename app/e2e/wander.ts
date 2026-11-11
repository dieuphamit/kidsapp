import { expect, type Locator, type Page } from '@playwright/test';

export type WanderSnap = Record<string, { x: number; z: number; yaw: number; mode: string; sx: number; sy: number }>;

/** Đọc vị trí các con vật qua hook e2e `window.__behocWander` (xem src/ui/WanderAnimal.tsx) */
export async function wanderSnap(page: Page): Promise<WanderSnap> {
  return page.evaluate(() => {
    const w = window as Window & { __behocWander?: () => WanderSnap };
    return w.__behocWander ? w.__behocWander() : {};
  });
}

/**
 * Chụp 3 ảnh cách nhau 2s (t=0, 2, 4) và kiểm tra con vật đi dạo thật sự di chuyển:
 * x đổi, z giữ nguyên (đi đúng làn), con đứng yên không rời chỗ, không con nào ra khỏi vùng nhìn thấy.
 * Trả về các ảnh chụp vị trí để test kiểm tra thêm.
 */
export async function expectAnimalsWander(page: Page, gameEl: Locator, shotPrefix: string, minWalkers: number) {
  const snaps: WanderSnap[] = [];
  for (let i = 0; i < 3; i++) {
    if (i > 0) await page.waitForTimeout(2000);
    snaps.push(await wanderSnap(page));
    await page.screenshot({ path: `test-results/shots/${shotPrefix}-${i * 2}s.png` });
  }
  const [a, , c] = snaps;
  const ids = Object.keys(a);
  expect(ids.length).toBeGreaterThan(0);
  const size = (await gameEl.locator('canvas').first().boundingBox())!;

  let walkers = 0;
  for (const id of ids) {
    const moved = Math.abs(c[id].x - a[id].x);
    // Đi đúng làn: z không đổi
    expect(Math.abs(c[id].z - a[id].z), `${id} giữ làn`).toBeLessThan(1e-6);
    if (a[id].mode === 'idle') {
      expect(moved, `${id} đứng yên`).toBeLessThan(1e-6);
    } else if (moved > 0.15) {
      walkers++;
    }
    // Luôn nằm trong khung hình
    for (const s of snaps) {
      expect(s[id].sx, `${id} trong khung (x)`).toBeGreaterThan(0);
      expect(s[id].sx, `${id} trong khung (x)`).toBeLessThan(size.width);
      expect(s[id].sy, `${id} trong khung (y)`).toBeGreaterThan(0);
      expect(s[id].sy, `${id} trong khung (y)`).toBeLessThan(size.height);
    }
  }
  expect(walkers, 'số con đang đi dạo').toBeGreaterThanOrEqual(minWalkers);
  return snaps;
}

/**
 * Chạm thật (chuột vào canvas) vào một con đang đi mà không bị con khác che gần đó,
 * kiểm tra: nói tên, dừng lại (x đứng yên) trong lúc phản ứng, rồi đi tiếp.
 */
export async function expectTapStopsWalker(page: Page, gameEl: Locator) {
  const canvas = (await gameEl.locator('canvas').first().boundingBox())!;
  let target = '';
  let snap: WanderSnap = {};
  await expect(async () => {
    snap = await wanderSnap(page);
    const ids = Object.keys(snap);
    target =
      ids.find((id) => {
        const s = snap[id];
        if (s.mode !== 'walk') return false;
        // Chỉ con đứng TRƯỚC (z lớn hơn, gần camera) mới che được điểm chạm
        return ids.every((o) => o === id || snap[o].z <= s.z || Math.hypot(snap[o].sx - s.sx, snap[o].sy - s.sy) > 260);
      }) ?? '';
    expect(target, 'có con đang đi đứng riêng để chạm').not.toBe('');
  }).toPass({ timeout: 20_000 });

  await page.mouse.click(canvas.x + snap[target].sx, canvas.y + snap[target].sy);
  await expect(gameEl).toHaveAttribute('data-last-say', `animal.${target}`, { timeout: 3000 });

  // Đang phản ứng: đứng lại một chỗ
  const r1 = (await wanderSnap(page))[target];
  expect(r1.mode).toBe('react');
  await page.waitForTimeout(500);
  const r2 = (await wanderSnap(page))[target];
  expect(r2.mode).toBe('react');
  expect(r2.x).toBe(r1.x);

  // Phản ứng xong thì đi tiếp
  await expect.poll(async () => (await wanderSnap(page))[target].mode, { timeout: 15_000 }).not.toBe('react');
  await expect
    .poll(async () => Math.abs((await wanderSnap(page))[target].x - r2.x), { timeout: 15_000 })
    .toBeGreaterThan(0.1);
}
