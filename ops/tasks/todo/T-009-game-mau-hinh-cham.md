---
id: T-009
title: "Game Màu và hình: chạm khối 3D"
type: ui
depends_on:
  - T-005
  - T-007
scope:
  - app/src/games/shapes/**
  - app/e2e/shapes.spec.ts
acceptance:
  - npm run verify
  - Từ bản đồ chạm Hồ nước mở được game, chạm một khối nghe color.<màu> rồi shape.<hình>
  - Có ảnh app/test-results/shots/T-009-pond.png
attempts: 0
---
## Mục tiêu
Bé vào Hồ nước: mặt hồ tròn xanh mát, 4 khối đất sét 3D (quả bóng tròn, khối vuông, khối tam giác, ngôi sao) nổi bập bềnh và xoay chậm, mỗi khối một màu. Bé chạm khối nào thì khối đó nảy "boing", Đậu Đậu đọc màu ("Màu đỏ") rồi tên hình ("Hình tròn"). Chạm đủ cả 4 khối thì khen "Giỏi quá!" và các khối đổi sang màu mới.

## Chi tiết
- `app/src/games/shapes/manifest.ts`: `{ id: 'shapes', title: { vi: 'Màu và hình', ja: 'いろとかたち' }, place: 'place.pond', icon: '🔺', color: 'mint', minAge: 24, maxAge: 72, Component: lazy(() => import('./Game')) }`.
- `app/src/games/shapes/logic.ts` (thuần, có test):
  - `SHAPES = ['circle', 'square', 'triangle', 'star'] as const`.
  - `dealColors(rand = Math.random): Record<Shape, LearnColor>` chọn 4 màu khác nhau trong `LEARN_COLORS` (từ `src/core/tokens`, do T-007 thêm).
  - `markTapped(state, shape)` trả state mới; `allTapped(state)` true khi cả 4 đã được chạm ít nhất một lần.
- `app/src/games/shapes/Game.tsx`:
  - Gốc `<div data-testid="game-shapes" data-last-say={...}>`, nền gradient trời.
  - `<Scene3D label="Hồ nước" view={{ position: [0, 3.6, 11], target: [0, 0.6, 0], fov: 38 }}>`.
  - Mặt hồ: đĩa dẹt màu nước mềm (lấy `#a0e7e5` = `--clay-mint`, hoặc pha nhẹ) có viền bờ cỏ `#9be38a`; vài gợn sóng là vòng `torus` mỏng phóng to rồi mờ dần.
  - 4 khối xếp ngang trên mặt hồ, cách đều, mỗi khối cỡ ~1.3 đơn vị (trên màn hình ≥140px): tròn = `sphereGeometry` (32×24); vuông = `RoundedBox` của drei (bo 0.15); tam giác = lăng trụ tam giác (`cylinderGeometry` 3 cạnh, xoay để mặt tam giác hướng camera); sao = `ExtrudeGeometry` từ `Shape` 5 cánh có `bevelEnabled` cho mềm. Vật liệu `meshStandardMaterial color={LEARN_HEX[màu]} roughness={0.55}`.
  - Chuyển động: bập bềnh `y = sin(t*1.2 + pha)*0.08`, xoay y chậm 0.3 rad/s.
  - Chạm (`onPointerDown`, stopPropagation, vùng chạm là chính khối hoặc hộp trong suốt lớn hơn): nảy (lên 0.5 + squash 0.6s), `say('color.<màu>')`, sau 1000ms `say('shape.<hình>')`; chạm khối khác thì hủy timeout cũ. Khi `allTapped`: sau khi đọc xong (~1200ms) `say('ui.great')`, 4 khối cùng nảy, rồi `dealColors` mới.
  - `say(key)` = `speaker.say(key)` + ghi vào `data-last-say`. Vào game gọi `say('pond.hello')`.
  - `<BackHome onExit={onExit} />`.
- Chừa phần dưới màn hình trống (khoảng 30% chiều cao): T-011 sẽ đặt các ô bóng ở đó.

## Kiểm thử
- Unit `app/src/games/shapes/logic.test.ts`:
  - `dealColors` với `rand` cố định trả 4 màu khác nhau, đều thuộc `LEARN_COLORS`.
  - `markTapped` 3 hình → `allTapped` false; thêm hình thứ 4 → true; chạm lại một hình không làm hỏng state.
  - Mỗi hình có `shape.<id>` và mỗi màu có `color.<id>` trong `contentByKey()`.
- E2E `app/e2e/shapes.spec.ts`:
  - `goto('./')`, chạm "Hồ nước" → `getByTestId('game-shapes')` hiện; đợi 1.2s, chụp `test-results/shots/T-009-pond.png`.
  - Chạm khối đầu tiên bên trái (tọa độ theo tỉ lệ khung nhìn) → `data-last-say` khớp `/^color\./`; sau 1.2s khớp `/^shape\./`.
  - Nút "Về nhà" → `getByTestId('home')` hiện.

## Không làm
- Không làm kéo thả và ô bóng (T-011).
- Không sửa `src/core`, `src/ui`, content. Nếu `LEARN_COLORS` chưa có trong `src/core/tokens.ts` thì dừng và ghi `CÂU HỎI:`, không tự thêm.
- Không có câu hỏi kiểu "đâu là màu đỏ?", không điểm số.

## Tham khảo
- Spec mục 6 (Màu và hình); CLAUDE.md luật 7, 8.
