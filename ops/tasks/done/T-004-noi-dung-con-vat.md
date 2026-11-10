---
id: T-004
title: Nội dung con vật vi/ja
type: tts
depends_on:
  - T-001
scope:
  - app/src/content/animals.json
  - app/public/audio/**
acceptance:
  - npm run verify
  - "animals.json có 17 key: animal.<id> và animal.<id>-sound cho 8 con, cộng farm.hello"
  - npm run check:audio xanh
attempts: 0
---
## Mục tiêu
Khi bé chạm con vật ở trang trại (T-008), Đậu Đậu đọc tên con vật rồi "kêu" thay con vật bằng giọng vui. Task này chỉ tạo nội dung và mp3.

## Chi tiết
Tạo `app/src/content/animals.json` (mảng `{ key, vi, ja }`), id con vật cố định là `cow, chicken, duck, pig, dog, sheep, horse, rabbit` (trùng tên file model của T-003):

| key | vi | ja |
|---|---|---|
| `animal.cow` | Con bò | うしさん |
| `animal.cow-sound` | Ùm bò! Ùm bò! | モーモー! |
| `animal.chicken` | Con gà | にわとりさん |
| `animal.chicken-sound` | Ò ó o! | コケコッコー! |
| `animal.duck` | Con vịt | あひるさん |
| `animal.duck-sound` | Cạp cạp cạp! | ガーガー! |
| `animal.pig` | Con heo | ぶたさん |
| `animal.pig-sound` | Ụt ịt, ụt ịt! | ブーブー! |
| `animal.dog` | Con chó | いぬさん |
| `animal.dog-sound` | Gâu gâu! | ワンワン! |
| `animal.sheep` | Con cừu | ひつじさん |
| `animal.sheep-sound` | Be be be! | メーメー! |
| `animal.horse` | Con ngựa | うまさん |
| `animal.horse-sound` | Hí hí hí! | ヒヒーン! |
| `animal.rabbit` | Con thỏ | うさぎさん |
| `animal.rabbit-sound` | Thỏ nhảy tưng tưng! | ぴょんぴょん! |
| `farm.hello` | Đến trang trại rồi! Bé chạm vào bạn nào? | まきばに ついたよ!どの こに さわる? |

Dùng dấu `!` ASCII như trên để giọng đọc vui. Sinh mp3 từ gốc worktree:
`uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`
Nghe thử vài file (độ dài > 0, không lỗi). Nếu edge-tts đọc một tiếng kêu quá lạ (ví dụ đọc "Ụt ịt" thành tiếng khác hẳn), được phép đổi chữ cho dễ đọc hơn nhưng giữ nghĩa, và ghi lại thay đổi trong phần tóm tắt.

## Kiểm thử
- `npm run check:audio` báo đủ; `src/core/content.test.ts` xanh (key đúng regex `^[a-z0-9]+(\.[a-z0-9-]+)+$`).

## Không làm
- Không tạo file SFX tiếng kêu thật (để sau), không sửa content file khác, không làm UI game.

## Tham khảo
- Spec mục 5 (nội dung và âm thanh), mục 6 (game Con vật).
