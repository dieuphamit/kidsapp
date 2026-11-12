// Đi hết 11 trò từ bản đồ theo 5 khu mới (T-034), mỗi trò Về nhà quay lại bản đồ
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

// [id trong manifest, nhãn khu trên bản đồ, data-testid gốc của trò]
const ROUTES: [string, string, string][] = [
  ['animals', 'Thế giới thú', 'game-animals'],
  ['zoo3d', 'Thế giới thú', 'game-zoo'],
  ['sound-quiz', 'Thế giới thú', 'game-sound-quiz'],
  ['shadow', 'Thế giới thú', 'game-shadow'],
  ['peekaboo', 'Thế giới thú', 'game-peekaboo'],
  ['counting', 'Vườn quả', 'game-counting'],
  ['sort', 'Vườn quả', 'game-sort'],
  ['shapes', 'Vườn quả', 'game-shapes'],
  ['memory', 'Góc đố', 'game-memory'],
  ['puzzle', 'Góc đố', 'game-puzzle'],
  ['music', 'Nhà âm nhạc', 'game-music'],
];

for (const [id, place, root] of ROUTES) {
  test(`bản đồ → ${place} → ${id} → Về nhà`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();
    await page.getByLabel(place, { exact: true }).click();
    await pickGame(page, id);
    await expect(page.getByTestId(root)).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('Về nhà').first().click();
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 5000 });
    // vừa chơi xong thì có nút chơi lại đúng trò
    await expect(page.getByTestId('replay')).toHaveAttribute('data-game', id);
    expect(errors).toEqual([]);
  });
}
