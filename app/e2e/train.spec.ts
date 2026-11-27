// E2E menu đoàn tàu (mặc định): tab khu, đoàn tàu chạy vào, mọi toa của mỗi khu nằm trọn trong khung (iPad và
// iPhone dọc, không cần kéo), mở trò, đổi kiểu menu trong khu bố mẹ (tàu → bản đồ → tàu).
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openParentArea } from './parent-gate.js';

test.beforeAll(() => mkdirSync('test-results/shots', { recursive: true }));

type Box = { x: number; y: number; width: number; height: number; name: string };

async function buttonBoxes(page: Page): Promise<Box[]> {
  return page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label') ?? e.textContent ?? '', x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
}

/** Mọi nút ≥120px (theo tỉ lệ khung), cách nhau ≥24px; nút nằm trong màn hình thì không tràn ra ngoài. */
function expectKidRules(boxes: Box[], scale = 1) {
  for (const b of boxes) {
    expect(b.width, `"${b.name}" rộng`).toBeGreaterThanOrEqual(120 * scale - 1);
    expect(b.height, `"${b.name}" cao`).toBeGreaterThanOrEqual(120 * scale - 1);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
      expect(Math.max(gapX, gapY), `khe "${a.name}" – "${b.name}"`).toBeGreaterThanOrEqual(24 * scale - 1);
    }
  }
}

const trainStill = (page: Page) => expect(page.getByTestId('train')).not.toHaveAttribute('data-moving', /.*/, { timeout: 5000 });
const scrollLeft = (page: Page) => page.getByTestId('train-viewport').evaluate((el) => el.scrollLeft);

test('mặc định là đoàn tàu: tab khu, toa có nút ▶, luật vùng chạm; chụp train-home', async ({ page }) => {
  await page.goto('./?e2e=1');
  const menu = page.getByTestId('train-menu');
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('home')).toHaveCount(0);
  await expect(page.getByTestId('shelf')).toHaveCount(0);
  await expect(menu).toHaveAttribute('data-last-say', 'ui.train-hello');
  await expect(menu.getByText('Tu tu! Lên tàu nào! Bé chọn toa nào?')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();

  // khu đầu tiên đang chọn; mỗi khu có trò là một tab
  await expect(page.getByRole('button', { name: 'Thế giới thú' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('[data-testid^="train-tab-"]').count()).toBeGreaterThanOrEqual(6);
  expect(await page.locator('[data-testid^="train-car-"]').count()).toBeGreaterThanOrEqual(4);
  await trainStill(page);

  const boxes = await buttonBoxes(page);
  expectKidRules(boxes);
  // tab nằm trọn khung, không đè cổng phụ huynh; nút ▶ của các toa đang thấy ở trên thanh tab
  const tabs = await page.locator('[data-testid^="train-tab-"] button').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  for (const t of tabs) {
    expect(t.left).toBeGreaterThanOrEqual(0);
    expect(t.right).toBeLessThanOrEqual(1194 + 1);
    expect(t.bottom).toBeLessThanOrEqual(834 + 1);
  }
  const tabTop = Math.min(...tabs.map((t) => t.top));
  const firstPlay = (await page.locator('[data-testid^="train-car-"] button').first().boundingBox())!;
  expect(firstPlay.y + firstPlay.height + 24).toBeLessThanOrEqual(tabTop);
  expect(firstPlay.y).toBeGreaterThan(144);
  await expect(page.locator('a[href^="http"]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/shots/train-home.png' });
});

test('đổi tab: nói tên khu, đoàn tàu mới chạy vào; chụp train-tab', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
  await trainStill(page);
  await page.getByRole('button', { name: 'Nhà âm nhạc' }).click();
  const menu = page.getByTestId('train-menu');
  await expect(menu).toHaveAttribute('data-place', 'place.music');
  await expect(menu).toHaveAttribute('data-last-say', 'place.music');
  await expect(page.getByRole('button', { name: 'Nhà âm nhạc' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Thế giới thú' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('train-car-music')).toBeVisible();
  // đang chạy vào: tàu lệch phải rồi dừng đúng chỗ
  await trainStill(page);
  const engine = (await page.getByTestId('train-engine').boundingBox())!;
  expect(engine.x).toBeLessThan(120);
  expectKidRules(await buttonBoxes(page));
  await page.screenshot({ path: 'test-results/shots/train-tab.png' });

  await page.getByRole('button', { name: 'Trang trại' }).click();
  await expect(menu).toHaveAttribute('data-place', 'place.farm');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/train-arriving.png' });
});

test('mọi toa nằm trọn trong khung, kéo không trôi; chạm ▶ toa cuối mở trò; về nhà thì lại thấy đoàn tàu khu đó; chụp train-drag', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
  await trainStill(page);
  const lastCar = page.locator('[data-testid^="train-car-"]').last();
  // toa cuối đã thấy trọn, không lấn dải cổng phụ huynh
  const car = (await lastCar.boundingBox())!;
  expect(car.x).toBeGreaterThanOrEqual(0);
  expect(car.x + car.width).toBeLessThanOrEqual(1194 - 144);

  // kéo ngang trên đoàn tàu (vùng tranh trong toa, không phải nút): tàu vừa khung nên không trôi; kéo không mở nhầm trò
  await page.mouse.move(900, 380);
  await page.mouse.down();
  for (let x = 900; x >= 200; x -= 50) await page.mouse.move(x, 385);
  await page.mouse.up();
  await page.waitForTimeout(600);
  expect(await scrollLeft(page)).toBe(0);
  await expect(page.getByTestId('train-menu')).toBeVisible();
  await expect(page.getByTestId('train-menu')).toHaveAttribute('data-last-say', 'ui.train-hello');
  await page.screenshot({ path: 'test-results/shots/train-drag.png' });

  await lastCar.getByRole('button').click();
  await expect(page.getByTestId('train-menu')).toHaveAttribute('data-last-say', /.+/);
  await expect(page.getByTestId('train-menu')).toBeHidden({ timeout: 10_000 });
  await expect(page.getByLabel('Về nhà')).toBeVisible({ timeout: 15_000 });
  await page.getByLabel('Về nhà').click();
  await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('train-menu')).toHaveAttribute('data-place', 'place.zoo');
});

const PLACE_IDS = ['zoo', 'house', 'orchard', 'pond', 'puzzle', 'music', 'farm'];

/** Vùng tàu không cần cuộn: đo bằng kích thước bố cục (trong khung), không phụ thuộc co giãn/xoay. */
const trainFits = (page: Page) =>
  page.getByTestId('train-viewport').evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, overflow: el.hasAttribute('data-overflow') }));

