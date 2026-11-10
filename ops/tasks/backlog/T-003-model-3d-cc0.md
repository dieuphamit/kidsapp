---
id: T-003
title: "Model 3D CC0: 8 con vật + mèo"
type: asset
depends_on: []
scope:
  - app/public/models/**
acceptance:
  - npm run verify
  - "Có 9 file app/public/models/{cow,chicken,duck,pig,dog,sheep,horse,rabbit,cat}.glb, mỗi file ≤ 1MB"
  - "app/public/models/CREDITS.md ghi đủ 9 dòng: gói nguồn, tác giả, license CC0, số tam giác, tên animation"
---
## Mục tiêu
Chuẩn bị model 3D cho trang trại (T-008) và cho Đậu Đậu (T-006): 8 con vật dễ thương kiểu low-poly, bo tròn, màu phẳng, hợp thế giới đồ chơi đất sét, cộng một con mèo làm Đậu Đậu.

## Chi tiết
- Nguồn: chỉ lấy từ `assets-src/` ở gốc worktree (gói CC0 của Kenney, Quaternius mà bố mẹ đã tải). Không tải gì từ mạng, không sửa gì trong `assets-src/`.
  - **Nếu `assets-src/` không tồn tại hoặc rỗng: dừng ngay, không tạo file nào, không commit**, ghi `CÂU HỎI: chưa có assets-src/, cần tải gói CC0 nào (ví dụ Quaternius Ultimate Animated Animals, Kenney Animal Pack)?`.
  - Tìm bằng Glob (`**/*.glb`, `**/*.gltf`, `**/*.fbx` với path `assets-src`); đọc file license trong gói để chắc là CC0. Chỉ nhận .glb/.gltf (không convert FBX/OBJ).
- 9 model, tên file đích cố định (các task sau dùng đúng tên này):
  `cow.glb` (bò), `chicken.glb` (gà), `duck.glb` (vịt), `pig.glb` (heo), `dog.glb` (chó), `sheep.glb` (cừu), `horse.glb` (ngựa), `rabbit.glb` (thỏ), `cat.glb` (mèo Đậu Đậu, ưu tiên mèo màu kem/cam, mặt tròn, mắt to).
  - Ưu tiên cùng một gói để phong cách đồng nhất. Ưu tiên bản có animation (Idle, Jump…). Chọn biến thể đáng yêu, không có răng nanh hay vẻ dữ.
  - Gói không có con nào thì không thay bằng con khác: bỏ qua con đó, ghi `CÂU HỎI:` liệt kê các con còn thiếu, vẫn làm xong các con còn lại (acceptance khi đó sẽ do bố mẹ quyết).
- Nén, chạy trong `app/`:
  `npm run model:opt -- ../assets-src/<đường-dẫn> public/models/<tên>.glb --compress meshopt`
  (nếu `package.json` chưa có script `model:opt` thì dùng `npx @gltf-transform/cli optimize ../assets-src/<đường-dẫn> public/models/<tên>.glb --compress meshopt`).
- Ngân sách: mỗi file ≤ 1MB; mỗi con vật ≤ ~5k tam giác (8 con cùng một scene phải ≤ ~50k), mèo ≤ ~8k. Kiểm tra bằng `npx @gltf-transform/cli inspect public/models/<tên>.glb`. Vượt thì thêm `--simplify true --simplify-ratio 0.5` (hoặc tỉ lệ khác) rồi xem lại hình còn đẹp không.
- `app/public/models/CREDITS.md`: bảng một dòng mỗi model với cột: file, gói nguồn, file gốc, tác giả, license (CC0), số tam giác, dung lượng, tên các animation clip (ghi "không có" nếu không có). T-006 và T-008 đọc cột animation này.

## Kiểm thử
- `npm run verify` xanh (vite-plugin-pwa đã precache `*.glb`, giới hạn 10MB/file).
- Tự kiểm: `ls -l app/public/models/*.glb` đều ≤ 1MB; số dòng trong CREDITS.md khớp số file .glb.

## Không làm
- Không sửa code trong `app/src` (hiển thị model là T-006, T-008).
- Không tạo texture/model tự vẽ, không dùng nguồn không phải CC0 (kể cả CC-BY).
- Không thêm `assets-src/` vào git.

## Tham khảo
- CLAUDE.md luật 7, 8; spec mục 3; prompt `ops/runner/prompts/asset.md`.
