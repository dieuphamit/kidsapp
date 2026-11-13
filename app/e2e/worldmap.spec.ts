// E2E bản đồ 5 khu (T-034)
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

type Box = { x: number; y: number; width: number; height: number };

const STAGE = { width: 1194, height: 834 };
// 5 khu theo thứ tự; house chưa có trò (phase 3 thêm) nên có thể ẩn
const PLACE_IDS = ['zoo', 'house', 'orchard', 'puzzle', 'music'];
const WITH_GAMES = ['zoo', 'orchard', 'puzzle', 'music'];

function overlap(a: Box, b: Box, gap = 0): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

async function placeButtons(page: Page) {
  const wrappers = page.locator('[data-testid^="place-"]');
  const ids = await wrappers.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.slice('place-'.length)));
  return { ids, buttons: ids.map((id) => page.getByTestId(`place-${id}`).getByRole('button')) };
}

test('bản đồ có các khu trong 5 khu (zoo, house, orchard, puzzle, music), không còn trang trại / hồ nước', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('place-music')).toBeVisible();

  const { ids } = await placeButtons(page);
  for (const id of WITH_GAMES) expect(ids, `khu ${id}`).toContain(id);
  for (const id of ids) expect(PLACE_IDS, `khu lạ ${id}`).toContain(id);
  // đúng thứ tự PLACES
  expect(ids).toEqual(PLACE_IDS.filter((id) => ids.includes(id)));

  await expect(page.getByLabel('Thế giới thú')).toBeVisible();
  await expect(page.getByLabel('Vườn quả')).toBeVisible();
  await expect(page.getByLabel('Góc đố')).toBeVisible();
  await expect(page.getByLabel('Nhà âm nhạc')).toBeVisible();
  await expect(page.getByLabel('Trang trại')).toHaveCount(0);
  await expect(page.getByLabel('Hồ nước')).toHaveCount(0);

  // dải icon trò: Thế giới thú có 6 trò nhưng chỉ hiện 4 icon đầu
  await expect(page.getByTestId('place-zoo').getByTestId('strip')).toHaveText('🌍🐄🦁🔊');
  await expect(page.getByTestId('place-orchard').getByTestId('strip')).toHaveText('🍎🧺🔺');
  await expect(page.getByTestId('place-puzzle').getByTestId('strip')).toHaveText('🃏🧩');

  // chưa chơi trò nào thì không có nút chơi lại
  await expect(page.getByTestId('replay')).toHaveCount(0);

  const clouds = page.locator('[data-testid="cloud"]');
  expect(await clouds.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();
});

test('nút khu 200px, cách nhau ≥24px, nằm trọn khung, không đè cổng phụ huynh và Đậu Đậu; chụp T-034-map', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByTestId('place-music')).toBeVisible();
  await page.waitForTimeout(800); // chờ hiệu ứng hiện nút xong

  const { ids, buttons } = await placeButtons(page);
  const boxes: (Box & { id: string })[] = [];
  for (let i = 0; i < ids.length; i++) {
    const box = await buttons[i].boundingBox();
    expect(box, ids[i]).not.toBeNull();
    expect(box!.width, `${ids[i]} rộng`).toBeCloseTo(200, 0);
    expect(box!.height, `${ids[i]} cao`).toBeCloseTo(200, 0);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(STAGE.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(STAGE.height);
    boxes.push({ ...box!, id: ids[i] });
  }

  const gate = await page.getByLabel('Khu phụ huynh').boundingBox();
  const mascot = await page.getByRole('img', { name: 'Đậu Đậu' }).boundingBox();
  const bubble = await page.getByTestId('bubble').boundingBox();
  for (const b of boxes) {
    expect(overlap(b, gate!), `${b.id} đè cổng phụ huynh`).toBe(false);
    expect(overlap(b, mascot!, 24), `${b.id} sát Đậu Đậu`).toBe(false);
    expect(overlap(b, bubble!), `${b.id} đè bong bóng`).toBe(false);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(overlap(boxes[i], boxes[j], 24), `${boxes[i].id} sát ${boxes[j].id}`).toBe(false);
    }
  }

  await page.screenshot({ path: 'test-results/shots/T-034-map.png' });
});

test('chạm khu có phản hồi ngay (data-pressed, nói tên khu)', async ({ page }) => {
  await page.goto('./');
  const orchardBtn = page.getByLabel('Vườn quả');
  await expect(orchardBtn).toBeVisible();
  // Màn đổi sau 400ms, nên ghi lại phản hồi ngay trong trang thay vì đọc sau
  await page.evaluate(() => {
    const w = window as unknown as { seen: { pressed: boolean; say: string | null } };
    w.seen = { pressed: false, say: null };
    const home = document.querySelector('[data-testid="home"]')!;
    const btn = document.querySelector('[aria-label="Vườn quả"]')!;
    new MutationObserver(() => {
      if (btn.hasAttribute('data-pressed')) w.seen.pressed = true;
      w.seen.say ??= home.getAttribute('data-last-say') === 'place.orchard' ? 'place.orchard' : null;
    }).observe(home, { attributes: true, subtree: true });
  });
  const box = (await orchardBtn.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => (window as unknown as { seen: unknown }).seen), { timeout: 1000 })
    .toEqual({ pressed: true, say: 'place.orchard' });
  await page.mouse.up();
});

test('chạm khu nhiều trò mở màn chọn trò sau khoảng 400ms', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Góc đố')).toBeVisible();
  await page.getByLabel('Góc đố').click();
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 1500 });
  await expect(page.getByTestId('pick-memory')).toBeVisible();
  await expect(page.getByTestId('pick-puzzle')).toBeVisible();
});

// Phase 3: không còn khu nào chỉ có 1 trò; luật "1 trò thì vào thẳng" kiểm ở WorldMap.test.tsx.
test('Nhà âm nhạc mở màn chọn trò có Vẽ và nhạc và Ban nhạc thú', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Nhà âm nhạc')).toBeVisible();
  await page.getByLabel('Nhà âm nhạc').click();
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 1500 });
  await expect(page.getByTestId('pick-music')).toBeVisible();
  await expect(page.getByTestId('pick-band')).toBeVisible();
});

test('bong bóng không giao với mây ở 3 thời điểm', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
  const bubble = page.getByTestId('bubble');
  const clouds = page.locator('[data-testid="cloud"]');
  for (const wait of [0, 2000, 2000]) {
    if (wait > 0) await page.waitForTimeout(wait);
    const bubbleBox = await bubble.boundingBox();
    expect(bubbleBox).not.toBeNull();
    const n = await clouds.count();
    for (let i = 0; i < n; i++) {
      const cloudBox = await clouds.nth(i).boundingBox();
      expect(overlap(bubbleBox!, cloudBox!), `Mây ${i + 1} giao với bong bóng`).toBe(false);
    }
  }
});
