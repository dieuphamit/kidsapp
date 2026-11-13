// E2E tests for Shapes game - T-009, T-011, T-018
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { pickGame } from './pick.js';

type Round = { shapes: string[]; slots: Record<string, [number, number, number]>; radius: number };

/** Hình và ô bóng của lượt hiện tại (hook e2e của game). */
async function currentRound(page: Page): Promise<Round> {
  await page.waitForFunction(() => !!(window as unknown as { __behocShapes?: unknown }).__behocShapes);
  return page.evaluate(() => (window as unknown as { __behocShapes: () => Round }).__behocShapes());
}

/** Thả hình `shape` vào tâm ô bóng của hình `target`. */
async function dropOn(page: Page, round: Round, shape: string, target: string) {
  const [x, , z] = round.slots[target];
  await page.evaluate(
    ({ shape, x, z }) => {
      (window as unknown as { __behocDrag: (id: string, x: number, z: number) => void }).__behocDrag(shape, x, z);
    },
    { shape, x, z },
  );
}

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

// T-018: Hồ nước đẹp hơn
test.describe('T-018: Hồ nước đẹp hơn', () => {
  test('chụp hồ nước khi mới vào', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');

    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định rồi chụp ảnh (không còn vệt tia tối)
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/shots/T-018-pond.png' });
  });

  test('chụp sau khi kéo đủ 4 khối', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo từng khối vào đúng ô qua __behocDrag
    const round = await currentRound(page);
    expect(round.shapes).toHaveLength(4);
    for (const shape of round.shapes) {
      await dropOn(page, round, shape, shape);
      await page.waitForTimeout(300);
    }

    // Đợi animation ăn mừng
    await page.waitForTimeout(1200);

    // Chụp ảnh lúc hoàn thành
    await page.screenshot({ path: 'test-results/shots/T-018-done.png' });
  });
});

test.describe('Shapes game (Màu và hình)', () => {
  test('từ bản đồ chạm Hồ nước mở game shapes', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondButton = page.getByLabel('Vườn quả');
    await expect(pondButton).toBeVisible();
    await pondButton.tap();
    await pickGame(page, 'shapes');

    // Đợi game shapes hiện (timeout 10s theo hướng dẫn)
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định rồi chụp ảnh
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'test-results/shots/T-009-pond.png' });
  });

  test('chạm khối qua e2e hook nghe color rồi shape', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Gọi hook __behocTap để chạm circle
    const tapRound = await currentRound(page);
    await page.evaluate((id) => {
      (window as unknown as { __behocTap: (id: string) => void }).__behocTap(id);
    }, tapRound.shapes[0]);

    // Kiểm tra data-last-say khớp /^color\./ (timeout 3s theo hướng dẫn)
    await expect(gameEl).toHaveAttribute('data-last-say', /^color\./, { timeout: 3000 });

    // Sau đó data-last-say khớp /^shape\./ (timeout 3s)
    await expect(gameEl).toHaveAttribute('data-last-say', /^shape\./, { timeout: 3000 });
  });

  test('chạm thật vào canvas có phản hồi', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Lấy giá trị ban đầu của data-last-say
    const initialSay = await gameEl.getAttribute('data-last-say');

    // Chạm vào giữa canvas (khoảng 40% chiều rộng, 45% chiều cao)
    const viewport = page.viewportSize()!;
    const x = viewport.width * 0.4;
    const y = viewport.height * 0.45;
    await page.mouse.click(x, y);

    // Đợi data-last-say đổi khác giá trị ban đầu (timeout 5s theo hướng dẫn)
    await expect(async () => {
      const currentSay = await gameEl.getAttribute('data-last-say');
      expect(currentSay).not.toBe(initialSay);
    }).toPass({ timeout: 5000 });
  });

  test('nút Về nhà quay lại màn hình chính', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    await expect(page.getByTestId('game-shapes')).toBeVisible({ timeout: 10000 });

    // Chạm nút Về nhà
    const backButton = page.getByRole('button', { name: 'Về nhà' });
    await expect(backButton).toBeVisible();
    await backButton.tap();

    // Kiểm tra quay lại home
    await expect(page.getByTestId('home')).toBeVisible();
  });

  // T-011: Drag and drop tests
  test('kéo khối tròn vào ô bóng tròn - snap thành công', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo hình đầu tiên vào đúng ô bóng của nó qua hook __behocDrag
    const snapRound = await currentRound(page);
    await dropOn(page, snapRound, snapRound.shapes[0], snapRound.shapes[0]);

    // Chụp ảnh lúc đang kéo (trước khi hoàn tất animation)
    await page.screenshot({ path: 'test-results/shots/T-011-drag.png' });

    // Sau khi thả đúng: ui.great
    await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });
  });

  test('kéo khối vào ô sai - nghe pond.try-again', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo hình đầu vào ô bóng của hình thứ hai (sai)
    const wrongRound = await currentRound(page);
    await dropOn(page, wrongRound, wrongRound.shapes[0], wrongRound.shapes[1]);

    // Sau khi thả sai: pond.try-again
    await expect(gameEl).toHaveAttribute('data-last-say', 'pond.try-again', { timeout: 3000 });
  });

  test('kéo tất cả khối vào đúng ô - ăn mừng', async ({ page }) => {
    await page.goto('./?e2e=1&level=medium');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Vườn quả');
    await pondButton.tap();
    await pickGame(page, 'shapes');
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo từng khối vào đúng ô
    const round = await currentRound(page);
    expect(round.shapes).toHaveLength(4);
    for (const shape of round.shapes) {
      await dropOn(page, round, shape, shape);

      // Đợi một chút giữa các lần kéo
      await page.waitForTimeout(300);
    }

    // Đợi animation ăn mừng (800ms delay + animation)
    await page.waitForTimeout(1200);

    // Chụp ảnh lúc ăn mừng
    await page.screenshot({ path: 'test-results/shots/T-011-done.png' });
  });
});

test.describe('E3: độ khó Màu và hình', () => {
  test('dễ (bé 28 tháng): 2 hình; kéo xong thì lượt mới đổi hình', async ({ page }) => {
    await page.goto('./?e2e=1&picker=orchard');
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('pick-shapes').click();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-level', 'easy');
    const round = await currentRound(page);
    expect(round.shapes).toHaveLength(2);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/shots/E3-shapes-easy.png' });
    for (const shape of round.shapes) {
      await dropOn(page, round, shape, shape);
      await page.waitForTimeout(300);
    }
    // sau ăn mừng: lượt mới, hình khác hẳn lượt trước
    await expect(gameEl).not.toHaveAttribute('data-shapes', round.shapes.join(' '), { timeout: 6000 });
    const next = await currentRound(page);
    expect(next.shapes.some((s) => round.shapes.includes(s))).toBe(false);
  });

  test('khó: 5 hình có cặp giống nhau; chụp E3-shapes.png', async ({ page }) => {
    await page.goto('./?e2e=1&level=hard&picker=orchard');
    await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('pick-shapes').click();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
    const round = await currentRound(page);
    expect(round.shapes).toHaveLength(5);
    const pairs = [['square', 'rectangle'], ['circle', 'oval'], ['square', 'diamond'], ['star', 'heart']];
    expect(pairs.some(([a, b]) => round.shapes.includes(a) && round.shapes.includes(b))).toBe(true);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/shots/E3-shapes.png' });
    // thả đúng một hình
    await dropOn(page, round, round.shapes[2], round.shapes[2]);
    await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });
  });
});
