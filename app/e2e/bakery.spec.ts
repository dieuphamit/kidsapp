// E2E Tiệm bánh Đậu Đậu (T-040): trang trí bánh tự do, rung chuông cho khách ăn.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

declare global {
  interface Window {
    __behocBakery?: {
      toppings(): { id: string; x: number; y: number }[];
      add(id: string): void;
      serve(): void;
    };
  }
}

test.beforeAll(() => mkdirSync('test-results/shots', { recursive: true }));

async function openBakery(page: Page) {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await page.getByRole('button', { name: 'Nhà Đậu Đậu' }).tap();
  await pickGame(page, 'bakery');
  const game = page.getByTestId('game-bakery');
  await expect(game).toBeVisible({ timeout: 15_000 });
  // Đợi khách gọi bánh xong (các câu nói theo giờ không đè lên kết quả kéo)
  await expect(game).toHaveAttribute('data-last-say', 'bakery.order', { timeout: 10_000 });
  return game;
}

/** Kéo thật bằng chuột từ tâm phần tử `from` tới điểm (tx, ty) của màn hình. */
async function dragTo(page: Page, fromTestId: string, tx: number, ty: number) {
  const box = (await page.getByTestId(fromTestId).boundingBox())!;
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((tx - sx) * i) / steps, sy + ((ty - sy) * i) / steps);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
}

test('Nhà Đậu Đậu → Tiệm bánh: kéo dâu lên bánh, thêm nến, rung chuông → khen nến', async ({ page }) => {
  const game = await openBakery(page);

  // Chạm (không kéo) chỉ nói tên, không thêm lên bánh
  await page.getByTestId('shelf-kiwi').tap();
  await expect(game).toHaveAttribute('data-last-say', 'topping.kiwi');
  expect(await page.evaluate(() => window.__behocBakery!.toppings())).toHaveLength(0);

  // Kéo thật dâu tây lên bánh: dính đúng chỗ thả (trong khung bánh 400×330, viewport 1:1)
  const cake = (await page.getByTestId('cake').boundingBox())!;
  const dropX = cake.x + 150;
  const dropY = cake.y + 210;
  await dragTo(page, 'shelf-strawberry', dropX, dropY);
  await expect(game).toHaveAttribute('data-last-say', 'topping.strawberry');
  const list = await page.evaluate(() => window.__behocBakery!.toppings());
  expect(list).toHaveLength(1);
  expect(list[0].id).toBe('strawberry');
  expect(Math.abs(list[0].x - 150)).toBeLessThanOrEqual(2);
  expect(Math.abs(list[0].y - 210)).toBeLessThanOrEqual(2);
  await page.waitForTimeout(500); // chờ hiệu ứng "đáp xuống" xong rồi mới đo
  const placed = (await page.getByTestId('on-cake').first().boundingBox())!;
  expect(Math.abs(placed.x + placed.width / 2 - dropX)).toBeLessThanOrEqual(4);
  expect(Math.abs(placed.y + placed.height / 2 - dropY)).toBeLessThanOrEqual(4);

  // Dâu thứ 2: nói tên rồi 700ms sau đếm "2"
  await dragTo(page, 'shelf-strawberry', cake.x + 260, cake.y + 220);
  await expect(game).toHaveAttribute('data-last-say', 'topping.strawberry');
  await expect(game).toHaveAttribute('data-last-say', 'number.2', { timeout: 2000 });

  // Thả ngoài bánh: không thêm, không nói
  await dragTo(page, 'shelf-chocolate', 640, 120);
  await page.waitForTimeout(500);
  await expect(game).toHaveAttribute('data-last-say', 'number.2');
  expect(await page.evaluate(() => window.__behocBakery!.toppings())).toHaveLength(2);

  // Thêm nến và kiwi bằng hook
  await page.evaluate(() => {
    window.__behocBakery!.add('candle');
    window.__behocBakery!.add('kiwi');
  });
  await expect(page.getByTestId('on-cake')).toHaveCount(4);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/T-040-bakery.png' });

  // Rung chuông thật → khách khen có nến
  await page.getByRole('button', { name: 'Chuông' }).tap();
  await expect(game).toHaveAttribute('data-last-say', 'bakery.yum-candle');
  await expect(page.getByTestId('cake')).toHaveAttribute('data-eaten', '');
  await page.waitForTimeout(650); // khách đã tiến lại, bánh đang thu nhỏ
  await page.screenshot({ path: 'test-results/shots/T-040-served.png' });

  // 1.5s sau hỏi câu mở; rồi khách mới, bánh trống
  await expect(game).toHaveAttribute('data-last-say', 'bakery.ask', { timeout: 3000 });
  await expect(game).toHaveAttribute('data-last-say', /^animal\./, { timeout: 5000 });
  expect(await page.evaluate(() => window.__behocBakery!.toppings())).toHaveLength(0);
});

test('chạm topping trên bánh → bỏ ra; bánh trống rung chuông → nói lại bakery.order', async ({ page }) => {
  const game = await openBakery(page);
  await page.evaluate(() => window.__behocBakery!.add('chocolate'));
  await expect(page.getByTestId('on-cake')).toHaveCount(1);
  await page.getByTestId('on-cake').tap();
  await expect(page.getByTestId('on-cake')).toHaveCount(0);

  await page.evaluate(() => window.__behocBakery!.add('kiwi'));
  await page.getByTestId('on-cake').tap();
  await page.getByRole('button', { name: 'Chuông' }).tap();
  await expect(game).toHaveAttribute('data-last-say', 'bakery.order');
  await expect(page.getByTestId('cake')).not.toHaveAttribute('data-eaten', '');
});

test('vùng chạm kệ và chuông ≥120px, cách nhau ≥24px', async ({ page }) => {
  await openBakery(page);
  const ids = ['strawberry', 'cherries', 'blueberry', 'kiwi', 'candle', 'chocolate'];
  const boxes = [];
  for (const id of ids) {
    const b = (await page.getByTestId(`shelf-${id}`).boundingBox())!;
    expect(b.width, id).toBeGreaterThanOrEqual(120);
    expect(b.height, id).toBeGreaterThanOrEqual(120);
    boxes.push(b);
  }
  const bell = (await page.getByRole('button', { name: 'Chuông' }).boundingBox())!;
  expect(bell.width).toBeGreaterThanOrEqual(120);
  boxes.push(bell);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
      const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
      expect(Math.max(gapX, gapY), `${i}-${j}`).toBeGreaterThanOrEqual(24);
    }
  }
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo thật việt quất lên bánh khi khung bị xoay', async ({ page }) => {
    const game = await openBakery(page);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    const cake = (await page.getByTestId('cake').boundingBox())!;
    await dragTo(page, 'shelf-blueberry', cake.x + cake.width / 2, cake.y + cake.height / 2);
    await expect(game).toHaveAttribute('data-last-say', 'topping.blueberry');
    const list = await page.evaluate(() => window.__behocBakery!.toppings());
    expect(list).toHaveLength(1);
    // Tâm bánh trong khung 400×330 → khoảng (200, 165)
    expect(Math.abs(list[0].x - 200)).toBeLessThanOrEqual(6);
    expect(Math.abs(list[0].y - 165)).toBeLessThanOrEqual(6);
    await page.screenshot({ path: 'test-results/shots/T-040-mobile-drag.png' });
  });
});
