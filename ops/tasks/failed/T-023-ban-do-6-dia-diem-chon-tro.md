---
id: T-023
title: Bản đồ 6 địa điểm và màn chọn trò
type: ui
depends_on:
  - T-022
scope:
  - app/src/ui/WorldMap.tsx
  - app/src/ui/WorldMap.module.css
  - app/src/ui/WorldMap.test.tsx
  - app/src/ui/WorldMapScene.tsx
  - app/src/ui/GamePicker.tsx
  - app/src/ui/GamePicker.module.css
  - app/src/ui/GamePicker.test.tsx
  - app/src/core/games.ts
  - app/src/core/games.test.ts
  - app/src/App.tsx
  - app/src/games/*/manifest.ts
  - app/e2e/worldmap.spec.ts
  - app/e2e/picker.spec.ts
acceptance:
  - npm run verify
  - Bản đồ có 6 địa điểm (thêm Sở thú, Nhà Đậu Đậu), nút ≥120px, cách nhau ≥24px, nằm trọn trong khung 1194×834
  - Địa điểm có ≥2 trò thì chạm vào hiện màn chọn trò; có 1 trò thì vào thẳng như cũ
  - GameProps có ageMonths; ảnh app/test-results/shots/T-023-map.png và T-023-picker.png
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Phase 2 thêm 6 trò mới, nên mỗi địa điểm có thể có nhiều trò. Bản đồ cần thêm 2 địa điểm và một màn chọn trò đơn giản cho bé.

## Chi tiết
- `src/core/games.ts`: thêm `ageMonths: number` vào `GameProps` (các trò dùng để chỉnh độ khó); thêm `order?: number` và `titleKey?: string` vào `GameManifest`; thêm hàm thuần `gamesByPlace(games): Map<string, GameManifest[]>` sắp theo `order` (mặc định 0) rồi id. `src/App.tsx` truyền `ageMonths={settings.ageMonths}` cho game.
- Manifest các trò đang có: thêm `order: 0`; animals thêm `titleKey: 'game.farm3d'`. Không đổi gì khác trong game cũ.
- `WorldMap`: 6 địa điểm `place.farm, place.pond, place.orchard, place.music, place.zoo, place.house` (icon 🦁 cho zoo, 🏠 cho house; chỉ dùng token màu có sẵn trong `tokens.ts`). Bố cục 3 cột × 2 hàng hoặc vòng quanh Đậu Đậu, mỗi nút ≥120px, khe ≥24px, không đè nút cổng phụ huynh, cảnh 3D `WorldMapScene` vẫn đẹp (có thể thêm 2 cụm trang trí cho địa điểm mới, vẫn không shadow map). Địa điểm không có trò nào (sau `gamesForAge`) thì ẩn.
- Chạm địa điểm: luôn `say(placeKey)` ngay (≤100ms). 1 trò → mở trò như cũ. ≥2 trò → hiện `GamePicker`.
- `src/ui/GamePicker.tsx`: lớp phủ toàn màn hình nền trời nhạt, tiêu đề là tên địa điểm (chữ to), 2–3 `ClayButton` size ≥ 200 xếp ngang giữa màn hình, mỗi nút có icon trò (emoji to) + tên trò; chạm → `say(titleKey ?? place)` rồi mở trò sau ~400ms. Vào màn chọn thì `say('ui.pick-game')`. Có `BackHome` để quay lại bản đồ. `data-testid="game-picker"`, gốc có `data-last-say`.

## Kiểm thử
- Unit: `games.test.ts` cho `gamesByPlace`; `GamePicker.test.tsx` (render 2 nút, chạm gọi onPick); `WorldMap.test.tsx` cập nhật cho 6 địa điểm (mock 3D như mẫu sẵn có). Test bản đồ dùng danh sách game giả có ≥2 trò cùng một địa điểm để kiểm picker.
- E2E `worldmap.spec.ts`: các nút địa điểm hiện có đều ≥120×120 và không chồng nhau; chụp `T-023-map.png`. `picker.spec.ts`: lúc task này chạy, chưa địa điểm nào có ≥2 trò thật — e2e chỉ kiểm bản đồ hiện 4 địa điểm có trò và vào thẳng trò như cũ; picker được kiểm ở unit; chụp `T-023-picker.png` bằng cách render GamePicker trong unit KHÔNG được (không có ảnh) → thay vào đó e2e mở `./?e2e=1&picker=farm` (móc chỉ bật khi `e2e=1`: ép mở picker của địa điểm đó với các trò hiện có) để chụp ảnh.

## Không làm
Không làm các trò mới (T-024…T-030), không sửa content.

## Tham khảo
docs/superpowers/specs/2026-11-11-phase-2-games.md; CLAUDE.md luật UX.
