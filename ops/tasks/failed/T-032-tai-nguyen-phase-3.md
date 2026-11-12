---
id: T-032
title: Ảnh Đậu Đậu 2D, thẻ ảnh chuyện và topping
type: asset
depends_on: []
scope:
  - app/scripts/photo-cards.mjs
  - app/scripts/render-daudau.mjs
  - app/scripts/cards/**
  - app/public/cards/daudau.png
  - app/public/cards/story/**
  - app/public/cards/extra/**
  - app/public/cards/CREDITS.md
  - app/package.json
acceptance:
  - npm run verify
  - public/cards/daudau.png 512×512 nền trong suốt, < 120 KB
  - 18 file public/cards/story/<story>-<n>.png và 2 file public/cards/extra/{candle,chocolate}.png, mỗi file < 120 KB, ghi nguồn trong CREDITS.md
  - public/cards/index.json không đổi
attempts: 1
last_error: agent không thay đổi gì
---
## Mục tiêu
Phase 3 cần Đậu Đậu dạng ảnh 2D (để kéo thả và đặt trong màn 2D) và ảnh thật cho 6 chuyện ba tranh, nến và sô-cô-la.

## Chi tiết
- `scripts/render-daudau.mjs` (lệnh `npm run cards:daudau`): render component `src/ui/DauDau.tsx` bằng Playwright + Vite như `render-cards.mjs` (có thể dùng lại `scripts/cards/` làm trang render), camera nhìn thẳng hơi chếch, ánh sáng ấm như `Scene3D`, nền trong suốt, Đậu Đậu chiếm ~85% khung 512×512 → `public/cards/daudau.png`. Không sửa `DauDau.tsx`.
- `scripts/photo-cards.mjs`: thêm nhóm ảnh mới, ghi ra thư mục con thay vì `public/cards/` gốc, KHÔNG thêm vào `index.json`. Chọn tay ảnh Wikimedia Commons CC0 / PD / CC BY / CC BY-SA, vật thể rõ, một vật chính, nền đơn giản:

| file | nội dung |
|---|---|
| story/plant-1, -2, -3 | hạt giống (hạt hướng dương hoặc hạt đậu), mầm non hai lá, bông hoa hướng dương |
| story/chick-1, -2, -3 | quả trứng gà, trứng đang nứt có gà con nhú ra, gà con lông vàng |
| story/butterfly-1, -2, -3 | sâu bướm, nhộng/kén, bướm (ưu tiên bướm vua) |
| story/frog-1, -2, -3 | nòng nọc, ếch con còn đuôi, con ếch xanh |
| story/banana-1, -2, -3 | nải chuối xanh, quả chuối chín vàng, chuối bóc vỏ một nửa |
| story/rain-1, -2, -3 | đám mây trắng/xám trên trời, mưa rơi, cầu vồng |
| extra/candle | một cây nến sinh nhật đang cháy |
| extra/chocolate | thanh hoặc miếng sô-cô-la |

  Ảnh cảnh (mây, mưa, cầu vồng) không tách nền được: cắt vuông 512×512, giữ nền. Các ảnh còn lại tách nền như thẻ hiện có.
- `CREDITS.md`: thêm các dòng mới (đường dẫn file, ảnh gốc, tác giả, giấy phép) và một dòng cho `daudau.png` (render từ model tự làm).
- `package.json`: thêm script `cards:daudau`.

## Kiểm thử
- `npm run check:size` vẫn xanh. Mở từng ảnh xem bằng mắt (ghi trong report ảnh nào chưa ưng).

## Không làm
Không sửa code app, không đổi thẻ hiện có, không sửa `index.json`.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md mục Tài nguyên mới; commit dd1d38b (cách làm thẻ ảnh).
