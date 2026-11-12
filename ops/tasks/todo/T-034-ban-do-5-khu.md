---
id: T-034
title: Bản đồ 5 khu, màn chọn trò mới và nút chơi lại
type: ui
depends_on:
  - T-032
  - T-033
scope:
  - app/src/ui/WorldMap.tsx
  - app/src/ui/WorldMap.module.css
  - app/src/ui/WorldMap.test.tsx
  - app/src/ui/WorldMapScene.tsx
  - app/src/ui/GamePicker.tsx
  - app/src/ui/GamePicker.module.css
  - app/src/ui/GamePicker.test.tsx
  - app/src/core/places.ts
  - app/src/core/places.test.ts
  - app/src/core/lastGame.ts
  - app/src/core/lastGame.test.ts
  - app/src/App.tsx
  - app/src/games/*/manifest.ts
  - app/e2e/worldmap.spec.ts
  - app/e2e/picker.spec.ts
  - app/e2e/tour.spec.ts
acceptance:
  - npm run verify
  - Bản đồ có đúng 5 khu (zoo, house, orchard, puzzle, music) khi có trò; nút 200px, khe ≥24px, nằm trọn khung, không đè cổng phụ huynh
  - Chạm khu mở màn trò sau 400ms; khu 1 trò vào thẳng; nút chơi lại vào thẳng trò vừa chơi
  - Ảnh T-034-map.png, T-034-picker.png, T-034-replay.png
---
## Mục tiêu
Bé vào trò nhanh hơn, trò xếp theo nghĩa, nhìn bản đồ là biết khu nào có gì. Mockup: `.superpowers/brainstorm/phase-3/menu.html` phương án B.

## Chi tiết
- `src/core/places.ts` (thuần, dùng chung cho bản đồ và kệ ở T-035): `PLACES` theo thứ tự `place.zoo, place.house, place.orchard, place.puzzle, place.music`, mỗi khu có `icon` (🦁 🏠 🍎 🧩 🎵) và `color` (peach, butter, leaf, mint, lilac). `placeOrder(key)` trả chỉ số.
- Manifest (chỉ đổi `place`/`order`): animals → zoo 0; zoo3d → zoo 1; sound-quiz → zoo 2; shadow → zoo 3; peekaboo → zoo 4. counting → orchard 0; sort → orchard 1; shapes → orchard 2. memory → puzzle 0; puzzle → puzzle 1. music → music 0.
- `WorldMap`: bố cục theo mockup (zoo trên trái, orchard trên phải, house dưới trái, puzzle dưới giữa, music dưới phải; Đậu Đậu 3D giữa). `ClayButton` size 200, trong nút: icon khu, tên khu, dải ≤4 icon trò (từ `manifest.icon`, đã lọc tuổi) cỡ nhỏ trên nền trắng mờ. Hướng Đậu Đậu quay: trái/giữa/phải theo cột. Chờ 400ms thay 800ms. Bỏ `place.farm`, `place.pond` khỏi bản đồ.
- Nút **chơi lại** (`data-testid="replay"`): vòng tròn 132px nền trắng viền `--learn-yellow`, ngay bên phải Đậu Đậu, hiện `icon` trò vừa chơi; chạm → `say(titleKey ?? place)` ngay, mở trò sau 300ms. Ẩn khi chưa có trò nào hoặc trò đó không hợp tuổi hiện tại.
- `src/core/lastGame.ts`: `loadLastGame(): Promise<string | null>`, `saveLastGame(id)` bằng idb-keyval key `behoc.last-game`. `App.tsx` gọi `saveLastGame` mỗi khi mở trò.
- `GamePicker`: dải màu khu phía trên (gradient từ màu khu sang trong suốt), bong bóng tên khu (icon + tên), hàng thẻ trò 180×228 (`ClayButton` nền trắng, icon to + tên), tối đa 5 thẻ một hàng, căn giữa; Đậu Đậu ảnh `cards/daudau.png` 168px góc dưới trái kèm bong bóng `ui.pick-game` (nói khi vào). Chạm thẻ: `say(titleKey ?? place)` rồi mở trò sau 300ms. Giữ `BackHome`, `data-testid="game-picker"`, `data-last-say`.
- Móc e2e giữ `?e2e=1&picker=<khu>`.

## Kiểm thử
- Unit: `places.test.ts`; `lastGame.test.ts` (mock idb-keyval); `WorldMap.test.tsx` cho 5 khu, dải icon, nút chơi lại hiện/ẩn, khu 1 trò vào thẳng; `GamePicker.test.tsx` 5 thẻ.
- E2E `worldmap.spec.ts`: 5 khu, mọi nút ≥120 và không chồng nhau, chụp `T-034-map.png`. `picker.spec.ts`: Thế giới thú → 5 thẻ, chụp `T-034-picker.png`. Vào một trò, về nhà → nút chơi lại hiện đúng icon, chạm vào thẳng trò; chụp `T-034-replay.png`.
- `tour.spec.ts`: sửa đường đi cho 11 trò cũ theo khu mới (không thêm trò mới, T-042 làm).

## Không làm
Không làm kiểu kệ đồ chơi và cài đặt (T-035). Không sửa logic trong game.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md mục Menu chính.
