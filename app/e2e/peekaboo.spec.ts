import { test, expect } from '@playwright/test';
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

  test('chạm bụi đúng → peek.found rồi animal.<id>, chụp T-026-found.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Vào Sở thú - vào thẳng game vì chỉ có 1 game
    await page.getByLabel('Sở thú').click();

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

    // Chờ 1.2s, sau đó data-last-say phải là animal.<id>
    await page.waitForTimeout(1200);
    const lastSay = await gameEl.getAttribute('data-last-say');
    expect(lastSay).toMatch(/^animal\./);

    // Chụp ảnh khi thú hiện ra
    await page.screenshot({ path: join(shotsDir, 'T-026-found.png') });
  });

  test('mọi bụi có kích thước >= 120px', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 10000 });

    // Vào Sở thú - vào thẳng game vì chỉ có 1 game
    await page.getByLabel('Sở thú').click();

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

    await expect(page.getByTestId('game-peekaboo')).toBeVisible({ timeout: 10000 });

    // Chạm nút Về nhà
    const backBtn = page.getByLabel('Về nhà');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Về lại home
    await expect(page.getByTestId('home')).toBeVisible({ timeout: 5000 });
  });
});
