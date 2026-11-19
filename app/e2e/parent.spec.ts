// E2E khu bố mẹ: cổng giữ 3 giây + phép tính người lớn, mục "Tuần này" (phút theo kỹ năng), Chế độ nhẹ nhàng.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { answerParentGate, holdParentGate, openParentArea, solveGateQuestion } from './parent-gate.js';

mkdirSync('test-results/shots', { recursive: true });

/** Kệ đồ chơi (2D, không WebGL) để cổng phụ huynh đứng yên và test không phụ thuộc GPU. */
const SHELF = './?e2e=1&menu=shelf';

/** Số phần tử đang chạy hiệu ứng lặp vô hạn (nảy, trôi, nhấp nháy). */
function infiniteAnimations(page: Page): Promise<number> {
  return page.evaluate(() => [...document.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    return cs.animationName !== 'none' && cs.animationIterationCount.split(',').some((n) => n.trim() === 'infinite');
  }).length);
}

test('cổng phụ huynh: giữ 3 giây, 4 nút đáp án to; chọn sai thì lặng lẽ đóng, chọn đúng thì vào; chụp parent-gate', async ({ page }) => {
  await page.goto(SHELF);
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 10_000 });

  // chạm nhanh không mở
  const gate = page.getByRole('button', { name: 'Khu phụ huynh' });
  await gate.dispatchEvent('pointerdown');
  await page.waitForTimeout(500);
  await gate.dispatchEvent('pointerup');
  await page.waitForTimeout(3000);
  await expect(page.getByRole('dialog', { name: 'Xác nhận phụ huynh' })).toHaveCount(0);

  await holdParentGate(page);
  const confirm = page.getByRole('dialog', { name: 'Xác nhận phụ huynh' });
  const question = (await confirm.getByTestId('gate-question').textContent()) ?? '';
  expect(question).toMatch(/^\d+ [+×] \d+ = \?$/);
  const answer = solveGateQuestion(question);
  const choices = confirm.getByRole('group', { name: 'Đáp án' }).getByRole('button');
  await expect(choices).toHaveCount(4);
  // nút ≥120px, cách nhau ≥24px, nằm trong khung
  const boxes = [];
  for (let i = 0; i < 4; i++) boxes.push((await choices.nth(i).boundingBox())!);
  for (const b of boxes) {
    expect(b.width).toBeGreaterThanOrEqual(120);
    expect(b.height).toBeGreaterThanOrEqual(120);
    expect(b.x + b.width).toBeLessThanOrEqual(1194 - 144);
  }
  for (let i = 1; i < 4; i++) expect(boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width)).toBeGreaterThanOrEqual(24);
  const labels = await choices.evaluateAll((els) => els.map((e) => Number(e.getAttribute('aria-label'))));
  expect(labels.filter((n) => n === answer)).toHaveLength(1);
  await page.screenshot({ path: 'test-results/shots/parent-gate.png' });

  // chọn sai: đóng lặng lẽ (không âm báo sai), không vào khu bố mẹ
  const sounds: string[] = [];
  page.on('request', (r) => { if (r.url().endsWith('.mp3')) sounds.push(r.url()); });
  const wrong = labels.find((n) => n !== answer)!;
  const wrongBtn = confirm.getByRole('button', { name: String(wrong), exact: true });
  await wrongBtn.dispatchEvent('pointerdown');
  await wrongBtn.dispatchEvent('pointerup');
  await expect(confirm).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toHaveCount(0);
  expect(sounds).toEqual([]);

  // phải giữ lại 3 giây, câu mới; chọn đúng thì vào
  await openParentArea(page);
});

