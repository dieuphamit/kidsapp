// E2E trò "Bếp nấu ăn" (cook): kéo nguyên liệu vào nồi, món lạ về chỗ, bật bếp, khuấy, kéo bát cho khách.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

type Snap = {
  index: number;
  phase: string;
  customer: string;
  dish: string;
  need: string[];
  counter: string[];
  added: string[];
  stirred: number;
  stirNeed: number;
};
declare global {
  interface Window {
    __behocCook?: {
      snapshot(): Snap | null;
      add(item: string): string;
      turnOn(): boolean;
      stir(amount: number): boolean;
      serve(): boolean;
    };
  }
}

/** level: easy (24 tháng, 2 nguyên liệu), medium (36: 3 + 1 món lạ), hard (54: 4 + 2 món lạ). */
async function openCook(page: Page, level: 'easy' | 'medium' | 'hard') {
  // Bảng chọn trò của nhà bạn đồng hành mở thẳng (trang 2D, không phụ thuộc bản đồ 3D)
  await page.goto(`./?e2e=1&picker=house&level=${level}`);
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('pick-cook').click();
  const game = page.getByTestId('game-cook');
  await expect(game).toBeVisible({ timeout: 15_000 });
  await expect(game).toHaveAttribute('data-last-say', 'cook.hello');
  return game;
}

async function snap(page: Page): Promise<Snap> {
  return (await page.evaluate(() => window.__behocCook!.snapshot()))!;
}

/** Chờ mọi ảnh tải xong để ảnh chụp đầy đủ. */
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="game-cook"] img')].every((i) => i.complete && i.naturalWidth > 0),
  );
}

async function center(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Kéo bằng chuột thật, nhiều bước (pointer events đi qua clientToStage). */
async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  }
  await page.mouse.up();
}

/** Chạm nút bếp bằng chuột thật (nút nhấp nháy liên tục nên không chờ "đứng yên"). */
async function tapStove(page: Page) {
  const b = (await page.getByRole('button', { name: 'stove' }).boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/** Thả nguyên liệu vào nồi rồi chờ nó nằm trong nồi. */
async function dropInPot(page: Page, item: string) {
  await expect(page.getByTestId(`item-${item}`)).toHaveAttribute('data-state', 'counter');
  await dragTo(page, await center(page, `item-${item}`), await center(page, 'pot'));
  await expect(page.getByTestId(`inpot-${item}`)).toBeVisible();
  await expect(page.getByTestId(`slot-${item}`)).toHaveAttribute('data-done', '');
}

test('Nhà → Bếp nấu ăn: khách thú, thẻ công thức 4 món, quầy 6 nguyên liệu (bé lớn); chụp cook-start', async ({ page }) => {
  const game = await openCook(page, 'hard');
  const s = await snap(page);
  expect(s.need).toHaveLength(4);
  expect(s.counter).toHaveLength(6);
  await expect(page.getByTestId('customer')).toHaveAttribute('data-customer', s.customer);
  await expect(page.getByTestId('recipe')).toHaveAttribute('data-dish', s.dish);
  await expect(page.locator('[data-item]')).toHaveCount(6);
  // sau câu chào thì Đậu Đậu nói món khách muốn
  await expect(game).toHaveAttribute('data-last-say', `cook.want.${s.dish}`, { timeout: 8000 });

  // vùng chạm ≥120px, cách nhau ≥24px; thứ ở phần trên tránh góc cổng bố mẹ
  const boxes = [];
  for (const it of s.counter) boxes.push((await page.getByTestId(`item-${it}`).boundingBox())!);
  boxes.sort((a, b) => a.x - b.x);
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i].width).toBeGreaterThanOrEqual(120);
    expect(boxes[i].x).toBeGreaterThanOrEqual(0);
    expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(1194);
    if (i) expect(boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width)).toBeGreaterThanOrEqual(24);
  }
  const stove = (await page.getByRole('button', { name: 'stove' }).boundingBox())!;
  expect(stove.width).toBeGreaterThanOrEqual(120);
  const card = (await page.getByTestId('recipe').boundingBox())!;
  expect(card.x + card.width).toBeLessThanOrEqual(1194 - 144);

  await imagesLoaded(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/shots/cook-start.png' });
});

