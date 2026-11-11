// E2E tests for Shadow game - T-028
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test.describe('T-028: Bóng của ai?', () => {
  test('Sở thú → Bóng của ai?; chụp T-028-shadow.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm Sở thú
    const zooButton = page.getByLabel('Sở thú');
    await expect(zooButton).toBeVisible();
    await zooButton.tap();

    // Mở GamePicker, chọn Bóng của ai?
    const picker = page.getByTestId('game-picker');
    await expect(picker).toBeVisible({ timeout: 10000 });
    const shadowButton = page.getByLabel('Bóng của ai?');
    await expect(shadowButton).toBeVisible();
    await shadowButton.tap();

    // Đợi game shadow hiện
    const gameEl = page.getByTestId('game-shadow');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi hello được nói
    await expect(gameEl).toHaveAttribute('data-last-say', 'shadow.hello', { timeout: 3000 });

    // Chụp ảnh
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/shots/T-028-shadow.png' });
  });

  test('thả sai → không phát ui.great', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shadow
    await page.getByLabel('Sở thú').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Bóng của ai?').tap();
    const gameEl = page.getByTestId('game-shadow');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-last-say', 'shadow.hello', { timeout: 3000 });

    // Lấy answer
    const answer = await page.evaluate(() => {
      return (window as unknown as { __behocShadow: { answer(): string } }).__behocShadow.answer();
    });

    // Lấy danh sách choices từ card testid
    const cards = await page.locator('[data-testid^="card-"]').all();
    let wrongCard: string | null = null;
    for (const card of cards) {
      const testid = await card.getAttribute('data-testid');
      const id = testid?.replace('card-', '');
      if (id && id !== answer) {
        wrongCard = id;
        break;
      }
    }

    // Kéo thẻ sai vào bóng
    if (wrongCard) {
      const card = page.getByTestId(`card-${wrongCard}`);
      const shadow = page.getByTestId('shadow');
      const cardBox = await card.boundingBox();
      const shadowBox = await shadow.boundingBox();

      if (cardBox && shadowBox) {
        const startX = cardBox.x + cardBox.width / 2;
        const startY = cardBox.y + cardBox.height / 2;
        const endX = shadowBox.x + shadowBox.width / 2;
        const endY = shadowBox.y + shadowBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();
      }
    }

    // Đợi một chút để đảm bảo không phát ui.great
    await page.waitForTimeout(1500);

    // Không nên có ui.great
    const lastSay = await gameEl.getAttribute('data-last-say');
    expect(lastSay).not.toBe('ui.great');
  });

  test('thả đúng → ui.great; chụp T-028-done.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shadow
    await page.getByLabel('Sở thú').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Bóng của ai?').tap();
    const gameEl = page.getByTestId('game-shadow');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-last-say', 'shadow.hello', { timeout: 3000 });

    // Sử dụng hook __behocShadow.drop để thả đúng
    await page.evaluate(() => {
      const shadow = (window as unknown as { __behocShadow: { answer(): string; drop(id: string): void } }).__behocShadow;
      shadow.drop(shadow.answer());
    });

    // Kiểm tra ui.great được phát (sau 900ms delay)
    await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });

    // Chụp ảnh lúc hoàn thành
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/shots/T-028-done.png' });
  });

  test('kéo thật bằng page.mouse từ thẻ đúng vào bóng', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shadow
    await page.getByLabel('Sở thú').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Bóng của ai?').tap();
    const gameEl = page.getByTestId('game-shadow');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-last-say', 'shadow.hello', { timeout: 3000 });

    await page.waitForTimeout(300);

    // Lấy answer
    const answer = await page.evaluate(() => {
      return (window as unknown as { __behocShadow: { answer(): string } }).__behocShadow.answer();
    });

    // Kéo thẻ đúng vào bóng
    const card = page.getByTestId(`card-${answer}`);
    const shadow = page.getByTestId('shadow');
    const cardBox = await card.boundingBox();
    const shadowBox = await shadow.boundingBox();

    expect(cardBox).not.toBeNull();
    expect(shadowBox).not.toBeNull();

    if (cardBox && shadowBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;
      const endX = shadowBox.x + shadowBox.width / 2;
      const endY = shadowBox.y + shadowBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY, { steps: 15 });
      await page.mouse.up();
    }

    // Kiểm tra animal.<id> được nói trước
    await expect(gameEl).toHaveAttribute('data-last-say', `animal.${answer}`, { timeout: 2000 });

    // Kiểm tra ui.great được phát (sau 900ms delay)
    await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });
  });
});

// Test kéo trên iPhone dọc (viewport 430x932)
test.describe('iPhone dọc 430×932: kéo trong game shadow', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('kéo thẻ vào bóng trên điện thoại dọc', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shadow
    await page.getByLabel('Sở thú').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Bóng của ai?').tap();
    const gameEl = page.getByTestId('game-shadow');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-last-say', 'shadow.hello', { timeout: 3000 });

    await page.waitForTimeout(300);

    // Lấy answer
    const answer = await page.evaluate(() => {
      return (window as unknown as { __behocShadow: { answer(): string } }).__behocShadow.answer();
    });

    // Kéo thẻ đúng vào bóng
    const card = page.getByTestId(`card-${answer}`);
    const shadow = page.getByTestId('shadow');
    const cardBox = await card.boundingBox();
    const shadowBox = await shadow.boundingBox();

    expect(cardBox).not.toBeNull();
    expect(shadowBox).not.toBeNull();

    if (cardBox && shadowBox) {
      const startX = cardBox.x + cardBox.width / 2;
      const startY = cardBox.y + cardBox.height / 2;
      const endX = shadowBox.x + shadowBox.width / 2;
      const endY = shadowBox.y + shadowBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY, { steps: 15 });
      await page.mouse.up();
    }

    // Kiểm tra ui.great được phát
    await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });

    await page.screenshot({ path: 'test-results/shots/T-028-mobile-portrait.png' });
  });
});
