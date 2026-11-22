// Tắm cho thú: bùn trên ảnh thật, chà mất bùn đúng chỗ ngón tay, vòi sen, lắc mình, sạch bong.
import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

test.beforeAll(() => mkdirSync('test-results/shots', { recursive: true }));

type Hook = { dirtyCells(): [number, number][]; brush: number };

/** Ghi tuổi vào idb-keyval trước khi vào app (mẫu: tour.spec.ts). */
async function setAge(page: Page, ageMonths: number) {
  await page.goto('./?menu=map&e2e=1');
  await page.evaluate(async (age) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put({ lang: 'vi', ageMonths: age, sessionMinutes: 15 }, 'behoc.settings');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, ageMonths);
}

async function openBath(page: Page, animal = 'pig') {
  await page.goto(`./?menu=map&e2e=1&bath=${animal}`);
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('Hồ nước', { exact: true }).click();
  await pickGame(page, 'bath');
  const tub = page.getByTestId('bath-tub');
  await expect(tub).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
  await expect(tub).toHaveAttribute('data-animal', animal);
  return tub;
}

/** Điểm trên màn hình ứng với (fx, fy) trong canvas; khung Stage có thể bị xoay 90° (điện thoại dọc). */
async function screenPoint(page: Page, canvas: Locator, fx: number, fy: number) {
  const rotated = (await page.getByTestId('stage').getAttribute('data-rotated')) === 'true';
  const b = (await canvas.boundingBox())!;
  return rotated
    ? { x: b.x + b.width * (1 - fy), y: b.y + b.height * fx }
    : { x: b.x + b.width * fx, y: b.y + b.height * fy };
}

/** Alpha lớp bùn tại (fx, fy) của canvas (đọc pixel nội bộ). */
function mudAlpha(mud: Locator, fx: number, fy: number) {
  return mud.evaluate(
    (c: HTMLCanvasElement, p) => c.getContext('2d')!.getImageData(Math.floor(p.fx * c.width), Math.floor(p.fy * c.height), 1, 1).data[3],
    { fx, fy },
  );
}

/** Chà ngoằn ngoèo khắp khung thú (hàng cách nhau `gap`); dừng sớm khi trò đổi bước (đủ sạch / lau khô). */
async function scrubAll(page: Page, canvas: Locator, gap = 0.07, from = 0.06, to = 0.96) {
  const tub = page.getByTestId('bath-tub');
  const phase = await tub.getAttribute('data-phase');
  for (let fy = from; fy <= to; fy += gap) {
    if ((await tub.getAttribute('data-phase')) !== phase) break;
    const a = await screenPoint(page, canvas, 0.04, fy);
    const b = await screenPoint(page, canvas, 0.96, fy);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 14 });
    await page.mouse.up();
  }
}

test('bé nhỏ: bùn trên ảnh thật → chà nổi bọt → vòi sen → lắc mình, kêu, sạch bong → con tiếp theo', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tub = await openBath(page, 'pig');
  const game = page.getByTestId('game-bath');
  await expect(game).toHaveAttribute('data-last-say', 'bath.dirty.pig');
  await expect(tub).toHaveAttribute('data-phase', 'scrub');
  const mud = page.getByTestId('bath-mud');
  const canvas = page.getByTestId('bath-canvas');

  // ảnh thật đã nạp, có bùn phủ lên
  expect(await page.locator('[data-testid=bath-tub] img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThanOrEqual(1000);
  const cells = await page.evaluate(() => (window as unknown as { __behocBath: Hook }).__behocBath.dirtyCells());
  expect(cells.length).toBeGreaterThan(40);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/shots/bath-dirty.png' });

  // chà một nét qua vệt bùn: bùn mất, bọt nổi lên
  const [fx, fy] = cells[Math.floor(cells.length / 2)];
  expect(await mudAlpha(mud, fx, fy)).toBeGreaterThan(0);
  const p = await screenPoint(page, canvas, fx - 0.08, fy);
  const q = await screenPoint(page, canvas, fx + 0.08, fy);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 8 });
  // chụp lúc đang chà: miếng bọt biển dưới ngón tay
  await page.screenshot({ path: 'test-results/shots/bath-scrubbing.png' });
  await page.mouse.up();
  expect(await mudAlpha(mud, fx, fy)).toBe(0);
  expect(Number(await tub.getAttribute('data-clean'))).toBeGreaterThan(0);
  const foam = await canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 16) if (d[i] > 0) n++;
    return n;
  });
  expect(foam, 'có bọt xà phòng').toBeGreaterThan(20);

  // chà khắp nơi tới khi đủ sạch: vòi sen hiện ra
  await scrubAll(page, canvas);
  await expect(tub).toHaveAttribute('data-phase', 'rinse', { timeout: 5000 });
  await expect(game).toHaveAttribute('data-last-say', 'bath.shower');
  const shower = page.getByRole('button', { name: 'Vòi sen' });
  await expect(shower).toBeVisible();
  await page.waitForTimeout(700); // chờ hiệu ứng nảy ra xong
  const sb = (await shower.boundingBox())!;
  expect(sb.width).toBeGreaterThanOrEqual(120);
  expect(1194 - (sb.x + sb.width), 'cách cổng phụ huynh').toBeGreaterThanOrEqual(144);
  await page.screenshot({ path: 'test-results/shots/bath-rinse.png' });

  // bấm vòi sen: nước rơi, thú lắc mình và kêu tiếng thật, rồi sạch bong
  await shower.click();
  await expect(tub).toHaveAttribute('data-phase', 'shower');
  await expect(page.getByTestId('bath-water')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/bath-shower.png' });
  await expect(game).toHaveAttribute('data-last-say', 'animal.pig-sound', { timeout: 4000 });
  await expect(game).toHaveAttribute('data-last-say', 'bath.clean.pig', { timeout: 4000 });
  await expect(tub).toHaveAttribute('data-phase', 'done');
  await expect(page.getByTestId('bath-sparkles')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/bath-clean.png' });
  // không còn chút bùn nào
  expect(await mudAlpha(mud, fx, fy)).toBe(0);

  // sang con tiếp theo
  await expect(game).toHaveAttribute('data-round', '1', { timeout: 8000 });
  const next = await page.getByTestId('bath-tub').getAttribute('data-animal');
  expect(next).not.toBe('pig');
  await expect(game).toHaveAttribute('data-last-say', `bath.dirty.${next}`);
  expect(errors).toEqual([]);
});

