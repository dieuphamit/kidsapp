import { test, expect, type Page } from '@playwright/test';
import { pickGame } from './pick.js';

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

  // Màn chọn trò của khu thú (đọc lại tùy chọn đã lưu sau khi tải lại trang)
  await page.goto('./?e2e=1&picker=zoo');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('pick-shadow')).toBeVisible();
  await expect(page.getByTestId('pick-peekaboo')).toHaveCount(0);
  await expect(page.locator('[data-testid^="pick-"]')).toHaveCount(5); // world, animals, zoo3d, sound-quiz, shadow
  await page.waitForTimeout(1200); // chờ thẻ hiện hết
  await page.screenshot({ path: 'test-results/shots/opts-picker.png' });
});

test('đặt Khó cho Lật hình thì bé 28 tháng nhận 6 thẻ thay vì 4', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 10_000 });

  // Mặc định theo tuổi (28 tháng): 2 cặp
  await page.getByLabel('Góc đố').click();
  await pickGame(page, 'memory');
  const game = page.getByTestId('game-memory');
  await expect(game.locator('[data-flipped]')).toHaveCount(4, { timeout: 10_000 });

  await page.goto('./?e2e=1');
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
