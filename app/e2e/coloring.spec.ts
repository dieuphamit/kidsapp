// E2E trò "Tô màu" (coloring): phòng vẽ chọn tranh trên giá vẽ, chạm vùng để đổ màu, hoàn tác, ăn mừng khi tô xong.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

/** Ghi tuổi vào idb-keyval trước khi vào app. */
async function setAge(page: Page, ageMonths: number) {
  await page.goto('./?menu=map&e2e=1');
  await page.evaluate(async (age) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
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
}

async function openGame(page: Page, ageMonths = 36, setup = true) {
  if (setup) await setAge(page, ageMonths);
  await page.goto('./?menu=map&e2e=1');
  await expect(page.getByTestId('home')).toBeVisible();
  await page.getByLabel('Nhà âm nhạc').click();
  await pickGame(page, 'coloring');
  const game = page.getByTestId('game-coloring');
  await expect(game).toBeVisible({ timeout: 10_000 });
  await expect(game).toHaveAttribute('data-last-say', 'coloring.hello');
  await page.waitForTimeout(900); // giá vẽ hiện xong (hiệu ứng trồi lên)
  return game;
}

/** Một điểm (toạ độ màn hình) mà chạm vào đúng trúng phần tử này (không bị vùng khác đè). */
async function hitPoint(page: Page, testId: string) {
  const p = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const fs = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8];
    for (const fy of fs) {
      for (const fx of fs) {
        const x = r.left + r.width * fx;
        const y = r.top + r.height * fy;
        if (document.elementFromPoint(x, y) === el) return { x, y };
      }
    }
    return null;
  }, testId);
  expect(p, `điểm chạm cho ${testId}`).not.toBeNull();
  return p!;
}

async function tapRegion(page: Page, region: string) {
  const p = await hitPoint(page, `region-${region}`);
  await page.mouse.click(p.x, p.y);
}

/** Chọn màu: bấm "Đổi bộ màu" tới khi ô màu đó hiện (bảng chia 3 bộ, không cuộn). */
async function pickPaint(page: Page, label: string) {
  const btn = page.getByLabel(label, { exact: true });
  for (let i = 0; i < 3 && !(await btn.isVisible()); i++) {
    await page.getByLabel('Đổi bộ màu').click();
    await page.waitForTimeout(550); // ô màu mới nảy lên xong
  }
  await btn.click();
}

/** Mọi ô màu đang hiện: nằm trọn trong khung, không bị gì che (chạm giữa và 4 góc trong trúng nút). */
async function swatchBoxes(page: Page) {
  return page.locator('[data-testid="coloring-palette"] button').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      const pts = [
        [0.5, 0.5],
        [0.2, 0.2],
        [0.8, 0.2],
        [0.2, 0.8],
        [0.8, 0.8],
      ];
      const clear = pts.every(([fx, fy]) => {
        const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        return hit !== null && e.contains(hit);
      });
      return { name: e.getAttribute('aria-label') ?? '', x: r.x, y: r.y, w: r.width, h: r.height, clear };
    }),
  );
}

type Box = { name: string; x: number; y: number; w: number; h: number };

async function visibleButtons(page: Page): Promise<Box[]> {
  return page.locator('button:visible').evaluateAll((els) =>
    els
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { name: e.getAttribute('aria-label') ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
      })
      // bỏ bút màu đang bị cuộn khuất dưới mép khung
      .filter((b) => b.y + b.h <= window.innerHeight + 0.5),
  );
}

function expectUxRules(boxes: Box[]) {
  for (const b of boxes) {
    expect(b.w, `rộng "${b.name}"`).toBeGreaterThanOrEqual(120 - 0.5);
    expect(b.h, `cao "${b.name}"`).toBeGreaterThanOrEqual(120 - 0.5);
    expect(b.x + b.w, `"${b.name}" trong khung`).toBeLessThanOrEqual(1194 + 0.5);
    if (b.name !== 'Khu phụ huynh' && b.y < 144) expect(b.x + b.w, `"${b.name}" tránh cổng bố mẹ`).toBeLessThanOrEqual(1194 - 144);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
      const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
      expect(Math.max(gapX, gapY), `"${a.name}" và "${b.name}"`).toBeGreaterThanOrEqual(24 - 0.5);
    }
  }
}

