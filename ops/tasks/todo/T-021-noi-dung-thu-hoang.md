---
id: T-021
title: Nội dung thú hoang vi/ja
type: tts
depends_on: []
scope:
  - app/src/content/wild.json
  - app/public/audio/**
acceptance:
  - npm run verify
  - "wild.json có 25 key: animal.<id> và animal.<id>-sound cho 12 thú hoang, cộng zoo.hello"
  - npm run check:audio xanh
attempts: 0
---
## Mục tiêu
Giọng đọc tên và "tiếng kêu / điều thú vị" cho 12 thú hoang ở Sở thú và các trò thẻ hình.

## Chi tiết
Tạo `app/src/content/wild.json` (mảng `{ key, vi, ja }`, cùng định dạng `animals.json`):

| key | vi | ja |
|---|---|---|
| animal.elephant | Con voi | ぞうさん |
| animal.elephant-sound | Voi có cái vòi thật dài! | ぞうさんは おはなが ながいね! |
| animal.giraffe | Hươu cao cổ | きりんさん |
| animal.giraffe-sound | Hươu cao cổ cao ơi là cao! | きりんさんは せが たかいね! |
| animal.lion | Sư tử | ライオンさん |
| animal.lion-sound | Sư tử gầm: gừ gừ! | ライオンさんは ガオー! |
| animal.tiger | Con hổ | とらさん |
| animal.tiger-sound | Hổ có bộ lông vằn vện! | とらさんは しましまだね! |
| animal.monkey | Con khỉ | おさるさん |
| animal.monkey-sound | Khỉ kêu: khẹc khẹc! | おさるさんは キッキッ! |
| animal.panda | Gấu trúc | パンダさん |
| animal.panda-sound | Gấu trúc thích ăn tre! | パンダさんは ささが すき! |
| animal.penguin | Chim cánh cụt | ペンギンさん |
| animal.penguin-sound | Chim cánh cụt đi lạch bạch! | ペンギンさんは よちよち! |
| animal.koala | Gấu túi | コアラさん |
| animal.koala-sound | Gấu túi ôm cây ngủ khò khò! | コアラさんは きに だっこ! |
| animal.fox | Con cáo | きつねさん |
| animal.fox-sound | Cáo có cái đuôi thật xù! | きつねさんは しっぽが ふわふわ! |
| animal.bear | Gấu trắng | しろくまさん |
| animal.bear-sound | Gấu trắng sống ở xứ tuyết! | しろくまさんは ゆきの くに! |
| animal.parrot | Con vẹt | オウムさん |
| animal.parrot-sound | Vẹt biết nói: xin chào! | オウムさんは こんにちは! |
| animal.fish | Con cá | おさかなさん |
| animal.fish-sound | Cá bơi tung tăng! | おさかなさんは すいすい! |
| zoo.hello | Đến sở thú rồi! Bé chạm vào bạn nào? | どうぶつえんに ついたよ!どの こに さわる? |

Sinh mp3 từ gốc worktree: `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`. Nghe thử vài file.

## Kiểm thử
`npm run check:audio` đủ; `src/core/content.test.ts` xanh.

## Không làm
Không sửa content file khác, không làm UI.
