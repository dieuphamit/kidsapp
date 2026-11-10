---
id: T-018
title: Hồ nước đẹp hơn (bỏ vệt bóng, tam giác dễ nhận)
type: ui
depends_on: [T-011]
scope:
  - app/src/games/shapes/**
  - app/e2e/shapes.spec.ts
acceptance:
  - npm run verify
  - Ảnh `app/test-results/shots/T-018-pond.png` không còn vệt tia tối trên mặt nước
---
## Mục tiêu
Màn hình Hồ nước (game Màu và hình) hiện có vệt tia tối hình nan quạt trên mặt nước (bóng đổ/ContactShadows chồng lên mặt phẳng nước, z-fighting), và khối tam giác (lăng trụ) nhìn nghiêng trông như hộp méo, bé khó nhận ra là "tam giác".

## Chi tiết
- Bỏ vệt: nâng ContactShadows lên trên mặt nước một chút hoặc tắt hẳn cho cảnh này; mặt nước dùng vật liệu phẳng, không tự đổ bóng; không thêm shadow map (theo CLAUDE.md).
- Tam giác: xoay lăng trụ để mặt tam giác hướng về camera (nhìn rõ hình tam giác), có thể nghiêng nhẹ 10–15° cho có khối.
- Giữ nguyên màu, vị trí, logic chạm/kéo và móc kiểm thử `?e2e=1`.
- e2e: chụp `app/test-results/shots/T-018-pond.png`.

## Không làm
Không đổi luật chơi, không đổi nội dung giọng đọc.
