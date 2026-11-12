// E2E trò Đường về nhà (T-041): mức 1 đi từng bước, mức 2 xếp lệnh rồi chạy
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

type Dir = 'up' | 'down' | 'left' | 'right';
type Pos = { r: number; c: number };

declare global {
  interface Window {
    __behocPath?: {
      solution(): string[];
      tapDir(dir: string): void;
    };
  }
}

const DELTA: Record<Dir, Pos> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};
const ARROW_LABEL: Record<Dir, string> = { up: 'Lên', down: 'Xuống', left: 'Trái', right: 'Phải' };
const move = (p: Pos, d: Dir): Pos => ({ r: p.r + DELTA[d].r, c: p.c + DELTA[d].c });

/** Đặt tuổi bé trong cài đặt (idb-keyval) rồi vào Góc đố → Đường về nhà. */
async function openPath(page: Page, query = '', ageMonths = 40) {
  await page.goto('./?e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await page.evaluate(async (age) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('keyval-store', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('keyval');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put({ lang: 'vi', ageMonths: age, sessionMinutes: 15 }, 'behoc.settings');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, ageMonths);
  await page.goto(`./?e2e=1${query}`);
  await expect(page.getByTestId('home')).toBeVisible();
  await page.getByLabel('Góc đố').click();
  await pickGame(page, 'path');
  const game = page.getByTestId('game-path');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'path.hello');
  return game;
}

async function dauPos(page: Page): Promise<Pos> {
  const cell = page.locator('[data-testid^="cell-"][data-dau]');
  await expect(cell).toHaveCount(1);
  return { r: Number(await cell.getAttribute('data-r')), c: Number(await cell.getAttribute('data-c')) };
}

