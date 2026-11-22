// E2E trò "Cho thú ăn" (feed): kéo đúng món vào miệng thú thật, thú nhai, no dần, kêu vui.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

type Turn = { animal: string; foods: string[]; bites: number; need: number };
declare global {
  interface Window {
    __behocFeed?: {
      turn(): Turn | null;
      index(): number;
      offer(food: string): 'yum' | 'full' | 'nope';
    };
  }
}

/** Món thú thích (khớp logic.ts). */
const LIKES: Record<string, string> = {
  rabbit: 'carrot',
  monkey: 'banana',
  panda: 'bamboo',
  dog: 'bone',
  cat: 'fish',
  chicken: 'corn',
  horse: 'apple',
};

/** Ghi tuổi vào idb-keyval trước khi vào app (mặc định 28 tháng = 2 món). */
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
  await page.getByRole('button', { name: 'Trang trại' }).click();
  await pickGame(page, 'feed');
  const game = page.getByTestId('game-feed');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'feed.hello');
  return game;
}

async function turn(page: Page): Promise<Turn> {
  return (await page.evaluate(() => window.__behocFeed!.turn()))!;
}

/** Chờ mọi ảnh tải xong để ảnh chụp đầy đủ. */
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="game-feed"] img')].every((i) => i.complete && i.naturalWidth > 0),
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

