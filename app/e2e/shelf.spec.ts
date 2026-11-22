// E2E menu kiểu kệ đồ chơi và lựa chọn kiểu menu trong khu bố mẹ (T-035)
import { test, expect, type Page } from '@playwright/test';
import { openParentArea } from './parent-gate.js';
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


/** Đợi mọi hiệu ứng hữu hạn (thẻ trồi lên trễ dần, nảy quá cỡ) chạy xong: đo giữa chừng thì thẻ to hơn thật. */
async function cardsSettled(page: Page) {
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.then(() => undefined, () => undefined)),
    ),
  );
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


test('kệ đồ chơi: mọi thẻ ≥120px (132px khi ít trò), khe ≥24px, trong khung, xếp theo khu; chụp T-035-shelf', async ({ page }) => {
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
  // thứ tự khu: Thế giới thú trước, rồi ... Nhà âm nhạc, Trang trại cuối
  expect(ids.slice(0, 6)).toEqual(['world', 'animals', 'zoo3d', 'sound-quiz', 'shadow', 'peekaboo']);
  expect(ids.slice(-5, -2).sort()).toEqual(['band', 'coloring', 'music']);
  expect(ids.slice(-2)).toEqual(['mama', 'feed']);

  await cardsSettled(page); // chờ hiệu ứng hiện thẻ (trễ dần 40ms/thẻ, nảy quá cỡ) chạy xong rồi mới đo
  const boxes = await cardBoxes(page);
  // ≤18 trò: 6 cột thẻ 132px; nhiều hơn: 7 cột thẻ 120px (sàn ClayButton)
  const min = (await shelf.getAttribute('data-cols')) === '6' ? 132 : 120;
  for (const b of boxes) {
    expect(b.width, `${b.id} rộng`).toBeGreaterThanOrEqual(min);
    expect(b.height, `${b.id} cao`).toBeGreaterThanOrEqual(min);
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

test('60 tháng: đủ mọi trò, kệ gọn 4 tầng vẫn trọn khung, khe ≥24px, không đè cổng; chụp T-035-shelf-all', async ({ page }) => {
  await page.goto('./?e2e=1');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put({ lang: 'vi', ageMonths: 60, sessionMinutes: 15, menuStyle: 'shelf' }, 'behoc.settings');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto('./?e2e=1&menu=shelf');
  const shelf = page.getByTestId('shelf');
  await expect(shelf).toBeVisible({ timeout: 3000 });
  const cards = page.locator('[data-testid^="shelf-card-"]');
  expect(await cards.count()).toBeGreaterThanOrEqual(22);
  await expect(shelf).toHaveAttribute('data-compact', 'true');
  await cardsSettled(page); // chờ hiệu ứng hiện thẻ (trễ dần 40ms/thẻ, nảy quá cỡ) chạy xong rồi mới đo
  const boxes = await cardBoxes(page);
  for (const b of boxes) {
    expect(b.width, `${b.id} rộng`).toBeGreaterThanOrEqual(120);
    expect(b.height, `${b.id} cao`).toBeGreaterThanOrEqual(120);
  }
  expectInsideAndApart(boxes, 1194, 834, 24);
  const gate = (await page.getByLabel('Khu phụ huynh').boundingBox())!;
  const mascot = (await shelf.locator('img').boundingBox())!;
  for (const b of boxes) {
    expect(overlap(b, gate, 24), `${b.id} sát cổng phụ huynh`).toBe(false);
    expect(overlap(b, mascot), `${b.id} đè Đậu Đậu`).toBe(false);
  }
  await page.screenshot({ path: 'test-results/shots/T-035-shelf-all.png' });
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
  // Bắt đầu ở màn chọn trò (2D) để không phụ thuộc WebGL của máy chạy test.
  // Mặc định giờ là đoàn tàu: lưu sẵn kiểu bản đồ (như máy đã chọn bản đồ trước đây) để kiểm tra đổi bản đồ → kệ
  await page.goto('./?e2e=1');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tx = request.result.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put({ lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map' }, 'behoc.settings');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  });
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
    await cardsSettled(page); // chờ hiệu ứng hiện thẻ (trễ dần 40ms/thẻ, nảy quá cỡ) chạy xong rồi mới đo
    const boxes = await cardBoxes(page);
    expect(boxes.length).toBeGreaterThanOrEqual(11);
    expectInsideAndApart(boxes, 430, 932, 0);
    await page.screenshot({ path: 'test-results/shots/T-035-shelf-portrait.png' });
    await page.getByTestId('shelf-card-counting').getByRole('button').tap();
    await expect(page.getByTestId('game-counting')).toBeVisible({ timeout: 15_000 });
  });
});
