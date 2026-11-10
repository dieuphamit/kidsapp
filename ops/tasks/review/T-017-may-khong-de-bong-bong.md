---
id: T-017
title: Mây không đè lên bong bóng lời nói
type: ui
depends_on:
  - T-005
scope:
  - app/src/ui/WorldMap.tsx
  - app/src/ui/WorldMap.module.css
  - app/e2e/worldmap.spec.ts
acceptance:
  - npm run verify
  - Bong bóng "Đi đâu chơi nào?" không bị đám mây nào chồng lên (e2e so sánh boundingBox của bong bóng với từng đám mây, không giao nhau)
attempts: 0
---
## Mục tiêu
Trên màn hình Thế giới nhỏ, một đám mây trôi nằm sát ngay dưới bong bóng lời nói, trông như dính vào nhau. Bé phải thấy bong bóng tách biệt, rõ ràng.

## Chi tiết
- Đặt vùng trôi của mây tránh khoảng ngay dưới bong bóng (ví dụ mây chỉ trôi ở dải cao 18–40% màn hình, hoặc bong bóng có z-index cao hơn và mây đi phía sau với độ mờ nhẹ).
- Giữ nguyên phong cách đất sét/pastel hiện có, không đổi vị trí 4 địa điểm và Đậu Đậu.
- e2e: chụp `app/test-results/shots/T-017-worldmap.png` và kiểm tra bong bóng không giao với mây nào trong 3 thời điểm (0s, 2s, 4s).

## Không làm
Không đổi nội dung chữ, không thêm hiệu ứng mới.
