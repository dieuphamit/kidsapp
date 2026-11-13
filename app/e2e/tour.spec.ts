// T-042: đi hết 18 trò ở cả hai kiểu menu (bản đồ 5 khu và kệ đồ chơi); mỗi trò Về nhà quay lại đúng menu.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

// [id trong manifest, nhãn khu trên bản đồ, data-testid gốc của trò]
const ROUTES: [string, string, string][] = [
  ['world', 'Thế giới thú', 'game-world'],
  ['animals', 'Thế giới thú', 'game-animals'],
  ['zoo3d', 'Thế giới thú', 'game-zoo'],
  ['sound-quiz', 'Thế giới thú', 'game-sound-quiz'],
  ['shadow', 'Thế giới thú', 'game-shadow'],
  ['peekaboo', 'Thế giới thú', 'game-peekaboo'],
  ['hide', 'Nhà Đậu Đậu', 'game-hide'],
  ['story', 'Nhà Đậu Đậu', 'game-story'],
  ['bakery', 'Nhà Đậu Đậu', 'game-bakery'],
  ['counting', 'Vườn quả', 'game-counting'],
  ['sort', 'Vườn quả', 'game-sort'],
  ['shapes', 'Vườn quả', 'game-shapes'],
  ['pattern', 'Vườn quả', 'game-pattern'],
  ['memory', 'Góc đố', 'game-memory'],
  ['puzzle', 'Góc đố', 'game-puzzle'],
  ['path', 'Góc đố', 'game-path'],
  ['music', 'Nhà âm nhạc', 'game-music'],
  ['band', 'Nhà âm nhạc', 'game-band'],
];

/** Tuổi mặc định 28 tháng ẩn story, pattern, path: ghi tuổi 48 tháng vào idb-keyval trước khi vào app. */
async function setAge(page: Page, ageMonths: number) {
  await page.goto('./?e2e=1');
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

for (const [id, place, root] of ROUTES) {
  test(`${id}: bản đồ → ${place} → trò → Về nhà; kệ → trò → Về nhà`, async ({ page }) => {
    test.setTimeout(120_000); // trò 3D chạy WebGL phần mềm
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await setAge(page, 48);

    // Kiểu bản đồ
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();
    await page.getByLabel(place, { exact: true }).click();
    await pickGame(page, id);
    await expect(page.getByTestId(root)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/shots/T-042-${id}.png` });
    await page.getByLabel('Về nhà').first().click();
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 5000 });
    // vừa chơi xong thì có nút chơi lại đúng trò
    await expect(page.getByTestId('replay')).toHaveAttribute('data-game', id);

    // Kiểu kệ đồ chơi
    await page.goto('./?e2e=1&menu=shelf');
    await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 5000 });
    await page.getByTestId(`shelf-card-${id}`).getByRole('button').click();
    await expect(page.getByTestId(root)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Về nhà').first().click();
    await expect(page.getByTestId('shelf')).toBeVisible({ timeout: 5000 });

    expect(errors).toEqual([]);
  });
}
