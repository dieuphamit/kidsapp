---
id: T-008
title: Game Con vật (trang trại 3D)
type: ui
depends_on:
  - T-003
  - T-004
  - T-005
scope:
  - app/src/vite-env.d.ts
  - app/src/games/animals/**
  - app/e2e/animals.spec.ts
acceptance:
  - npm run verify
  - Từ bản đồ chạm Trang trại mở được game, chạm con bò nghe animal.cow rồi animal.cow-sound, nút 🏠 về lại bản đồ
  - Có ảnh app/test-results/shots/T-008-farm.png và T-008-tap.png
attempts: 1
last_error: npm run verify thất bại
note: " | Claude sửa tay trong worktree 11/11 sáng, đã xem ảnh"
---
## Mục tiêu
Bé vào Trang trại: một bãi cỏ tròn như đĩa đất sét, 8 con vật 3D đứng thành hai hàng, khẽ lắc lư. Bé chạm con nào thì con đó nhảy lên co giãn, Đậu Đậu đọc tên ("Con bò") rồi "kêu" thay nó ("Ùm bò! Ùm bò!"). Không có đúng sai, chạm bao nhiêu cũng được. Nút 🏠 ở góc trên trái để về bản đồ.

## Chi tiết
- `app/src/games/animals/manifest.ts`: `export const manifest: GameManifest = { id: 'animals', title: { vi: 'Con vật', ja: 'どうぶつ' }, place: 'place.farm', icon: '🐄', color: 'butter', minAge: 24, maxAge: 72, Component: lazy(() => import('./Game')) }` (Game export default).
- `app/src/games/animals/animals.ts`: dữ liệu thuần, `ANIMALS = [{ id: 'cow', model: 'cow.glb', pos: [x, 0, z] }, ...]` cho 8 id `cow, chicken, duck, pig, dog, sheep, horse, rabbit`. Bố cục: hàng sau 4 con (z ≈ -1.2), hàng trước 4 con (z ≈ 1.4), xen kẽ; **con bò đứng hàng trước, gần giữa nhất** (e2e chạm vào nó). Con lớn (bò, ngựa) ở hàng sau nếu che con nhỏ.
- `app/src/games/animals/Game.tsx` (`GameProps`: `lang`, `speaker`, `onExit`):
  - Gốc `<div data-testid="game-animals" data-last-say={...}>` full màn hình, nền gradient trời (biến `tokens.css`).
  - `<Scene3D label="Trang trại" view={{ position: [0, 4.2, 13], target: [0, 0.8, 0], fov: 40 }}>` (chỉnh nếu cần để cả 8 con vừa khung, mỗi con trên màn hình ≥ ~140px).
  - Nền cỏ: đĩa `cylinderGeometry` dẹt màu `#9be38a` (giá trị của `--grass`), mép bo bằng một `torus` cùng màu; vài bụi cỏ/hoa bằng cầu nhỏ pastel. Tổng tam giác cả scene ≤ ~50k (xem CREDITS.md).
  - Mỗi con: `useGLTF(import.meta.env.BASE_URL + 'models/<id>.glb')`, chuẩn hóa chiều cao ~1.4 đơn vị bằng `Box3` (ngựa/bò cao hơn chút, thỏ/gà thấp hơn), quay mặt hướng camera, chân trên mặt cỏ. Lắc lư idle nhẹ lệch pha từng con (`useFrame`, xoay y ±0.15). Có clip Idle/Jump trong CREDITS thì dùng `useAnimations`.
  - Vùng chạm: mỗi con có khối hộp trong suốt (`meshBasicMaterial transparent opacity={0} depthWrite={false}`) bao quanh, rộng hơn model một chút. `onPointerDown` (stopPropagation): nhảy 0.6s cao 0.7 kèm squash/stretch như `DauDau`, `say('animal.<id>')`, sau 1300ms `say('animal.<id>-sound')`. Chạm con khác giữa chừng thì hủy timeout cũ. Clear mọi timeout khi unmount.
  - `say(key)` = `speaker.say(key)` + ghi key vào `data-last-say` của gốc. Khi vào game gọi `say('farm.hello')` một lần.
  - `<BackHome onExit={onExit} />` (từ `src/ui/BackHome`).
  - `<Suspense>` bọc các model, fallback là bãi cỏ trống (không màn hình trắng).
- Không dùng `speaker.sfx` (chưa có file sfx).

## Kiểm thử
- Unit `app/src/games/animals/animals.test.ts`:
  - Đủ 8 id, không trùng; mỗi id có `animal.<id>` và `animal.<id>-sound` trong `contentByKey()`.
  - Mỗi `model` tồn tại trong `app/public/models/` (đọc bằng `fs`, đường dẫn từ `import.meta.dirname`).
  - `manifest.place === 'place.farm'`, `minAge 24`, `maxAge 72`.
- E2E `app/e2e/animals.spec.ts`:
  - `goto('./')`, chạm nút "Trang trại" → `getByTestId('game-animals')` hiện (timeout 5s).
  - Chờ `waitForResponse` của `models/cow.glb`, đợi thêm 1.5s, chụp `test-results/shots/T-008-farm.png`.
  - Chạm vào con bò (tọa độ theo tỉ lệ khung nhìn, xác định qua ảnh chụp, có thể tính sẵn từ `ANIMALS`) → `data-last-say="animal.cow"`; sau 1.6s → `data-last-say="animal.cow-sound"`. Chụp `test-results/shots/T-008-tap.png` ngay sau lúc chạm (thấy con bò đang nhảy).
  - Nút "Về nhà" ≥120×120 → chạm → `getByTestId('home')` hiện.

## Không làm
- Không sửa `src/ui/*`, `src/core/*`, content hay model; thiếu model nào thì dừng và ghi `CÂU HỎI:`.
- Không thêm điểm số, câu hỏi "con nào là con bò?", hay âm báo sai.
- Không kéo thả con vật, không xoay camera bằng tay.

## Tham khảo
- Spec mục 6 (Con vật và tiếng kêu); CLAUDE.md luật UX, mục Cấu trúc; `app/public/models/CREDITS.md`.

## Đồng bộ phong cách (bố mẹ yêu cầu, 10/11)
Model đến từ 2–3 bộ khác nhau (Kenney Cube Pets + Quaternius). Trong game phải làm chúng trông như một bộ đồ chơi: chuẩn hóa chiều cao (bounding box) cho mọi con ~1.2 đơn vị, cùng ánh sáng `Scene3D`, và áp vật liệu lì kiểu đất sét (giữ màu/texture gốc nhưng đặt `roughness` ≈ 0.85, `metalness` 0) cho mọi mesh. Chụp ảnh e2e cả đàn để bố mẹ so sánh.

## Ghi chú sau lần thất bại (11/11, 00:15) — cách kiểm thử chạm vật thể 3D
Unit test đã qua hết; chỉ e2e trượt vì bấm vào mesh 3D trong Chromium headless không ổn định (canvas chưa render khung đầu, máy đang tải nặng) và timeout quá ngắn.
- Thêm **móc kiểm thử**: khi URL có `?e2e=1`, game gán `window.__behocTap = (id: string) => handleTap(id)` dùng CHUNG hàm xử lý với chạm thật (không viết logic riêng cho test). Gỡ khi unmount. Không bật khi không có `?e2e=1`.
- e2e: mở `./?e2e=1`, vào game, đợi `data-ready="true"` trên root game (đặt sau khi model/scene tải xong, dùng `useGLTF` + `Suspense` hoặc `onCreated` của Canvas), rồi gọi `page.evaluate(() => window.__behocTap('cow'))` để kiểm tra chuỗi `data-last-say`. Giữ thêm đúng 1 test bấm thật vào giữa canvas chỉ để chắc chạm thật có phản hồi (kiểm tra `data-last-say` đổi khác giá trị ban đầu), timeout 5 s.
- Timeout: chuyển cảnh từ bản đồ vào game `toBeVisible({ timeout: 10000 })`; các kỳ vọng phụ thuộc animation/âm thanh ≥ 3000 ms. Không dùng `waitForTimeout` để chờ trạng thái — dùng `expect(...).toHaveAttribute(..., { timeout })`.
- Khai báo kiểu `window.__behocTap` trong `src/vite-env.d.ts` nếu cần (thêm file này vào scope nếu sửa) hoặc dùng `(window as unknown as {...})`.

## Phản hồi của bố mẹ (2026-11-11)
- Bố cục chưa đạt (xem ảnh T-008-farm.png): 8 con dồn một hàng che nhau, chỉ thấy 5 con; ngựa cao gấp ~3 lần con khác; mặt đất là đĩa xanh nghiêng khổng lồ. Sửa: (1) chuẩn hóa CHIỀU CAO mọi con về ~1.2 đơn vị bằng Box3 của cả model (ngựa cũng vậy); (2) xếp 8 con thành 2 hàng so le hoặc vòng cung, khoảng cách đủ để không con nào che con nào, cả 8 con nằm trọn trong khung iPad ngang 1194x834 với lề an toàn, mỗi con có vùng chạm đủ lớn; (3) mặt đất là đồng cỏ phẳng kéo tới chân trời (plane lớn màu cỏ đất sét) với vài bụi cây/hàng rào gỗ đơn giản phía sau, camera nhìn hơi chếch từ trên xuống ~20°; (4) giữ vật liệu đất sét (roughness 0.85, metalness 0). Chụp lại T-008-farm.png và tự xem ảnh trước khi báo xong.
