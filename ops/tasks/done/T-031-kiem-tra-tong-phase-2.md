---
id: T-031
title: Kiểm tra tổng phase 2 (đi hết các trò, dung lượng)
type: test
depends_on: [T-024, T-025, T-026, T-027, T-028, T-029, T-030]
scope:
  - app/e2e/tour.spec.ts
  - app/e2e/perf.spec.ts
acceptance:
  - npm run verify
  - "tour.spec.ts: từ bản đồ vào được cả 11 trò (qua picker khi cần), mỗi trò hiện gốc data-testid và Về nhà quay lại bản đồ; ảnh T-031-<id>.png cho từng trò"
attempts: 0
---
## Mục tiêu
Chắc chắn bé đi được tới mọi trò và quay về, app vẫn nhẹ.

## Chi tiết
- `app/e2e/tour.spec.ts`: một test cho mỗi trò (animals, sound-quiz, shapes, counting, sort, music, zoo3d, peekaboo, shadow, memory, puzzle): `goto('./?e2e=1')` → chạm địa điểm → (picker nếu có) → chạm trò → gốc trò hiện → đợi 1.5s → chụp `test-results/shots/T-031-<id>.png` → nút Về nhà → bản đồ hiện. Không có lỗi trang (`page.on('pageerror')`).
- `perf.spec.ts`: thêm FPS cho Sở thú bằng `checkFps` sẵn có (chỉ chặn khi có GPU thật).
- `check:size` vẫn xanh.

## Không làm
Không sửa code app; trò nào hỏng thì ghi `CÂU HỎI:` nêu trò và lỗi.
