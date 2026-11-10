---
id: T-005
title: WorldMap 4 địa điểm
type: ui
depends_on:
  - T-001
  - T-002
scope:
  - app/src/ui/WorldMap.tsx
  - app/src/ui/WorldMap.module.css
  - app/src/ui/WorldMap.test.tsx
  - app/src/ui/Home.tsx
  - app/src/App.tsx
  - app/e2e/worldmap.spec.ts
  - app/e2e/ux-rules.spec.ts
acceptance:
  - npm run verify
  - Màn hình chính hiện 4 nút địa điểm lấy từ key place.* và ux-rules.spec.ts kiểm tra có ít nhất một nút địa điểm, mọi nút ≥120px và cách nhau ≥24px
  - Có ảnh app/test-results/shots/T-005-worldmap.png
attempts: 0
---
## Mục tiêu
Màn hình chính thành bản đồ "Thế giới nhỏ": trời xanh nhạt chuyển tím, mây trắng trôi chậm, một ngọn đồi cỏ tròn, 4 địa điểm bằng đất sét (Trang trại, Hồ nước, Vườn quả, Nhà âm nhạc). Đậu Đậu đứng giữa, bong bóng chữ "Đi đâu chơi nào?". Bé chạm một địa điểm: nút lún xuống ngay, Đậu Đậu nhảy tưng tưng về phía đó và đọc tên địa điểm; nếu nơi đó có game thì mở game.

## Chi tiết
- `app/src/ui/WorldMap.tsx` export `WorldMap({ games, lang, speaker, onPick })` (cùng props với `Home` hiện tại). Gốc là `<div data-testid="home" data-last-say={...}>` (giữ testid `home` cho các test sẵn có).
- **Địa điểm lấy từ content, không viết cứng danh sách:** `contentByKey()` rồi lọc key bắt đầu bằng `place.` theo thứ tự xuất hiện (T-001 tạo `place.farm`, `place.pond`, `place.orchard`, `place.music`). Phần nhìn của từng key nằm trong một bảng `PLACE_LOOK` trong WorldMap:
  - `place.farm`: icon `🐄`, `color: 'butter'`, vị trí khoảng trái-trên (left 10%, top 26%)
  - `place.pond`: icon `🦆`, `color: 'mint'`, trái-dưới (left 18%, top 62%)
  - `place.orchard`: icon `🍎`, `color: 'leaf'`, phải-trên (right 10%, top 26%) — phải nằm dưới vùng cổng phụ huynh 120×120 ở góc trên phải, cách ≥24px
  - `place.music`: icon `🎵`, `color: 'lilac'`, phải-dưới (right 18%, top 62%)
  - key `place.*` lạ (đảo mới sau này): icon `⭐`, `color: 'peach'`, xếp tiếp theo vòng.
  Mỗi địa điểm là `ClayButton` `size={168}`, `label` và `caption` = text của key theo `lang`. Không tự viết button.
- Nền (CSS trong `WorldMap.module.css`, chỉ dùng biến trong `tokens.css`): gradient `--sky-top` → `--sky-bottom`; 3–4 đám mây (`data-testid="cloud"`, khối trắng `--paper` bo tròn, bóng mềm) trôi ngang 40–70s/vòng bằng CSS animation, tắt khi `prefers-reduced-motion`; đồi cỏ `--grass` là hình elip lớn ở đáy, bo mềm, có bóng `--shadow-clay` nhẹ. Bong bóng chữ `ui.where` giữ kiểu như `screens.module.css` `.bubble`.
- Đậu Đậu: `Scene3D label="Đậu Đậu"` ở giữa (giữ `role=img` tên "Đậu Đậu"), bên trong `<Walker target={x}><DauDau onTap={() => say('ui.hello')} /></Walker>`. `Walker` là component nhỏ trong WorldMap.tsx: `useFrame` lerp `group.position.x` về `target` (±1.6 cho trái/phải, 0 ở giữa), trong lúc di chuyển nảy 2 nhịp (y = |sin| × 0.4) và xoay mặt về hướng đi. Không sửa `DauDau.tsx`.
- Chạm địa điểm (ClayButton gọi ở pointerdown): `say(placeKey)`, đặt `target` theo phía của nút; tìm `games.find(g => g.place === placeKey)`: có thì sau ~800ms gọi `onPick(game)` (khóa không nhận chạm khác trong lúc chờ, clear timeout khi unmount); không có thì chỉ nảy và đọc tên, 1.5s sau Đậu Đậu về giữa. Không có thông báo "chưa có", không âm báo sai.
- `say(key)` = `speaker.say(key)` + ghi `key` vào `data-last-say` của gốc (dùng ref hoặc state) để e2e kiểm tra được. Lúc mount gọi `say('ui.where')` một lần.
- `App.tsx`: thay `Home` bằng `WorldMap`. `Home.tsx` xóa đi (hoặc chỉ re-export WorldMap); không để code chết.

## Kiểm thử
- Unit `app/src/ui/WorldMap.test.tsx` (mock `Scene3D`/`DauDau` bằng `vi.mock` vì jsdom không có WebGL; speaker giả `{ say: vi.fn(), sfx: vi.fn() }`):
  - Render 4 nút tên "Trang trại", "Hồ nước", "Vườn quả", "Nhà âm nhạc" khi `lang='vi'`; `lang='ja'` thì "まきば", "いけ"...
  - `pointerDown` vào "Hồ nước" → `speaker.say` được gọi với `'place.pond'`.
  - Có game giả `place: 'place.farm'`: pointerDown "Trang trại", `vi.advanceTimersByTime(900)` → `onPick` nhận đúng game; địa điểm không có game thì `onPick` không được gọi.
- E2E `app/e2e/worldmap.spec.ts`:
  - 4 nút địa điểm hiện; ít nhất 3 phần tử `data-testid="cloud"`; `getByRole('img', { name: 'Đậu Đậu' })` hiện.
  - `page.mouse` di tới "Vườn quả", `mouse.down()` → trong ≤100ms nút có thuộc tính `data-pressed`; sau đó gốc `home` có `data-last-say="place.orchard"`.
  - Đợi 800ms cho mây và Đậu Đậu ổn định, chụp `test-results/shots/T-005-worldmap.png`.
- Sửa `app/e2e/ux-rules.spec.ts` (test "màn hình chính đạt luật UX"):
  - Thêm khẳng định có **ít nhất một** nút hiện mà không phải "Khu phụ huynh" (hiện vòng kiểm tra ≥120px gần như trống vì Home chưa có nút game). Gợi ý: `page.locator('button:visible').filter({ hasNot: page.getByLabel('Khu phụ huynh') })` hoặc lọc theo `aria-label` trong `boxes`.
  - Thêm kiểm tra khoảng cách ≥24px giữa mọi cặp nút hiện (khoảng cách = max(khe ngang, khe dọc) giữa hai hình chữ nhật). Giữ nguyên các kiểm tra cũ, không nới lỏng.

## Không làm
- Không sửa `DauDau.tsx`, `Scene3D.tsx`, `ClayButton.tsx`, `tokens.*`, file content.
- Không làm game nào, không làm "đảo" mới, không thêm thư viện animation (chỉ CSS + useFrame).
- Không cuộn/kéo bản đồ; bản đồ vừa một màn hình iPad ngang (1194×834 trong e2e).

## Tham khảo
- Spec mục 3 ("Thế giới nhỏ"), mục 4; mockup `.superpowers/brainstorm/` (home-layout) nếu có.