async function treeSet(page: Page): Promise<Set<string>> {
  const keys = await page
    .locator('[data-testid^="cell-"][data-kind="tree"]')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute('data-r')},${e.getAttribute('data-c')}`));
  return new Set(keys);
}

/** Đi từng bước bằng cách chạm ô kề theo lời giải, tới nhà. */
async function walkHome(page: Page, tapCell: (r: number, c: number) => Promise<void>) {
  const game = page.getByTestId('game-path');
  const sol = (await page.evaluate(() => window.__behocPath!.solution())) as Dir[];
  expect(sol.length).toBeGreaterThanOrEqual(2);
  expect(sol.length).toBeLessThanOrEqual(4);
  let pos = await dauPos(page);
  for (const [i, d] of sol.entries()) {
    const next = move(pos, d);
    // ô kề đi được có viền gợi ý
    await expect(page.getByTestId(`cell-${next.r}-${next.c}`)).toHaveAttribute('data-hint', 'true');
    await tapCell(next.r, next.c);
    await expect.poll(() => dauPos(page)).toEqual(next);
    // mỗi bước nói hướng (bước cuối nói hướng rồi tới path.home)
    if (i < sol.length - 1) await expect(game).toHaveAttribute('data-last-say', `path.${d}`);
    pos = next;
  }
  await expect(game).toHaveAttribute('data-last-say', 'path.home', { timeout: 3000 });
  await expect(page.locator('[data-kind="home"]')).toHaveAttribute('data-glow', 'true');
}

test('Góc đố → Đường về nhà mức 1: chạm ô kề tới nhà → path.home; chụp T-041-step', async ({ page }) => {
  const game = await openPath(page);
  await expect(game).toHaveAttribute('data-mode', 'step');
  // mức 1 không có dải lệnh
  await expect(page.getByTestId('slot-0')).toHaveCount(0);

  // chạm cây: cây lắc, không nói gì
  const tree = page.locator('[data-kind="tree"]').first();
  await tree.click();
  await expect(tree).toHaveAttribute('data-shake', 'true');
  await expect(game).toHaveAttribute('data-last-say', 'path.hello');

  await walkHome(page, (r, c) => page.getByTestId(`cell-${r}-${c}`).click());
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/shots/T-041-step.png' });

  // 2.5s sau là bản đồ mới, Đậu Đậu ở ô xuất phát mới
  await expect(page.locator('[data-kind="home"]')).not.toHaveAttribute('data-glow', 'true', { timeout: 4000 });
  await expect(page.locator('[data-testid^="cell-"][data-dau]')).toHaveCount(1);
});

test('mức 1: ô hàng xóm ≥120px, khe 24px', async ({ page }) => {
  await openPath(page);
  const a = (await page.getByTestId('cell-0-0').boundingBox())!;
  const b = (await page.getByTestId('cell-0-1').boundingBox())!;
  const c = (await page.getByTestId('cell-1-0').boundingBox())!;
  expect(a.width).toBeGreaterThanOrEqual(120);
  expect(a.height).toBeGreaterThanOrEqual(120);
  expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(24);
  expect(c.y - (a.y + a.height)).toBeGreaterThanOrEqual(24);
});

test('?path=program: xếp lệnh đụng cây → path.bump, sửa ô lỗi rồi ▶ → path.home; chụp T-041-program', async ({ page }) => {
  const game = await openPath(page, '&path=program');
  await expect(game).toHaveAttribute('data-mode', 'program');
  // mức 2 không có viền gợi ý
  await expect(page.locator('[data-hint="true"]')).toHaveCount(0);

  const sol = (await page.evaluate(() => window.__behocPath!.solution())) as Dir[];
  const trees = await treeSet(page);
  // tìm bước k trên đường đi mà cạnh đó có cây: chương trình = sol[0..k) + hướng đâm vào cây
  let pos = await dauPos(page);
  const start = pos;
  let bad: { k: number; dir: Dir } | null = null;
  for (let k = 0; k < sol.length && !bad; k++) {
    for (const d of Object.keys(DELTA) as Dir[]) {
      const n = move(pos, d);
      if (trees.has(`${n.r},${n.c}`)) {
        bad = { k, dir: d };
        break;
      }
    }
    pos = move(pos, sol[k]);
  }
  expect(bad).not.toBeNull();
  const { k, dir } = bad!;
  const buggy = [...sol.slice(0, k), dir];

  for (const d of buggy) {
    await page.getByRole('button', { name: ARROW_LABEL[d], exact: true }).click();
    await expect(game).toHaveAttribute('data-last-say', `path.${d}`);
  }
  for (let i = 0; i < buggy.length; i++) {
    await expect(page.getByTestId(`slot-${i}`)).toHaveAttribute('data-cmd', buggy[i]);
  }

  await page.getByRole('button', { name: 'Chạy' }).click();
  await expect(game).toHaveAttribute('data-last-say', 'path.bump', { timeout: 5000 });
  await expect(page.getByTestId(`slot-${k}`)).toHaveAttribute('data-bump', 'true');
  await expect(page.getByTestId('daudau')).toHaveAttribute('data-scratch', 'true');
  await page.screenshot({ path: 'test-results/shots/T-041-program.png' });

  // Đậu Đậu về ô xuất phát, dải lệnh giữ nguyên
  await expect(game).not.toHaveAttribute('data-busy', 'true', { timeout: 3000 });
  expect(await dauPos(page)).toEqual(start);
  for (let i = 0; i < buggy.length; i++) {
    await expect(page.getByTestId(`slot-${i}`)).toHaveAttribute('data-cmd', buggy[i]);
  }

  // sửa: xóa ô lỗi rồi thêm phần còn lại của lời giải
  await page.getByRole('button', { name: `Xóa lệnh ${k + 1}` }).click();
  await expect(page.getByTestId(`slot-${k}`)).not.toHaveAttribute('data-cmd');
  for (const d of sol.slice(k)) {
    await page.getByRole('button', { name: ARROW_LABEL[d], exact: true }).click();
  }
  for (let i = 0; i < sol.length; i++) {
    await expect(page.getByTestId(`slot-${i}`)).toHaveAttribute('data-cmd', sol[i]);
  }
  await page.getByRole('button', { name: 'Chạy' }).click();
  await expect(game).toHaveAttribute('data-last-say', 'path.go');
  await expect(game).toHaveAttribute('data-last-say', 'path.home', { timeout: 5000 });
  await expect(page.locator('[data-kind="home"]')).toHaveAttribute('data-glow', 'true');
  await page.screenshot({ path: 'test-results/shots/T-041-program-home.png' });
});

test('?path=program: dải lệnh tối đa 4 ô; nút ≥120px khe ≥24px, tránh góc phụ huynh', async ({ page }) => {
  await openPath(page, '&path=program');
  for (let i = 0; i < 6; i++) await page.evaluate(() => window.__behocPath!.tapDir('right'));
  await expect(page.locator('[data-testid^="slot-"][data-cmd]')).toHaveCount(4);
  await expect(page.locator('[data-testid^="slot-"]')).toHaveCount(4);
  // chờ hiệu ứng "bật lên" của ô lệnh vừa thêm chạy xong rồi mới đo
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );

  const boxes = await page.locator('[data-testid="game-path"] button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  expect(boxes.length).toBe(1 + 5 + 4); // về nhà, 4 mũi tên + ▶, 4 ô lệnh
  for (const b of boxes) {
    expect(b.w, b.name!).toBeGreaterThanOrEqual(120);
    expect(b.h, b.name!).toBeGreaterThanOrEqual(120);
    expect(b.x + b.w, b.name!).toBeLessThanOrEqual(1194 - 144);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const gapX = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
      const gapY = Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h);
      expect(Math.max(gapX, gapY), `${a.name} / ${b.name}`).toBeGreaterThanOrEqual(24);
    }
  }
});

test.describe('iPhone dọc 430×932', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('mức 1: chạm ô kề tới nhà', async ({ page }) => {
    await openPath(page);
    await walkHome(page, (r, c) => page.getByTestId(`cell-${r}-${c}`).tap());
  });

  test('mức 2: chạm mũi tên, chạm ô lệnh để xóa', async ({ page }) => {
    const game = await openPath(page, '&path=program');
    await page.getByRole('button', { name: 'Lên', exact: true }).tap();
    await page.getByRole('button', { name: 'Phải', exact: true }).tap();
    await expect(game).toHaveAttribute('data-last-say', 'path.right');
    await expect(page.getByTestId('slot-1')).toHaveAttribute('data-cmd', 'right');
    await page.getByRole('button', { name: 'Xóa lệnh 1' }).tap();
    await expect(page.getByTestId('slot-0')).toHaveAttribute('data-cmd', 'right');
    await expect(page.getByTestId('slot-1')).not.toHaveAttribute('data-cmd');
  });
});
