// E2E trò "Cửa hàng" (shop): kéo món từ kệ vào giỏ, món lạ về kệ, giỏ ra quầy, bấm máy tính tiền, khách cầm túi ra về.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

type Snap = {
  index: number;
  count: number;
  phase: string;
  customer: string;
  need: { item: string; qty: number }[];
  shelf: string[];
  basket: string[];
  scanned: number;
};
declare global {
  interface Window {
    __behocShop?: {
      snapshot(): Snap | null;
      add(item: string): string;
      pay(): boolean;
    };
  }
}

/** level: easy (24 tháng: 1–2 món, kệ 4), medium (36: 3 món, kệ 6), hard (54: có số lượng, kệ 8). */
async function openShop(page: Page, level: 'easy' | 'medium' | 'hard') {
  await page.goto(`./?e2e=1&picker=orchard&level=${level}`);
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('pick-shop').click();
  const game = page.getByTestId('game-shop');
  await expect(game).toBeVisible({ timeout: 15_000 });
  await expect(game).toHaveAttribute('data-last-say', 'shop.hello');
  return game;
}

async function snap(page: Page): Promise<Snap> {
  return (await page.evaluate(() => window.__behocShop!.snapshot()))!;
}

/** Chờ mọi ảnh tải xong để ảnh chụp đầy đủ. */
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="game-shop"] img')].every((i) => i.complete && i.naturalWidth > 0),
  );
}

async function center(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Kéo bằng chuột thật, nhiều bước (pointer events đi qua clientToStage). */
async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, onMid?: () => Promise<void>) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    if (i === 7) await onMid?.();
  }
  await page.mouse.up();
}

/** Chạm máy tính tiền bằng chuột thật (nút nhấp nháy liên tục nên không chờ "đứng yên"). */
async function tapRegister(page: Page) {
  const b = (await page.getByRole('button', { name: 'register' }).boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/** Kéo một cái `item` từ kệ vào giỏ rồi chờ giỏ có thêm một món. */
async function dropInBasket(page: Page, item: string) {
  const before = (await snap(page)).basket.length;
  await expect(page.getByTestId(`item-${item}`)).toHaveAttribute('data-state', 'shelf');
  await page.waitForTimeout(500); // chờ món đứng yên trên kệ
  await dragTo(page, await center(page, `item-${item}`), await center(page, 'basket'));
  await expect(page.getByTestId('basket')).toHaveAttribute('data-count', String(before + 1));
}

test('Vườn quả → Cửa hàng: khách vào, bong bóng 3 hình, kệ 6 món; vùng chạm đủ to, tránh góc bố mẹ; chụp shop-enter', async ({ page }) => {
  const game = await openShop(page, 'medium');
  const s = await snap(page);
  expect(s.count).toBe(4);
  expect(s.need).toHaveLength(3);
  expect(s.shelf).toHaveLength(6);
  await expect(page.getByTestId('customer')).toHaveAttribute('data-customer', s.customer);
  await expect(page.locator('[data-testid^="item-"]')).toHaveCount(6);
  await expect(page.locator('[data-testid^="want-"]')).toHaveCount(3);
  // sau câu chào thì đọc danh sách: "Bạn muốn mua…" rồi tên từng món
  await expect(game).toHaveAttribute('data-last-say', 'shop.want', { timeout: 8000 });
  await expect(game).toHaveAttribute('data-last-say', /^(fruit|feed\.food|cook\.food|words)\./, { timeout: 5000 });

  await page.waitForTimeout(1200);
  const boxes = [];
  for (const it of s.shelf) boxes.push((await page.getByTestId(`item-${it}`).boundingBox())!);
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    expect(a.width).toBeGreaterThanOrEqual(120);
    expect(a.height).toBeGreaterThanOrEqual(120);
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      const gapX = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
      const gapY = Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height);
      expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(24);
    }
  }
  const register = (await page.getByRole('button', { name: 'register' }).boundingBox())!;
  expect(register.width).toBeGreaterThanOrEqual(120);
  const wish = (await page.getByTestId('wish').boundingBox())!;
  expect(wish.x + wish.width).toBeLessThanOrEqual(1194 - 144);
  const customer = (await page.getByTestId('customer').boundingBox())!;
  expect(customer.y).toBeGreaterThanOrEqual(120);
  expect(customer.x + customer.width).toBeLessThanOrEqual(1194);

  // chạm khách: nhún và kêu tiếng thật ngay
  await page.getByTestId('customer').dispatchEvent('pointerdown');
  await expect(game).toHaveAttribute('data-last-say', `animal.${s.customer}-sound`);

  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/shop-enter.png' });
});

