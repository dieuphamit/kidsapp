// E2E trò "Mẹ ơi, con đâu?" (mama): kéo thú con về đúng thú mẹ.
import { test, expect, type Page } from '@playwright/test';
import { pickGame } from './pick.js';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

type BabyId = string;
declare global {
  interface Window {
    __behocMama?: {
      turn(): { baby: BabyId; mamas: BabyId[] } | null;
      index(): number;
      drop(mama: BabyId): 'ok' | 'wrong';
    };
  }
}

/** Ghi tuổi vào idb-keyval trước khi vào app (mặc định 28 tháng = 2 thú mẹ). */
async function setAge(page: Page, ageMonths: number) {
  await page.goto('./?menu=map&e2e=1');
  await page.evaluate(async (age) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put({ lang: 'vi', ageMonths: age, sessionMinutes: 15 }, 'behoc.settings');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, ageMonths);
}

async function openGame(page: Page) {
  await page.goto('./?menu=map&e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  // Trang trại có nhiều trò: chạm khu rồi chọn trò mama
  await page.getByRole('button', { name: 'Trang trại' }).click();
  await pickGame(page, 'mama');
  const game = page.getByTestId('game-mama');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'mama.hello');
  return game;
}

/** Chờ mọi ảnh thẻ tải xong để ảnh chụp đầy đủ. */
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="game-mama"] img')].every((i) => i.complete && i.naturalWidth > 0),
  );
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

async function center(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('bản đồ → Trang trại → trò; có 2 thú mẹ ở 28 tháng, hỏi mẹ của con; chụp mama-start', async ({ page }) => {
  const game = await openGame(page);
  const turn = (await page.evaluate(() => window.__behocMama!.turn()))!;
  expect(turn.mamas).toHaveLength(2);
  expect(turn.mamas).toContain(turn.baby);
  await expect(page.locator('[data-mama]')).toHaveCount(2);
  await expect(page.getByTestId('baby')).toHaveAttribute('data-baby', turn.baby);
  // sau câu chào thì hỏi "Mẹ của ... đâu nhỉ?"
  await expect(game).toHaveAttribute('data-last-say', `mama.ask.${turn.baby}`, { timeout: 10_000 }); // câu chào (~6s) đọc xong mới hỏi

  // vùng chạm ≥120px, thú mẹ to hơn con
  const baby = (await page.getByTestId('baby').boundingBox())!;
  expect(baby.width).toBeGreaterThanOrEqual(120);
  for (const m of turn.mamas) {
    const b = (await page.getByTestId(`mama-${m}`).boundingBox())!;
    expect(b.width).toBeGreaterThan(baby.width * 1.3);
    expect(b.x + b.width).toBeLessThanOrEqual(1194);
  }
  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/mama-start.png' });
});

test('4 thú mẹ ở 60 tháng; chạm mẹ thì mẹ kêu ngay (data-pressed, tiếng thật); chụp mama-four', async ({ page }) => {
  await setAge(page, 60);
  const game = await openGame(page);
  const turn = (await page.evaluate(() => window.__behocMama!.turn()))!;
  expect(turn.mamas).toHaveLength(4);
  await expect(page.locator('[data-mama]')).toHaveCount(4);

  const other = turn.mamas.find((m) => m !== turn.baby)!;
  const c = await center(page, `mama-${other}`);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await expect(page.getByTestId(`mama-${other}`)).toHaveAttribute('data-pressed', '');
  await expect(game).toHaveAttribute('data-last-say', /^animal\.[a-z]+-sound$/);
  await page.mouse.up();

  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/mama-four.png' });
});

test('kéo con vào mẹ sai: không âm báo sai, con quay về ổ, mẹ đúng gọi; kéo vào mẹ đúng: rúc vào mẹ, tim bay; chụp mama-snuggle', async ({ page }) => {
  await setAge(page, 40);
  const game = await openGame(page);
  const turn = (await page.evaluate(() => window.__behocMama!.turn()))!;
  expect(turn.mamas).toHaveLength(3);
  await imagesLoaded(page);
  await page.waitForTimeout(900); // chờ con nhảy vào ổ xong
  const nest = (await page.getByTestId('baby').boundingBox())!;

  // Thả nhầm: mẹ đúng kêu gọi con (tiếng kêu thật), lượt không đổi, con về chỗ cũ
  const wrong = turn.mamas.find((m) => m !== turn.baby)!;
  await dragTo(page, await center(page, 'baby'), await center(page, `mama-${wrong}`));
  await expect(game).toHaveAttribute('data-last-say', /^animal\.[a-z]+-sound$/);
  expect(await page.evaluate(() => window.__behocMama!.index())).toBe(0);
  await expect(page.getByTestId(`mama-${turn.baby}`).locator('[data-call]')).toHaveCount(1);
  await expect.poll(async () => (await page.getByTestId('baby').boundingBox())!.y, { timeout: 3000 }).toBeCloseTo(nest.y, -1);

  // Thả đúng
  await dragTo(page, await center(page, 'baby'), await center(page, `mama-${turn.baby}`));
  await expect(game).toHaveAttribute('data-phase', 'snuggle');
  await expect(page.getByTestId('baby')).toHaveAttribute('data-phase', 'snuggle');
  await expect(game).toHaveAttribute('data-last-say', `mama.found.${turn.baby}`, { timeout: 6000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/shots/mama-snuggle.png' });

  // Sang con kế, hỏi tiếp
  await expect.poll(() => page.evaluate(() => window.__behocMama!.index()), { timeout: 6000 }).toBe(1);
  const next = (await page.evaluate(() => window.__behocMama!.turn()))!;
  await expect(game).toHaveAttribute('data-last-say', `mama.ask.${next.baby}`);
});

test('đủ 5 con về với mẹ → ăn mừng với bạn đồng hành rồi chơi tiếp; chụp mama-party', async ({ page }) => {
  test.setTimeout(90_000);
  const game = await openGame(page);
  for (let i = 0; i < 5; i++) {
    await expect.poll(() => page.evaluate(() => window.__behocMama!.index()), { timeout: 8000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'ask', { timeout: 8000 });
    const t = (await page.evaluate(() => window.__behocMama!.turn()))!;
    expect(await page.evaluate((b) => window.__behocMama!.drop(b), t.baby)).toBe('ok');
  }
  await expect(game).toHaveAttribute('data-last-say', 'mama.done', { timeout: 8000 });
  await expect(page.getByTestId('party')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/mama-party.png' });
  // ván mới, không điểm, không thua
  await expect(game).toHaveAttribute('data-phase', 'ask', { timeout: 12_000 });
  expect(await page.evaluate(() => window.__behocMama!.index())).toBe(0);
});

test.describe('iPhone dọc 430×932: kéo con về mẹ', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo trong khung xoay vẫn thả đúng mẹ; chụp mama-portrait', async ({ page }) => {
    const game = await openGame(page);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    const turn = (await page.evaluate(() => window.__behocMama!.turn()))!;
    await imagesLoaded(page);
    await dragTo(page, await center(page, 'baby'), await center(page, `mama-${turn.baby}`));
    await expect(game).toHaveAttribute('data-phase', 'snuggle');
    await expect(game).toHaveAttribute('data-last-say', `mama.found.${turn.baby}`, { timeout: 6000 });
    await page.screenshot({ path: 'test-results/shots/mama-portrait.png' });
  });
});
