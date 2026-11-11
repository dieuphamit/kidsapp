import { expect, type Page } from '@playwright/test';

/**
 * Sau khi chạm một địa điểm: nếu địa điểm có nhiều trò thì bảng chọn trò hiện ra,
 * hàm này chạm đúng trò `gameId` (id trong manifest). Nếu vào thẳng game thì không làm gì.
 */
export async function pickGame(page: Page, gameId: string): Promise<void> {
  const picker = page.getByTestId('game-picker');
  const anyGame = page.locator('[data-testid^="game-"]:not([data-testid="game-picker"])');
  await expect(picker.or(anyGame).first()).toBeVisible({ timeout: 10_000 });
  if (await picker.isVisible()) {
    await page.getByTestId(`pick-${gameId}`).click();
    await expect(picker).toBeHidden({ timeout: 10_000 });
  }
}
