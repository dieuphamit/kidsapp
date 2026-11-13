import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

test.beforeAll(() => {
  mkdirSync('test-results/shots', { recursive: true });
});

test('vào Nhà âm nhạc hiện game-music', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await expect(musicBtn).toBeVisible();
  await musicBtn.click();
  await pickGame(page, 'music');

  await expect(page.getByTestId('game-music')).toBeVisible();
});

test('chạm màu xanh dương ghi data-last-say', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await pickGame(page, 'music');
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
  await pickGame(page, 'music');
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
  await pickGame(page, 'music');
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
  await pickGame(page, 'music');
  await expect(page.getByTestId('game-music')).toBeVisible();

  const backBtn = page.getByLabel('Về nhà');
  await expect(backBtn).toBeVisible();
  await backBtn.click();

  await expect(page.getByTestId('home')).toBeVisible();
});

test('chạm nút Nhạc hiện 8 phím và 4 trống (mức vừa), tất cả >= 120x120, cách nhau >= 24px', async ({ page }) => {
  await page.goto('./?e2e=1&level=medium');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await pickGame(page, 'music');
  await expect(page.getByTestId('game-music')).toBeVisible();

  // Chuyển sang chế độ nhạc
  const playBtn = page.getByLabel('Nhạc');
  await expect(playBtn).toBeVisible();
  await playBtn.click();

  // Kiểm tra 8 phím
  const keyBoxes: { x: number; y: number; width: number; height: number }[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = page.getByLabel(`Phím ${i}`, { exact: true });
    await expect(key).toBeVisible();
    const box = await key.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeGreaterThanOrEqual(120);
    keyBoxes.push(box!);
  }

  // Kiểm tra 4 trống
  const drumLabels = ['Trống to', 'Trống nhỏ', 'Cái lắc', 'Cái chuông'];
  const drumBoxes: { x: number; y: number; width: number; height: number }[] = [];
  for (const label of drumLabels) {
    const drum = page.getByLabel(label, { exact: true });
    await expect(drum).toBeVisible();
    const box = await drum.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeGreaterThanOrEqual(120);
    drumBoxes.push(box!);
  }

  // Kiểm tra khoảng cách giữa các phím (liền kề)
  for (let i = 0; i < keyBoxes.length - 1; i++) {
    const gap = keyBoxes[i + 1].x - (keyBoxes[i].x + keyBoxes[i].width);
    expect(gap).toBeGreaterThanOrEqual(24);
  }

  // Kiểm tra khoảng cách giữa các trống (liền kề)
  for (let i = 0; i < drumBoxes.length - 1; i++) {
    const gap = drumBoxes[i + 1].x - (drumBoxes[i].x + drumBoxes[i].width);
    expect(gap).toBeGreaterThanOrEqual(24);
  }
});

test('chạm Phím 3 tăng __osc, không có lỗi console', async ({ page }) => {
  // Theo dõi số oscillator được tạo
  await page.addInitScript(() => {
    (window as unknown as { __osc: number }).__osc = 0;
    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      (window as unknown as { __osc: number }).__osc++;
      return originalCreateOscillator.apply(this, args);
    };
  });

  // Theo dõi lỗi console
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await pickGame(page, 'music');
  await expect(page.getByTestId('game-music')).toBeVisible();

  // Chuyển sang chế độ nhạc
  const playBtn = page.getByLabel('Nhạc');
  await playBtn.click();

  // Chạm Phím 3
  const key3 = page.getByLabel('Phím 3', { exact: true });
  await expect(key3).toBeVisible();
  await key3.click();

  // Đợi một chút cho synth khởi động
  await page.waitForTimeout(100);

  // Kiểm tra oscillator đã được tạo
  const oscCount = await page.evaluate(() => (window as unknown as { __osc: number }).__osc);
  expect(oscCount).toBeGreaterThan(0);

  // Không có lỗi console
  expect(consoleErrors).toEqual([]);
});

test('chạm Phím 5 rồi chụp ảnh với phím lún và ♪ bay', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await pickGame(page, 'music');
  await expect(page.getByTestId('game-music')).toBeVisible();

  // Chuyển sang chế độ nhạc
  const playBtn = page.getByLabel('Nhạc');
  await playBtn.click();

  // Chạm Phím 5 và giữ
  const key5 = page.getByLabel('Phím 5', { exact: true });
  await expect(key5).toBeVisible();

  // Dùng mouse.down để giữ trạng thái pressed
  const box = await key5.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();

  // Đợi một chút để note animation xuất hiện
  await page.waitForTimeout(50);

  // Chụp ảnh ngay khi phím lún và ♪ bay
  await page.screenshot({ path: 'test-results/shots/T-015-instruments.png' });

  await page.mouse.up();
});

