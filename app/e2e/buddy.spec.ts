// E2E Bạn đồng hành: chọn con vật + tên trong khu bố mẹ → màn chính, trò Trốn ở đâu theo nhân vật/tên mới.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

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

/** Ghi lại file giọng đọc mà trình phát (Howler, XHR) tải; bỏ qua lượt nạp sẵn cache (fetch). */
function recordSpeech(page: Page): string[] {
  const speech: string[] = [];
  page.on('request', (r) => {
    const m = /\/audio\/(vi|ja|en)\/[^/]+\.mp3/.exec(r.url());
    if (m && r.resourceType() !== 'fetch') speech.push(decodeURIComponent(m[0]));
  });
  return speech;
}

/** Đặt thẳng settings trong IndexedDB (idb-keyval: keyval-store/keyval) rồi tải lại. */
async function setBuddy(page: Page, character: string, name: string) {
  await page.evaluate(
    ([character, name]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onupgradeneeded = () => open.result.createObjectStore('keyval');
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(
            { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map', buddy: { character, name } },
            'behoc.settings',
          );
          tx.oncomplete = () => { open.result.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      }),
    [character, name],
  );
}

test('chọn thỏ + Mi Mi → màn chính hiện thỏ, Trốn ở đâu đọc file của Mi Mi; chụp buddy-chon, buddy-home-bunny', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('buddy')).toHaveAttribute('data-character', 'cat');
  await openParentArea(page);
  await page.getByRole('button', { name: 'Bạn đồng hành' }).dispatchEvent('pointerdown');
  const panel = page.getByTestId('buddy-settings');
  await expect(panel).toBeVisible();

  // nút ≥120px, cách nhau ≥24px, chừa 144px mép phải (cổng bố mẹ), nằm trọn khung
  const boxes = await panel.getByRole('button').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { w: (e as HTMLElement).offsetWidth, h: (e as HTMLElement).offsetHeight, x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }),
  );
  expect(boxes).toHaveLength(1 + 4 + 8);
  for (const b of boxes) {
    expect(b.w).toBeGreaterThanOrEqual(120);
    expect(b.h).toBeGreaterThanOrEqual(120);
    expect(b.right).toBeLessThanOrEqual(1194 - 144);
    expect(b.bottom).toBeLessThanOrEqual(834);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      const gapX = Math.max(b.x - a.right, a.x - b.right);
      const gapY = Math.max(b.y - a.bottom, a.y - b.bottom);
      expect(Math.max(gapX, gapY), `nút ${i} và ${j} quá sát`).toBeGreaterThanOrEqual(23.5);
    }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/shots/buddy-settings.png' });

  const speech = recordSpeech(page);
  await page.getByRole('button', { name: 'Con vật: Thỏ' }).click();
  await expect(panel).toHaveAttribute('data-character', 'bunny');
  await page.getByRole('button', { name: 'Tên: Mi Mi' }).click();
  await expect(panel).toHaveAttribute('data-name', 'mimi');
  await expect(panel).toHaveAttribute('data-last-say', 'buddy.hello');
  await expect(page.getByRole('button', { name: 'Tên: Mi Mi' })).toHaveAttribute('aria-pressed', 'true');
  // nói thử bằng tên mới
  await expect.poll(() => speech, { timeout: 5000 }).toContain('/audio/vi/buddy.hello~mimi.mp3');
  await page.waitForTimeout(1000); // đang vẫy tay
  await page.screenshot({ path: 'test-results/shots/buddy-chon.png' });

  await page.getByRole('button', { name: 'Xong' }).click();
  await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toHaveCount(0);

  // màn chính: thỏ tên Mi Mi; khu nhà mang tên mới
  const buddy = page.getByTestId('buddy');
  await expect(buddy).toHaveAttribute('data-character', 'bunny');
  await expect(buddy).toHaveAttribute('data-name', 'mimi');
  await expect(page.getByRole('img', { name: 'Mi Mi' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nhà Mi Mi' })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/shots/buddy-home-bunny.png' });

  // tải lại vẫn giữ lựa chọn; vào Trốn ở đâu
  await page.goto('./?e2e=1&picker=house');
  await expect(page.getByRole('button', { name: 'Mi Mi trốn ở đâu?' })).toBeVisible({ timeout: 10_000 });
  const speech2 = recordSpeech(page);
  await pickGame(page, 'hide');
  const game = page.getByTestId('game-hide');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'hide.hello', { timeout: 3000 });
  await expect.poll(() => speech2, { timeout: 5000 }).toContain('/audio/vi/hide.hello~mimi.mp3');
  expect(speech2).not.toContain('/audio/vi/hide.hello.mp3');
  await expect(page.getByTestId('hide-daudau').locator('img')).toHaveAttribute('src', /cards\/buddy-bunny\.png$/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/buddy-hide-bunny.png' });
});

for (const [character, name, label] of [
  ['cat', 'dau', 'Đậu Đậu'],
  ['dog', 'tom', 'Tôm'],
  ['bear', 'nana', 'Na Na'],
] as const) {
  test(`màn chính với ${character} (${label}); chụp buddy-home-${character}`, async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
    await setBuddy(page, character, name);
    await page.reload();
    const buddy = page.getByTestId('buddy');
    await expect(buddy).toHaveAttribute('data-character', character, { timeout: 10_000 });
    await expect(page.getByRole('img', { name: label })).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `test-results/shots/buddy-home-${character}.png` });
  });
}

test('tên đang chọn chạy offline: bộ giọng đọc của tên được nạp sẵn vào cache', async ({ page, context }) => {
  test.setTimeout(180_000);
  await page.goto('./?e2e=1&picker=house');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await setBuddy(page, 'dog', 'kiki');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ki Ki trốn ở đâu?' })).toBeVisible({ timeout: 10_000 });
  // đủ 93 câu có tên × 3 ngôn ngữ (E4 thêm 36 câu: chuyện, phòng mới của Trốn ở đâu)
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.open('buddy-audio')).keys()).length), { timeout: 90_000 })
    .toBe(93 * 3);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ki Ki trốn ở đâu?' })).toBeVisible({ timeout: 10_000 });
  const status = await page.evaluate(async () => {
    const r = await fetch('audio/ja/hide.hello~kiki.mp3'); // tương đối với /kidsapp/
    return r.status;
  });
  expect(status).toBe(200);
});
