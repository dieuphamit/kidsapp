// E2E tests for Shapes game - T-009, T-011, T-018
import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

// Slot positions from logic.ts (used for coordinate calculation)
const SLOTS = {
  star: [-2.4, 0, 3.5],
  triangle: [-0.8, 0, 3.5],
  square: [0.8, 0, 3.5],
  circle: [2.4, 0, 3.5],
} as const;

// Đảm bảo thư mục shots tồn tại
const shotsDir = 'test-results/shots';
if (!existsSync(shotsDir)) {
  mkdirSync(shotsDir, { recursive: true });
}

// T-018: Hồ nước đẹp hơn
test.describe('T-018: Hồ nước đẹp hơn', () => {
  test('chụp hồ nước khi mới vào', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();

    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định rồi chụp ảnh (không còn vệt tia tối)
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/shots/T-018-pond.png' });
  });

  test('chụp sau khi kéo đủ 4 khối', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo từng khối vào đúng ô qua __behocDrag
    const shapes = ['circle', 'square', 'triangle', 'star'] as const;
    for (const shape of shapes) {
      await page.evaluate(
        ({ shape, slotX, slotZ }) => {
          (window as unknown as { __behocDrag: (id: string, x: number, z: number) => void }).__behocDrag(
            shape,
            slotX,
            slotZ
          );
        },
        { shape, slotX: SLOTS[shape][0], slotZ: SLOTS[shape][2] }
      );
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
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Chạm nút Hồ nước
    const pondButton = page.getByLabel('Hồ nước');
    await expect(pondButton).toBeVisible();
    await pondButton.tap();

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
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });

    // Đợi scene sẵn sàng
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Gọi hook __behocTap để chạm circle
    await page.evaluate(() => {
      (window as unknown as { __behocTap: (id: string) => void }).__behocTap('circle');
    });

    // Kiểm tra data-last-say khớp /^color\./ (timeout 3s theo hướng dẫn)
    await expect(gameEl).toHaveAttribute('data-last-say', /^color\./, { timeout: 3000 });

    // Sau đó data-last-say khớp /^shape\./ (timeout 3s)
    await expect(gameEl).toHaveAttribute('data-last-say', /^shape\./, { timeout: 3000 });
  });

  test('chạm thật vào canvas có phản hồi', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
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
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
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
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Sử dụng hook __behocDrag để kéo circle vào slot circle
    // Circle slot is at x=2.4, z=3.5
    await page.evaluate(
      ({ slotX, slotZ }) => {
        (window as unknown as { __behocDrag: (id: string, x: number, z: number) => void }).__behocDrag(
          'circle',
          slotX,
          slotZ
        );
      },
      { slotX: SLOTS.circle[0], slotZ: SLOTS.circle[2] }
    );

    // Chụp ảnh lúc đang kéo (trước khi hoàn tất animation)
    await page.screenshot({ path: 'test-results/shots/T-011-drag.png' });

    // Sau khi thả đúng: ui.great
    await expect(gameEl).toHaveAttribute('data-last-say', 'ui.great', { timeout: 3000 });
  });

  test('kéo khối vào ô sai - nghe pond.try-again', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo circle vào slot của square (sai)
    await page.evaluate(
      ({ slotX, slotZ }) => {
        (window as unknown as { __behocDrag: (id: string, x: number, z: number) => void }).__behocDrag(
          'circle',
          slotX,
          slotZ
        );
      },
      { slotX: SLOTS.square[0], slotZ: SLOTS.square[2] }
    );

    // Sau khi thả sai: pond.try-again
    await expect(gameEl).toHaveAttribute('data-last-say', 'pond.try-again', { timeout: 3000 });
  });

  test('kéo tất cả khối vào đúng ô - ăn mừng', async ({ page }) => {
    await page.goto('./?e2e=1');
    await expect(page.getByTestId('home')).toBeVisible();

    // Vào game shapes
    const pondButton = page.getByLabel('Hồ nước');
    await pondButton.tap();
    const gameEl = page.getByTestId('game-shapes');
    await expect(gameEl).toBeVisible({ timeout: 10000 });
    await expect(gameEl).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Đợi scene ổn định
    await page.waitForTimeout(1000);

    // Kéo từng khối vào đúng ô
    const shapes = ['circle', 'square', 'triangle', 'star'] as const;
    for (const shape of shapes) {
      await page.evaluate(
        ({ shape, slotX, slotZ }) => {
          (window as unknown as { __behocDrag: (id: string, x: number, z: number) => void }).__behocDrag(
            shape,
            slotX,
            slotZ
          );
        },
        { shape, slotX: SLOTS[shape][0], slotZ: SLOTS[shape][2] }
      );

      // Đợi một chút giữa các lần kéo
      await page.waitForTimeout(300);
    }

    // Đợi animation ăn mừng (800ms delay + animation)
    await page.waitForTimeout(1200);

    // Chụp ảnh lúc ăn mừng
    await page.screenshot({ path: 'test-results/shots/T-011-done.png' });
  });
});
