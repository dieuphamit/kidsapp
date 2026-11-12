import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

test('vào game sound-quiz từ picker thế giới thú và chụp ảnh', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });

  // Chạm nút game "Ai kêu đấy?"
  const gameBtn = page.getByLabel('Ai kêu đấy?');
  await expect(gameBtn).toBeVisible({ timeout: 3000 });
  await gameBtn.click();

  // Chờ vào game
  await expect(page.getByTestId('game-sound-quiz')).toBeVisible({ timeout: 5000 });

  // Đợi để UI ổn định
  await page.waitForTimeout(800);

  // Chụp ảnh quiz
  await page.screenshot({ path: 'test-results/shots/T-027-quiz.png' });
});

test('chạm thẻ sai thì nghe quiz.again rồi -sound', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });

  // Chạm nút game "Ai kêu đấy?"
  await page.getByLabel('Ai kêu đấy?').click();

  // Chờ vào game
  const gameEl = page.getByTestId('game-sound-quiz');
  await expect(gameEl).toBeVisible({ timeout: 5000 });

  // Đợi quiz.hello và -sound phát xong
  await page.waitForTimeout(2500);

  // Lấy đáp án đúng từ hook
  const correctAnswer = await page.evaluate(() => {
    const w = window as Window & { __behocQuiz?: { answer(): string } };
    return w.__behocQuiz?.answer();
  });
  expect(correctAnswer).toBeTruthy();

  // Tìm thẻ sai (không phải đáp án)
  const allCards = await page.locator('[data-testid^="card-"]').all();
  let wrongCard = null;
  for (const card of allCards) {
    const testId = await card.getAttribute('data-testid');
    if (testId && !testId.includes(correctAnswer!)) {
      wrongCard = card;
      break;
    }
  }
  expect(wrongCard).not.toBeNull();

  // Chạm thẻ sai
  await wrongCard!.dispatchEvent('pointerdown');

  // Kiểm tra data-last-say = quiz.again
  await expect(gameEl).toHaveAttribute('data-last-say', 'quiz.again', { timeout: 2000 });

  // Sau đó sẽ phát lại -sound
  await expect(gameEl).toHaveAttribute('data-last-say', `animal.${correctAnswer}-sound`, { timeout: 3000 });
});

test('chạm thẻ đúng thì nghe ui.great', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });

  // Chạm nút game "Ai kêu đấy?"
  await page.getByLabel('Ai kêu đấy?').click();

  // Chờ vào game
  const gameEl = page.getByTestId('game-sound-quiz');
  await expect(gameEl).toBeVisible({ timeout: 5000 });

  // Đợi quiz.hello và -sound phát xong
  await page.waitForTimeout(2500);

  // Lấy đáp án đúng từ hook
  const correctAnswer = await page.evaluate(() => {
    const w = window as Window & { __behocQuiz?: { answer(): string } };
    return w.__behocQuiz?.answer();
  });
  expect(correctAnswer).toBeTruthy();

  // Chạm thẻ đúng
  const correctCard = page.getByTestId(`card-${correctAnswer}`);
  await expect(correctCard).toBeVisible();
  await correctCard.dispatchEvent('pointerdown');

  // Kiểm tra nghe tên con vật trước
  await expect(gameEl).toHaveAttribute('data-last-say', `animal.${correctAnswer}`, { timeout: 2000 });

  // Sau đó nghe ui.great
  await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });
});

test('thẻ ảnh có kích thước ≥ 120px', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });

  // Chạm nút game "Ai kêu đấy?"
  await page.getByLabel('Ai kêu đấy?').click();

  // Chờ vào game
  await expect(page.getByTestId('game-sound-quiz')).toBeVisible({ timeout: 5000 });

  // Kiểm tra kích thước tất cả các thẻ
  const cards = await page.locator('[data-testid^="card-"]').all();
  expect(cards.length).toBeGreaterThanOrEqual(2);

  for (const card of cards) {
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeGreaterThanOrEqual(120);
  }
});

test('nút loa có kích thước ≥ 160px và hoạt động', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });

  // Chạm nút game "Ai kêu đấy?"
  await page.getByLabel('Ai kêu đấy?').click();

  // Chờ vào game
  const gameEl = page.getByTestId('game-sound-quiz');
  await expect(gameEl).toBeVisible({ timeout: 5000 });

  // Kiểm tra nút loa
  const speakerBtn = page.getByLabel('Nghe lại');
  await expect(speakerBtn).toBeVisible();

  const box = await speakerBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(160);
  expect(box!.height).toBeGreaterThanOrEqual(160);

  // Đợi quiz.hello phát xong
  await page.waitForTimeout(2000);

  // Lấy đáp án để kiểm tra -sound
  const correctAnswer = await page.evaluate(() => {
    const w = window as Window & { __behocQuiz?: { answer(): string } };
    return w.__behocQuiz?.answer();
  });

  // Chạm nút loa
  await speakerBtn.click();

  // Kiểm tra phát lại tiếng kêu
  await expect(gameEl).toHaveAttribute('data-last-say', `animal.${correctAnswer}-sound`, { timeout: 2000 });
});

test('nút Về nhà hoạt động', async ({ page }) => {
  await page.goto('./?e2e=1&picker=zoo');

  // Chờ picker xuất hiện
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 5000 });

  // Chạm nút game "Ai kêu đấy?"
  await page.getByLabel('Ai kêu đấy?').click();

  // Chờ vào game
  await expect(page.getByTestId('game-sound-quiz')).toBeVisible({ timeout: 5000 });

  // Chạm nút Về nhà
  const backBtn = page.getByLabel('Về nhà');
  await expect(backBtn).toBeVisible();

  const box = await backBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(120);
  expect(box!.height).toBeGreaterThanOrEqual(120);

  await backBtn.click();

  // Về lại home
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 3000 });
});
