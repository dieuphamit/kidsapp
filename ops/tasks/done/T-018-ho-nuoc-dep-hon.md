---
id: T-018
title: Hồ nước đẹp hơn (bỏ vệt bóng, tam giác dễ nhận)
type: ui
depends_on:
  - T-011
scope:
  - app/src/games/shapes/**
  - app/e2e/shapes.spec.ts
acceptance:
  - npm run verify
  - Ảnh `app/test-results/shots/T-018-pond.png` không còn vệt tia tối trên mặt nước
attempts: 1
last_error: npm run verify thất bại
note: " | Claude sửa tay 11/11 sáng, đã xem ảnh"
---
## Mục tiêu
Màn hình Hồ nước (game Màu và hình) hiện có vệt tia tối hình nan quạt trên mặt nước (bóng đổ/ContactShadows chồng lên mặt phẳng nước, z-fighting), và khối tam giác (lăng trụ) nhìn nghiêng trông như hộp méo, bé khó nhận ra là "tam giác".

## Chi tiết
- Bỏ vệt: nâng ContactShadows lên trên mặt nước một chút hoặc tắt hẳn cho cảnh này; mặt nước dùng vật liệu phẳng, không tự đổ bóng; không thêm shadow map (theo CLAUDE.md).
- Tam giác: xoay lăng trụ để mặt tam giác hướng về camera (nhìn rõ hình tam giác), có thể nghiêng nhẹ 10–15° cho có khối.
- Mặt cỏ hiện là tấm phẳng có mép: lộ dải tím nhạt ở đáy màn hình và mép xiên hai bên. Làm mặt đất đủ rộng (vd plane 80×80 hoặc circle bán kính 40) để không thấy mép trong khung iPad ngang 1194×834.
- Trời đang chiếm ~45% màn hình, hồ và khối dồn xuống dưới: hạ camera/đổi target để hồ + 4 khối + 4 ô bóng chiếm phần giữa, trời ≤ 30%.
- Scene3D có prop `shadowScale` (mặc định 7): nếu giữ ContactShadows thì tăng để bóng khối ở ô bóng (z=3.5) không bị cắt vuông.
- Giữ nguyên màu, vị trí, logic chạm/kéo và móc kiểm thử `?e2e=1`.
- e2e: chụp `app/test-results/shots/T-018-pond.png` (lúc mới vào) và `T-018-done.png` (sau khi kéo đủ 4 khối, dùng `__behocDrag`).

## Không làm
Không đổi luật chơi, không đổi nội dung giọng đọc.
