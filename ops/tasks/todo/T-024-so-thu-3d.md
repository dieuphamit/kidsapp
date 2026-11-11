---
id: T-024
title: Sở thú 3D
type: ui
depends_on: [T-019, T-021, T-023]
scope:
  - app/src/games/zoo/**
  - app/e2e/zoo.spec.ts
acceptance:
  - npm run verify
  - "Chạm một bạn thú thì nghe animal.<id> rồi animal.<id>-sound; ảnh T-024-zoo.png"
attempts: 0
---
## Mục tiêu
Như Trang trại nhưng là sở thú: mỗi lần vào có 6 bạn thú hoang (chọn ngẫu nhiên trong 12), chạm bạn nào thì bạn đó nhảy lên, Đậu Đậu đọc tên và một điều thú vị.

## Chi tiết
- Làm theo đúng cách `src/games/animals/Game.tsx` đã giải quyết (đọc kỹ file đó trước): clone model bằng `SkeletonUtils.clone`, `Box3.setFromObject(obj, true)`, căn tâm x/z, chuẩn hóa chiều cao ~1.2 (hươu cao cổ cao hơn ~1.8 qua trường `height`), `rotY` riêng nếu model quay ngang, `Scene3D` với `shadowScale` đủ rộng, camera như trang trại. Phần dùng chung viết lại trong `src/games/zoo/` (không sửa game animals).
- Bố cục 2 hàng × 3, hitbox ≥120px trên màn hình; nền đồng cỏ vàng nhạt + vài cây/đá tròn trang trí (khối đơn giản, màu token), hàng rào thấp.
- `manifest.ts`: id `zoo3d`, place `place.zoo`, titleKey `game.zoo3d`, icon 🦁, order 0, minAge 24, maxAge 72.
- Vào game `say('zoo.hello')`; chạm thú: nhảy + `say('animal.<id>')`, 1300ms sau `say('animal.<id>-sound')`. `data-testid="game-zoo"`, `data-ready`, `data-last-say`, móc `window.__behocTap(id)` khi `?e2e=1`.

## Kiểm thử
- Unit cho hàm chọn 6 con (luôn 6 con khác nhau trong 12, có seed).
- E2E: vào Sở thú (qua picker nếu có) → chờ `data-ready` → chụp `T-024-zoo.png`; `__behocTap` một con đang hiện → nghe đúng 2 key.
- Tự xem ảnh: 6 con thấy rõ, cùng cỡ, quay mặt ra trước, không bị cắt mép.

## Không làm
Không sửa game animals, không sửa content.
