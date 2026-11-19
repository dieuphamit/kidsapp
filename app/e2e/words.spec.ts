// E2E trò "Đồ vật quanh bé" (words): thẻ học đồ vật bằng ảnh thật, xem thẻ và tìm thẻ.
import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

test.beforeAll(() => mkdirSync('test-results/shots', { recursive: true }));

declare global {
  interface Window {
    __behocWords?: {
      phase(): 'topics' | 'view' | 'quiz';
      card(): string | null;
      quiz(): { target: string; choices: string[] } | null;
      topic(): string | null;
    };
  }
}

/** Ghi tuổi bé vào idb (settings). */
async function setAge(page: Page, ageMonths: number) {
  await page.goto('./?e2e=1');
  await page.evaluate(
    (age) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('keyval-store', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('keyval');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put({ lang: 'vi', ageMonths: age, sessionMinutes: 15 }, 'behoc.settings');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    ageMonths,
  );
}

/** Vào thẳng bảng chọn trò của Nhà (2D, không qua bản đồ 3D) rồi chọn trò words. */
async function openGame(page: Page, ageMonths: number): Promise<Locator> {
  await setAge(page, ageMonths);
  await page.goto('./?e2e=1&picker=house');
  await pickGame(page, 'words');
  const game = page.getByTestId('game-words');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'words.hello');
  return game;
}

/** Chờ mọi ảnh thẻ tải xong để ảnh chụp đầy đủ. */
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="game-words"] img')].every((i) => i.complete && i.naturalWidth > 0),
  );
}

async function expectSafe(loc: Locator, label: string) {
  const b = (await loc.boundingBox())!;
  expect(b.width, label).toBeGreaterThanOrEqual(120);
  expect(b.height, label).toBeGreaterThanOrEqual(120);
  // góc trên-phải là cổng bố mẹ: nút của trò cách mép phải ≥144px
  expect(b.x + b.width, label).toBeLessThanOrEqual(1194 - 144);
}

