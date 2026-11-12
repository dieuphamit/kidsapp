import { test, expect } from '@playwright/test';
import { pickGame } from './pick.js';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Đường dẫn tuyệt đối đến thư mục shots
const __dirname = dirname(fileURLToPath(import.meta.url));
const shotsDir = join(__dirname, '..', 'test-results', 'shots');
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test.describe('Peekaboo game', () => {
  test('vào Sở thú → Ú òa và chụp T-026-bushes.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Chạm nút Sở thú - vì chỉ có 1 game trong place.zoo, sẽ vào thẳng game
    const zooBtn = page.getByLabel('Sở thú');
    await expect(zooBtn).toBeVisible({ timeout: 10000 });
    await zooBtn.click();
    await pickGame(page, 'peekaboo');

    // Game peekaboo hiện (vào thẳng vì chỉ có 1 game trong Sở thú)
    const gameEl = page.getByTestId('game-peekaboo');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Chờ game khởi tạo (data-last-say có giá trị)
    await expect(gameEl).toHaveAttribute('data-last-say', 'peek.hello', { timeout: 5000 });

    // Chụp ảnh bụi cây
    await page.screenshot({ path: join(shotsDir, 'T-026-bushes.png') });
  });

  test('chạm bụi trống → peek.empty', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Vào Sở thú - vào thẳng game vì chỉ có 1 game
    await page.getByLabel('Sở thú').click();
    await pickGame(page, 'peekaboo');

    const gameEl = page.getByTestId('game-peekaboo');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-last-say', 'peek.hello', { timeout: 5000 });

    // Lấy vị trí bụi đúng
    const answer = await page.evaluate(() => {
      const w = window as Window & { __behocPeek?: { answer(): number } };
      return w.__behocPeek?.answer() ?? -1;
    });

    // Chạm bụi KHÁC bụi đúng
    const wrongBush = (answer + 1) % 3; // 3 bụi cho e2e mặc định (ageMonths từ storage)
    const bush = page.getByTestId(`bush-${wrongBush}`);
    await expect(bush).toBeVisible();
    await bush.click();

    // data-last-say phải là peek.empty
    await expect(gameEl).toHaveAttribute('data-last-say', 'peek.empty', { timeout: 3000 });
  });

  test('chạm bụi đúng → thú phóng to giữa màn hình, nói tên rồi kêu, chụp T-026-found.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Vào Sở thú - vào thẳng game vì chỉ có 1 game
    await page.getByLabel('Sở thú').click();
    await pickGame(page, 'peekaboo');

    const gameEl = page.getByTestId('game-peekaboo');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-last-say', 'peek.hello', { timeout: 5000 });

    // Lấy vị trí bụi đúng
    const answer = await page.evaluate(() => {
      const w = window as Window & { __behocPeek?: { answer(): number } };
      return w.__behocPeek?.answer() ?? -1;
    });
    expect(answer).toBeGreaterThanOrEqual(0);

    // Chạm bụi đúng
    const bush = page.getByTestId(`bush-${answer}`);
    await expect(bush).toBeVisible();
    await bush.click();

    // data-last-say phải là peek.found
    await expect(gameEl).toHaveAttribute('data-last-say', 'peek.found', { timeout: 3000 });

    // Thú phóng to ra giữa màn hình
    const reveal = page.getByTestId('peek-reveal');
    await expect(reveal).toBeVisible();
    const id = await reveal.getAttribute('data-animal');
    expect(id).toBeTruthy();

    // Sau "Ú òa!" là tên thú
    await expect(gameEl).toHaveAttribute('data-last-say', `animal.${id}`, { timeout: 3000 });

    // Lúc thú đã to ở giữa: ảnh rộng hơn hẳn bụi (200px) và tâm gần tâm khung 1194×834
    await page.waitForTimeout(600);
    const box = await reveal.locator('img').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(400);
    expect(Math.abs(box!.x + box!.width / 2 - 597)).toBeLessThan(40);
    expect(Math.abs(box!.y + box!.height / 2 - 417)).toBeLessThan(60);
    await page.screenshot({ path: join(shotsDir, 'T-026-found.png') });

    // Rồi tới tiếng kêu thật của đúng con thú đó
    await expect(gameEl).toHaveAttribute('data-last-say', `animal.${id}-sound`, { timeout: 3000 });

    // Thú về lại bụi, sang ván mới
    await expect(reveal).toBeHidden({ timeout: 5000 });
  });

  test('mọi bụi có kích thước >= 120px', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Vào Sở thú - vào thẳng game vì chỉ có 1 game
    await page.getByLabel('Sở thú').click();
    await pickGame(page, 'peekaboo');

    const gameEl = page.getByTestId('game-peekaboo');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Kiểm tra tất cả các bụi (tối đa 5)
    for (let i = 0; i < 5; i++) {
      const bush = page.getByTestId(`bush-${i}`);
      if (await bush.isVisible()) {
        const box = await bush.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(120);
        expect(box!.height).toBeGreaterThanOrEqual(120);
      }
    }
  });

  test('nút Về nhà hoạt động', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Vào Sở thú - vào thẳng game vì chỉ có 1 game
    await page.getByLabel('Sở thú').click();
    await pickGame(page, 'peekaboo');

    await expect(page.getByTestId('game-peekaboo')).toBeVisible({ timeout: 10000 });

    // Chạm nút Về nhà
    const backBtn = page.getByLabel('Về nhà');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Về lại home
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 5000 });
  });
});
