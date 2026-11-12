// E2E màn chọn trò của khu và nút chơi lại (T-034)
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

type Box = { x: number; y: number; width: number; height: number };
function overlap(a: Box, b: Box, gap = 0): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

const ZOO_GAMES = ['animals', 'zoo3d', 'sound-quiz', 'shadow', 'peekaboo'];

test('Thế giới thú → 5 thẻ trò 180×228 một hàng, bong bóng tên khu, Đậu Đậu hỏi; chụp T-034-picker', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Thế giới thú')).toBeVisible();
  await page.getByLabel('Thế giới thú').click();

  const picker = page.getByTestId('game-picker');
  await expect(picker).toBeVisible({ timeout: 2000 });
  await expect(picker).toHaveAttribute('data-last-say', 'ui.pick-game');
  await expect(page.getByRole('heading', { name: /Thế giới thú/ })).toBeVisible();
  await expect(picker.getByText('Bé chơi trò nào?')).toBeVisible();

  const cards = page.locator('[data-testid^="pick-"]');
  await expect(cards).toHaveCount(5);
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('pick-'.length)));
  expect(ids).toEqual(ZOO_GAMES);

  await page.waitForTimeout(800); // chờ hiệu ứng hiện thẻ
  const boxes: Box[] = [];
  for (const id of ZOO_GAMES) {
    const box = (await page.getByTestId(`pick-${id}`).getByRole('button').boundingBox())!;
    expect(box.width, id).toBeCloseTo(180, 0);
    expect(box.height, id).toBeCloseTo(228, 0);
    boxes.push(box);
  }
  // một hàng, khe ≥24px, căn giữa khung
  for (const b of boxes) expect(b.y).toBeCloseTo(boxes[0].y, 0);
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width)).toBeGreaterThanOrEqual(24);
  }
  const mid = (boxes[0].x + boxes[4].x + boxes[4].width) / 2;
  expect(Math.abs(mid - 1194 / 2)).toBeLessThan(2);

  // không đè nút Về nhà, cổng phụ huynh, Đậu Đậu
  const back = (await page.getByLabel('Đậu Đậu').boundingBox())!;
  const gate = (await page.getByLabel('Khu phụ huynh').boundingBox())!;
  const mascot = (await picker.locator('img').boundingBox())!;
  expect(mascot.width).toBeCloseTo(168, 0);
  for (const b of boxes) {
    expect(overlap(b, back, 24)).toBe(false);
    expect(overlap(b, gate, 24)).toBe(false);
    expect(overlap(b, mascot)).toBe(false);
  }

  await page.screenshot({ path: 'test-results/shots/T-034-picker.png' });
});

test('móc e2e ?picker=zoo mở màn chọn trò; nút quay lại về bản đồ', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('[data-testid^="pick-"]')).toHaveCount(5);
  await page.getByLabel('Đậu Đậu').click();
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 2000 });
  await expect(page.getByTestId('game-picker')).toHaveCount(0);
});

test('chạm thẻ nói tên trò ngay rồi vào trò', async ({ page }) => {
  await page.goto('./?e2e=1&picker=puzzle');
  const picker = page.getByTestId('game-picker');
  await expect(picker).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(600); // chờ hiệu ứng hiện thẻ
  // Màn đổi sau 300ms, nên ghi lại câu nói đầu tiên sau khi chạm ngay trong trang
  await page.evaluate(() => {
    const w = window as unknown as { said: string[] };
    w.said = [];
    const el = document.querySelector('[data-testid="game-picker"]')!;
    new MutationObserver(() => w.said.push(el.getAttribute('data-last-say') ?? '')).observe(el, {
      attributes: true,
      attributeFilter: ['data-last-say'],
    });
  });
  await page.getByTestId('pick-memory').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { said: string[] }).said)).toEqual(['game.memory']);
  await expect(page.getByTestId('game-memory')).toBeVisible({ timeout: 10_000 });
});

test('vào một trò, về nhà → nút chơi lại hiện icon trò, chạm vào thẳng trò; chụp T-034-replay', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('replay')).toHaveCount(0);

  // Góc đố → Lật hình
  await page.getByLabel('Góc đố').click();
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 2000 });
  await page.getByTestId('pick-memory').getByRole('button').click();
  await expect(page.getByTestId('game-memory')).toBeVisible({ timeout: 10_000 });

  // Về nhà
  await page.getByLabel('Về nhà').click();
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 5000 });

  const replay = page.getByTestId('replay');
  await expect(replay).toBeVisible();
  await expect(replay).toHaveAttribute('data-game', 'memory');
  await expect(replay).toHaveText(/🃏/);
  await page.waitForTimeout(800);

  // tròn 132px, ngay bên phải Đậu Đậu, không đè các khu và cổng phụ huynh
  const btn = replay.getByRole('button');
  const box = (await btn.boundingBox())!;
  expect(box.width).toBeCloseTo(132, 0);
  expect(box.height).toBeCloseTo(132, 0);
  const mascot = (await page.getByRole('img', { name: 'Đậu Đậu' }).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(mascot.x + mascot.width);
  expect(box.x - (mascot.x + mascot.width)).toBeLessThanOrEqual(48);
  const places = page.locator('[data-testid^="place-"]').getByRole('button');
  for (let i = 0; i < (await places.count()); i++) {
    expect(overlap(box, (await places.nth(i).boundingBox())!, 24), `chơi lại sát khu ${i}`).toBe(false);
  }
  expect(overlap(box, (await page.getByLabel('Khu phụ huynh').boundingBox())!)).toBe(false);

  await page.screenshot({ path: 'test-results/shots/T-034-replay.png' });

  // Chạm → nói tên trò ngay, vào thẳng trò (không qua màn chọn trò)
  await page.evaluate(() => {
    const w = window as unknown as { said: string[] };
    w.said = [];
    const el = document.querySelector('[data-testid="home"]')!;
    new MutationObserver(() => w.said.push(el.getAttribute('data-last-say') ?? '')).observe(el, {
      attributes: true,
      attributeFilter: ['data-last-say'],
    });
  });
  await btn.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { said: string[] }).said)).toEqual(['game.memory']);
  await expect(page.getByTestId('game-memory')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('game-picker')).toHaveCount(0);
});

test('nút chơi lại còn sau khi tải lại trang', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Nhà âm nhạc').click();
  await pickGame(page, 'music');
  await expect(page.getByTestId('game-music')).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByTestId('replay')).toHaveAttribute('data-game', 'music', { timeout: 5000 });
});
