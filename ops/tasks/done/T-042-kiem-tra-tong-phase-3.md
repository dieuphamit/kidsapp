---
id: T-042
title: Kiểm tra tổng phase 3 (17 trò, hai kiểu menu)
type: test
depends_on: [T-034, T-035, T-036, T-037, T-038, T-039, T-040, T-041]
scope:
  - app/e2e/tour.spec.ts
  - app/e2e/perf.spec.ts
acceptance:
  - npm run verify
  - "tour.spec.ts: kiểu bản đồ vào được cả 17 trò (qua màn chọn trò khi cần), kiểu kệ vào được cả 17 trò; mỗi trò hiện gốc data-testid và Về nhà quay lại đúng menu; ảnh T-042-<id>.png"
---
## Mục tiêu
Chắc chắn bé đi tới mọi trò ở cả hai kiểu menu và quay về, app vẫn nhẹ.

## Chi tiết
- `tour.spec.ts`: với mỗi trò (animals, zoo3d, sound-quiz, shadow, peekaboo, hide, story, bakery, counting, sort, shapes, pattern, memory, puzzle, path, music, band): `goto('./?e2e=1')` → chạm khu → (màn chọn trò nếu có) → chạm trò → gốc trò hiện → đợi 1.5s → chụp `test-results/shots/T-042-<id>.png` → Về nhà → bản đồ hiện. Lặp lại với `?e2e=1&menu=shelf` (không chụp lại) → Về nhà → kệ hiện. Không có lỗi trang (`page.on('pageerror')`). Tuổi mặc định 28 tháng ẩn story, pattern, path: đặt tuổi 48 tháng trước khi vào (theo cách test sẵn có làm; nếu chưa có thì `page.addInitScript` ghi idb).
- `perf.spec.ts`: giữ FPS bản đồ; thêm kiểm Ban nhạc thú chạy 10 giây không lỗi trang.
- `check:size` vẫn xanh.

## Không làm
Không sửa code app; trò nào hỏng thì ghi `CÂU HỎI:` nêu trò và lỗi.