test('mỗi khu: mọi toa nằm trọn trong khung, tên trò không bị cắt; chụp train-<khu>', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
  await trainStill(page);
  expect(await page.locator('[data-testid^="train-tab-"]').count()).toBe(PLACE_IDS.length);
  for (const id of PLACE_IDS) {
    await page.getByTestId(`train-tab-${id}`).getByRole('button').click();
    await expect(page.getByTestId('train-menu')).toHaveAttribute('data-place', `place.${id}`);
    await trainStill(page);
    const v = await trainFits(page);
    expect(v.overflow, id).toBe(false);
    expect(v.sw, `${id}: tàu không cần kéo`).toBeLessThanOrEqual(v.cw);
    const cars = page.locator('[data-testid^="train-car-"]');
    const n = await cars.count();
    expect(n, id).toBeGreaterThanOrEqual(1);
    expect(n, id).toBeLessThanOrEqual(4);
    for (let i = 0; i < n; i++) {
      const b = (await cars.nth(i).boundingBox())!;
      expect(b.x, `${id} toa ${i}`).toBeGreaterThanOrEqual(0);
      // chừa 144px mép phải (cổng phụ huynh)
      expect(b.x + b.width, `${id} toa ${i}`).toBeLessThanOrEqual(1194 - 144);
      expect(b.y + b.height, `${id} toa ${i}`).toBeLessThanOrEqual(834);
      // tên trò không bị cắt: không tràn ngang, biển tên nằm trọn trong ô tranh, dưới icon
      const plate = await cars.nth(i).evaluate((el) => {
        const p = el.querySelector('[class*="plate"]') as HTMLElement;
        const w = p.parentElement as HTMLElement;
        return { sw: p.scrollWidth, cw: p.clientWidth, top: p.offsetTop, bottom: p.offsetTop + p.offsetHeight, win: w.clientHeight };
      });
      expect(plate.sw, `${id} toa ${i} tên trò tràn ngang`).toBeLessThanOrEqual(plate.cw);
      expect(plate.bottom, `${id} toa ${i} tên trò tràn dưới`).toBeLessThanOrEqual(plate.win);
      expect(plate.top, `${id} toa ${i} tên trò đè icon`).toBeGreaterThanOrEqual(60);
    }
    expect((await page.getByTestId('train-engine').boundingBox())!.x).toBeGreaterThanOrEqual(0);
    expectKidRules(await buttonBoxes(page));
    await page.screenshot({ path: `test-results/shots/train-${id}.png` });
  }
});

