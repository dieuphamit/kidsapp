import { test, expect, type Page } from '@playwright/test';
import { openParentArea } from './parent-gate.js';
import { pickGame } from './pick.js';


async function openGameSettings(page: Page) {
  await openParentArea(page);
  await page.getByRole('button', { name: 'Trò chơi', exact: true }).dispatchEvent('pointerdown');
  await expect(page.getByTestId('game-settings')).toBeVisible();
}

async function closeAll(page: Page) {
  await page.getByRole('button', { name: 'Xong' }).dispatchEvent('pointerdown');
  await page.getByRole('button', { name: 'Xong' }).dispatchEvent('pointerup'); // nút màn Trò chơi kích hoạt khi nhả tay
  await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toHaveCount(0);
}

test('khu bố mẹ: tắt Ú òa thì trò biến mất khỏi bản đồ, kệ và màn chọn trò', async ({ page }) => {
  await page.goto('./?e2e=1&menu=shelf');
  await expect(page.getByTestId('shelf-card-peekaboo')).toBeVisible({ timeout: 10_000 });

  await openParentArea(page);
  await page.screenshot({ path: 'test-results/shots/opts-parent.png' });
  await page.getByRole('button', { name: 'Trò chơi', exact: true }).dispatchEvent('pointerdown');
  const panel = page.getByTestId('game-settings');
  await expect(panel).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/opts-settings.png' });

  // Nút trong danh sách đều ≥120px và cách mép phải ≥144px (cổng phụ huynh)
  const boxes = await panel.getByRole('button').evaluateAll((els) =>
    els.map((e) => ({ w: (e as HTMLElement).offsetWidth, h: (e as HTMLElement).offsetHeight, right: e.getBoundingClientRect().right })),
  );
  for (const b of boxes) {
    expect(b.w).toBeGreaterThanOrEqual(120);
    expect(b.h).toBeGreaterThanOrEqual(120);
    expect(b.right).toBeLessThanOrEqual(1194 - 144);
  }

  const toggle = page.getByRole('button', { name: 'Ú òa: Đang bật' });
  await toggle.scrollIntoViewIfNeeded();
  await toggle.dispatchEvent('pointerdown');
  await toggle.dispatchEvent('pointerup'); // nút màn Trò chơi kích hoạt khi nhả tay
  await expect(page.getByRole('button', { name: 'Ú òa: Đang tắt' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('opt-peekaboo').screenshot({ path: 'test-results/shots/opts-off.png' });
  await closeAll(page);

  // Kệ đồ chơi
  await expect(page.getByTestId('shelf-card-peekaboo')).toHaveCount(0);
  await expect(page.getByTestId('shelf-card-shadow')).toBeVisible();

  // Màn chọn trò của Hồ nước, khu có Ú òa (đọc lại tùy chọn đã lưu sau khi tải lại trang)
  await page.goto('./?menu=map&e2e=1&picker=pond');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('pick-sound-quiz')).toBeVisible();
  await expect(page.getByTestId('pick-peekaboo')).toHaveCount(0);
  await expect(page.locator('[data-testid^="pick-"]')).toHaveCount(2); // bath, sound-quiz
  await page.waitForTimeout(1200); // chờ thẻ hiện hết
  await page.screenshot({ path: 'test-results/shots/opts-picker.png' });
});

test('đặt Khó cho Lật hình thì bé 28 tháng nhận 6 thẻ thay vì 4', async ({ page }) => {
  await page.goto('./?menu=map&e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });

  // Mặc định theo tuổi (28 tháng): 2 cặp
  await page.getByLabel('Góc đố').click();
  await pickGame(page, 'memory');
  const game = page.getByTestId('game-memory');
  await expect(game.locator('[data-flipped]')).toHaveCount(4, { timeout: 10_000 });

  await page.goto('./?menu=map&e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await openGameSettings(page);
  const hard = page.getByRole('button', { name: 'Lật hình: Khó' });
  await hard.scrollIntoViewIfNeeded();
  await hard.dispatchEvent('pointerdown');
  await hard.dispatchEvent('pointerup'); // nút màn Trò chơi kích hoạt khi nhả tay
  await expect(hard).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('opt-memory').screenshot({ path: 'test-results/shots/opts-hard.png' });
  await closeAll(page);

  await page.getByLabel('Góc đố').click();
  await pickGame(page, 'memory');
  await expect(game.locator('[data-flipped]')).toHaveCount(6, { timeout: 10_000 });
  await page.screenshot({ path: 'test-results/shots/opts-memory-hard.png' });
});

test('Tất cả trò: chọn Khó một lần thì mọi trò thành Khó (Lật hình 6 thẻ), chọn chủ đề chung; chụp opts-all.png', async ({ page }) => {
  await page.goto('./?menu=map&e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });
  await openGameSettings(page);
  const all = page.getByTestId('opt-all');
  await expect(all).toBeVisible();
  const press = async (name: string) => {
    const b = page.getByRole('button', { name });
    await b.dispatchEvent('pointerdown');
    await b.dispatchEvent('pointerup'); // nút màn Trò chơi kích hoạt khi nhả tay
  };
  await press('Tất cả trò: Khó');
  await expect(page.getByRole('button', { name: 'Tất cả trò: Khó' })).toHaveAttribute('aria-pressed', 'true');
  for (const t of ['Lật hình', 'Ghép hình', 'Tiệm bánh']) {
    await expect(page.getByRole('button', { name: `${t}: Khó` })).toHaveAttribute('aria-pressed', 'true');
  }
  await press('Tất cả trò: Trái cây');
  await expect(page.getByRole('button', { name: 'Tất cả trò: Trái cây' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Lật hình: Trái cây' })).toHaveAttribute('aria-pressed', 'true');
  // khung Tất cả trò nằm trong vùng an toàn: cách mép phải ≥144px (cổng bố mẹ)
  const right = await all.getByRole('button').evaluateAll((els) => Math.max(...els.map((e) => (e as HTMLElement).getBoundingClientRect().right)));
  expect(right).toBeLessThanOrEqual(1194 - 144);
  await page.screenshot({ path: 'test-results/shots/opts-all.png' });
  await closeAll(page);

  // Lưu thật: vào Lật hình (bé 28 tháng) nhận 6 thẻ như mức Khó
  await page.getByLabel('Góc đố').click();
  await pickGame(page, 'memory');
  await expect(page.getByTestId('game-memory').locator('[data-flipped]')).toHaveCount(6, { timeout: 10_000 });
});
