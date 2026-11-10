import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

test('vào Nhà âm nhạc hiện game-music', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await expect(musicBtn).toBeVisible();
  await musicBtn.click();

  await expect(page.getByTestId('game-music')).toBeVisible();
});

test('chạm màu xanh dương ghi data-last-say', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await expect(page.getByTestId('game-music')).toBeVisible();

  const blueBtn = page.getByLabel('Màu xanh dương');
  await expect(blueBtn).toBeVisible();
  await blueBtn.click();

  const game = page.getByTestId('game-music');
  await expect(game).toHaveAttribute('data-last-say', 'color.blue');
});

test('vẽ trên paper tạo pixel không trắng, xóa làm trống', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await expect(page.getByTestId('game-music')).toBeVisible();

  const paper = page.getByTestId('paper');
  await expect(paper).toBeVisible();

  const box = await paper.boundingBox();
  expect(box).not.toBeNull();

  // Chọn màu xanh dương
  const blueBtn = page.getByLabel('Màu xanh dương');
  await blueBtn.click();

  // Vẽ đường cong ngoằn ngoèo
  const startX = box!.x + 100;
  const startY = box!.y + 100;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    const x = startX + i * 15;
    const y = startY + Math.sin(i * 0.5) * 50;
    await page.mouse.move(x, y);
  }
  await page.mouse.up();

  // Đổi màu đỏ và vẽ vòng tròn
  const redBtn = page.getByLabel('Màu đỏ');
  await redBtn.click();
  await expect(page.getByTestId('game-music')).toHaveAttribute('data-last-say', 'color.red');

  const cx = box!.x + 400;
  const cy = box!.y + 200;
  await page.mouse.move(cx, cy - 50);
  await page.mouse.down();
  for (let angle = 0; angle <= 360; angle += 18) {
    const rad = (angle * Math.PI) / 180;
    await page.mouse.move(cx + Math.cos(rad) * 50, cy + Math.sin(rad) * 50);
  }
  await page.mouse.up();

  // Chụp ảnh
  await page.screenshot({ path: 'test-results/shots/T-014-draw.png' });

  // Kiểm tra canvas có pixel không trắng/trong suốt
  const hasColor = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="paper"]') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      // Pixel không trong suốt và không trắng
      if (a > 0 && (r < 255 || g < 255 || b < 255)) {
        return true;
      }
    }
    return false;
  });
  expect(hasColor).toBe(true);

  // Nhấn Xóa
  const eraseBtn = page.getByLabel('Xóa');
  await eraseBtn.click();

  // Đợi 600ms cho animation
  await page.waitForTimeout(600);

  // Kiểm tra canvas trống
  const isEmpty = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="paper"]') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 0 && (r < 255 || g < 255 || b < 255)) {
        return false;
      }
    }
    return true;
  });
  expect(isEmpty).toBe(true);
});

test('7 nút (6 màu + Xóa) đều >= 120x120', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await expect(page.getByTestId('game-music')).toBeVisible();

  const colorLabels = ['Màu đỏ', 'Màu vàng', 'Màu xanh lá', 'Màu xanh dương', 'Màu cam', 'Màu tím'];

  for (const label of colorLabels) {
    const btn = page.getByLabel(label);
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeGreaterThanOrEqual(120);
  }

  const eraseBtn = page.getByLabel('Xóa');
  await expect(eraseBtn).toBeVisible();
  const eraseBox = await eraseBtn.boundingBox();
  expect(eraseBox).not.toBeNull();
  expect(eraseBox!.width).toBeGreaterThanOrEqual(120);
  expect(eraseBox!.height).toBeGreaterThanOrEqual(120);
});

test('nút Về nhà đưa về home', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await expect(page.getByTestId('game-music')).toBeVisible();

  const backBtn = page.getByLabel('Về nhà');
  await expect(backBtn).toBeVisible();
  await backBtn.click();

  await expect(page.getByTestId('home')).toBeVisible();
});