test('khu bố mẹ: chuyển về Bản đồ rồi về Đoàn tàu; chụp train-settings', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
  await openParentArea(page);
  const trainBtn = page.getByRole('button', { name: '🚂 Đoàn tàu / きしゃ' });
  const mapBtn = page.getByRole('button', { name: /Bản đồ/ });
  await expect(trainBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(mapBtn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: /Kệ đồ chơi/ })).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: 'test-results/shots/train-settings.png' });

  await mapBtn.click();
  await expect(mapBtn).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('train-menu')).toHaveCount(0);

  // đã lưu: tải lại vẫn là bản đồ
  await page.reload();
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await openParentArea(page);
  await expect(page.getByRole('button', { name: /Bản đồ/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Đoàn tàu/ }).click();
  await page.getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('home')).toHaveCount(0);
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('khung xoay ngang, tab và mọi toa của cả 7 khu trong màn hình, kéo không trôi; chụp train-portrait', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('train-menu')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await trainStill(page);

    const tabs = page.locator('[data-testid^="train-tab-"] button');
    const n = await tabs.count();
    const boxes: Box[] = [];
    for (let i = 0; i < n; i++) {
      const b = (await tabs.nth(i).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(431);
      expect(b.y + b.height).toBeLessThanOrEqual(933);
      boxes.push({ ...b, name: `tab ${i}` });
    }
    expect(n).toBe(PLACE_IDS.length);
    await page.screenshot({ path: 'test-results/shots/train-portrait.png' });

    // mỗi khu: mọi toa nằm trọn trong màn hình (khung đã xoay), vùng tàu không cần cuộn
    for (const id of PLACE_IDS) {
      await page.getByTestId(`train-tab-${id}`).getByRole('button').tap();
      await expect(page.getByTestId('train-menu')).toHaveAttribute('data-place', `place.${id}`);
      await trainStill(page);
      const v = await trainFits(page);
      expect(v.sw, `${id}: tàu không cần kéo`).toBeLessThanOrEqual(v.cw);
      const cars = page.locator('[data-testid^="train-car-"]');
      const m = await cars.count();
      for (let i = 0; i < m; i++) {
        const b = (await cars.nth(i).boundingBox())!;
        expect(b.x, `${id} toa ${i}`).toBeGreaterThanOrEqual(0);
        expect(b.y, `${id} toa ${i}`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${id} toa ${i}`).toBeLessThanOrEqual(431);
        expect(b.y + b.height, `${id} toa ${i}`).toBeLessThanOrEqual(933);
      }
    }
    await page.screenshot({ path: 'test-results/shots/train-portrait-farm.png' });

    // hướng "trái → phải" của khung trên màn hình (khung đã xoay): từ tab đầu tới tab cuối
    const a = boxes[0];
    const z = boxes[n - 1];
    const dx = z.x - a.x;
    const dy = z.y - a.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    // điểm giữa vùng tàu: lấy tâm đầu tàu rồi đi về phía phải khung
    const eng = (await page.getByTestId('train-engine').boundingBox())!;
    const sx = eng.x + eng.width / 2 + ux * 120;
    const sy = eng.y + eng.height / 2 + uy * 120;
    expect(await scrollLeft(page)).toBe(0);
    await page.mouse.move(sx + ux * 120, sy + uy * 120);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ux * (120 - k * 25), sy + uy * (120 - k * 25));
    await page.mouse.up();
    await page.waitForTimeout(600);
    // tàu vừa khung: kéo không trôi, không mở nhầm trò
    expect(await scrollLeft(page)).toBe(0);
    await expect(page.getByTestId('train-menu')).toBeVisible();
    await expect(page.getByTestId('train-menu')).toHaveAttribute('data-place', 'place.farm');
    await page.screenshot({ path: 'test-results/shots/train-portrait-drag.png' });
  });
});
