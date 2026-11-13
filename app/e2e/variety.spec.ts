// E2: đa dạng nội dung + chủ đề cho sound-quiz, shadow, sort, memory, puzzle.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

type Opt = { enabled: boolean; difficulty: 'auto' | 'easy' | 'medium' | 'hard'; topic: string };

/** Ghi thẳng tùy chọn trò vào IndexedDB (như khu bố mẹ lưu) rồi mở màn chọn trò của khu. */
async function openWith(page: Page, place: string, gameId: string, games: Record<string, Opt>) {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await page.evaluate(
    (games) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('keyval-store');
        req.onupgradeneeded = () => req.result.createObjectStore('keyval');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(
            { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map', games },
            'behoc.settings',
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    games,
  );
  await page.goto(`./?e2e=1&picker=${place}`);
  await pickGame(page, gameId);
  const game = page.getByTestId(`game-${gameId}`);
  await expect(game).toBeVisible({ timeout: 10_000 });
  return game;
}

const on = (difficulty: Opt['difficulty'], topic = 'mix'): Opt => ({ enabled: true, difficulty, topic });

test('Ai kêu đấy? mức Khó: 4 thẻ, đáp án không lặp lại liền nhau', async ({ page }) => {
  const game = await openWith(page, 'zoo', 'sound-quiz', { 'sound-quiz': on('hard') });
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(4);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/E2-sound-quiz.png' });

  const answer = () =>
    page.evaluate(() => (window as Window & { __behocQuiz?: { answer(): string } }).__behocQuiz?.answer() ?? '');
  const seen: string[] = [];
  for (let i = 0; i < 4; i++) {
    const a = await answer();
    expect(a).not.toBe('');
    expect(seen.slice(-4), `ván ${i}`).not.toContain(a);
    seen.push(a);
    await page.getByTestId(`card-${a}`).dispatchEvent('pointerdown');
    await expect(game).toHaveAttribute('data-last-say', `animal.${a}`);
    await expect.poll(answer, { timeout: 5000 }).not.toBe(a);
    await expect(page.locator('[data-testid^="card-"]')).toHaveCount(4);
  }
});

test('Bóng của ai? chủ đề Hình & màu: bóng hình khối, thả đúng đọc shape.<id>', async ({ page }) => {
  const game = await openWith(page, 'zoo', 'shadow', { shadow: on('hard', 'shapes') });
  await expect(game).toHaveAttribute('data-last-say', 'shadow.hello-thing', { timeout: 3000 });
  const cards = page.locator('[data-testid^="card-"]');
  await expect(cards).toHaveCount(4);
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('card-', '')));
  for (const id of ids) {
    expect(['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval', 'moon']).toContain(id);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/E2-shadow.png' });

  const answer = await page.evaluate(() =>
    (window as unknown as { __behocShadow: { answer(): string } }).__behocShadow.answer(),
  );
  await page.evaluate(() => {
    const s = (window as unknown as { __behocShadow: { answer(): string; drop(id: string): void } }).__behocShadow;
    s.drop(s.answer());
  });
  await expect(game).toHaveAttribute('data-last-say', `shape.${answer}`, { timeout: 2000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/shots/E2-shadow-done.png' });
});

type SortHook = {
  fruits(): { id: string; color: string }[];
  baskets(): string[];
  mode(): string;
  sayFor(i: number): string;
  drop(i: number, color: string): void;
};

test('Xếp vào giỏ kiểu To / nhỏ: giỏ to và giỏ nhỏ, xếp hết', async ({ page }) => {
  const game = await openWith(page, 'orchard', 'sort', { sort: on('hard', 'sizes') });
  await expect(game).toHaveAttribute('data-last-say', 'sort.hello-sizes', { timeout: 3000 });
  const sort = () => page.evaluate(() => (window as unknown as { __behocSort: SortHook }).__behocSort.baskets());
  expect(await sort()).toEqual(['big', 'small']);
  const fruits = await page.evaluate(() => (window as unknown as { __behocSort: SortHook }).__behocSort.fruits());
  expect(fruits).toHaveLength(8);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/E2-sort.png' });

  const say0 = await page.evaluate(() => (window as unknown as { __behocSort: SortHook }).__behocSort.sayFor(0));
  expect(['sort.big', 'sort.small']).toContain(say0);
  for (let i = 0; i < fruits.length; i++) {
    await page.evaluate(
      ({ i, c }) => (window as unknown as { __behocSort: SortHook }).__behocSort.drop(i, c),
      { i, c: fruits[i].color },
    );
    await page.waitForTimeout(150);
  }
  await expect(game).toHaveAttribute('data-last-say', 'sort.done', { timeout: 3000 });
});

test('Xếp vào giỏ kiểu Thú / quả: giỏ con vật và giỏ trái cây', async ({ page }) => {
  const game = await openWith(page, 'orchard', 'sort', { sort: on('medium', 'kinds') });
  await expect(game).toHaveAttribute('data-last-say', 'sort.hello-kinds', { timeout: 3000 });
  const baskets = await page.evaluate(() => (window as unknown as { __behocSort: SortHook }).__behocSort.baskets());
  expect(baskets).toEqual(['animal', 'fruit']);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/shots/E2-sort-kinds.png' });
});

test('Lật hình chủ đề Hình & màu: toàn thẻ hình khối', async ({ page }) => {
  const game = await openWith(page, 'puzzle', 'memory', { memory: on('medium', 'shapes') });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/shots/E2-memory.png' });
  const ids = await page.evaluate(
    () => (window as Window & { __behocMemory?: { reveal(): string[] } }).__behocMemory?.reveal() ?? [],
  );
  expect(ids.length).toBeGreaterThanOrEqual(6);
  for (const id of ids) {
    expect(['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval', 'moon']).toContain(id);
  }
  await expect(game).toBeVisible();
});

test('Ghép hình chủ đề Hình & màu: ghép xong đọc tên hình', async ({ page }) => {
  const game = await openWith(page, 'puzzle', 'puzzle', { puzzle: on('easy', 'shapes') });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/E2-puzzle.png' });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle!.solveOne());
    await page.waitForTimeout(150);
  }
  await expect(game).toHaveAttribute('data-last-say', /^shape\./, { timeout: 4000 });
  await page.screenshot({ path: 'test-results/shots/E2-puzzle-done.png' });
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo thật: Xếp vào giỏ kiểu Thú / quả', async ({ page }) => {
    const game = await openWith(page, 'orchard', 'sort', { sort: on('easy', 'kinds') });
    await page.waitForTimeout(600);
    const { fruits, say } = await page.evaluate(() => {
      const s = (window as unknown as { __behocSort: SortHook }).__behocSort;
      return { fruits: s.fruits(), say: s.sayFor(0) };
    });
    const from = await page.getByLabel('Quả 1').boundingBox();
    const to = await page.locator(`[data-color="${fruits[0].color}"]`).boundingBox();
    expect(from && to).toBeTruthy();
    const sx = from!.x + from!.width / 2;
    const sy = from!.y + from!.height / 2;
    const ex = to!.x + to!.width / 2;
    const ey = to!.y + to!.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(sx + ((ex - sx) * i) / 10, sy + ((ey - sy) * i) / 10);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await expect(game).toHaveAttribute('data-last-say', say, { timeout: 2000 });
    await page.screenshot({ path: 'test-results/shots/E2-sort-mobile.png' });
  });
});

