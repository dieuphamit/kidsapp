// E2E trò "Nối điểm" (dots): chạm/kéo nối các chấm theo số quanh bóng mờ con vật, nối xong hiện ảnh thật.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

declare global {
  interface Window {
    __behocDots?: {
      animal(): string;
      dots(): [number, number][];
      next(): number;
      tap(i: number): boolean;
    };
  }
}

/** Ghi tuổi vào idb-keyval trước khi vào app (trò từ 30 tháng). */
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

async function openGame(page: Page, ageMonths: number) {
  await setAge(page, ageMonths);
  await page.goto('./?menu=map&e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await page.getByLabel('Góc đố').click();
  await pickGame(page, 'dots');
  const game = page.getByTestId('game-dots');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'dots.hello');
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('[data-testid="dots-photo"]');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await page.waitForTimeout(700); // chấm hiện xong
  return game;
}

async function center(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function tap(page: Page, testId: string) {
  const c = await center(page, testId);
  await page.mouse.click(c.x, c.y);
}

/** Kéo ngón (chuột) qua các chấm from..to liên tục, nhiều bước giữa hai chấm. */
async function dragThrough(page: Page, from: number, to: number) {
  const start = await center(page, `dot-${from}`);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  let prev = start;
  for (let n = from + 1; n <= to; n++) {
    const c = await center(page, `dot-${n}`);
    const steps = 8;
    for (let k = 1; k <= steps; k++) await page.mouse.move(prev.x + ((c.x - prev.x) * k) / steps, prev.y + ((c.y - prev.y) * k) / steps);
    prev = c;
  }
  return async () => page.mouse.up();
}

test('30 tháng: 5 chấm to ≥120, cách nhau ≥24, tránh nút Về nhà và cổng bố mẹ; chạm 1, 2 đọc số và nối nét; chụp dots-start', async ({ page }) => {
  const game = await openGame(page, 30);
  const dots = page.locator('[data-testid^="dot-"]');
  await expect(dots).toHaveCount(5);
  await expect(page.getByTestId('dot-1')).toHaveAttribute('data-state', 'next');

  const home = (await page.getByLabel('Về nhà').boundingBox())!;
  const boxes = [];
  for (let i = 1; i <= 5; i++) {
    const b = (await page.getByTestId(`dot-${i}`).boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(120);
    expect(b.height).toBeGreaterThanOrEqual(120);
    expect(b.x + b.width).toBeLessThanOrEqual(1194 - 144);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(834);
    const clearOfHome = b.x >= home.x + home.width + 24 || b.y >= home.y + home.height + 24;
    expect(clearOfHome).toBe(true);
    boxes.push(b);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
      const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
      expect(Math.max(gapX, gapY), `chấm ${i + 1} và ${j + 1}`).toBeGreaterThanOrEqual(24 - 0.5);
    }
  }

  const c1 = await center(page, 'dot-1');
  await page.mouse.move(c1.x, c1.y);
  await page.mouse.down();
  // phản hồi ngay khi đặt ngón: chấm lún, sáng lên, đọc "một"
  await expect(page.getByTestId('dot-1')).toHaveAttribute('data-pressed', '');
  await expect(page.getByTestId('dot-1')).toHaveAttribute('data-state', 'done');
  await expect(game).toHaveAttribute('data-last-say', 'number.1');
  await page.mouse.up();
  await tap(page, 'dot-2');
  await expect(game).toHaveAttribute('data-last-say', 'number.2');
  await expect(page.getByTestId('dots-line')).toBeVisible();
  await expect(page.getByTestId('dot-3')).toHaveAttribute('data-state', 'next');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/dots-start.png' });
});

test('chạm nhầm chấm: không âm báo sai, không nối, chấm kế tiếp nhún gợi ý', async ({ page }) => {
  const game = await openGame(page, 30);
  await tap(page, 'dot-3');
  await expect(page.getByTestId('dot-1').locator('[data-hint]')).toHaveCount(1);
  await expect(game).toHaveAttribute('data-last-say', 'dots.hello');
  await expect(game).toHaveAttribute('data-next', '0');
  await expect(page.getByTestId('dot-3')).toHaveAttribute('data-state', 'todo');
});

test('60 tháng: 10 chấm; kéo ngón từ chấm 1 qua tới chấm 6 là nối liền; chụp dots-midway', async ({ page }) => {
  const game = await openGame(page, 60);
  await expect(page.locator('[data-testid^="dot-"]')).toHaveCount(10);
  const release = await dragThrough(page, 1, 6);
  await expect(game).toHaveAttribute('data-next', '6');
  await expect(game).toHaveAttribute('data-last-say', 'number.6');
  // ngón còn đè: nét tạm kéo theo ngón
  const c7 = await center(page, 'dot-7');
  const c6 = await center(page, 'dot-6');
  await page.mouse.move((c6.x + c7.x) / 2, (c6.y + c7.y) / 2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/shots/dots-midway.png' });
  await release();
});

test('nối hết vòng: ảnh thật hiện dần, con vật kêu tiếng thật, "Là con ..."; rồi sang con khác; chụp dots-reveal', async ({ page }) => {
  test.setTimeout(60_000);
  const game = await openGame(page, 40);
  const animal = await game.getAttribute('data-animal');
  const n = await page.locator('[data-testid^="dot-"]').count();
  expect(n).toBe(8);
  for (let i = 0; i < n; i++) await tap(page, `dot-${i + 1}`);
  await expect(game).toHaveAttribute('data-phase', 'reveal');
  await expect(page.getByTestId('dots-sparkles')).toBeVisible();
  await expect(game).toHaveAttribute('data-last-say', `animal.${animal}-sound`, { timeout: 6000 }); // khi số cuối đọc xong
  await expect(game).toHaveAttribute('data-last-say', `dots.is.${animal}`, { timeout: 6000 });
  await expect.poll(() => page.getByTestId('dots-photo').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  await page.screenshot({ path: 'test-results/shots/dots-reveal.png' });
  // con kế tiếp, bắt đầu lại từ chấm 1
  await expect(game).toHaveAttribute('data-phase', 'play', { timeout: 12_000 });
  expect(await game.getAttribute('data-animal')).not.toBe(animal);
  await expect(game).toHaveAttribute('data-next', '0');
});

test.describe('iPhone dọc 430×932: kéo nối chấm trong khung xoay', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo qua cả 5 chấm vẫn nối đúng, hiện ảnh thật; chụp dots-portrait', async ({ page }) => {
    const game = await openGame(page, 30);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    const release = await dragThrough(page, 1, 5);
    await release();
    await expect(game).toHaveAttribute('data-phase', 'reveal');
    await expect(game).toHaveAttribute('data-next', '5');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'test-results/shots/dots-portrait.png' });
  });

  test('chạm từng chấm trong khung xoay cũng nối', async ({ page }) => {
    const game = await openGame(page, 30);
    for (let i = 1; i <= 3; i++) await tap(page, `dot-${i}`);
    await expect(game).toHaveAttribute('data-next', '3');
    await expect(game).toHaveAttribute('data-last-say', 'number.3');
  });
});
