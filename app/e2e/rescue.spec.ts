// E2E trò "Đội cứu hộ" (rescue): chuông báo + bong bóng tình huống, chọn xe trong ga-ra, giữ tay để lái,
// thao tác cứu hộ bằng chuột thật (kéo dụng cụ tới đích, giữ tay phun nước/lau), ăn mừng và chơi lại.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/shots', { recursive: true });

type Snap = {
  level: string;
  index: number;
  count: number;
  phase: string;
  mission: string;
  vehicle: string;
  animal: string;
  garage: string[];
  acts: string[];
  step: number;
  hp: number[];
  driven: number;
  driveNeed: number;
};
declare global {
  interface Window {
    __behocRescue?: {
      snapshot(): Snap | null;
      pick(v: string): string;
      drive(ms: number): boolean;
      dragDone(): boolean;
      rub(target: number, ms: number): boolean;
    };
  }
}

const RUB_ACTS = ['spray', 'wash', 'dry', 'clean'];
/** Key câu nói của một thao tác: 'ladderUp' → 'rescue.do.ladder-up'. */
const doKey = (act: string) => `rescue.do.${act.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;

/** level: easy (24 tháng: 2 xe, 3 nhiệm vụ), medium (36: 3 xe, 4 nhiệm vụ), hard (54: 4 xe, 5 nhiệm vụ). */
async function openRescue(page: Page, level: 'easy' | 'medium' | 'hard') {
  await page.goto(`./?e2e=1&picker=farm&level=${level}`);
  await expect(page.getByTestId('game-picker')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('pick-rescue').click();
  const game = page.getByTestId('game-rescue');
  await expect(game).toBeVisible({ timeout: 15_000 });
  await expect(game).toHaveAttribute('data-last-say', 'rescue.hello');
  return game;
}

async function snap(page: Page): Promise<Snap> {
  return (await page.evaluate(() => window.__behocRescue!.snapshot()))!;
}

/** Chờ mọi ảnh tải xong để ảnh chụp đầy đủ. */
async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-testid="game-rescue"] img')].every((i) => i.complete && i.naturalWidth > 0),
  );
}

async function center(page: Page, selector: string) {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Chọn xe đúng và tới nơi bằng móc logic (lái thật kiểm tra ở test riêng). */
async function skipToRescue(page: Page) {
  const game = page.getByTestId('game-rescue');
  const s = await snap(page);
  expect(await page.evaluate((v) => window.__behocRescue!.pick(v), s.vehicle)).toBe('right');
  await expect(game).toHaveAttribute('data-phase', 'drive', { timeout: 4000 });
  expect(await page.evaluate(() => window.__behocRescue!.drive(99_999))).toBe(true);
  await expect(game).toHaveAttribute('data-view', 'rescue');
  await imagesLoaded(page);
}

/**
 * Làm một bước cứu hộ bằng chuột thật. Bước kéo: kéo vật từ chỗ nó đang nằm tới đích.
 * Bước phun/lau: giữ chuột trên từng chỗ cho tới khi xong. `shot` = chụp ảnh giữa chừng.
 */
async function doStep(page: Page, shot?: string) {
  const before = await snap(page);
  const act = before.acts[before.step];
  const moved = async () => {
    const now = await snap(page);
    return now.index !== before.index || now.step !== before.step || now.phase !== 'rescue';
  };
  if (RUB_ACTS.includes(act)) {
    for (let i = 0; i < before.hp.length; i++) {
      const p = await center(page, `[data-testid="spot-${i}"]`);
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.mouse.move(p.x + 14, p.y + 8);
      if (shot && i === 0) {
        await page.waitForTimeout(260);
        await page.screenshot({ path: shot });
      }
      // giữ tay (xê dịch nhẹ) cho tới khi chỗ này xong
      for (let k = 0; k < 80; k++) {
        if (await moved()) break;
        if ((await snap(page)).hp[i] === 0) break;
        await page.mouse.move(p.x + (k % 2 ? 14 : -14), p.y + (k % 2 ? -8 : 8));
        await page.waitForTimeout(40);
      }
      await page.mouse.up();
    }
  } else {
    // vật kéo trượt về điểm đầu của bước (900ms) rồi mới nắm được
    await expect(page.locator('[data-testid="handle"][data-live]')).toHaveAttribute('data-act', act);
    await page.waitForTimeout(1000);
    const from = await center(page, '[data-testid="handle"][data-live]');
    const to = await center(page, '[data-testid="target"]');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const steps = 14;
    for (let k = 1; k <= steps; k++) {
      await page.mouse.move(from.x + ((to.x - from.x) * k) / steps, from.y + ((to.y - from.y) * k) / steps);
      if (shot && k === 7) await page.screenshot({ path: shot });
      if (await moved()) break;
    }
    await page.mouse.up();
  }
  await expect.poll(moved, { timeout: 5000 }).toBe(true);
}

/** Làm hết các bước của nhiệm vụ đang cứu bằng chuột thật; chụp ảnh thao tác đầu và lúc bạn thú mừng. */
async function rescueByHand(page: Page, shots: boolean) {
  const game = page.getByTestId('game-rescue');
  const s = await snap(page);
  for (let i = 0; i < s.acts.length; i++) {
    await expect(game).toHaveAttribute('data-step', String(i));
    await doStep(page, shots && i === 0 ? `test-results/shots/rescue-do-${s.mission}.png` : undefined);
  }
  await expect(game).toHaveAttribute('data-phase', 'saved');
  // bạn thú nhảy mừng, kêu tiếng thật, rồi Đậu Đậu khen đúng việc vừa làm (không cắt ngang tiếng kêu)
  await expect(page.getByTestId('happy')).toBeVisible({ timeout: 4000 });
  await expect(game).toHaveAttribute('data-last-say', /^(animal\.[a-z]+-sound|feed\.sound\.cat)$/);
  if (shots) {
    await page.waitForTimeout(450);
    await page.screenshot({ path: `test-results/shots/rescue-saved-${s.mission}.png` });
  }
  await expect(game).toHaveAttribute('data-last-say', `rescue.done.${s.mission}`, { timeout: 6000 });
  return s;
}

test('Trang trại → Đội cứu hộ: bong bóng tình huống, ga-ra 4 xe (bé lớn); xe khác chỉ bấm còi chào, xe đúng nhấp nháy; chụp rescue-garage', async ({ page }) => {
  const game = await openRescue(page, 'hard');
  const s = await snap(page);
  expect(s.garage).toHaveLength(4);
  expect(s.garage).toContain(s.vehicle);
  expect(s.count).toBe(5);
  await expect(page.getByTestId('bubble')).toHaveAttribute('data-mission', s.mission);
  await expect(page.locator('[data-testid^="car-"]')).toHaveCount(4);
  // sau câu chào thì Đậu Đậu nói tình huống
  await expect(game).toHaveAttribute('data-last-say', `rescue.call.${s.mission}`, { timeout: 8000 });
  // bé lớn: chưa gợi ý ngay
  await expect(page.getByTestId(`car-${s.vehicle}`)).not.toHaveAttribute('data-hint', '');

  // vùng chạm ≥120px, cách nhau ≥24px, nằm trong khung
  const boxes = [];
  for (const v of s.garage) boxes.push((await page.getByTestId(`car-${v}`).boundingBox())!);
  boxes.sort((a, b) => a.x - b.x);
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i].width).toBeGreaterThanOrEqual(120);
    expect(boxes[i].height).toBeGreaterThanOrEqual(120);
    expect(boxes[i].x).toBeGreaterThanOrEqual(0);
    expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(1194);
    if (i) expect(boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width)).toBeGreaterThanOrEqual(24);
  }
  const cap = (await page.getByTestId('captain').boundingBox())!;
  expect(cap.width).toBeGreaterThanOrEqual(120);
  expect(cap.x).toBeGreaterThanOrEqual(144 + 24);

  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/rescue-garage.png' });

  // Chạm xe khác: không âm báo sai, xe bấm còi lắc vui, Đậu Đậu khích lệ, xe đúng nhấp nháy
  const other = s.garage.find((v) => v !== s.vehicle)!;
  const ob = (await page.getByTestId(`car-${other}`).boundingBox())!;
  await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2);
  await expect(game).toHaveAttribute('data-last-say', 'rescue.other');
  await expect(game).toHaveAttribute('data-phase', 'pick');
  await expect(page.getByTestId(`car-${s.vehicle}`)).toHaveAttribute('data-hint', '');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'test-results/shots/rescue-garage-hint.png' });

  // Chạm đội trưởng: nhắc lại tình huống
  await page.getByTestId('captain').dispatchEvent('pointerdown');
  await expect(game).toHaveAttribute('data-last-say', `rescue.call.${s.mission}`);
});

test('chọn xe đúng → xe chạy ra; xe chỉ chạy khi bé giữ tay, nhả tay thì dừng; tới nơi thì sang cứu hộ; chụp rescue-drive', async ({ page }) => {
  const game = await openRescue(page, 'medium');
  const s = await snap(page);
  expect(s.garage).toHaveLength(3);
  const rb = (await page.getByTestId(`car-${s.vehicle}`).boundingBox())!;
  await page.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await expect(game).toHaveAttribute('data-last-say', `rescue.go.${s.vehicle}`);
  await expect(game).toHaveAttribute('data-phase', 'drive', { timeout: 4000 });
  await expect(page.getByTestId('driver')).toHaveAttribute('data-vehicle', s.vehicle);

  // không giữ tay: xe đứng yên
  await page.waitForTimeout(500);
  expect((await snap(page)).driven).toBe(0);

  // giữ tay ở bất kỳ đâu: xe chạy, bánh quay
  await page.mouse.move(640, 430);
  await page.mouse.down();
  await expect(page.getByTestId('driver')).toHaveAttribute('data-holding', '');
  await expect.poll(async () => (await snap(page)).driven, { timeout: 4000 }).toBeGreaterThan(600);
  await page.screenshot({ path: 'test-results/shots/rescue-drive.png' });
  await page.mouse.up();

  // nhả tay: xe dừng, quãng đã đi được giữ nguyên
  await expect(page.getByTestId('driver')).not.toHaveAttribute('data-holding', '');
  const paused = (await snap(page)).driven;
  expect(paused).toBeLessThan(s.driveNeed);
  await page.waitForTimeout(500);
  expect((await snap(page)).driven).toBe(paused);

  // giữ tiếp tới nơi
  await page.mouse.down();
  await expect(game).toHaveAttribute('data-phase', 'rescue', { timeout: 8000 });
  await page.mouse.up();
  const now = await snap(page);
  await expect(game).toHaveAttribute('data-last-say', doKey(now.acts[0]), { timeout: 4000 });
  await expect(page.getByTestId('animal')).toHaveAttribute('data-mood', 'hope');
  await expect(page.getByTestId('vehicle')).toHaveAttribute('data-vehicle', s.vehicle);

  // chạm bạn thú và xe lúc nào cũng có phản ứng
  await page.getByTestId('animal').dispatchEvent('pointerdown');
  await expect(game).toHaveAttribute('data-last-say', /^(animal\.[a-z]+-sound|feed\.sound\.cat)$/);
});

test('bé lớn: cứu đủ 5 nhiệm vụ bằng tay (3 bước nhỏ) → ăn mừng → chơi lại ra nhiệm vụ còn thiếu; chụp rescue-do-*, rescue-saved-*, rescue-party', async ({ page }) => {
  test.setTimeout(300_000);
  const game = await openRescue(page, 'hard');
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    await expect.poll(async () => (await snap(page))?.index, { timeout: 15_000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'pick', { timeout: 10_000 });
    await skipToRescue(page);
    const s = await rescueByHand(page, true);
    expect(seen).not.toContain(s.mission);
    seen.push(s.mission);
    if (s.mission !== 'fire') expect(s.acts.length).toBeGreaterThanOrEqual(2);
  }
  await expect(page.getByTestId('party')).toBeVisible({ timeout: 15_000 });
  await expect(game).toHaveAttribute('data-last-say', 'rescue.party');
  await imagesLoaded(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/shots/rescue-party.png' });

  // Chơi lại: lượt mới, nhiệm vụ đầu là nhiệm vụ lượt trước chưa gặp
  const replay = (await page.getByRole('button', { name: 'Chơi lại' }).boundingBox())!;
  expect(replay.width).toBeGreaterThanOrEqual(120);
  await page.mouse.click(replay.x + replay.width / 2, replay.y + replay.height / 2);
  await expect(game).toHaveAttribute('data-phase', 'pick');
  const next = await snap(page);
  expect(next.index).toBe(0);
  expect(seen).not.toContain(next.mission);
  await skipToRescue(page);
  await rescueByHand(page, true);
});

test('bé nhỏ: ga-ra 2 xe, xe đúng nhấp nháy ngay, thao tác 1 bước; cứu đủ 3 nhiệm vụ → ăn mừng', async ({ page }) => {
  test.setTimeout(120_000);
  const game = await openRescue(page, 'easy');
  const first = await snap(page);
  expect(first.garage).toHaveLength(2);
  expect(first.count).toBe(3);
  await expect(page.getByTestId(`car-${first.vehicle}`)).toHaveAttribute('data-hint', '');
  for (let i = 0; i < 3; i++) {
    await expect.poll(async () => (await snap(page))?.index, { timeout: 15_000 }).toBe(i);
    await expect(game).toHaveAttribute('data-phase', 'pick', { timeout: 10_000 });
    const s = await snap(page);
    expect(s.acts).toHaveLength(1);
    await skipToRescue(page);
    await rescueByHand(page, false);
  }
  await expect(page.getByTestId('party')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid^="party-animal-"]')).toHaveCount(3);
});

test.describe('iPhone dọc 430×932: kéo dụng cụ cứu hộ', () => {
  test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

  test('kéo trong khung xoay vẫn tới đúng đích; chụp rescue-mobile', async ({ page }) => {
    test.setTimeout(120_000);
    const game = await openRescue(page, 'medium');
    await expect(page.getByTestId('stage')).toHaveAttribute('data-rotated', 'true');
    // tìm nhiệm vụ có bước đầu là kéo (dập lửa là giữ tay phun nên làm bằng tay rồi sang nhiệm vụ kế)
    for (let i = 0; i < 4; i++) {
      await expect.poll(async () => (await snap(page))?.index, { timeout: 15_000 }).toBe(i);
      await expect(game).toHaveAttribute('data-phase', 'pick', { timeout: 10_000 });
      await skipToRescue(page);
      const s = await snap(page);
      await doStep(page, RUB_ACTS.includes(s.acts[0]) ? undefined : 'test-results/shots/rescue-mobile.png');
      if (!RUB_ACTS.includes(s.acts[0])) {
        const now = await snap(page);
        expect(now.phase === 'saved' || now.step === 1).toBe(true);
        return;
      }
      for (let k = 1; k < s.acts.length; k++) await doStep(page);
    }
    throw new Error('không gặp nhiệm vụ nào có bước kéo');
  });
});
