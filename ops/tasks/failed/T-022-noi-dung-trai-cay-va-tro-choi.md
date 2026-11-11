---
id: T-022
title: Nội dung trái cây, địa điểm mới và câu dẫn các trò vi/ja
type: tts
depends_on:
  - T-021
scope:
  - app/src/content/fruits.json
  - app/src/content/games2.json
  - app/src/content/places.json
  - app/public/audio/**
acceptance:
  - npm run verify
  - fruits.json có 20 key fruit.<id> và fruit.<id>-color cho 10 quả
  - places.json thêm place.zoo, place.house; games2.json có đủ key ở bảng dưới
  - npm run check:audio xanh
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Giọng đọc cho trái cây và cho 6 trò mới của phase 2.

## Chi tiết
`app/src/content/fruits.json` (mỗi quả 2 key: `fruit.<id>` là tên, `fruit.<id>-color` là câu màu):

| id | tên vi / câu màu vi | tên ja / câu màu ja |
|---|---|---|
| apple | Quả táo / Táo màu đỏ! | りんご / りんごは あかいね! |
| banana | Quả chuối / Chuối màu vàng! | バナナ / バナナは きいろだね! |
| cherries | Quả anh đào / Anh đào màu đỏ! | さくらんぼ / さくらんぼは あかいね! |
| grapes | Chùm nho / Nho màu tím! | ぶどう / ぶどうは むらさきだね! |
| lemon | Quả chanh vàng / Chanh màu vàng! | レモン / レモンは きいろだね! |
| orange | Quả cam / Cam màu cam! | みかん / みかんは オレンジいろ! |
| pear | Quả lê / Lê màu xanh lá! | なし / なしは みどりだね! |
| pineapple | Quả dứa / Dứa màu vàng! | パイナップル / パイナップルは きいろだね! |
| strawberry | Quả dâu tây / Dâu tây màu đỏ! | いちご / いちごは あかいね! |
| watermelon | Quả dưa hấu / Dưa hấu màu xanh lá! | すいか / すいかは みどりだね! |

`app/src/content/places.json` thêm 2 dòng: `place.zoo` Sở thú / どうぶつえん; `place.house` Nhà Đậu Đậu / ダウダウのおうち.

`app/src/content/games2.json`:

| key | vi | ja |
|---|---|---|
| game.farm3d | Các bạn ở trang trại | まきばの なかま |
| game.sound-quiz | Ai kêu đấy? | だれの こえ? |
| game.sort | Xếp quả theo màu | いろわけ |
| game.zoo3d | Các bạn ở sở thú | どうぶつえんの なかま |
| game.peekaboo | Ú òa | いないいないばあ |
| game.shadow | Bóng của ai? | だれの かげ? |
| game.memory | Lật hình | おなじの さがし |
| game.puzzle | Ghép hình | パズル |
| ui.pick-game | Bé chơi trò nào? | どれで あそぶ? |
| memory.hello | Tìm hai hình giống nhau nhé! | おなじ えを みつけてね! |
| memory.match | Giống nhau rồi! | おなじだね! |
| memory.done | Bé nhớ giỏi quá! | よく おぼえたね! |
| quiz.hello | Ai kêu thế nhỉ? Bé nghe nhé! | だれの こえかな?きいてね! |
| quiz.again | Nghe lại nào! | もう いちど きいてね! |
| peek.hello | Bạn nào đang trốn nhỉ? | だれが かくれてるかな? |
| peek.empty | Không có ở đây! | ここには いないよ! |
| peek.found | Ú òa! | ばあ! |
| shadow.hello | Bóng của ai đây? | これは だれの かげかな? |
| sort.hello | Xếp quả vào giỏ cùng màu nhé! | おなじ いろの かごに いれてね! |
| sort.done | Xếp xong rồi! | ぜんぶ いれたね! |
| puzzle.hello | Ghép hình nào! | パズルを しよう! |
| puzzle.done | Ghép xong rồi! | できたね! |

Sinh mp3 từ gốc worktree: `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`.

## Kiểm thử
`npm run check:audio`, `src/core/content.test.ts` xanh.

## Không làm
Không sửa content file khác ngoài 3 file trên, không làm UI.
