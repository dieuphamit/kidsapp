import { expect, type Page } from '@playwright/test';

/**
 * Sau khi chạm một địa điểm: nếu địa điểm có nhiều trò thì bảng chọn trò hiện ra,
 * hàm này chạm đúng trò `gameId` (id trong manifest). Ở menu đoàn tàu (đã chạm tab khu) thì chạm ▶ trên toa
 * của trò. Nếu vào thẳng game thì không làm gì.
 */
export async function pickGame(page: Page, gameId: string): Promise<void> {
  const picker = page.getByTestId('game-picker');
  const train = page.getByTestId('train-menu');
  const anyGame = page.locator('[data-testid^="game-"]:not([data-testid="game-picker"])');
  await expect(picker.or(train).or(anyGame).first()).toBeVisible({ timeout: 10_000 });
  if (await picker.isVisible()) {
    await page.getByTestId(`pick-${gameId}`).click();
    await expect(picker).toBeHidden({ timeout: 10_000 });
  } else if (await train.isVisible()) {
    // menu đoàn tàu: chạm nút ▶ trên toa của trò (Playwright tự cuộn toa vào khung nếu khuất)
    await page.getByTestId(`train-car-${gameId}`).getByRole('button').click();
    await expect(train).toBeHidden({ timeout: 10_000 });
  }
}