test('chạm Vẽ trở lại chế độ vẽ, nét vẽ trước đó vẫn còn', async ({ page }) => {
  await page.goto('./');
  const musicBtn = page.getByLabel('Nhà âm nhạc');
  await musicBtn.click();
  await pickGame(page, 'music');
  await expect(page.getByTestId('game-music')).toBeVisible();

  // Đang ở chế độ vẽ mặc định, vẽ một nét
  const paper = page.getByTestId('paper');
  await expect(paper).toBeVisible();
  const paperBox = await paper.boundingBox();
  expect(paperBox).not.toBeNull();

  const startX = paperBox!.x + 100;
  const startY = paperBox!.y + 100;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 50);
  await page.mouse.up();

  // Kiểm tra canvas có pixel không trắng
  const hasColorBefore = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="paper"]') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 0 && (r < 255 || g < 255 || b < 255)) {
        return true;
      }
    }
    return false;
  });
  expect(hasColorBefore).toBe(true);

  // Chuyển sang chế độ nhạc
  const playBtn = page.getByLabel('Nhạc');
  await playBtn.click();

  // Paper không hiển thị khi ở chế độ nhạc
  await expect(paper).not.toBeVisible();

  // Chuyển về chế độ vẽ
  const drawBtn = page.getByLabel('Vẽ');
  await drawBtn.click();

  // Paper hiện lại
  await expect(paper).toBeVisible();

  // Kiểm tra nét vẽ vẫn còn
  const hasColorAfter = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="paper"]') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 0 && (r < 255 || g < 255 || b < 255)) {
        return true;
      }
    }
    return false;
  });
  expect(hasColorAfter).toBe(true);
});

/** Vào Nhà âm nhạc → Vẽ và nhạc → chế độ Nhạc. */
async function openPlay(page: import('@playwright/test').Page, query: string) {
  await page.goto(`./?${query}&picker=music`);
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('pick-music').click();
  await expect(page.getByTestId('game-music')).toBeVisible();
  await page.getByLabel('Nhạc').click();
  const box = page.getByTestId('instruments');
  await expect(box).toBeVisible();
  return box;
}

test('E3: mức dễ 5 phím 2 trống; theo phím sáng chơi hết câu nhạc → khen; chụp E3-music.png', async ({ page }) => {
  const box = await openPlay(page, 'e2e=1');
  const game = page.getByTestId('game-music');
  await expect(box).toHaveAttribute('data-level', 'easy');
  await expect(page.getByLabel('Phím 5', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Phím 6', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Trống nhỏ', { exact: true })).toHaveCount(0);
  const song = await box.getAttribute('data-song');
  await expect(game).toHaveAttribute('data-last-say', `song.${song}`);

  // Mọi nút trong khung ≥120px và cách nhau ≥24px
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  for (const b of boxes) {
    expect(b.w, b.name ?? '').toBeGreaterThanOrEqual(120);
    expect(b.h, b.name ?? '').toBeGreaterThanOrEqual(120);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
      expect(Math.max(gapX, gapY), `${a.name} ↔ ${b.name}`).toBeGreaterThanOrEqual(24);
    }
  }

  // chơi 2 nốt đầu rồi chụp: phím sáng nhún, chấm tiến trình sáng
  const length = Number(await box.getAttribute('data-length'));
  for (let i = 0; i < 2; i++) {
    const k = Number(await box.getAttribute('data-next-key'));
    await page.getByLabel(`Phím ${k + 1}`, { exact: true }).click();
  }
  await expect(box).toHaveAttribute('data-pos', '2');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/shots/E3-music.png' });

  for (let i = 2; i < length; i++) {
    const k = Number(await box.getAttribute('data-next-key'));
    await page.getByLabel(`Phím ${k + 1}`, { exact: true }).click();
  }
  await expect(box).toHaveAttribute('data-cheer', '');
  await expect(game).toHaveAttribute('data-last-say', 'music.song-done', { timeout: 3000 });
  // xong thì sang bài khác
  await expect(box).not.toHaveAttribute('data-song', song!, { timeout: 20_000 });
});

test('E3: mức khó cả bài dài hơn; nút Bài khác đổi bài', async ({ page }) => {
  const box = await openPlay(page, 'e2e=1&level=hard');
  await expect(page.getByLabel('Phím 8', { exact: true })).toBeVisible();
  expect(Number(await box.getAttribute('data-length'))).toBeGreaterThanOrEqual(12);
  const song = await box.getAttribute('data-song');
  await page.getByLabel('Bài khác').click();
  await expect(box).not.toHaveAttribute('data-song', song!);
  await expect(page.getByTestId('game-music')).toHaveAttribute('data-last-say', /^song\./);
  await page.screenshot({ path: 'test-results/shots/E3-music-hard.png' });
});