test('khu bố mẹ: Xếp vào giỏ có chủ đề Theo màu / Thú / quả / To / nhỏ; Bóng của ai? có Hình & màu', async ({ page }) => {
  // Kệ đồ chơi (không có bản đồ 3D) để cổng phụ huynh đứng yên
  await page.goto('./?e2e=1&menu=shelf');
  await expect(page.getByTestId('shelf-card-sort')).toBeVisible({ timeout: 10_000 });
  const gate = page.getByRole('button', { name: 'Khu phụ huynh' });
  await gate.dispatchEvent('pointerdown');
  await page.waitForTimeout(3300);
  await gate.dispatchEvent('pointerup');
  const confirm = page.getByRole('dialog', { name: 'Xác nhận phụ huynh' });
  await expect(confirm).toBeVisible({ timeout: 2000 });
  const q = await confirm.locator('span').first().textContent();
  const [a, b] = (q ?? '').match(/\d+/g)!.map(Number);
  await page.getByLabel('Đáp án').fill(String(a + b));
  await page.getByRole('button', { name: 'Mở' }).click();
  await page.getByRole('button', { name: 'Trò chơi', exact: true }).dispatchEvent('pointerdown');
  await expect(page.getByTestId('game-settings')).toBeVisible();

  const row = page.getByTestId('opt-sort');
  await row.scrollIntoViewIfNeeded();
  for (const t of ['Trộn', 'Theo màu', 'Thú / quả', 'To / nhỏ']) {
    await expect(row.getByRole('button', { name: `Xếp vào giỏ: ${t}` })).toBeVisible();
  }
  await row.getByRole('button', { name: 'Xếp vào giỏ: To / nhỏ' }).dispatchEvent('pointerdown');
  await row.getByRole('button', { name: 'Xếp vào giỏ: To / nhỏ' }).dispatchEvent('pointerup'); // nút màn Trò chơi kích hoạt khi nhả tay
  await expect(row.getByRole('button', { name: 'Xếp vào giỏ: To / nhỏ' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('opt-shadow').getByRole('button', { name: 'Bóng của ai?: Hình & màu' })).toHaveCount(1);
  await row.screenshot({ path: 'test-results/shots/E2-settings.png' });
});
