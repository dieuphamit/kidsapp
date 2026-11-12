// E2E Ban nhạc thú (T-037)
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

declare global {
  interface Window {
    __behocBand?: {
      slots(): (string | null)[];
      put(i: number, id: string): void;
    };
  }
}

test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

/** Mở bảng chọn trò của Nhà âm nhạc (trang 2D, không phụ thuộc bản đồ 3D) rồi vào Ban nhạc thú. */
async function openBand(page: Page) {
  await page.goto('./?e2e=1&picker=music');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel('Ban nhạc thú')).toBeVisible();
  await page.getByTestId('pick-band').click();
  const game = page.getByTestId('game-band');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'band.hello');
  await page.waitForFunction(() => !!window.__behocBand);
  return game;
}

/** Kéo thật bằng chuột từ tâm phần tử này sang tâm phần tử kia. */
async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.getByTestId(from).boundingBox())!;
  const b = (await page.getByTestId(to).boundingBox())!;
  const sx = a.x + a.width / 2, sy = a.y + a.height / 2;
  const ex = b.x + b.width / 2, ey = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((ex - sx) * i) / steps, sy + ((ey - sy) * i) / steps);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

/** Đợi đến khi chính nhịp `beat` phát tiếng kêu `key` (kiểm tra mỗi khung hình). */
async function waitForBeatSay(page: Page, beat: number, key: string) {
  await page.waitForFunction(
    ({ beat, key }) => {
      const el = document.querySelector('[data-testid="game-band"]');
      return el?.getAttribute('data-beat') === String(beat) && el.getAttribute('data-last-say') === key;
    },
    { beat, key },
    { timeout: 10_000 },
  );
}

test('Nhà âm nhạc → Ban nhạc thú; kéo bò vào ô 3, vòng lặp phát tiếng bò; chụp T-037-band.png', async ({ page }) => {
  const game = await openBand(page);

  // Có sẵn chó ở ô 1, vòng lặp chạy và phát tiếng chó ở nhịp 0
  expect(await page.evaluate(() => window.__behocBand!.slots())).toEqual(['dog', null, null, null]);
  await waitForBeatSay(page, 0, 'animal.dog-sound');

  await dragTo(page, 'tray-cow', 'slot-2');
  expect(await page.evaluate(() => window.__behocBand!.slots()[2])).toBe('cow');
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-animal', 'cow');

  // Đủ một vòng: nhịp 2 phát tiếng bò
  await waitForBeatSay(page, 2, 'animal.cow-sound');
  await expect(page.getByTestId('slot-2')).toHaveAttribute('data-active', '');

  // Thêm vài con cho ảnh duyệt
  await page.evaluate(() => window.__behocBand!.put(1, 'duck'));
  await waitForBeatSay(page, 1, 'animal.duck-sound');
  await expect(game).toHaveAttribute('data-beat', /[0-3]/);
  await page.screenshot({ path: 'test-results/shots/T-037-band.png' });
});

test('ô trống là nghỉ; sân khấu trống thì vòng lặp dừng', async ({ page }) => {
  const game = await openBand(page);
  await waitForBeatSay(page, 0, 'animal.dog-sound');
  // Nhịp 1 trống: last-say vẫn là tiếng chó
  await page.waitForFunction(() => document.querySelector('[data-testid="game-band"]')?.getAttribute('data-beat') === '1');
  await expect(game).toHaveAttribute('data-last-say', 'animal.dog-sound');

  // Chạm chó trên sân khấu → về khay → hết nhịp
  await page.getByLabel('Ô 1: dog').click();
  await expect(page.getByTestId('slot-0')).not.toHaveAttribute('data-animal');
  await expect(game).not.toHaveAttribute('data-beat');
  expect(await page.evaluate(() => window.__behocBand!.slots())).toEqual([null, null, null, null]);
});

test('chạm con vật ở khay thì nghe tiếng kêu; rùa/thỏ đổi tempo', async ({ page }) => {
  const game = await openBand(page);
  await page.getByTestId('tray-pig').click();
  await expect(game).toHaveAttribute('data-last-say', 'animal.pig-sound');
  expect(await page.evaluate(() => window.__behocBand!.slots())).toEqual(['dog', null, null, null]);

  await page.getByLabel('Chậm').click();
  await expect(game).toHaveAttribute('data-tempo', 'slow');
  await page.getByLabel('Nhanh').click();
  await expect(game).toHaveAttribute('data-tempo', 'fast');
  await page.getByLabel('Nhanh').click();
  await expect(game).toHaveAttribute('data-tempo', 'normal');
});

test('vùng chạm ≥120px', async ({ page }) => {
  await openBand(page);
  const ids = ['tray-cow', 'tray-chicken', 'tray-duck', 'tray-pig', 'tray-dog', 'tray-sheep'];
  for (const id of ids) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.width, id).toBeGreaterThanOrEqual(120);
    expect(box.height, id).toBeGreaterThanOrEqual(120);
  }
  for (const label of ['Chậm', 'Nhanh', 'Ô 1: dog']) {
    const box = (await page.getByLabel(label).boundingBox())!;
    expect(box.width, label).toBeGreaterThanOrEqual(120);
    expect(box.height, label).toBeGreaterThanOrEqual(120);
  }
  // Mọi nút (kể cả vùng Khu phụ huynh) cách nhau ≥24px
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
      expect(Math.max(gapX, gapY), `${a.name} ↔ ${b.name}`).toBeGreaterThanOrEqual(24);
    }
  }
});

test.describe('iPhone dọc: kéo con vật', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo gà vào ô 4', async ({ page }) => {
    await openBand(page);
    await dragTo(page, 'tray-chicken', 'slot-3');
    await expect(page.getByTestId('slot-3')).toHaveAttribute('data-animal', 'chicken');
    expect(await page.evaluate(() => window.__behocBand!.slots()[3])).toBe('chicken');
    await waitForBeatSay(page, 3, 'animal.chicken-sound');
    await page.screenshot({ path: 'test-results/shots/T-037-band-mobile.png' });
  });
});