test('phòng vẽ: 4 giá vẽ + 7 tab nhóm, vùng chạm đủ to, đổi nhóm; chụp coloring-room', async ({ page }) => {
  const game = await openGame(page);
  await expect(page.locator('[data-testid^="easel-"]')).toHaveCount(4);
  await expect(page.locator('[data-testid^="tab-"]')).toHaveCount(7);
  expectUxRules(await visibleButtons(page));
  await page.screenshot({ path: 'test-results/shots/coloring-room.png' });

  // mọi nhóm: chụp lại để bố mẹ xem toàn bộ tranh
  const tabs: [string, string][] = [
    ['sea', 'Dưới biển'],
    ['bugs', 'Chim và côn trùng'],
    ['vehicles', 'Xe cộ'],
    ['fruits', 'Hoa và quả'],
    ['things', 'Đồ vật'],
    ['daudau', 'Mèo con'],
  ];
  for (const [id, label] of tabs) {
    await page.getByLabel(label, { exact: true }).click();
    await expect(game).toHaveAttribute('data-group', id);
    await expect(game).toHaveAttribute('data-last-say', `coloring.group.${id}`);
    await expect(page.locator('[data-testid^="easel-"]')).toHaveCount(4);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/shots/coloring-room-${id}.png` });
  }
  await expect(page.getByTestId('easel-dd-face')).toBeVisible();
});

test('chọn tranh heo, chọn màu, chạm tô vài vùng, hoàn tác/làm lại; chụp coloring-paint', async ({ page }) => {
  const game = await openGame(page);
  await page.getByLabel('Bạn heo con!').click();
  await expect(game).toHaveAttribute('data-screen', 'paint');
  await expect(game).toHaveAttribute('data-picture', 'pig');
  await expect(game).toHaveAttribute('data-last-say', 'coloring.pic.pig');
  await page.waitForTimeout(600); // ô màu nảy lên xong
  expectUxRules(await visibleButtons(page));

  // bảng màu: 3 bộ, mỗi bộ hiện đủ cùng lúc (không cuộn, không ô nào bị cắt hay che),
  // tránh dải 144px sát mép phải ở nửa trên (cổng bố mẹ); đi hết 3 bộ thì gặp đủ 17 màu
  const palette = page.getByTestId('coloring-palette');
  expect(await palette.evaluate((el) => el.scrollHeight <= el.clientHeight && getComputedStyle(el).overflowY !== 'auto')).toBe(true);
  const seen = new Set<string>();
  for (let set = 0; set < 3; set++) {
    await expect(palette).toHaveAttribute('data-set', String(set));
    await page.waitForTimeout(600);
    const boxes = await swatchBoxes(page);
    expect(boxes.length).toBeGreaterThanOrEqual(6);
    for (const b of boxes) {
      seen.add(b.name);
      expect(b.clear, `"${b.name}" hiện đủ, không bị che`).toBe(true);
      expect(b.y, `"${b.name}" trong khung`).toBeGreaterThanOrEqual(0);
      expect(b.y + b.h, `"${b.name}" trong khung`).toBeLessThanOrEqual(834 + 0.5);
      expect(b.x + b.w, `"${b.name}" trong khung`).toBeLessThanOrEqual(1194 + 0.5);
      if (b.y < 417) expect(b.x + b.w, `"${b.name}" cách mép phải ≥144 ở nửa trên`).toBeLessThanOrEqual(1194 - 144 + 0.5);
    }
    expectUxRules(await visibleButtons(page));
    if (set === 1) await page.screenshot({ path: 'test-results/shots/coloring-palette-2.png' });
    if (set === 2) await page.screenshot({ path: 'test-results/shots/coloring-palette-3.png' });
    await page.getByLabel('Đổi bộ màu').click();
  }
  await expect(palette).toHaveAttribute('data-set', '0');
  expect(seen.size).toBe(18); // 17 màu/công cụ + nút đổi bộ
  // không phần tử nào của trò trong dải sát mép phải ở nửa trên
  const intruders = await page.evaluate(() => {
    const game = document.querySelector('[data-testid="game-coloring"]')!;
    const out: string[] = [];
    for (const el of game.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width >= 1194 && r.height >= 834) continue; // lớp phủ cả khung (nền, khung chứa)
      if (r.right > 1194 - 144 + 0.5 && r.top < 417) out.push(`${el.tagName}.${el.className} ${Math.round(r.left)},${Math.round(r.top)}`);
    }
    return out;
  });
  expect(intruders).toEqual([]);

  await pickPaint(page, 'Màu hồng');
  await expect(game).toHaveAttribute('data-color', 'pink');
  await expect(game).toHaveAttribute('data-last-say', 'color.pink');
  await tapRegion(page, 'head');
  await expect(page.getByTestId('region-head')).toHaveAttribute('data-fill', 'pink');

  await pickPaint(page, 'Màu nâu');
  await tapRegion(page, 'ear-l');
  await tapRegion(page, 'ear-r');
  await expect(page.getByTestId('region-ear-r')).toHaveAttribute('data-fill', 'brown');

  // công cụ vui ở bộ màu cuối
  await pickPaint(page, 'Màu cầu vồng!');
  await expect(game).toHaveAttribute('data-last-say', 'coloring.rainbow');
  await tapRegion(page, 'snout');
  await expect(page.getByTestId('region-snout')).toHaveAttribute('data-fill', 'rainbow');
  await pickPaint(page, 'Lấp lánh!');
  await expect(page.getByLabel('Lấp lánh!')).toHaveAttribute('aria-pressed', 'true');
  await tapRegion(page, 'cheek-l');
  await expect(page.getByTestId('region-cheek-l')).toHaveAttribute('data-fill', 'sparkle');

  // hoàn tác bỏ má lấp lánh, làm lại thì hiện lại
  await page.getByLabel('Hoàn tác').click();
  await expect(page.getByTestId('region-cheek-l')).toHaveAttribute('data-fill', '');
  await expect(page.getByTestId('region-snout')).toHaveAttribute('data-fill', 'rainbow');
  await page.getByLabel('Làm lại').click();
  await expect(page.getByTestId('region-cheek-l')).toHaveAttribute('data-fill', 'sparkle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/shots/coloring-paint.png' });

  // về giá vẽ: tranh nhỏ hiện bản đã tô
  await page.getByLabel('Về giá vẽ').click();
  await expect(game).toHaveAttribute('data-screen', 'pick');
  await expect(page.getByTestId('easel-pig')).toHaveAttribute('data-filled', '5');
});

test('tô hết tranh: ăn mừng, khen; tranh còn lại sau khi tải lại; chụp coloring-done', async ({ page }) => {
  const game = await openGame(page);
  await page.getByLabel('Dưới biển').click();
  await page.getByLabel('Bạn rùa!').click();
  await expect(game).toHaveAttribute('data-picture', 'turtle');
  const colors = ['Màu xanh lá', 'Màu vàng', 'Màu xanh lá', 'Màu cam', 'Màu xanh nõn chuối', 'Màu nâu'];
  const regions = ['leg-l', 'leg-r', 'head', 'shell', 'hex', 'rim'];
  for (let i = 0; i < regions.length; i++) {
    await pickPaint(page, colors[i]);
    await tapRegion(page, regions[i]);
  }
  await expect(game).toHaveAttribute('data-done', '');
  await expect(page.getByTestId('coloring-party')).toBeVisible();
  await expect(game).toHaveAttribute('data-last-say', 'coloring.done', { timeout: 3000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/shots/coloring-done.png' });

  // lưu trên máy: vào lại trò vẫn thấy tranh đã tô
  await page.waitForTimeout(300);
  const game2 = await openGame(page, 36, false);
  await page.getByLabel('Dưới biển').click();
  await expect(page.getByTestId('easel-turtle')).toHaveAttribute('data-filled', '6');
  await page.getByLabel('Bạn rùa!').click();
  await expect(game2).toHaveAttribute('data-done', '');
  await expect(page.getByTestId('region-shell')).toHaveAttribute('data-fill', 'orange');
});

test('chạm giấy trống: có gợn phản hồi, không đổi màu vùng nào', async ({ page }) => {
  const game = await openGame(page);
  await page.getByLabel('Bạn heo con!').click();
  await expect(game).toHaveAttribute('data-screen', 'paint');
  const paper = (await page.getByTestId('coloring-paper').boundingBox())!;
  await page.mouse.click(paper.x + 30, paper.y + paper.height - 30);
  const fills = await page.evaluate(() => window.__behocColoring?.fills());
  expect(fills).toEqual({});
});

test.describe('iPhone dọc 430×932: chạm tô trong khung xoay', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('chạm đúng vùng đầu heo thì chỉ vùng đó đổi màu; chụp coloring-portrait', async ({ page }) => {
    const game = await openGame(page);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    await page.getByLabel('Bạn heo con!').click();
    await expect(game).toHaveAttribute('data-screen', 'paint');
    await pickPaint(page, 'Màu xanh da trời');
    await expect(game).toHaveAttribute('data-color', 'sky');
    await tapRegion(page, 'snout');
    await expect(page.getByTestId('region-snout')).toHaveAttribute('data-fill', 'sky');
    expect(await page.evaluate(() => window.__behocColoring?.fills())).toEqual({ snout: 'sky' });
    await pickPaint(page, 'Màu vàng');
    await tapRegion(page, 'head');
    expect(await page.evaluate(() => window.__behocColoring?.fills())).toEqual({ snout: 'sky', head: 'yellow' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/coloring-portrait.png' });
  });
});

declare global {
  interface Window {
    __behocColoring?: { picture(): string; fills(): Record<string, string> };
  }
}
