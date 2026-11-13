// E2E tiếng Anh: chọn English trong khu bố mẹ, vào một trò, mọi câu nói lấy từ /audio/en/
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

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

test('khu bố mẹ: chọn English rồi vào Ai kêu đấy, giọng đọc lấy từ /audio/en/; chụp en-settings, en-game', async ({ page }) => {
  // Bắt đầu ở màn chọn trò (2D) để không phụ thuộc WebGL của máy chạy test
  await page.goto('./?e2e=1&picker=zoo');
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });
  await openParentArea(page);

  const langs = page.getByRole('group', { name: 'Ngôn ngữ' }).getByRole('button');
  await expect(langs).toHaveCount(3);
  const en = page.getByRole('button', { name: /English/ });
  await expect(en).toHaveAttribute('aria-pressed', 'false');
  await en.click();
  await expect(en).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Tiếng Việt/ })).toHaveAttribute('aria-pressed', 'false');

  // ba nút ngôn ngữ nằm trọn khung, không chồng nhau
  const card = (await page.getByRole('dialog', { name: 'Cài đặt phụ huynh' }).locator('div').first().boundingBox())!;
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(1194);
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(834);
  const boxes = await Promise.all([0, 1, 2].map(async (i) => (await langs.nth(i).boundingBox())!));
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width);
  await page.screenshot({ path: 'test-results/shots/en-settings.png' });

  await page.getByRole('button', { name: 'Đóng' }).click();
  await expect(page.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toHaveCount(0);

  // từ giờ ghi lại mọi file giọng đọc được tải
  const speech: string[] = [];
  page.on('request', (r) => {
    const m = /\/audio\/(vi|ja|en)\/[^/]+\.mp3/.exec(r.url());
    if (m) speech.push(m[0]);
  });

  // tên trò hiện bằng tiếng Anh
  const gameBtn = page.getByLabel("Who's that sound?");
  await expect(gameBtn).toBeVisible({ timeout: 3000 });
  await gameBtn.click();
  await expect(page.getByTestId('game-sound-quiz')).toBeVisible({ timeout: 10_000 });

  await expect.poll(() => speech, { timeout: 5000 }).toContain('/audio/en/quiz.hello.mp3');
  expect(speech.length).toBeGreaterThan(0);
  for (const url of speech) expect(url).toMatch(/^\/audio\/en\//);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/shots/en-game.png' });

  // đã lưu: tải lại vẫn là tiếng Anh
  await page.goto('./?e2e=1&picker=zoo');
  await expect(page.getByLabel("Who's that sound?")).toBeVisible({ timeout: 5000 });
});
