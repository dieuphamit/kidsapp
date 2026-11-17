import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Trang demo so sánh thú "giống thật" (`?demo=realism`, chỉ cho bố mẹ xem ở local): bấm từng phương án × từng
 * cảnh, chờ thú tải xong, kiểm tra thú đang di chuyển và chụp `test-results/shots/demo-realism-<pa>-<cảnh>.png`.
 */

mkdirSync('test-results/shots', { recursive: true });

type Snap = Record<string, { x: number; y: number; z: number }>;
const snap = (page: Page): Promise<Snap> =>
  page.evaluate(() => {
    const w = window as Window & { __behocWander?: () => Snap };
    return w.__behocWander ? w.__behocWander() : {};
  });

const SCENES = [
  { id: 'sea', label: 'Biển' },
  { id: 'meadow', label: 'Đồng cỏ' },
];
// DEMO_PA=a,c: chỉ chạy vài phương án (khi chỉnh từng phương án)
const OPTIONS = (process.env.DEMO_PA ?? 'a,b,c').split(',');

for (const scene of SCENES) {
  test(`demo realism: cảnh ${scene.id}, bấm từng phương án và chụp ảnh`, async ({ page }) => {
    test.setTimeout(180_000); // WebGL phần mềm, model có texture
    await page.goto('./?demo=realism&pa=a&e2e=1');
    const demo = page.getByTestId('realism-demo');
    await page.getByRole('button', { name: scene.label }).dispatchEvent('pointerdown');
    await expect(demo).toHaveAttribute('data-scene', scene.id);
    // thú đồng cỏ có lúc cùng đứng nghỉ/gặm cỏ vài giây: so vị trí đầu và cuối cả lượt (qua mọi phương án)
    let first: Snap | null = null;
    for (const pa of OPTIONS) {
      await page.getByRole('button', { name: new RegExp(`^Phương án ${pa.toUpperCase()}:`) }).dispatchEvent('pointerdown');
      await expect(demo).toHaveAttribute('data-option', pa);
      await expect(demo).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
      await expect(page.getByTestId('realism-info')).toContainText(`${pa.toUpperCase()}.`);
      first ??= await snap(page);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `test-results/shots/demo-realism-${pa}-${scene.id}.png` });
    }
    const last = await snap(page);
    const ids = Object.keys(first!);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    const moved = ids.filter((id) => Math.hypot(last[id].x - first![id].x, last[id].y - first![id].y, last[id].z - first![id].z) > 0.05).length;
    expect(moved, 'thú đang di chuyển').toBeGreaterThan(0);
  });
}
