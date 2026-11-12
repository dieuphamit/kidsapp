// E2E: Chuyện ba tranh (T-039)
import { test, expect, type Page, type Locator } from '@playwright/test';
import { pickGame } from './pick.js';

declare global {
  interface Window {
    __behocStory?: { story(): string; drop(step: number): void };
  }
}

/** Đặt tuổi bé vào idb (settings) rồi mở lại app. */
async function openWithAge(page: Page, ageMonths: number) {
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
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
}

/** Nhà Đậu Đậu → Chuyện ba tranh; chờ Đậu Đậu đọc tranh 1 rồi hỏi "tiếp theo". */
async function openStory(page: Page): Promise<{ game: Locator; story: string }> {
  await page.getByLabel('Nhà Đậu Đậu').click();
  await pickGame(page, 'story');
  const game = page.getByTestId('game-story');
  await expect(game).toBeVisible({ timeout: 10_000 });
  const story = await page.evaluate(() => window.__behocStory!.story());
  await expect(game).toHaveAttribute('data-last-say', `story.${story}-1`, { timeout: 5_000 });
  await expect(game).toHaveAttribute('data-last-say', 'story.next', { timeout: 5_000 });
  return { game, story };
}

/** Kéo thật bằng chuột (sinh pointer events), từ tâm `from` tới tâm `to`. */
async function dragTo(page: Page, from: Locator, to: Locator) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  const sx = a!.x + a!.width / 2, sy = a!.y + a!.height / 2;
  const ex = b!.x + b!.width / 2, ey = b!.y + b!.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + ((ex - sx) * i) / steps, sy + ((ey - sy) * i) / steps);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

test.describe('Chuyện ba tranh (≥ 36 tháng)', () => {
  test('thả sai trôi về; kéo đúng 2 rồi 3 → kể lại 1..3 rồi story.done; chụp ảnh', async ({ page }) => {
    test.setTimeout(60_000);
    await openWithAge(page, 48);
    const { game, story } = await openStory(page);

    // 3 ô, ô 1 có sẵn tranh 1; khay có tranh 2 và 3
    await expect(page.getByTestId('story-slot-0')).toHaveAttribute('data-filled', '1');
    await expect(page.getByTestId('story-slot-2')).toBeVisible();
    await expect(page.getByTestId('story-card-2')).toBeVisible();
    await expect(page.getByTestId('story-card-3')).toBeVisible();
    for (const id of ['story-card-2', 'story-card-3', 'story-slot-0']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box!.width, id).toBeGreaterThanOrEqual(120);
      expect(box!.height, id).toBeGreaterThanOrEqual(120);
    }
    await page.screenshot({ path: 'test-results/shots/T-039-story.png' });

    // Thả tranh 3 vào ô 2 → trôi về khay, nhắc lại câu ô trước rồi "tiếp theo"
    await page.evaluate(() => window.__behocStory!.drop(3));
    const card3 = page.getByTestId('story-card-3');
    await expect(card3).toHaveAttribute('data-returning', 'true');
    await expect(page.getByTestId('story-slot-1')).not.toHaveAttribute('data-filled', /.*/);
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-1`);
    await expect(card3).not.toHaveAttribute('data-returning', /.*/, { timeout: 2_000 });
    await expect(card3).toBeVisible();
    await expect(game).toHaveAttribute('data-last-say', 'story.next', { timeout: 5_000 });

    // Chạm (không kéo) tranh ở khay: phóng to, không nói đáp án
    await page.getByTestId('story-card-2').click();
    await expect(page.getByTestId('story-card-2')).toHaveAttribute('data-zoom', 'true');
    await expect(game).toHaveAttribute('data-last-say', 'story.next');

    // Kéo thật tranh 2 vào ô 2
    await dragTo(page, page.getByTestId('story-card-2'), page.getByTestId('story-slot-1'));
    await expect(page.getByTestId('story-slot-1')).toHaveAttribute('data-filled', '2');
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-2`);
    await expect(game).toHaveAttribute('data-last-say', 'story.next', { timeout: 5_000 });

    // Kéo thật tranh 3 vào ô 3 → đọc câu 3, rồi kể lại 1, 2, 3 và story.done
    await dragTo(page, page.getByTestId('story-card-3'), page.getByTestId('story-slot-2'));
    await expect(page.getByTestId('story-slot-2')).toHaveAttribute('data-filled', '3');
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-3`);
    for (let n = 1; n <= 3; n++) {
      await expect(game).toHaveAttribute('data-last-say', `story.${story}-${n}`, { timeout: 5_000 });
      await expect(page.getByTestId(`story-slot-${n - 1}`)).toHaveAttribute('data-glow', 'true');
    }
    await expect(game).toHaveAttribute('data-last-say', 'story.done', { timeout: 5_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/shots/T-039-done.png' });

    // 3 giây sau: chuyện mới, khác chuyện vừa rồi
    await expect(game).not.toHaveAttribute('data-story', story, { timeout: 6_000 });
    await expect(page.getByTestId('story-slot-1')).not.toHaveAttribute('data-filled', /.*/);
  });

  test('nút Về nhà quay lại bản đồ', async ({ page }) => {
    await openWithAge(page, 48);
    await openStory(page);
    await page.getByRole('button', { name: 'Về nhà' }).click();
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Chuyện ba tranh (< 36 tháng): 2 tranh', () => {
  test('chỉ 2 ô; thả tranh 3 → kể lại -1, -3 rồi story.done', async ({ page }) => {
    test.setTimeout(45_000);
    await openWithAge(page, 30);
    const { game, story } = await openStory(page);
    await expect(page.getByTestId('story-slot-1')).toBeVisible();
    await expect(page.getByTestId('story-slot-2')).toHaveCount(0);
    await expect(page.getByTestId('story-card-2')).toHaveCount(0);

    await page.evaluate(() => window.__behocStory!.drop(3));
    await expect(page.getByTestId('story-slot-1')).toHaveAttribute('data-filled', '3');
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-3`);
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-1`, { timeout: 5_000 });
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-3`, { timeout: 5_000 });
    await expect(game).toHaveAttribute('data-last-say', 'story.done', { timeout: 5_000 });
  });
});

test.describe('iPhone dọc 430×932: kéo tranh', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo thật tranh 2 vào ô 2', async ({ page }) => {
    test.setTimeout(45_000);
    await openWithAge(page, 48);
    const { game, story } = await openStory(page);
    await dragTo(page, page.getByTestId('story-card-2'), page.getByTestId('story-slot-1'));
    await expect(page.getByTestId('story-slot-1')).toHaveAttribute('data-filled', '2');
    await expect(game).toHaveAttribute('data-last-say', `story.${story}-2`);
    await page.screenshot({ path: 'test-results/shots/T-039-mobile-drag.png' });
  });
});
