---
id: T-001
title: Tên 4 địa điểm vi/ja
type: tts
depends_on: []
scope:
  - app/src/content/places.json
  - app/public/audio/**
acceptance:
  - npm run verify
  - app/src/content/places.json có đúng 4 key place.farm, place.pond, place.orchard, place.music
  - npm run check:audio xanh, có app/public/audio/vi/place.*.mp3 và app/public/audio/ja/place.*.mp3
attempts: 0
---
## Mục tiêu
Đậu Đậu đọc tên địa điểm khi bé chạm vào trên bản đồ "Thế giới nhỏ" (bản đồ làm ở T-005; task này chỉ chuẩn bị nội dung và giọng đọc).

## Chi tiết
Tạo `app/src/content/places.json` (mảng JSON, cùng định dạng `ui.json`) gồm 4 mục, đúng thứ tự này (WorldMap đọc theo thứ tự file):
- `place.farm`: "Trang trại" / "まきば"
- `place.pond`: "Hồ nước" / "いけ"
- `place.orchard`: "Vườn quả" / "かじゅえん"
- `place.music`: "Nhà âm nhạc" / "おんがくのいえ"

Sinh mp3 (chạy từ gốc worktree):
`uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`
Script tự ghi `app/public/audio/{vi,ja}/place.*.mp3` và cập nhật `app/public/audio/.hashes.json` (cả hai nằm trong scope). Sau đó chạy `npm run check:audio` và `npm run verify` trong `app/`.

## Kiểm thử
- `npm run check:audio` báo đủ âm thanh.
- Test sẵn có `src/core/content.test.ts` vẫn xanh (key đúng định dạng `nhóm.tên`, đủ vi/ja).

## Không làm
- Không sửa `ui.json` hay file content khác, không làm UI bản đồ (đó là T-005).
- Không thu âm tay, không đổi giọng hay tốc độ trong `tools/tts/generate.py`.

## Tham khảo
- Spec mục 3 (màn hình chính "Thế giới nhỏ"), mục 5 (nội dung và âm thanh).