test('Trang trại → Cho thú ăn: thú đói giữa màn, khay 2 món ở 28 tháng; chụp feed-hungry', async ({ page }) => {
  const game = await openGame(page);
  const t = await turn(page);
  expect(t.foods).toHaveLength(2);
  expect(t.foods).toContain(LIKES[t.animal]);
  await expect(page.getByTestId('animal')).toHaveAttribute('data-animal', t.animal);
  await expect(page.locator('[data-food]')).toHaveCount(2);
  await expect(page.getByTestId('fullness')).toHaveAttribute('data-bites', '0');
  // sau câu chào thì "Thỏ đói rồi! Thỏ thích ăn gì nhỉ?"
  await expect(game).toHaveAttribute('data-last-say', `feed.hungry.${t.animal}`, { timeout: 6000 });

  // vùng chạm ≥120px, cách nhau ≥24px, tránh góc cổng bố mẹ
  const boxes = [];
  for (const f of t.foods) boxes.push((await page.getByTestId(`food-${f}`).boundingBox())!);
  boxes.sort((a, b) => a.x - b.x);
  for (const b of boxes) {
    expect(b.width).toBeGreaterThanOrEqual(120);
    expect(b.x + b.width).toBeLessThanOrEqual(1194 - 144);
  }
  expect(boxes[1].x - (boxes[0].x + boxes[0].width)).toBeGreaterThanOrEqual(24);

  await imagesLoaded(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/shots/feed-hungry.png' });
});

test('4 món ở 60 tháng; chạm thú thì thú kêu ngay', async ({ page }) => {
  await setAge(page, 60);
  const game = await openGame(page);
  const t = await turn(page);
  expect(t.foods).toHaveLength(4);
  expect(t.need).toBe(3);
  const c = await center(page, 'animal');
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await expect(page.getByTestId('animal')).toHaveAttribute('data-pressed', '');
  await expect(game).toHaveAttribute('data-last-say', /^(animal\.[a-z]+-sound|feed\.sound\.[a-z]+)$/);
  await page.mouse.up();
  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/feed-four.png' });
});

test('kéo món không hợp: thú lắc đầu, món về khay, không đổi thanh no; kéo đúng: món bay vào miệng, thú nhai, tim đầy; chụp feed-chew, feed-full', async ({ page }) => {
  await setAge(page, 40);
  const game = await openGame(page);
  const t = await turn(page);
  expect(t.foods).toHaveLength(3);
  await imagesLoaded(page);
  await page.waitForTimeout(900);
  const right = LIKES[t.animal];
  const wrong = t.foods.find((f) => f !== right)!;
  const home = (await page.getByTestId(`food-${wrong}`).boundingBox())!;

  // Món không hợp: không âm báo sai, thú lắc đầu nhẹ, món trôi về khay
  await dragTo(page, await center(page, `food-${wrong}`), await center(page, 'animal'));
  await expect(game).toHaveAttribute('data-last-say', `feed.nope.${t.animal}`);
  await expect(page.getByTestId('animal').locator('[data-shake]')).toHaveCount(1);
  await expect(page.getByTestId('fullness')).toHaveAttribute('data-bites', '0');
  await expect.poll(async () => (await page.getByTestId(`food-${wrong}`).boundingBox())!.y, { timeout: 3000 }).toBeCloseTo(home.y, -1);
  // lần hai: gợi ý tên món, món đúng nhún
  await dragTo(page, await center(page, `food-${wrong}`), await center(page, 'animal'));
  await expect(game).toHaveAttribute('data-last-say', `feed.hint.${t.animal}`);
  await expect(page.getByTestId(`food-${right}`)).toHaveAttribute('data-hint', '');

  // Món đúng: bay vào miệng, thú nhai, thanh no thêm một tim
  await page.waitForTimeout(600);
  await dragTo(page, await center(page, `food-${right}`), await center(page, 'animal'));
  await expect(page.getByTestId('fullness')).toHaveAttribute('data-bites', '1');
  await expect(page.getByTestId('animal-body')).toHaveAttribute('data-chew', '', { timeout: 2000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'test-results/shots/feed-chew.png' });
  await expect(game).toHaveAttribute('data-last-say', `feed.likes.${t.animal}`, { timeout: 3000 });

  // Món đúng mọc lại trên khay, cho ăn tới no
  for (let b = 2; b <= t.need; b++) {
    await expect(page.getByTestId(`food-${right}`)).toHaveAttribute('data-state', 'tray');
    await page.waitForTimeout(500);
    await dragTo(page, await center(page, `food-${right}`), await center(page, 'animal'));
    await expect(page.getByTestId('fullness')).toHaveAttribute('data-bites', String(b));
  }
  await expect(game).toHaveAttribute('data-phase', 'full');
  await expect(page.getByTestId('happy')).toBeVisible();
  // no rồi: kêu tiếng thật, rồi "Thỏ no căng bụng rồi!"
  await expect(game).toHaveAttribute('data-last-say', /^(animal\.[a-z]+-sound|feed\.sound\.[a-z]+)$/, { timeout: 3000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/feed-full.png' });
  await expect(game).toHaveAttribute('data-last-say', `feed.full.${t.animal}`, { timeout: 3000 });

  // Sang con kế
  await expect.poll(() => page.evaluate(() => window.__behocFeed!.index()), { timeout: 8000 }).toBe(1);
  const next = await turn(page);
  expect(next.animal).not.toBe(t.animal);
  await expect(game).toHaveAttribute('data-last-say', `feed.hungry.${next.animal}`);
  await expect(page.getByTestId('fullness')).toHaveAttribute('data-bites', '0');
});

test('cho no cả 4 con → ăn mừng với bạn đồng hành rồi chơi tiếp; chụp feed-party', async ({ page }) => {
  test.setTimeout(120_000);
  const game = await openGame(page);
  for (let i = 0; i < 4; i++) {
    await expect.poll(() => page.evaluate(() => window.__behocFeed!.index()), { timeout: 10_000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'ask', { timeout: 10_000 });
    const t = await turn(page);
    for (let b = 0; b < t.need; b++) {
      expect(await page.evaluate((f) => window.__behocFeed!.offer(f), LIKES[t.animal])).toBe(b + 1 < t.need ? 'yum' : 'full');
      await page.waitForTimeout(300);
    }
  }
  await expect(game).toHaveAttribute('data-last-say', 'feed.done', { timeout: 10_000 });
  await expect(page.getByTestId('party')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/feed-party.png' });
  await expect(game).toHaveAttribute('data-phase', 'ask', { timeout: 8000 });
  expect(await page.evaluate(() => window.__behocFeed!.index())).toBe(0);
});

test.describe('iPhone dọc 430×932: kéo món cho thú ăn', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo trong khung xoay vẫn cho ăn đúng; chụp feed-mobile', async ({ page }) => {
    const game = await openGame(page);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    const t = await turn(page);
    await imagesLoaded(page);
    await page.waitForTimeout(800);
    await dragTo(page, await center(page, `food-${LIKES[t.animal]}`), await center(page, 'animal'));
    await expect(page.getByTestId('fullness')).toHaveAttribute('data-bites', '1');
    await expect(game).toHaveAttribute('data-last-say', `feed.likes.${t.animal}`, { timeout: 3000 });
    await page.screenshot({ path: 'test-results/shots/feed-mobile.png' });
  });
});