test('Tuần này: chơi một trò thật được ghi lại, phút theo kỹ năng và chip kỹ năng từng trò; chụp parent-stats', async ({ page }) => {
  await page.goto(SHELF);
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 10_000 });
  // dữ liệu mẫu cả tuần (chỉ trên máy: IndexedDB keyval-store/keyval, key behoc.playtime)
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };
    const MIN = 60_000;
    const log = {
      [day(1)]: { sort: 12 * MIN, story: 6 * MIN },
      [day(3)]: { music: 9 * MIN, mama: 7 * MIN },
      [day(5)]: { zoo3d: 4 * MIN, pattern: 5 * MIN },
      [day(9)]: { music: 60 * MIN }, // ngoài 7 ngày: không tính
    };
    const open = indexedDB.open('keyval-store');
    open.onupgradeneeded = () => open.result.createObjectStore('keyval');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(log, 'behoc.playtime');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  }));

  // bé chơi Đếm số một lúc rồi về nhà: thời gian được ghi khi rời trò
  await page.getByTestId('shelf-card-counting').getByRole('button').dispatchEvent('pointerdown');
  await expect(page.getByTestId('game-counting')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Về nhà' }).dispatchEvent('pointerdown');
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 10_000 });

  await openParentArea(page);
  await page.getByRole('button', { name: 'Tuần này' }).dispatchEvent('pointerdown');
  const stats = page.getByTestId('parent-stats');
  await expect(stats).toHaveAttribute('data-loaded', 'true');
  // Toán: Xếp vào giỏ 12 + Chuỗi hạt 5 + Đếm số vài giây (cộng rồi mới làm tròn)
  await expect(stats.getByTestId('skill-bar-math')).toHaveAttribute('data-minutes', '17');
  await expect(stats.getByTestId('skill-bar-logic')).toHaveAttribute('data-minutes', '23'); // 12 + 6 + 5
  await expect(stats.getByTestId('skill-bar-creativity')).toHaveAttribute('data-minutes', '9'); // nhạc ngày 9 không tính
  await expect(stats.getByTestId('skill-bar-social')).toHaveAttribute('data-minutes', '7');
  await expect(stats.getByTestId('skill-bar-science')).toHaveAttribute('data-minutes', '11'); // 7 + 4
  await expect(stats.getByTestId('skill-bar-language')).toHaveAttribute('data-minutes', '10'); // 6 + 4
  await expect(stats.getByTestId('stats-total')).toHaveText('7 ngày qua: bé chơi 43 phút');
  const counting = stats.getByTestId('game-skills-counting');
  await expect(counting).toContainText('1 phút');
  await expect(counting.locator('[data-skill]')).toHaveText(['🔢 Toán']);
  await expect(stats.getByTestId('game-skills-sort').locator('[data-skill]')).toHaveText(['🧩 Logic', '🔢 Toán']);
  // trò chơi nhiều nhất đứng đầu
  await expect(stats.locator('[data-testid^="game-skills-"]').first()).toHaveAttribute('data-testid', 'game-skills-sort');
  // nút Xong: ≥120px và không đè cổng phụ huynh ở góc phải trên
  const done = (await stats.getByRole('button', { name: 'Xong' }).boundingBox())!;
  expect(done.width).toBeGreaterThanOrEqual(120);
  expect(done.x + done.width).toBeLessThanOrEqual(1194 - 144);
  await page.screenshot({ path: 'test-results/shots/parent-stats.png' });

  const xong = stats.getByRole('button', { name: 'Xong' });
  await xong.dispatchEvent('pointerdown');
  await xong.dispatchEvent('pointerup');
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toBeVisible();
});

test('Chế độ nhẹ nhàng: bật lưu ngay, giữ sau khi tải lại, tắt hiệu ứng lặp; chụp parent-calm', async ({ page }) => {
  await page.goto(SHELF);
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 10_000 });
  expect(await infiniteAnimations(page)).toBeGreaterThan(0); // bình thường: Đậu Đậu nhún nhảy
  await expect(page.locator('html')).not.toHaveAttribute('data-calm', /.*/);

  await openParentArea(page);
  const calm = page.getByRole('button', { name: 'Chế độ nhẹ nhàng' });
  await expect(calm).toHaveAttribute('aria-pressed', 'false');
  await calm.click();
  await expect(calm).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-calm', 'true');
  // thẻ cài đặt (thêm công tắc) vẫn nằm trọn trong khung 834px
  const card = (await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).locator('> div').boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(834);
  await page.screenshot({ path: 'test-results/shots/parent-calm.png' });

  // lưu trong máy: tải lại vẫn bật, mọi hiệu ứng lặp dừng sau một lượt
  await page.reload();
  await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('html')).toHaveAttribute('data-calm', 'true');
  expect(await infiniteAnimations(page)).toBe(0);

  // tắt lại
  await openParentArea(page);
  await page.getByRole('button', { name: 'Chế độ nhẹ nhàng' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-calm', /.*/);
});

test.describe('iPhone dọc', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('khung xoay: giữ ⚙️ + chạm đáp án bằng chuột thật, mở Tuần này; chụp parent-mobile', async ({ page }) => {
    await page.goto(SHELF);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await holdParentGate(page, 'mouse');
    await answerParentGate(page, 'mouse');
    const area = page.getByRole('dialog', { name: 'Cài đặt phụ huynh' });
    await expect(area).toBeVisible();
    // vẫn đúng ngôn ngữ cũ: cú chạm đáp án không rơi xuống nút ngôn ngữ bên dưới
    await expect(page.getByRole('button', { name: /Tiếng Việt/ })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: 'test-results/shots/parent-mobile.png' });
    await page.getByRole('button', { name: 'Tuần này' }).tap();
    await expect(page.getByTestId('parent-stats')).toHaveAttribute('data-loaded', 'true');
  });
});