test('chọn chủ đề bằng nút ảnh to → xem thẻ: đọc tên, chạm thẻ nhún và đọc lại, nút sau/trước; chụp words-topics, words-view', async ({ page }) => {
  const game = await openGame(page, 30);
  for (const t of ['clothes', 'kitchen', 'vehicles', 'home']) await expectSafe(page.getByTestId(`topic-${t}`), t);
  await imagesLoaded(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/words-topics.png' });

  await page.getByTestId('topic-kitchen').click();
  await expect(game).toHaveAttribute('data-phase', 'view');
  await expect(game).toHaveAttribute('data-last-say', 'words.topic.kitchen');
  const first = (await page.evaluate(() => window.__behocWords!.card()))!;
  await expect(game).toHaveAttribute('data-last-say', `words.${first}`, { timeout: 4000 });
  const card = page.getByTestId('card');
  await expect(card).toHaveAttribute('data-card', first);
  await expectSafe(card, 'card');
  await expectSafe(page.getByRole('button', { name: 'Thẻ trước' }), 'prev');
  await expectSafe(page.getByRole('button', { name: 'Thẻ sau' }), 'next');

  // chạm thẻ: phản hồi ngay lúc chạm xuống (nhún + đọc tên)
  const c = (await card.boundingBox())!;
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  await expect(card).toHaveAttribute('data-pressed', '');
  await expect(card.locator('[data-bounce]')).toHaveCount(1);
  await expect(game).toHaveAttribute('data-last-say', `words.${first}`);
  await page.mouse.up();

  await page.getByRole('button', { name: 'Thẻ sau' }).click();
  const second = (await page.evaluate(() => window.__behocWords!.card()))!;
  expect(second).not.toBe(first);
  await expect(game).toHaveAttribute('data-last-say', `words.${second}`);
  // dưới 36 tháng: bấm sau mãi vẫn là xem thẻ, không có câu đố
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Thẻ sau' }).click();
  await expect(game).toHaveAttribute('data-phase', 'view');
  await page.getByRole('button', { name: 'Thẻ trước' }).click();
  await expect(game).toHaveAttribute('data-phase', 'view');

  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/words-view.png' });

  // nút chủ đề đưa về màn chọn chủ đề
  await page.getByRole('button', { name: 'Chọn chủ đề' }).click();
  await expect(game).toHaveAttribute('data-phase', 'topics');
});

test('xe cộ: đọc tên rồi phát tiếng thật của xe (nếu có); chụp words-vehicle', async ({ page }) => {
  const game = await openGame(page, 30);
  await page.getByTestId('topic-vehicles').click();
  const card = (await page.evaluate(() => window.__behocWords!.card()))!;
  await expect(game).toHaveAttribute('data-last-say', `words.${card}`, { timeout: 4000 });
  await page.getByTestId('card').click();
  await expect(game).toHaveAttribute('data-last-say', /^animal\.[a-z]+-sound$|^words\./, { timeout: 4000 });
  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/words-vehicle.png' });
});

test('≥36 tháng: sau 3 thẻ xen tìm thẻ; chạm sai thẻ nói tên mình, thẻ đúng nhún gợi ý; chạm đúng phóng to, lấp lánh; chụp words-find-hint, words-find', async ({ page }) => {
  const game = await openGame(page, 48);
  await page.getByTestId('topic-clothes').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Thẻ sau' }).click();
  await expect(game).toHaveAttribute('data-phase', 'quiz');
  await expect(game).toHaveAttribute('data-last-say', 'words.find');
  const q = (await page.evaluate(() => window.__behocWords!.quiz()))!;
  expect(q.choices).toHaveLength(3);
  await expect(page.locator('[data-choice]')).toHaveCount(3);
  for (const id of q.choices) await expectSafe(page.getByTestId(`choice-${id}`), id);
  await expect(game).toHaveAttribute('data-last-say', `words.ask.${q.target}`, { timeout: 5000 });

  const wrong = q.choices.find((c) => c !== q.target)!;
  await page.getByTestId(`choice-${wrong}`).click();
  await expect(game).toHaveAttribute('data-last-say', `words.this.${wrong}`);
  await expect(game).toHaveAttribute('data-phase', 'quiz');
  await expect(page.getByTestId(`choice-${q.target}`).locator('[data-hint]')).toHaveCount(1, { timeout: 4000 });
  await expect(game).toHaveAttribute('data-last-say', `words.ask.${q.target}`);
  await imagesLoaded(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/shots/words-find-hint.png' });

  await page.getByTestId(`choice-${q.target}`).click();
  await expect(game).toHaveAttribute('data-last-say', `words.yes.${q.target}`);
  await expect(page.getByTestId(`choice-${q.target}`)).toHaveAttribute('data-win', '');
  await expect(page.getByTestId('sparkles')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/words-find.png' });
  // khen xong thì về xem thẻ kế
  await expect(game).toHaveAttribute('data-phase', 'view', { timeout: 6000 });
});

test('60 tháng: tìm thẻ có 4 thẻ xếp 2×2; chụp words-find4', async ({ page }) => {
  const game = await openGame(page, 60);
  await page.getByTestId('topic-home').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Thẻ sau' }).click();
  await expect(game).toHaveAttribute('data-phase', 'quiz');
  const q = (await page.evaluate(() => window.__behocWords!.quiz()))!;
  expect(q.choices).toHaveLength(4);
  for (const id of q.choices) await expectSafe(page.getByTestId(`choice-${id}`), id);
  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/words-find4.png' });
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('khung xoay ngang: chạm chủ đề, chạm thẻ, bấm sau vẫn đúng; chụp words-mobile', async ({ page }) => {
    const game = await openGame(page, 30);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await page.getByTestId('topic-vehicles').tap();
    await expect(game).toHaveAttribute('data-phase', 'view');
    const first = (await page.evaluate(() => window.__behocWords!.card()))!;
    await page.getByTestId('card').tap();
    await expect(page.getByTestId('card').locator('[data-bounce]')).toHaveCount(1);
    await expect(game).toHaveAttribute('data-last-say', `words.${first}`);
    await page.getByRole('button', { name: 'Thẻ sau' }).tap();
    await expect.poll(() => page.evaluate(() => window.__behocWords!.card())).not.toBe(first);
    await imagesLoaded(page);
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'test-results/shots/words-mobile.png' });
  });
});
