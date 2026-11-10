---
id: T-011
title: "Game Màu và hình: kéo vào bóng"
type: ui
depends_on:
  - T-009
scope:
  - app/src/games/shapes/**
  - app/e2e/shapes.spec.ts
acceptance:
  - npm run verify
  - Kéo một khối thả vào ô bóng cùng hình thì khối khớp vào ô và nghe ui.great; thả sai chỗ thì khối trôi về, nghe pond.try-again
  - Có ảnh app/test-results/shots/T-011-drag.png và T-011-done.png
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Trên bờ hồ (phần dưới màn hình) có 4 ô "bóng" xám nhạt hình tròn, vuông, tam giác, sao. Bé kéo một khối từ mặt hồ thả vào bóng cùng hình: khối trượt khít vào ô, nảy vui, Đậu Đậu khen "Giỏi quá!". Thả sai chỗ: khối trôi nhẹ nhàng về chỗ cũ và Đậu Đậu gợi ý "Ồ, thử cái bóng khác xem nào!" (không có âm báo sai). Lấp đủ 4 bóng: tất cả nảy mừng, rồi một ván mới.

## Chi tiết
- Giữ nguyên hành vi chạm của T-009 (chạm → nảy, đọc màu rồi hình). Phân biệt chạm và kéo: pointerdown vẫn nảy và đọc màu ngay (phản hồi < 100ms); nếu ngón tay di chuyển > 12px trên màn hình thì chuyển sang kéo và hủy câu đọc tên hình đang chờ.
- `app/src/games/shapes/logic.ts` thêm hàm thuần (có test):
  - `SLOTS: Record<Shape, [number, number, number]>` vị trí 4 ô bóng trên bờ (hàng ngang phía trước, gần camera, xếp **khác thứ tự** với các khối trên hồ để bé phải tìm).
  - `dropResult(shape, point: [x, y, z], slots, radius = 0.9): 'snap' | 'wrong' | 'none'` — gần ô cùng hình (khoảng cách xz < radius) → `snap`; gần ô khác hình → `wrong`; không gần ô nào → `none`.
  - `placed` trong state, `allPlaced(state)`.
- `Game.tsx`:
  - Ô bóng: hình dẹt cùng dạng với khối, màu `#3b2a6b` (`--ink`) opacity 0.18, nằm sát mặt bờ cỏ.
  - Kéo bằng sự kiện con trỏ của R3F: `onPointerDown` gọi `e.target.setPointerCapture(e.pointerId)`; `onPointerMove` giao tia `e.ray` với mặt phẳng ngang y = 0.4 (`THREE.Plane`) để lấy vị trí, khối nhấc lên 0.3 và to 1.1 lần khi đang kéo; `onPointerUp` gọi `dropResult`. Chỉ một ngón: bỏ qua pointer khác khi đang kéo.
  - `snap`: khối trượt vào ô 250ms, nảy, `say('ui.great')`, khóa khối đó lại (vẫn chạm được để nghe màu/hình). `wrong` hoặc `none`: khối trôi về chỗ cũ trong 600ms bằng ease mềm; `wrong` thì `say('pond.try-again')`, `none` thì im lặng.
  - `allPlaced`: sau 800ms cả 4 khối nảy, vài hạt sao nhỏ màu pastel bay lên (mesh nhỏ, ≤ 40 cái, tự hủy sau 1.5s), rồi 2.5s sau các khối về hồ và `dealColors` mới.
  - Lần đầu vào game, sau `pond.hello` ~4s thì `say('pond.drag-hint')` một lần (nếu bé chưa kéo khối nào).

## Kiểm thử
- Unit `logic.test.ts` thêm: `dropResult` trả `snap` khi thả đúng tâm ô cùng hình, `wrong` khi thả vào ô khác hình, `none` khi thả giữa hồ; `allPlaced` đúng sau 4 lần snap.
- E2E `app/e2e/shapes.spec.ts` thêm test (giữ test T-009):
  - Vào game Hồ nước; dùng `page.mouse.move/down/move (steps: 10)/up` kéo khối hình tròn tới ô bóng tròn (tọa độ màn hình xác định qua ảnh chụp, tính từ `SLOTS`); chụp `test-results/shots/T-011-drag.png` lúc đang kéo (trước `up`).
  - Sau khi thả: `data-last-say="ui.great"`.
  - Kéo một khối khác thả vào ô sai → `data-last-say="pond.try-again"`.
  - Kéo nốt các khối vào đúng ô → chụp `test-results/shots/T-011-done.png` lúc ăn mừng.

## Không làm
- Không đổi game khác, không sửa `src/core`, `src/ui`, content.
- Không có đồng hồ, điểm số, giới hạn số lần thử.
- Không dùng thư viện kéo thả ngoài (chỉ R3F pointer events + three).

## Tham khảo
- Spec mục 4 (luật 3, 8), mục 6 (Màu và hình), mục 9 (rủi ro kéo thả 3D trên Safari: giữ cách kéo đơn giản nhất).
