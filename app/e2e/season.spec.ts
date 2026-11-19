// E2E trang trí theo mùa (ép ngày bằng ?e2e=1&date=...) và bản in trong khu phụ huynh
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openParentArea } from './parent-gate.js';

mkdirSync('test-results/shots', { recursive: true });

/** Chạm vào giữa mỗi khu vẫn trúng nút khu (lớp trang trí không chặn chạm). */
async function expectPlacesTappable(page: Page) {
  const ids = await page.locator('[data-testid^="place-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
  expect(ids.length).toBeGreaterThan(3);
  for (const id of ids) {
    const btn = page.getByTestId(id).getByRole('button');
    const box = (await btn.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-testid^="place-"]')?.getAttribute('data-testid') ?? el?.outerHTML.slice(0, 80);
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(hit, id).toBe(id);
  }
}

const CASES = [
  { season: 'tet', date: '2027-02-06', shot: 'season-tet' },
  { season: 'trungthu', date: '2026-09-25', shot: 'season-trungthu' },
  { season: 'xmas', date: '2026-12-24', shot: 'season-xmas' },
] as const;

for (const c of CASES) {
  test(`ngày ${c.date}: trang trí ${c.season}, không chặn chạm`, async ({ page }) => {
    await page.goto(`./?e2e=1&date=${c.date}`);
    await expect(page.getByTestId('home')).toBeVisible();
    const layer = page.getByTestId('season-layer');
    await expect(layer).toHaveAttribute('data-season', c.season);
    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    await expectPlacesTappable(page);
    await page.waitForTimeout(800); // các khu nảy vào xong
    await page.screenshot({ path: `test-results/shots/${c.shot}.png` });
  });
}

test('ngày thường không trang trí; bố mẹ tắt thì hết trang trí', async ({ page }) => {
  await page.goto('./?e2e=1&date=2026-11-19');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('place-music')).toBeVisible();
  await expect(page.getByTestId('season-layer')).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/shots/season-none.png' });

  // Tết nhưng bố mẹ chọn Tắt
  await page.goto('./?e2e=1&date=2027-02-06');
  await expect(page.getByTestId('season-layer')).toHaveAttribute('data-season', 'tet');
  await openParentArea(page);
  // khu bố mẹ vẫn nằm trọn khung khi thêm mục mùa và bản in
  const card = (await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).locator('div').first().boundingBox())!;
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(1194);
  expect(card.y + card.height).toBeLessThanOrEqual(834);
  await page.screenshot({ path: 'test-results/shots/season-parent.png' });
  const group = page.getByRole('group', { name: 'Trang trí theo mùa' });
  await expect(group.getByRole('button', { name: /Tự động/ })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: /Tắt/ }).click();
  await expect(group.getByRole('button', { name: /Tắt/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByTestId('season-layer')).toHaveCount(0);
  // tải lại vẫn nhớ
  await page.reload();
  await expect(page.getByTestId('place-music')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('season-layer')).toHaveCount(0);
});

test('bản in: chọn tờ, in ra trang A4 nét đen', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await openParentArea(page);
  // không mở hộp thoại in thật: đếm số lần gọi
  await page.evaluate(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => { (window as unknown as { printed: number }).printed++; };
  });
  await page.getByRole('button', { name: '🖨️ Bản in' }).click();
  const picker = page.getByRole('dialog', { name: 'Bản in' });
  await expect(picker).toBeVisible();
  // thẻ chọn tờ đủ lớn và cách nhau, nằm trong khung
  const cards = picker.getByRole('group', { name: 'Chọn tờ in' }).getByRole('button');
  expect(await cards.count()).toBeGreaterThanOrEqual(6);
  for (const card of await cards.all()) {
    const box = (await card.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(120);
    expect(box.height).toBeGreaterThanOrEqual(120);
    expect(box.y + box.height).toBeLessThanOrEqual(834);
  }
  await expect(picker.getByRole('button', { name: 'Chọn tờ để in' })).toBeDisabled();
  await page.getByTestId('sheet-color-cat').click();
  await page.getByTestId('sheet-dots-star').click();
  await page.getByTestId('sheet-trace-lines').click();
  await expect(page.getByTestId('sheet-color-cat')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/shots/printables-picker.png' });

  await picker.getByRole('button', { name: /In 3 tờ/ }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);

  // Trên màn hình: trang in ẩn. Khi in: chỉ còn trang in, app ẩn.
  await expect(page.getByTestId('print-pages')).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('print-pages')).toBeVisible();
  await expect(page.locator('#root')).toBeHidden();
  const pages = page.getByTestId('print-page');
  await expect(pages).toHaveCount(3);
  const first = (await pages.first().boundingBox())!;
  // 186mm ≈ 703px (96dpi), không bị co giãn/xoay theo khung
  expect(first.width).toBeGreaterThan(690);
  expect(first.width).toBeLessThan(715);
  const stroke = await pages.first().locator('path').first().evaluate((el) => getComputedStyle(el).stroke);
  expect(stroke).toBe('rgb(0, 0, 0)');
  await page.screenshot({ path: 'test-results/shots/printables-sheet.png', fullPage: true });
  await page.emulateMedia({ media: 'screen' });
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });
  test('Giáng Sinh trên iPhone dọc: trang trí theo khung xoay', async ({ page }) => {
    await page.goto('./?e2e=1&date=2026-12-24');
    await expect(page.getByTestId('home')).toBeVisible();
    await expect(page.getByTestId('season-layer')).toHaveAttribute('data-season', 'xmas');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await expectPlacesTappable(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/shots/season-mobile.png' });
  });
});