test('kéo món lạ: lắc rồi về chỗ, không đổi gì; kéo đủ nguyên liệu → bật bếp → khuấy → kéo bát cho khách; chụp cook-adding, cook-ready, cook-stir, cook-served', async ({ page }) => {
  test.setTimeout(90_000);
  const game = await openCook(page, 'medium');
  await expect(game).toHaveAttribute('data-last-say', /^cook\.want\./, { timeout: 8000 });
  await imagesLoaded(page);
  const s = await snap(page);
  expect(s.need).toHaveLength(3);
  const odd = s.counter.find((x) => !s.need.includes(x))!;
  expect(odd).toBeTruthy();

  // Món lạ: không âm báo sai, món lắc nhẹ và bay về chỗ, nồi không đổi
  const home = (await page.getByTestId(`item-${odd}`).boundingBox())!;
  await dragTo(page, await center(page, `item-${odd}`), await center(page, 'pot'));
  await expect(game).toHaveAttribute('data-last-say', 'cook.nope');
  await expect(page.getByTestId(`item-${odd}`)).toHaveAttribute('data-state', 'return');
  await expect.poll(async () => (await page.getByTestId(`item-${odd}`).boundingBox())!.y, { timeout: 3000 }).toBeCloseTo(home.y, -1);
  expect((await snap(page)).added).toEqual([]);
  expect((await snap(page)).phase).toBe('gather');

  // Bấm bếp khi chưa đủ: nhắc nhẹ, vẫn gom nguyên liệu
  await tapStove(page);
  await expect(game).toHaveAttribute('data-last-say', 'cook.notyet');
  expect((await snap(page)).phase).toBe('gather');

  // Nguyên liệu đúng: rơi vào nồi (tõm), ô trên thẻ được đánh dấu, đọc tên
  await dropInPot(page, s.need[0]);
  await dropInPot(page, s.need[1]);
  expect((await snap(page)).added).toEqual(s.need.slice(0, 2));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/shots/cook-adding.png' });
  await dropInPot(page, s.need[2]);
  await expect(game).toHaveAttribute('data-phase', 'ready');
  await expect(game).toHaveAttribute('data-last-say', 'cook.ready', { timeout: 4000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/shots/cook-ready.png' });

  // Bật bếp: nồi sôi, vá hiện ra
  await tapStove(page);
  await expect(game).toHaveAttribute('data-phase', 'stir');
  await expect(game).toHaveAttribute('data-last-say', 'cook.stir', { timeout: 3000 });
  await expect(page.getByTestId('ladle')).toBeVisible();

  // Khuấy: kéo vá vòng vòng trong nồi
  const pot = (await page.getByTestId('pot').boundingBox())!;
  const cx = pot.x + pot.width / 2;
  const cy = pot.y + 50;
  const from = await center(page, 'ladle');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  let shot = false;
  for (let k = 0; k <= 120; k++) {
    const a = (k / 24) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(a) * 100, cy + Math.sin(a) * 34);
    if (!shot && k === 30) {
      await page.screenshot({ path: 'test-results/shots/cook-stir.png' });
      shot = true;
    }
    if ((await game.getAttribute('data-phase')) === 'bowl') break;
  }
  await page.mouse.up();
  await expect(game).toHaveAttribute('data-phase', 'bowl');
  await expect(page.getByTestId('bowl')).toBeVisible();
  await expect(game).toHaveAttribute('data-last-say', 'cook.cooked', { timeout: 3000 });

  // Thả bát ra chỗ trống: bát về chỗ, chưa phục vụ
  await page.waitForTimeout(800);
  await dragTo(page, await center(page, 'bowl'), { x: 120, y: 600 });
  await expect(game).toHaveAttribute('data-phase', 'bowl');

  // Kéo bát cho khách: khách ăn, vui, tim bay, cảm ơn
  await page.waitForTimeout(500);
  await dragTo(page, await center(page, 'bowl'), await center(page, 'customer'));
  await expect(game).toHaveAttribute('data-phase', 'served');
  await expect(page.getByTestId('happy')).toBeVisible({ timeout: 4000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/cook-served.png' });
  await expect(game).toHaveAttribute('data-last-say', 'cook.yum', { timeout: 4000 });

  // Khách kế với món khác
  await expect.poll(async () => (await snap(page)).index, { timeout: 8000 }).toBe(1);
  const next = await snap(page);
  expect(next.customer).not.toBe(s.customer);
  expect(next.dish).not.toBe(s.dish);
  expect(next.added).toEqual([]);
  await expect(game).toHaveAttribute('data-last-say', `cook.want.${next.dish}`);
});

test('bé nhỏ: 2 nguyên liệu, không món lạ; phục vụ đủ 3 khách → ăn mừng rồi chơi tiếp; chụp cook-party', async ({ page }) => {
  test.setTimeout(90_000);
  const game = await openCook(page, 'easy');
  for (let i = 0; i < 3; i++) {
    await expect.poll(async () => (await snap(page))?.index, { timeout: 10_000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'gather', { timeout: 10_000 });
    const s = await snap(page);
    expect(s.need).toHaveLength(2);
    expect(s.counter).toHaveLength(2);
    for (const it of s.need) await page.evaluate((x) => window.__behocCook!.add(x), it);
    expect(await page.evaluate(() => window.__behocCook!.turnOn())).toBe(true);
    expect(await page.evaluate(() => window.__behocCook!.stir(5000))).toBe(true);
    expect(await page.evaluate(() => window.__behocCook!.serve())).toBe(true);
  }
  await expect(game).toHaveAttribute('data-last-say', 'cook.done', { timeout: 12_000 });
  await expect(page.getByTestId('party')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/cook-party.png' });
  await expect(game).toHaveAttribute('data-phase', 'gather', { timeout: 8000 });
  expect((await snap(page)).index).toBe(0);
});

test.describe('iPhone dọc 430×932: kéo nguyên liệu vào nồi', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo trong khung xoay vẫn thả đúng vào nồi; chụp cook-mobile', async ({ page }) => {
    const game = await openCook(page, 'medium');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await imagesLoaded(page);
    await page.waitForTimeout(800);
    const s = await snap(page);
    await dragTo(page, await center(page, `item-${s.need[0]}`), await center(page, 'pot'));
    await expect(page.getByTestId(`slot-${s.need[0]}`)).toHaveAttribute('data-done', '');
    expect((await snap(page)).added).toEqual([s.need[0]]);
    await expect(game).toHaveAttribute('data-phase', 'gather');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/shots/cook-mobile.png' });
  });
});
