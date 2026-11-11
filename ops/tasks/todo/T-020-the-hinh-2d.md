---
id: T-020
title: Thẻ hình 2D render từ model (31 thẻ)
type: asset
depends_on: [T-019]
scope:
  - app/scripts/render-cards.mjs
  - app/scripts/cards/**
  - app/public/cards/**
  - app/package.json
acceptance:
  - npm run verify
  - "Có 31 file app/public/cards/<id>.png nền trong suốt, mỗi file ≤ 150KB"
  - "app/public/cards/index.json liệt kê 31 thẻ: { id, kind: 'farm'|'wild'|'fruit' }"
attempts: 0
---
## Mục tiêu
Các trò 2D mới (lật hình, ai kêu đấy, bóng của ai, xếp quả, ghép hình) cần hình con vật và trái cây cùng phong cách với cảnh 3D nhưng nhẹ máy. Render sẵn mỗi model 3D thành một ảnh PNG nền trong suốt.

## Chi tiết
- 31 id: farm `cow chicken duck pig dog sheep horse rabbit cat`; wild `elephant giraffe lion tiger monkey panda penguin koala fox bear parrot fish`; fruit `apple banana cherries grapes lemon orange pear pineapple strawberry watermelon`. Model ở `app/public/models/<id>.glb`.
- `app/scripts/cards/index.html` + `app/scripts/cards/render.js` (JS thuần, để tsc của app không đụng tới): dùng `three` (đã có) + `GLTFLoader` + `MeshoptDecoder` + `SkeletonUtils.clone`, nhận `?model=<id>`; canvas 384×384, `alpha: true`, nền trong suốt; camera phối cảnh fov 30 nhìn hơi chếch từ trên (~15°), model xoay ~25° để thấy mặt và khối; chuẩn hóa bằng `Box3.setFromObject(obj, true)` để vật chiếm ~80% khung, căn giữa; ánh sáng ấm như `src/ui/Scene3D.tsx` (hemisphere + directional), không tone mapping, không shadow map. Render xong đặt `document.body.dataset.done = '1'`.
- `app/scripts/render-cards.mjs` (Node ESM): `createServer` của `vite` với root là `app/`, mở `/scripts/cards/index.html?model=<id>` bằng Chromium của `@playwright/test` (đã có), chờ `body[data-done]`, chụp phần tử canvas với `omitBackground: true` → `public/cards/<id>.png`; ghi `public/cards/index.json`. Thêm script `"cards": "node scripts/render-cards.mjs"` vào package.json (giữ nguyên các script khác). Chạy `npm run cards` và commit các PNG.
- Ảnh > 150KB thì hạ canvas xuống 320×320. Không thêm thư viện mới.
- Tự xem vài ảnh (cow, elephant, banana, watermelon, horse) bằng công cụ đọc ảnh: vật nằm giữa, không bị cắt, không tối, mặt hướng ra trước.

## Kiểm thử
- `npm run verify` xanh; có đúng 31 file `app/public/cards/*.png`.

## Không làm
Không sửa `app/src`, không thêm dependency mới, không vẽ tay.

## Tham khảo
docs/superpowers/specs/2026-11-11-phase-2-games.md
