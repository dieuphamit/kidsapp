// E2E menu kiểu kệ đồ chơi và lựa chọn kiểu menu trong khu bố mẹ (T-035)
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

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

async function cardBoxes(page: Page) {
  const wrappers = page.locator('[data-testid^="shelf-card-"]');
  const ids = await wrappers.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('shelf-card-'.length)));
  const boxes: (Box & { id: string })[] = [];
  for (const id of ids) {
    const box = await page.getByTestId(`shelf-card-${id}`).getByRole('button').boundingBox();
    expect(box, id).not.toBeNull();
    boxes.push({ ...box!, id });
  }
  return boxes;
}

function expectInsideAndApart(boxes: (Box & { id: string })[], vw: number, vh: number, gap: number) {
  for (const b of boxes) {
    expect(b.x, `${b.id} trái`).toBeGreaterThanOrEqual(0);
    expect(b.y, `${b.id} trên`).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, `${b.id} phải`).toBeLessThanOrEqual(vw + 1);
    expect(b.y + b.height, `${b.id} dưới`).toBeLessThanOrEqual(vh + 1);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(overlap(boxes[i], boxes[j], gap), `${boxes[i].id} sát ${boxes[j].id}`).toBe(false);
    }
  }
}

async function openParentArea(page: Page) {
  const gate = page.getByRole('button', { name: 'Khu phụ huynh' });
  await expect(gate).toBeVisible();
  // giữ 3 giây (gửi thẳng pointerdown/pointerup vào nút để không lệ thuộc toạ độ chuột)
  await gate.dispatchEvent('pointerdown');
  await page.waitForTimeout(3300);
  await gate.dispatchEvent('pointerup');
  const confirm = page.getByRole('dialog', { name: 'Xác nhận phụ huynh' });
  await expect(confirm).toBeVisible({ timeout: 2000 });
  const q = await confirm.locator('span').first().textContent();
  const [a, b] = (q ?? '').match(/\d+/g)!.map(Number);
  await page.getByLabel('Đáp án').fill(String(a + b));
  await page.getByRole('button', { name: 'Mở' }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toBeVisible();
}

test('kệ đồ chơi: mọi thẻ 132px, khe ≥24px, trong khung, xếp theo khu; chụp T-035-shelf', async ({ page }) => {
  await page.goto('./?e2e=1&menu=shelf');
  const shelf = page.getByTestId('shelf');
  await expect(shelf).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('home')).toHaveCount(0);
  await expect(shelf).toHaveAttribute('data-last-say', 'ui.pick-game');
  await expect(shelf.getByText('Bé chơi trò nào?')).toBeVisible();
  await expect(page.getByLabel('Về nhà')).toHaveCount(0);

  // tuổi mặc định 28 tháng: mọi trò hiện có đều hợp tuổi
  const cards = page.locator('[data-testid^="shelf-card-"]');
  expect(await cards.count()).toBeGreaterThanOrEqual(11);
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('shelf-card-'.length)));
  // thứ tự khu: Thế giới thú trước, Nhà âm nhạc cuối
  expect(ids.slice(0, 5)).toEqual(['animals', 'zoo3d', 'sound-quiz', 'shadow', 'peekaboo']);
  expect(ids.slice(-2).sort()).toEqual(['band', 'music']);

  await page.waitForTimeout(900); // chờ hiệu ứng hiện thẻ
  const boxes = await cardBoxes(page);
  for (const b of boxes) {
    expect(b.width, `${b.id} rộng`).toBeGreaterThanOrEqual(132);
    expect(b.height, `${b.id} cao`).toBeGreaterThanOrEqual(132);
  }
  expectInsideAndApart(boxes, 1194, 834, 24);

  // không đè cổng phụ huynh và Đậu Đậu
  const gate = (await page.getByLabel('Khu phụ huynh').boundingBox())!;
  const mascot = (await shelf.locator('img').boundingBox())!;
  expect(mascot.width).toBeCloseTo(108, 0);
  for (const b of boxes) {
    expect(overlap(b, gate, 24), `${b.id} sát cổng phụ huynh`).toBe(false);
    expect(overlap(b, mascot), `${b.id} đè Đậu Đậu`).toBe(false);
  }

  await page.screenshot({ path: 'test-results/shots/T-035-shelf.png' });
});

test('kệ đồ chơi: chạm thẻ nói tên trò ngay rồi vào đúng trò', async ({ page }) => {
  await page.goto('./?e2e=1&menu=shelf');
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const w = window as unknown as { said: string[] };
    w.said = [];
    const el = document.querySelector('[data-testid="shelf"]')!;
    new MutationObserver(() => w.said.push(el.getAttribute('data-last-say') ?? '')).observe(el, {
      attributes: true,
      attributeFilter: ['data-last-say'],
    });
  });
  await page.getByTestId('shelf-card-memory').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { said: string[] }).said)).toEqual(['game.memory']);
  await expect(page.getByTestId('game-memory')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('shelf')).toHaveCount(0);

  // Về nhà thì quay lại kệ
  await page.getByLabel('Về nhà').click();
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 5000 });
});

test('khu bố mẹ: chọn Kệ đồ chơi đổi ngay, đóng thì thấy kệ, tải lại vẫn là kệ; chụp T-035-settings', async ({ page }) => {
  // Bắt đầu ở màn chọn trò (2D) để không phụ thuộc WebGL của máy chạy test
  await page.goto('./?e2e=1&picker=zoo');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 3000 });
  await openParentArea(page);

  const map = page.getByRole('button', { name: /Bản đồ/ });
  const shelfBtn = page.getByRole('button', { name: /Kệ đồ chơi/ });
  await expect(map).toHaveAttribute('aria-pressed', 'true');
  await expect(shelfBtn).toHaveAttribute('aria-pressed', 'false');
  await shelfBtn.click();
  await expect(shelfBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(map).toHaveAttribute('aria-pressed', 'false');

  // khu bố mẹ nằm trọn khung
  const card = (await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).locator('div').first().boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(834);
  await page.screenshot({ path: 'test-results/shots/T-035-settings.png' });

  // không bấm Lưu, chỉ Đóng; rời màn chọn trò thì về menu chính là kệ
  await page.getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toHaveCount(0);
  await page.getByLabel('Đậu Đậu').click();
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 3000 });
  await expect(page.getByTestId('home')).toHaveCount(0);

  // đã lưu: tải lại trang chính vẫn là kệ
  await page.goto('./');
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('home')).toHaveCount(0);

  // mở lại khu bố mẹ: Kệ đồ chơi đang chọn; chạm Bản đồ thì đổi ngay
  await openParentArea(page);
  await expect(page.getByRole('button', { name: /Kệ đồ chơi/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Bản đồ/ }).click();
  await expect(page.getByRole('button', { name: /Bản đồ/ })).toHaveAttribute('aria-pressed', 'true');
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kệ xoay ngang, mọi thẻ trong màn hình, không chồng; chạm vào được trò', async ({ page }) => {
    await page.goto('./?e2e=1&menu=shelf');
    await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await page.waitForTimeout(900);
    const boxes = await cardBoxes(page);
    expect(boxes.length).toBeGreaterThanOrEqual(11);
    expectInsideAndApart(boxes, 430, 932, 0);
    await page.screenshot({ path: 'test-results/shots/T-035-shelf-portrait.png' });
    await page.getByTestId('shelf-card-counting').getByRole('button').tap();
    await expect(page.getByTestId('game-counting')).toBeVisible({ timeout: 15_000 });
  });
});
