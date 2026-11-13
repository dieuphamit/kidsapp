// E2E: Đậu Đậu trốn ở đâu? (T-036)
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { pickGame } from './pick.js';

mkdirSync('test-results/shots', { recursive: true });

type HideHook = {
  zones(): { prep: string; obj: string; x: number; y: number }[];
  drop(prep: string, obj: string): void;
  ask(): string | null;
};

const drop = (page: Page, prep: string, obj: string) =>
  page.evaluate(([p, o]) => (window as unknown as { __behocHide: HideHook }).__behocHide.drop(p, o), [prep, obj]);
const askOf = (page: Page) => page.evaluate(() => (window as unknown as { __behocHide: HideHook }).__behocHide.ask());

async function openHide(page: Page) {
  // mở thẳng bảng chọn trò của Nhà Đậu Đậu (bản đồ 3D nặng, nút còn đang nảy)
  // phòng đầu cố định là phòng khách (bình thường thứ tự phòng được xáo trộn)
  await page.goto('./?e2e=1&picker=house&hroom=living');
  await pickGame(page, 'hide');
  const game = page.getByTestId('game-hide');
  await expect(game).toBeVisible({ timeout: 10000 });
  await expect(game).toHaveAttribute('data-last-say', 'hide.hello', { timeout: 3000 });
  await expect(game).toHaveAttribute('data-room', 'living');
  await page.waitForTimeout(400);
  return game;
}

/** Kéo thật bằng chuột: từ tâm Đậu Đậu tới tâm vùng thả (toạ độ màn hình, đúng cả khi khung bị xoay). */
async function dragDaudauTo(page: Page, zoneTestId: string) {
  const cat = await page.getByTestId('hide-daudau').boundingBox();
  const zone = await page.getByTestId(zoneTestId).boundingBox();
  expect(cat).not.toBeNull();
  expect(zone).not.toBeNull();
  await page.mouse.move(cat!.x + cat!.width / 2, cat!.y + cat!.height / 2);
  await page.mouse.down();
  await page.mouse.move(zone!.x + zone!.width / 2, zone!.y + zone!.height / 2, { steps: 15 });
  await page.mouse.up();
}