test('món lạ nhẹ nhàng về kệ; kéo đủ món → giỏ ra quầy → bấm máy: bíp và đếm 1, 2, 3 → khách nhận túi, khách kế vào; chụp shop-drag, shop-middle, shop-checkout, shop-scan, shop-happy', async ({ page }) => {
  test.setTimeout(120_000);
  const game = await openShop(page, 'medium');
  await imagesLoaded(page);
  await page.waitForTimeout(1200);
  const s = await snap(page);
  const need = s.need.map((w) => w.item);
  const odd = s.shelf.find((x) => !need.includes(x))!;
  expect(odd).toBeTruthy();

  // Món lạ: không âm báo sai, món lướt về kệ, giỏ không đổi, món cần lấy nhấp nháy
  const home = (await page.getByTestId(`item-${odd}`).boundingBox())!;
  await dragTo(page, await center(page, `item-${odd}`), await center(page, 'basket'), async () => {
    await page.screenshot({ path: 'test-results/shots/shop-drag.png' });
  });
  await expect(game).toHaveAttribute('data-last-say', 'shop.nope');
  await expect.poll(async () => (await page.getByTestId(`item-${odd}`).boundingBox())!.y, { timeout: 3000 }).toBeCloseTo(home.y, -1);
  expect((await snap(page)).basket).toEqual([]);
  await expect(page.getByTestId(`item-${need[0]}`)).toHaveAttribute('data-hint', '');
  await expect(page.getByTestId(`want-${need[0]}-0`)).toHaveAttribute('data-hint', '');

  // Bấm máy khi chưa đủ: nhắc nhẹ, vẫn gom hàng
  await tapRegister(page);
  await expect(game).toHaveAttribute('data-last-say', 'shop.notyet');
  expect((await snap(page)).phase).toBe('shop');

  // Thả ra ngoài giỏ: món về kệ, không nói gì thêm
  await page.waitForTimeout(600);
  await dragTo(page, await center(page, `item-${need[0]}`), { x: 500, y: 520 });
  expect((await snap(page)).basket).toEqual([]);
  await expect(game).toHaveAttribute('data-last-say', 'shop.notyet');

  // Món đúng: rơi vào giỏ, hình trong bong bóng được đánh dấu, khen đúng món, khách vui dần
  await dropInBasket(page, need[0]);
  await expect(game).toHaveAttribute('data-last-say', `shop.got.${need[0]}`);
  await expect(page.getByTestId(`want-${need[0]}-0`)).toHaveAttribute('data-done', '');
  await expect(page.getByTestId(`item-${need[0]}`)).toHaveCount(0);
  await expect(page.getByTestId('customer')).toHaveAttribute('data-mood', '1');
  await dropInBasket(page, need[1]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/shop-middle.png' });

  // Món cuối: giỏ trượt tới quầy, nhắc bấm máy
  await dropInBasket(page, need[2]);
  await expect(game).toHaveAttribute('data-phase', 'checkout');
  await expect(page.getByTestId('basket')).toHaveAttribute('data-place', 'desk');
  await expect(game).toHaveAttribute('data-last-say', 'shop.pay', { timeout: 4000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/shop-checkout.png' });

  // Bấm máy tính tiền: từng món bíp, đếm 1, 2, 3
  await tapRegister(page);
  await expect(game).toHaveAttribute('data-phase', 'scan');
  await expect(game).toHaveAttribute('data-last-say', 'number.1');
  await expect(game).toHaveAttribute('data-last-say', 'number.2', { timeout: 3000 });
  await expect(page.getByTestId('screen')).toHaveText('2');
  await page.screenshot({ path: 'test-results/shots/shop-scan.png' });
  await expect(game).toHaveAttribute('data-last-say', 'number.3', { timeout: 3000 });
  await expect(game).toHaveAttribute('data-phase', 'paid');

  // Khách vui: nhận túi, kêu tiếng của mình, tim bay, rồi được cảm ơn
  await expect(page.getByTestId('bag')).toHaveAttribute('data-state', 'given', { timeout: 4000 });
  await expect(page.getByTestId('happy')).toBeVisible({ timeout: 4000 });
  await expect(game).toHaveAttribute('data-last-say', `animal.${s.customer}-sound`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/shop-happy.png' });
  await expect(game).toHaveAttribute('data-last-say', 'shop.thanks', { timeout: 4000 });

  // Khách kế, danh sách khác
  await expect.poll(async () => (await snap(page)).index, { timeout: 8000 }).toBe(1);
  const next = await snap(page);
  expect(next.customer).not.toBe(s.customer);
  expect(next.basket).toEqual([]);
  for (const w of next.need) expect(need).not.toContain(w.item);
  await expect(page.getByTestId('basket')).toHaveAttribute('data-place', 'shop');
});

test('bé lớn: danh sách có số lượng, bong bóng đúng số hình, kệ 8 ô mỗi ô 3 cái; lấy thừa thì món về kệ; đủ 5 khách thì ăn mừng; chụp shop-hard, shop-party-hard', async ({ page }) => {
  test.setTimeout(180_000);
  const game = await openShop(page, 'hard');
  await imagesLoaded(page);
  await page.waitForTimeout(1200);
  const s = await snap(page);
  expect(s.count).toBe(5);
  expect(s.shelf).toHaveLength(8);
  const total = s.need.reduce((a, w) => a + w.qty, 0);
  expect(total).toBeLessThanOrEqual(6);
  expect(s.need.some((w) => w.qty >= 2)).toBe(true);
  await expect(page.locator('[data-testid^="want-"]')).toHaveCount(total);
  for (const w of s.need) await expect(page.locator(`[data-testid^="want-${w.item}-"]`)).toHaveCount(w.qty);
  await expect(page.locator('[data-testid^="item-"]')).toHaveCount(8);
  // bong bóng và các hình nằm trọn trong khung, tránh góc bố mẹ
  const wish = (await page.getByTestId('wish').boundingBox())!;
  for (const el of await page.locator('[data-testid^="want-"]').all()) {
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(wish.x);
    expect(b.x + b.width).toBeLessThanOrEqual(wish.x + wish.width);
    expect(b.y).toBeGreaterThanOrEqual(wish.y);
    expect(b.y + b.height).toBeLessThanOrEqual(wish.y + wish.height);
  }

  // Lấy đủ số lượng món đầu bằng kéo thật: ô kệ vơi dần, hình trong bong bóng được đánh dấu lần lượt
  const many = s.need.find((w) => w.qty >= 2)!;
  for (let k = 0; k < many.qty; k++) {
    await expect(page.getByTestId(`item-${many.item}`)).toHaveAttribute('data-stock', String(3 - k));
    await dropInBasket(page, many.item);
    await expect(page.getByTestId(`want-${many.item}-${k}`)).toHaveAttribute('data-done', '');
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/shop-hard.png' });

  // Lấy thừa: món về kệ, lời nhắc dịu, giỏ không đổi
  if (many.qty < 3 && s.need.length > 1) {
    await page.waitForTimeout(400);
    await dragTo(page, await center(page, `item-${many.item}`), await center(page, 'basket'));
    await expect(game).toHaveAttribute('data-last-say', 'shop.enough');
    expect((await snap(page)).basket).toHaveLength(many.qty);
  }

  // Lấy nốt các món còn lại, tính tiền: đếm tới đúng tổng số
  for (const w of s.need.filter((x) => x.item !== many.item)) {
    for (let k = 0; k < w.qty; k++) await page.evaluate((x) => window.__behocShop!.add(x), w.item);
  }
  await expect(game).toHaveAttribute('data-phase', 'checkout');
  await tapRegister(page);
  await expect(game).toHaveAttribute('data-last-say', `number.${total}`, { timeout: 10_000 });
  await expect(game).toHaveAttribute('data-phase', 'paid');

  // Phục vụ nốt 4 khách còn lại: màn ăn mừng có đủ 5 khách đứng hàng; chụp shop-party-hard
  for (let i = 1; i < 5; i++) {
    await expect.poll(async () => (await snap(page))?.index, { timeout: 12_000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'shop', { timeout: 10_000 });
    const t = await snap(page);
    for (const w of t.need) for (let k = 0; k < w.qty; k++) await page.evaluate((x) => window.__behocShop!.add(x), w.item);
    expect(await page.evaluate(() => window.__behocShop!.pay())).toBe(true);
    await expect(game).toHaveAttribute('data-phase', 'paid', { timeout: 10_000 });
  }
  await expect(page.getByTestId('party')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('[data-testid^="guest-"]')).toHaveCount(5);
  await imagesLoaded(page);
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/shots/shop-party-hard.png' });
});

test('bé nhỏ: 1–2 món, kệ 4 ô; phục vụ đủ 3 khách → ăn mừng, bấm nút chơi lại → lượt mới; chụp shop-easy, shop-party', async ({ page }) => {
  test.setTimeout(120_000);
  const game = await openShop(page, 'easy');
  await imagesLoaded(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/shots/shop-easy.png' });
  const customers: string[] = [];
  for (let i = 0; i < 3; i++) {
    await expect.poll(async () => (await snap(page))?.index, { timeout: 12_000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'shop', { timeout: 10_000 });
    const s = await snap(page);
    customers.push(s.customer);
    expect(s.need).toHaveLength(i === 0 ? 1 : 2);
    expect(s.shelf).toHaveLength(4);
    for (const w of s.need) await page.evaluate((x) => window.__behocShop!.add(x), w.item);
    expect(await page.evaluate(() => window.__behocShop!.pay())).toBe(true);
    await expect(game).toHaveAttribute('data-phase', 'paid', { timeout: 6000 });
  }
  expect(new Set(customers).size).toBe(3);
  await expect(game).toHaveAttribute('data-last-say', 'shop.done', { timeout: 12_000 });
  await expect(page.getByTestId('party')).toBeVisible();
  const replay = page.getByRole('button', { name: 'replay' });
  await expect(replay).toBeVisible();
  const box = (await replay.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(120);
  // các khách vừa phục vụ đứng thành hàng trên sàn cùng Đậu Đậu; nút chơi lại không đè ai
  await expect(page.locator('[data-testid^="guest-"]')).toHaveCount(3);
  const cast = [...(await page.locator('[data-testid^="guest-"]').all()), page.getByTestId('party-buddy')];
  for (const el of cast) {
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(1194);
    expect(b.y + b.height).toBeLessThanOrEqual(box.y);
  }
  // chạm một khách: con đó kêu tiếng của mình
  await page.getByTestId('guest-1').dispatchEvent('pointerdown');
  await expect(game).toHaveAttribute('data-last-say', `animal.${customers[1]}-sound`);
  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/shop-party.png' });

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(game).toHaveAttribute('data-phase', 'shop');
  const again = await snap(page);
  expect(again.index).toBe(0);
  // lượt mới không lặp khách của lượt vừa rồi
  expect(customers).not.toContain(again.customer);
});

test.describe('iPhone dọc 430×932: kéo món vào giỏ', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo trong khung xoay vẫn thả đúng vào giỏ; chụp shop-mobile', async ({ page }) => {
    const game = await openShop(page, 'medium');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await imagesLoaded(page);
    await page.waitForTimeout(1200);
    const s = await snap(page);
    const item = s.need[0].item;
    await dragTo(page, await center(page, `item-${item}`), await center(page, 'basket'));
    await expect(page.getByTestId(`want-${item}-0`)).toHaveAttribute('data-done', '');
    expect((await snap(page)).basket).toEqual([item]);
    await expect(game).toHaveAttribute('data-phase', 'shop');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/shots/shop-mobile.png' });
  });
});
