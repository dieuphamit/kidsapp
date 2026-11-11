// iPhone 14 Pro Max: app thiết kế cho khung 1194×834 phải co lại vừa màn hình điện thoại,
// cầm dọc thì tự xoay ngang; nút vẫn chạm được; cổng phụ huynh có nút ⚙️ để đổi ngôn ngữ.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.beforeAll(() => mkdirSync('test-results/shots', { recursive: true }));

const PLACES = ['Trang trại', 'Hồ nước', 'Vườn quả', 'Nhà âm nhạc'];

async function expectPlacesInside(page: Page, vw: number, vh: number) {
  for (const name of PLACES) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.x, `${name} trái`).toBeGreaterThanOrEqual(0);
    expect(box!.y, `${name} trên`).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, `${name} phải`).toBeLessThanOrEqual(vw + 1);
    expect(box!.y + box!.height, `${name} dưới`).toBeLessThanOrEqual(vh + 1);
  }
}

test.describe('iPhone ngang 932×430', () => {
  test.use({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('bản đồ nằm trọn màn hình, chạm Trang trại vào được game', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();
    await expect(page.getByTestId('stage')).not.toHaveAttribute('data-rotated', 'true');
    await expectPlacesInside(page, 932, 430);
    await page.screenshot({ path: 'test-results/shots/mobile-landscape.png' });
    await page.getByRole('button', { name: 'Trang trại' }).tap();
    await expect(page.getByTestId('game-animals')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('khung tự xoay ngang, nằm trọn màn hình, chạm được', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await expectPlacesInside(page, 430, 932);
    await page.screenshot({ path: 'test-results/shots/mobile-portrait.png' });
    await page.getByRole('button', { name: 'Vườn quả' }).tap();
    await expect(page.getByTestId('game-counting')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Cài đặt ngôn ngữ', () => {
  test.use({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true });

  test('giữ ⚙️ 3 giây, trả lời phép cộng, đổi sang 日本語', async ({ page }) => {
    await page.goto('./');
    const gate = page.getByRole('button', { name: 'Khu phụ huynh' });
    await expect(gate).toBeVisible();
    await expect(gate).toContainText('⚙️');
    const box = (await gate.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3300);
    await page.mouse.up();
    const q = await page.getByRole('dialog', { name: 'Xác nhận phụ huynh' }).locator('span').first().textContent();
    const [a, b] = (q ?? '').match(/\d+/g)!.map(Number);
    await page.getByLabel('Đáp án').fill(String(a + b));
    await page.getByRole('button', { name: 'Mở' }).click();
    const ja = page.getByRole('button', { name: /日本語/ });
    await ja.click();
    await expect(ja).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: 'test-results/shots/mobile-settings.png' });
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByRole('button', { name: 'まきば' })).toBeVisible();
  });
});