test('bé lớn: sau vòi sen thì lau khăn cho khô rồi mới sạch bong', async ({ page }) => {
  test.setTimeout(90_000);
  await setAge(page, 60);
  const tub = await openBath(page, 'sheep');
  const canvas = page.getByTestId('bath-canvas');
  await scrubAll(page, canvas, 0.05);
  await expect(tub).toHaveAttribute('data-phase', 'rinse', { timeout: 5000 });
  await page.getByRole('button', { name: 'Vòi sen' }).click();
  await expect(tub).toHaveAttribute('data-phase', 'towel', { timeout: 6000 });
  await expect(page.getByTestId('game-bath')).toHaveAttribute('data-last-say', 'bath.towel');
  await expect(tub).toHaveAttribute('data-clean', '0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/shots/bath-towel.png' });
  await scrubAll(page, canvas, 0.05);
  await expect(tub).toHaveAttribute('data-phase', 'done', { timeout: 5000 });
  await expect(page.getByTestId('game-bath')).toHaveAttribute('data-last-say', 'bath.clean.sheep');
});

test.describe('iPhone dọc 430×932: khung xoay, bùn mất đúng chỗ chà', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('chà một chỗ: bùn ở đó mất, vệt bùn xa vẫn còn', async ({ page }) => {
    const tub = await openBath(page, 'cow');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    const mud = page.getByTestId('bath-mud');
    const canvas = page.getByTestId('bath-canvas');
    const hook = await page.evaluate(() => {
      const h = (window as unknown as { __behocBath: Hook }).__behocBath;
      return { cells: h.dirtyCells(), brush: h.brush };
    });
    const [ax, ay] = hook.cells[0];
    // ô bùn xa chỗ chà nhất
    const far = hook.cells.reduce((best, c) => (Math.hypot(c[0] - ax, c[1] - ay) > Math.hypot(best[0] - ax, best[1] - ay) ? c : best));
    expect(Math.hypot(far[0] - ax, far[1] - ay)).toBeGreaterThan(hook.brush * 2);
    expect(await mudAlpha(mud, ax, ay)).toBeGreaterThan(0);
    expect(await mudAlpha(mud, far[0], far[1])).toBeGreaterThan(0);

    const a = await screenPoint(page, canvas, ax, ay);
    const b = await screenPoint(page, canvas, ax + 0.01, ay + 0.01);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 3 });
    await page.mouse.up();
    await page.screenshot({ path: 'test-results/shots/bath-mobile-portrait.png' });

    expect(await mudAlpha(mud, ax, ay), 'bùn dưới ngón tay đã mất').toBe(0);
    expect(await mudAlpha(mud, far[0], far[1]), 'bùn ở xa vẫn còn').toBeGreaterThan(0);
    expect(Number(await tub.getAttribute('data-clean'))).toBeGreaterThan(0);
  });
});
