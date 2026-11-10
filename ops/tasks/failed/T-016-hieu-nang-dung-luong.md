---
id: T-016
title: Kiểm tra hiệu năng và dung lượng
type: test
depends_on:
  - T-008
  - T-011
  - T-013
  - T-015
scope:
  - app/e2e/perf.spec.ts
  - app/scripts/check-size.mjs
  - app/package.json
acceptance:
  - npm run verify
  - "npm run verify chạy thêm check-size: dist/ < 60MB và mỗi model .glb ≤ 1MB"
  - perf.spec.ts đo FPS ≥ 50 ở bản đồ, Trang trại và Hồ nước
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Chặn sớm việc app nặng dần hoặc giật: mỗi lần verify đều đo khung hình các scene 3D và tổng dung lượng bản offline, để bé luôn chơi mượt trên iPad và cài được offline.

## Chi tiết
- `app/scripts/check-size.mjs` (Node, không thư viện ngoài, cùng phong cách `scripts/check-audio.mjs`):
  - Nhận thư mục qua đối số đầu (`node scripts/check-size.mjs [thư-mục]`, mặc định `dist/` của app). Duyệt đệ quy, cộng byte. Không có `dist/` thì báo lỗi rõ ràng ("chạy npm run build trước") và exit 1.
  - Tổng ≥ 60MB (60 × 1024 × 1024) → in 10 file lớn nhất, exit 1. Mọi file `dist/models/*.glb` > 1MB → exit 1 và in tên file.
  - Thành công thì in một dòng: tổng MB, số file, file lớn nhất.
- `app/package.json`: thêm script `"check:size": "node scripts/check-size.mjs"`; nối vào cuối `verify`: `... && playwright test && npm run check:size` (playwright đã chạy `npm run build` trong webServer nên lúc đó `dist/` có sẵn). Giữ nguyên các script khác (kể cả những script người khác đã thêm như `model:opt`).
- `app/e2e/perf.spec.ts`:
  - Hàm `measureFps(page, ms = 3000)`: `page.evaluate` đếm `requestAnimationFrame` trong `ms` sau 2s khởi động, trả fps.
  - 3 test: bản đồ (`./`), Trang trại (chạm "Trang trại", chờ `game-animals` và `models/cow.glb`), Hồ nước (chạm "Hồ nước", chờ `game-shapes`). Mỗi test kỳ vọng fps ≥ 50 và ghi fps đo được bằng `test.info().annotations.push({ type: 'fps', description: ... })` để report đọc được.
  - Thêm một test Vườn quả (2.5D): chạm 3 quả liên tiếp, fps ≥ 50.
- Nếu Chromium headless trên máy runner render WebGL bằng phần mềm (SwiftShader) nên fps < 50 dù scene nhẹ: **không hạ ngưỡng, không skip**. Ghi số đo, tam giác ước tính (`npx @gltf-transform/cli inspect` các model) và `CÂU HỎI:` đề xuất cách đo (ví dụ chạy với `--use-gl=angle` hay đo trên iPad thật).

## Kiểm thử
- Chạy `node scripts/check-size.mjs` sau `npm run build` → xanh; tạo một thư mục tạm ngoài repo (`os.tmpdir()`) chứa một file 61MB, chạy `node scripts/check-size.mjs <thư-mục-tạm>` để chắc script trả exit 1, rồi xóa thư mục tạm.
- `npx playwright test e2e/perf.spec.ts` xanh, annotations có fps.

## Không làm
- Không tối ưu game hay model trong task này (chỉ đo và báo); không sửa `src/`, model, `vite.config.ts`.
- Không thêm thư viện đo hiệu năng.

## Tham khảo
- Spec mục 4 luật 9 (60fps, ≤ ~50k tam giác/scene, bundle < 60MB).
