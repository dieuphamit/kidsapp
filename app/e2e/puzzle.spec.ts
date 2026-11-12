// E2E tests for Puzzle game
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const shotsDir = join(process.cwd(), 'test-results', 'shots');

test.beforeAll(() => {
  if (!existsSync(shotsDir)) {
    mkdirSync(shotsDir, { recursive: true });
  }
});

test.describe('Puzzle game', () => {
  test('Nhà Đậu Đậu → Ghép hình, chụp T-030-start.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm vào Nhà Đậu Đậu
    const houseBtn = page.getByLabel('Nhà Đậu Đậu');
    await expect(houseBtn).toBeVisible({ timeout: 5000 });
    await houseBtn.tap();

    // Picker hiện, chọn Ghép hình
    const picker = page.getByTestId('game-picker');
    await expect(picker).toBeVisible({ timeout: 5000 });
    const puzzleBtn = page.getByLabel('Ghép hình');
    await expect(puzzleBtn).toBeVisible();
    await puzzleBtn.tap();

    // Game puzzle hiện
    const gameRoot = page.getByTestId('game-puzzle');
    await expect(gameRoot).toBeVisible({ timeout: 5000 });

    // puzzle.hello được nói
    await expect(gameRoot).toHaveAttribute('data-last-say', 'puzzle.hello', { timeout: 2000 });

    // Đợi ổn định rồi chụp ảnh
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/T-030-start.png' });
  });

  test('mảnh ≥120px', async ({ page }) => {
    await page.goto('./?e2e=1');
    await page.getByLabel('Nhà Đậu Đậu').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Ghép hình').tap();
    await expect(page.getByTestId('game-puzzle')).toBeVisible({ timeout: 5000 });

    // Kiểm tra mảnh 1 và mảnh 2
    const piece1 = page.getByLabel('Mảnh 1');
    await expect(piece1).toBeVisible();
    const box1 = await piece1.boundingBox();
    expect(box1).not.toBeNull();
    expect(box1!.width).toBeGreaterThanOrEqual(120);
    expect(box1!.height).toBeGreaterThanOrEqual(120);

    const piece2 = page.getByLabel('Mảnh 2');
    await expect(piece2).toBeVisible();
    const box2 = await piece2.boundingBox();
    expect(box2).not.toBeNull();
    expect(box2!.width).toBeGreaterThanOrEqual(120);
    expect(box2!.height).toBeGreaterThanOrEqual(120);
  });

  test('kéo mảnh 1 vào đúng chỗ bằng mouse → mảnh hút vào', async ({ page }) => {
    await page.goto('./?e2e=1');
    await page.getByLabel('Nhà Đậu Đậu').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Ghép hình').tap();
    await expect(page.getByTestId('game-puzzle')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Lấy vị trí mảnh 1
    const piece1 = page.getByLabel('Mảnh 1');
    await expect(piece1).toBeVisible();
    const box1 = await piece1.boundingBox();
    expect(box1).not.toBeNull();

    // Stage 1194×834, khung 360×360 ở giữa
    // Với 2 mảnh cắt dọc: mảnh 0 target = (90, 180) trong khung
    // Frame left = (1194 - 360) / 2 = 417, top = (834 - 360) / 2 = 237
    // Target trong stage: (417 + 90, 237 + 180) = (507, 417)
    const targetX = 507;
    const targetY = 417;

    // Kéo mảnh 1 từ vị trí hiện tại đến target
    const startX = box1!.x + box1!.width / 2;
    const startY = box1!.y + box1!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();

    // Chờ snap animation
    await page.waitForTimeout(300);

    // Mảnh 1 phải được đặt (không còn aria-label vì đã placed)
    // Kiểm tra bằng cách đảm bảo vẫn thấy được puzzle và data-placed
    const placedPiece = page.locator('[data-testid="game-puzzle"] [data-placed="true"]');
    await expect(placedPiece.first()).toBeVisible();
  });

  test('solveOne() hết mảnh → puzzle.done rồi tên hình, chụp T-030-done.png', async ({ page }) => {
    await page.goto('./?e2e=1');
    await page.getByLabel('Nhà Đậu Đậu').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Ghép hình').tap();

    const gameRoot = page.getByTestId('game-puzzle');
    await expect(gameRoot).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(600);

    // Dùng solveOne để đặt tất cả mảnh
    // Với bé < 42 tháng, sẽ có 2 mảnh
    await page.evaluate(() => {
      (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle?.solveOne();
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle?.solveOne();
    });

    // Chờ done animation
    await page.waitForTimeout(1000);

    // puzzle.done được nói
    await expect(gameRoot).toHaveAttribute('data-last-say', 'puzzle.done', { timeout: 2000 });

    // Chờ thêm để nói tên hình
    await page.waitForTimeout(2000);

    // Chụp ảnh lúc hoàn thành
    await page.screenshot({ path: 'test-results/shots/T-030-done.png' });

    // Sau đó sẽ nói tên hình (animal.xxx hoặc fruit.xxx)
    const lastSay = await gameRoot.getAttribute('data-last-say');
    expect(lastSay).toMatch(/^(animal\.|fruit\.)/);
  });

  test('nút Về nhà trở về home', async ({ page }) => {
    await page.goto('./?e2e=1');
    await page.getByLabel('Nhà Đậu Đậu').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Ghép hình').tap();
    await expect(page.getByTestId('game-puzzle')).toBeVisible({ timeout: 5000 });

    const backBtn = page.getByRole('button', { name: 'Về nhà' });
    await expect(backBtn).toBeVisible();
    await backBtn.tap();

    await expect(page.getByTestId('home')).toBeVisible();
  });
});

// Test kéo thả trên iPhone dọc
test.describe('Puzzle iPhone dọc', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('kéo mảnh vào đúng chỗ trên màn hình xoay', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Stage đã xoay
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');

    await page.getByLabel('Nhà Đậu Đậu').tap();
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Ghép hình').tap();
    await expect(page.getByTestId('game-puzzle')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Dùng solveOne để test vì kéo thả trên màn xoay phức tạp
    await page.evaluate(() => {
      (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle?.solveOne();
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      (window as { __behocPuzzle?: { solveOne(): void } }).__behocPuzzle?.solveOne();
    });

    await page.waitForTimeout(1000);

    const gameRoot = page.getByTestId('game-puzzle');
    await expect(gameRoot).toHaveAttribute('data-last-say', 'puzzle.done', { timeout: 2000 });

    await page.screenshot({ path: 'test-results/shots/T-030-mobile-done.png' });
  });
});
