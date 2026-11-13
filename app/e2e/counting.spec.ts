import { test, expect, type Page } from '@playwright/test';
import { pickGame } from './pick.js';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const shotsDir = join(process.cwd(), 'test-results', 'shots');

test.beforeAll(() => {
  if (!existsSync(shotsDir)) {
    mkdirSync(shotsDir, { recursive: true });
  }
});

/** Vào Vườn quả → Đếm số. `query` thêm vào URL (vd `e2e=1&level=hard&topic=fruits`). */
async function openCounting(page: Page, query = '') {
  if (query.includes('e2e=1')) {
    // Bảng chọn trò của Vườn quả mở thẳng (trang 2D, không phụ thuộc bản đồ 3D)
    await page.goto(`./?${query}&picker=orchard`);
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('pick-counting').click();
  } else {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();
    const orchardBtn = page.getByLabel('Vườn quả');
    await expect(orchardBtn).toBeVisible();
    await orchardBtn.tap();
    await pickGame(page, 'counting');
  }
  const gameRoot = page.getByTestId('game-counting');
  await expect(gameRoot).toBeVisible();
  return gameRoot;
}

const HARD_FRUITS = 'e2e=1&level=hard&topic=fruits';

test.describe('Counting game', () => {
  test('chạm Vườn quả mở game counting (khó, trái cây: cây 10 quả), chụp T-013-tree.png', async ({ page }) => {
    const gameRoot = await openCounting(page, HARD_FRUITS);
    await expect(gameRoot).toHaveAttribute('data-shown', '10');
    await expect(gameRoot).toHaveAttribute('data-kind', 'fruits');

    // Đợi 600ms cho ổn định
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/T-013-tree.png' });
  });

  test('mức khó: 10 nút quả đều ≥120×120', async ({ page }) => {
    await openCounting(page, HARD_FRUITS);

    for (let i = 1; i <= 10; i++) {
      const fruitBtn = page.getByLabel(`Quả ${i}`, { exact: true });
      await expect(fruitBtn).toBeVisible();
      const box = await fruitBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(120);
      expect(box!.height).toBeGreaterThanOrEqual(120);
    }
  });

  test('chạm quả 3 → number.1, chạm quả 7 → number.2, chụp T-013-basket.png', async ({ page }) => {
    const gameRoot = await openCounting(page, HARD_FRUITS);

    // Chạm quả 3
    const fruit3 = page.getByLabel('Quả 3');
    await fruit3.tap();
    await expect(gameRoot).toHaveAttribute('data-last-say', 'number.1');

    // Chạm quả 7
    await page.waitForTimeout(150);
    const fruit7 = page.getByLabel('Quả 7');
    await fruit7.tap();
    await expect(gameRoot).toHaveAttribute('data-last-say', 'number.2');

    // Chụp ảnh giỏ có 2 quả
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'test-results/shots/T-013-basket.png' });
  });

  test('mức khó: hái đúng số Đậu Đậu nói → number.N rồi khen; quả còn lại không đếm thêm', async ({ page }) => {
    const gameRoot = await openCounting(page, HARD_FRUITS);
    const target = Number(await gameRoot.getAttribute('data-target'));
    expect(target).toBeGreaterThanOrEqual(2);
    expect(target).toBeLessThanOrEqual(10);
    // Đậu Đậu nói số cần lấy
    await expect(gameRoot).toHaveAttribute('data-last-say', `number.${target}`, { timeout: 5000 });

    for (let i = 1; i <= target; i++) {
      await page.getByLabel(`Quả ${i}`, { exact: true }).tap();
      await page.waitForTimeout(150);
    }
    await expect(gameRoot).toHaveAttribute('data-last-say', `number.${target}`);
    if (target < 10) {
      // đủ rồi: chạm thêm chỉ lắc, không đếm
      await page.getByLabel('Quả 10', { exact: true }).tap();
      await expect(gameRoot).toHaveAttribute('data-last-say', `number.${target}`);
    }
    const done = target === 10 ? 'count.done' : 'count.all';
    await expect(gameRoot).toHaveAttribute('data-last-say', done, { timeout: 2500 });
  });

  test('mặc định (bé 28 tháng, dễ): 1–3 món, hái hết → khen, rồi lượt mới khác món; chụp E3-counting.png', async ({ page }) => {
    const gameRoot = await openCounting(page, 'e2e=1');
    await expect(gameRoot).toHaveAttribute('data-level', 'easy');
    const target = Number(await gameRoot.getAttribute('data-target'));
    expect(target).toBeGreaterThanOrEqual(1);
    expect(target).toBeLessThanOrEqual(3);
    await expect(gameRoot).toHaveAttribute('data-shown', String(target));
    const item = await gameRoot.getAttribute('data-item');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/E3-counting.png' });

    const kind = await gameRoot.getAttribute('data-kind');
    const prefix = kind === 'fruits' ? 'Quả' : kind === 'animals' ? 'Bạn' : 'Hình';
    for (let i = 1; i <= target; i++) {
      await page.getByLabel(`${prefix} ${i}`, { exact: true }).tap();
      await page.waitForTimeout(150);
    }
    await expect(gameRoot).toHaveAttribute('data-last-say', 'count.all', { timeout: 2500 });
    // Lượt mới: món khác
    await expect(gameRoot).not.toHaveAttribute('data-item', item!, { timeout: 6000 });
  });

  test('chủ đề con vật (vừa) và hình (vừa); chụp ảnh', async ({ page }) => {
    const animals = await openCounting(page, 'e2e=1&level=medium&topic=animals');
    await expect(animals).toHaveAttribute('data-kind', 'animals');
    const t = Number(await animals.getAttribute('data-target'));
    expect(t).toBeGreaterThanOrEqual(2);
    expect(t).toBeLessThanOrEqual(5);
    await page.getByLabel('Bạn 1', { exact: true }).tap();
    await expect(animals).toHaveAttribute('data-last-say', 'number.1');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/shots/E3-counting-animals.png' });

    const shapes = await openCounting(page, 'e2e=1&level=hard&topic=shapes');
    await expect(shapes).toHaveAttribute('data-kind', 'shapes');
    await expect(page.getByLabel('Hình 10', { exact: true })).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/E3-counting-shapes.png' });
  });

  test('nút Về nhà trở về home', async ({ page }) => {
    await openCounting(page);

    const backBtn = page.getByRole('button', { name: 'Về nhà' });
    await expect(backBtn).toBeVisible();
    await backBtn.tap();

    await expect(page.getByTestId('home')).toBeVisible();
  });
});