test.describe('T-036: Đậu Đậu trốn ở đâu?', () => {
  test('kéo Đậu Đậu xuống gầm bàn → hide.under-table; chụp T-036-room.png', async ({ page }) => {
    const game = await openHide(page);
    await dragDaudauTo(page, 'zone-under-table');
    await expect(game).toHaveAttribute('data-last-say', 'hide.under-table', { timeout: 2000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/T-036-room.png' });
  });

  test('mỗi vùng thả nói đúng câu của vùng đó', async ({ page }) => {
    const game = await openHide(page);
    // kéo thật vào vài vùng khác nhau (chơi tự do: 3 lần đầu)
    for (const key of ['on-table', 'in-box', 'beside-bed']) {
      await dragDaudauTo(page, `zone-${key}`);
      await expect(game).toHaveAttribute('data-last-say', `hide.${key}`, { timeout: 2000 });
    }
  });

  test('3 lần thả tự do rồi Đậu Đậu nhờ; thả đúng → hide.yay; chụp T-036-ask.png', async ({ page }) => {
    const game = await openHide(page);
    const zones = await page.evaluate(() => (window as unknown as { __behocHide: HideHook }).__behocHide.zones());
    expect(zones.map((z) => `${z.prep}-${z.obj}`).sort()).toEqual(
      ['on-table', 'under-table', 'beside-table', 'in-box', 'on-box', 'beside-box', 'on-bed', 'under-bed', 'beside-bed'].sort(),
    );

    for (const [prep, obj] of [['on', 'table'], ['in', 'box'], ['under', 'bed']]) {
      expect(await askOf(page)).toBeNull();
      await drop(page, prep, obj);
      await expect(game).toHaveAttribute('data-last-say', `hide.${prep}-${obj}`);
    }

    await expect(game).toHaveAttribute('data-mode', 'ask');
    const ask = await askOf(page);
    expect(ask).toMatch(/^hide\.ask-(on|in|under|beside)-(table|box|bed)$/);
    await expect(game).toHaveAttribute('data-last-say', ask!, { timeout: 4000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/shots/T-036-ask.png' });

    // thả chỗ khác → nói câu vị trí thật, rồi nhắc lại câu nhờ (không âm sai)
    const other = zones.find((z) => `hide.ask-${z.prep}-${z.obj}` !== ask)!;
    await drop(page, other.prep, other.obj);
    await expect(game).toHaveAttribute('data-last-say', `hide.${other.prep}-${other.obj}`);
    await expect(game).toHaveAttribute('data-last-say', ask!, { timeout: 3000 });

    // thả đúng → hide.yay
    const [prep, obj] = ask!.replace('hide.ask-', '').split('-');
    await drop(page, prep, obj);
    await expect(game).toHaveAttribute('data-last-say', 'hide.yay');
  });

  test('3 lần đúng → sang bếp', async ({ page }) => {
    const game = await openHide(page);
    for (const [p, o] of [['on', 'table'], ['in', 'box'], ['under', 'bed']]) await drop(page, p, o);
    for (let i = 0; i < 3; i++) {
      const [p, o] = (await askOf(page))!.replace('hide.ask-', '').split('-');
      await drop(page, p, o);
      await expect(game).toHaveAttribute('data-last-say', 'hide.yay');
    }
    await expect(game).toHaveAttribute('data-room', 'kitchen', { timeout: 4000 });
    await expect(game).toHaveAttribute('data-mode', 'free');
    await expect(page.getByTestId('obj-pot')).toBeVisible();
  });
});

test.describe('iPhone dọc 430×932: kéo trong Trốn ở đâu', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });

  test('kéo Đậu Đậu xuống gầm bàn trên điện thoại dọc', async ({ page }) => {
    const game = await openHide(page);
    await dragDaudauTo(page, 'zone-under-table');
    await expect(game).toHaveAttribute('data-last-say', 'hide.under-table', { timeout: 2000 });
    await dragDaudauTo(page, 'zone-in-box');
    await expect(game).toHaveAttribute('data-last-say', 'hide.in-box', { timeout: 2000 });
    await page.screenshot({ path: 'test-results/shots/T-036-mobile-portrait.png' });
  });
});

test.describe('E4: phòng mới', () => {
  test('công viên: cầu trượt, ghế dài, lều; bé nhỏ có vùng gợi ý; chụp E4-hide.png', async ({ page }) => {
    await page.goto('./?e2e=1&picker=house&hroom=park');
    await pickGame(page, 'hide');
    const game = page.getByTestId('game-hide');
    await expect(game).toHaveAttribute('data-room', 'park', { timeout: 10000 });
    for (const o of ['slide', 'bench', 'tent']) await expect(page.getByTestId(`obj-${o}`)).toBeVisible();
    await page.waitForTimeout(400);
    await dragDaudauTo(page, 'zone-under-slide');
    await expect(game).toHaveAttribute('data-last-say', 'hide.under-slide', { timeout: 2000 });
    await drop(page, 'on', 'bench');
    await expect(game).toHaveAttribute('data-last-say', 'hide.on-bench');
    await drop(page, 'in', 'tent');
    await expect(game).toHaveAttribute('data-last-say', 'hide.in-tent');
    // tuổi mặc định 28 tháng (Dễ): nhờ một chỗ, vùng đó sáng lên, không hỏi "cạnh"
    await expect(game).toHaveAttribute('data-mode', 'ask');
    const ask = (await askOf(page))!;
    expect(ask).toMatch(/^hide\.ask-(on|in|under)-(slide|bench|tent)$/);
    await expect(page.locator('[data-hint]')).toHaveCount(1);
    await expect(page.getByTestId(`zone-${ask.replace('hide.ask-', '')}`)).toHaveAttribute('data-hint', '');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/shots/E4-hide.png' });
  });

  test('bãi biển: dù, thuyền, xô; chụp E4-hide-beach.png', async ({ page }) => {
    await page.goto('./?e2e=1&picker=house&hroom=beach');
    await pickGame(page, 'hide');
    const game = page.getByTestId('game-hide');
    await expect(game).toHaveAttribute('data-room', 'beach', { timeout: 10000 });
    await page.waitForTimeout(400);
    await dragDaudauTo(page, 'zone-in-boat');
    await expect(game).toHaveAttribute('data-last-say', 'hide.in-boat', { timeout: 2000 });
    await drop(page, 'under', 'umbrella');
    await expect(game).toHaveAttribute('data-last-say', 'hide.under-umbrella');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/shots/E4-hide-beach.png' });
  });
});
