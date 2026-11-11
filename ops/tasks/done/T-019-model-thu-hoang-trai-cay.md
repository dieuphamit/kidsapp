---
id: T-019
title: "Model 3D CC0: 12 thú hoang + 10 trái cây"
type: asset
depends_on: []
scope:
  - app/public/models/**
acceptance:
  - npm run verify
  - "Có 22 file mới trong app/public/models/: elephant, giraffe, lion, tiger, monkey, panda, penguin, koala, fox, bear, parrot, fish, apple, banana, cherries, grapes, lemon, orange, pear, pineapple, strawberry, watermelon (.glb), mỗi file ≤ 1MB"
  - CREDITS.md thêm đủ 22 dòng
attempts: 1
last_error: "agent lỗi (exit 0, error_max_turns): hết số lượt cho phép sau 61 lượt"
note: " | Claude làm/kiểm tay 11/11 trưa"
---
## Mục tiêu
Chuẩn bị model cho Sở thú 3D (T-024) và cho thẻ hình 2D (T-020): 12 thú hoang và 10 trái cây cùng phong cách đồ chơi khối với trang trại.

## Chi tiết
- Nguồn chỉ lấy trong `assets-src/` (không tải mạng, không sửa `assets-src/`):
  - Thú: `assets-src/kenney-cube-pets/**/animal-<tên>.glb` (CC0, xem License.txt). Tên đích ← file gốc: elephant←animal-elephant, giraffe←animal-giraffe, lion←animal-lion, tiger←animal-tiger, monkey←animal-monkey, panda←animal-panda, penguin←animal-penguin, koala←animal-koala, fox←animal-fox, bear←animal-polar, parrot←animal-parrot, fish←animal-fish.
  - Quả: `assets-src/kenney-food-kit/Models/GLB format/<tên>.glb` (CC0, License.txt ở gốc gói). GLB của gói này có thể trỏ texture ngoài `Textures/colormap.png`; gltf-transform đọc theo đường dẫn tương đối và nhúng vào file đích — kiểm tra file đích có texture (inspect thấy texture).
- Nén, chạy trong `app/`: `npm run model:opt -- "../assets-src/<đường-dẫn>" public/models/<tên>.glb --compress meshopt` (đường dẫn có dấu cách phải đặt trong ngoặc kép).
- Ngân sách: mỗi file ≤ 1MB, mỗi model ≤ ~5k tam giác (kiểm bằng `npx @gltf-transform/cli inspect`).
- `app/public/models/CREDITS.md`: thêm 22 dòng cùng định dạng các dòng cũ.

## Kiểm thử
- `npm run verify` xanh; mọi `app/public/models/*.glb` ≤ 1MB; số dòng CREDITS khớp số .glb.

## Không làm
Không sửa `app/src`, không đổi model cũ, không dùng nguồn không phải CC0.

## Tham khảo
docs/superpowers/specs/2026-11-11-phase-2-games.md
