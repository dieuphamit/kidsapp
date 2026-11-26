import { test, expect, type Page } from '@playwright/test';

async function assertUxRules(page: Page, shot: string) {
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label') ?? e.textContent, w: r.width, h: r.height, x: r.x, y: r.y };
    }),
  );

  // Kiểm tra có ít nhất một nút địa điểm (không phải "Khu phụ huynh")
  const placeButtons = boxes.filter((b) => b.name !== 'Khu phụ huynh');
  expect(placeButtons.length, 'có ít nhất một nút địa điểm').toBeGreaterThanOrEqual(1);

  for (const b of boxes) {
    expect(b.w, `vùng chạm "${b.name}" rộng`).toBeGreaterThanOrEqual(120);
    expect(b.h, `vùng chạm "${b.name}" cao`).toBeGreaterThanOrEqual(120);
  }

  // Kiểm tra khoảng cách giữa mọi cặp nút >= 24px
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      // Khe ngang và khe dọc giữa hai hình chữ nhật
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
      const gap = Math.max(gapX, gapY);
      expect(gap, `khoảng cách giữa "${a.name}" và "${b.name}"`).toBeGreaterThanOrEqual(24);
    }
  }

  expect(await page.locator('a[href^="http"]').count(), 'không có link ra ngoài').toBe(0);
  await page.screenshot({ path: `test-results/shots/${shot}.png` });
}

test('màn hình chính đạt luật UX', async ({ page }) => {
  await page.goto('./?menu=map&menu=map');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();
  await page.waitForTimeout(800);
  await assertUxRules(page, 'home');
});

test('chạy offline sau lần tải đầu', async ({ page, context }) => {
  // ~2700 file precache (giọng đọc vi/ja/en, ảnh, model 3D): sw/sw.js tải song song nên cài xong trong
  // vài chục giây; vẫn để dư thời gian cho máy chạy song song nhiều trình duyệt
  test.setTimeout(180_000);
  // lần tải đầu ở menu mặc định (đoàn tàu, 2D): bản đồ 3D vẽ WebGL bằng CPU trên máy không GPU sẽ tranh
  // CPU với lúc service worker tải ~2700 file; bản đồ 3D vẫn được kiểm offline ở cuối test
  await page.goto('./');
  await expect(page.getByTestId('train-menu')).toBeVisible();
  // service worker cài xong (mọi file đã vào cache) và đã kích hoạt: chờ bằng sự kiện, không đợi cố định
  await page.evaluate(() => navigator.serviceWorker.ready);
  // đủ MỌI file trong danh sách precache đã nằm trong cache (không chỉ trang chủ)
  const listed = await page.evaluate(async () => new Set((await (await fetch('/sw.js')).text()).match(/"url":"[^"]+"/g)).size);
  expect(listed).toBeGreaterThan(1000);
  const cached = await page.evaluate(async () => (await (await caches.open('behoc-precache-v1')).keys()).length);
  expect(cached).toBe(listed);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('train-menu')).toBeVisible();
  // bản đồ 3D (model GLB) cũng mở được khi offline
  await page.goto('./?menu=map&menu=map');
  await expect(page.getByTestId('home')).toBeVisible();
  // tài sản trò chơi (giọng đọc 3 thứ tiếng, ảnh, model 3D) vẫn tải được khi offline
  const offline = await page.evaluate(async () =>
    Promise.all(
      ['/audio/vi/shop.hello.mp3', '/audio/ja/shop.qty.apple.2.mp3', '/audio/en/rescue.hello.mp3', '/world-photos/cow.png', '/models/cow.glb'].map(
        async (u) => (await fetch(u)).ok,
      ),
    ),
  );
  expect(offline).toEqual([true, true, true, true, true]);
});

test('đang khóa thì hiện màn hình ngủ', async ({ page }) => {
  await page.goto('./?menu=map&menu=map');
  await page.evaluate(() => localStorage.setItem('behoc.locked', '1'));
  await page.reload();
  await expect(page.getByTestId('sleep')).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/sleep.png' });
});
