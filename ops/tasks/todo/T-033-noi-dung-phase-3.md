---
id: T-033
title: Giọng đọc vi/ja cho menu mới và 6 trò phase 3
type: tts
depends_on: []
scope:
  - app/src/content/places.json
  - app/src/content/games3.json
  - app/public/audio/**
acceptance:
  - npm run verify
  - places.json đổi chữ place.zoo, thêm place.puzzle; games3.json có đủ mọi key ở dưới
  - npm run check:audio xanh
---
## Mục tiêu
Mọi câu Đậu Đậu nói trong menu mới và 6 trò mới, cả vi và ja.

## Chi tiết
`places.json`: `place.zoo` đổi thành **Thế giới thú / どうぶつの くに**; thêm `place.puzzle` **Góc đố / なぞなぞ コーナー**. Giữ nguyên các key khác.

`games3.json` (file mới). Sau khi sửa json chạy lệnh sinh giọng trong CLAUDE.md.

**Tên trò**

| key | vi | ja |
|---|---|---|
| game.hide | Đậu Đậu trốn ở đâu? | ダウダウ どこかな? |
| game.story | Chuyện ba tranh | おはなし ならべ |
| game.bakery | Tiệm bánh | ケーキやさん |
| game.pattern | Chuỗi hạt | じゅんばん ビーズ |
| game.path | Đường về nhà | おうちへ かえろう |
| game.band | Ban nhạc thú | どうぶつ バンド |

**Trốn ở đâu (hide)**: `hide.hello` Bé đưa Đậu Đậu đi trốn nhé! / ダウダウを かくして あげてね! · `hide.yay` Đúng chỗ rồi! Đậu Đậu thích lắm! / そこだね! ダウダウ うれしい!

Câu vị trí sinh theo bảng đồ vật × giới từ. Mỗi cặp hợp lệ có 2 key:
- `hide.<prep>-<obj>`: vi "Đậu Đậu ở {prepVi} {objVi}!", ja "ダウダウは {objJa}の {prepJa}!"
- `hide.ask-<prep>-<obj>`: vi "Bé đặt Đậu Đậu {askVi} {objVi} nhé!", ja "ダウダウを {objJa}の {prepJa}に おいてね!"

| prep | prepVi | askVi | prepJa |
|---|---|---|---|
| on | trên | lên | うえ |
| under | dưới | xuống dưới | した |
| in | trong | vào trong | なか |
| beside | cạnh | cạnh | よこ |

| obj | objVi | objJa | prep hợp lệ |
|---|---|---|---|
| table | cái bàn | つくえ | on, under, beside |
| box | cái hộp | はこ | in, on, beside |
| bed | cái giường | ベッド | on, under, beside |
| chair | cái ghế | いす | on, under, beside |
| pot | cái nồi | おなべ | in, beside |
| basket | cái giỏ | かご | in, beside |
| tree | cái cây | き | on, under, beside |
| bucket | cái xô | バケツ | in, beside |
| car | ô tô đồ chơi | くるま | in, on, beside |

(24 cặp × 2 = 48 key.)

**Chuyện ba tranh (story)**: `story.hello` Bé xếp tranh theo thứ tự nhé! / じゅんばんに ならべてね! · `story.next` Tiếp theo là gì nhỉ? / つぎは なにかな? · `story.done` Hay quá! Mình kể lại nhé. / すごい! もう いちど おはなし しよう。

| key | vi | ja |
|---|---|---|
| story.plant-1 | Đầu tiên là hạt giống. | はじめは たね。 |
| story.plant-2 | Tiếp theo, hạt nảy mầm. | つぎに めが でたよ。 |
| story.plant-3 | Cuối cùng, cây nở hoa! | さいごに はなが さいた! |
| story.chick-1 | Đầu tiên là quả trứng. | はじめは たまご。 |
| story.chick-2 | Tiếp theo, trứng nứt ra. | つぎに たまごが われたよ。 |
| story.chick-3 | Cuối cùng, gà con chui ra! | さいごに ひよこが でてきた! |
| story.butterfly-1 | Đầu tiên là con sâu. | はじめは いもむし。 |
| story.butterfly-2 | Tiếp theo, sâu làm kén. | つぎに さなぎに なったよ。 |
| story.butterfly-3 | Cuối cùng, bướm bay ra! | さいごに ちょうちょに なった! |
| story.frog-1 | Đầu tiên là nòng nọc. | はじめは おたまじゃくし。 |
| story.frog-2 | Tiếp theo, nòng nọc mọc chân. | つぎに あしが はえたよ。 |
| story.frog-3 | Cuối cùng, thành chú ếch! | さいごに かえるに なった! |
| story.banana-1 | Đầu tiên chuối còn xanh. | はじめは みどりの バナナ。 |
| story.banana-2 | Tiếp theo, chuối chín vàng. | つぎに きいろく なったよ。 |
| story.banana-3 | Cuối cùng, bóc vỏ ăn thôi! | さいごに かわを むいて たべよう! |
| story.rain-1 | Đầu tiên có đám mây. | はじめは くも。 |
| story.rain-2 | Tiếp theo, trời đổ mưa. | つぎに あめが ふったよ。 |
| story.rain-3 | Cuối cùng, cầu vồng hiện ra! | さいごに にじが でた! |

**Tiệm bánh (bakery)**

| key | vi | ja |
|---|---|---|
| bakery.hello | Tiệm bánh mở cửa rồi! | ケーキやさん、かいてん! |
| bakery.order | Bạn ấy muốn một cái bánh. Bé trang trí nhé! | ケーキを つくって あげてね! |
| bakery.yum | Ngon quá! Cảm ơn bé! | おいしい! ありがとう! |
| bakery.yum-fruit | Nhiều quả quá, ngon ghê! | くだもの いっぱい! おいしいね! |
| bakery.yum-candle | Có nến nữa, vui quá! | ろうそくも ある! うれしい! |
| bakery.ask | Con thích bánh vị gì? | どんな ケーキが すき? |
| topping.strawberry | Dâu tây đỏ! | あかい いちご! |
| topping.cherries | Anh đào đỏ! | あかい さくらんぼ! |
| topping.blueberry | Việt quất tím! | むらさきの ブルーベリー! |
| topping.kiwi | Kiwi xanh! | みどりの キウイ! |
| topping.candle | Cây nến! | ろうそく! |
| topping.chocolate | Sô-cô-la ngọt! | あまい チョコレート! |

**Chuỗi hạt (pattern)**: `pattern.hello` Bé xem chuỗi hạt nhé! / ビーズを みてね! · `pattern.next` Tiếp theo là quả gì? / つぎは なにかな? · `pattern.yay` Đúng quy luật rồi! / じゅんばん ぴったり!

**Đường về nhà (path)**

| key | vi | ja |
|---|---|---|
| path.hello | Đưa Đậu Đậu về nhà nhé! | ダウダウを おうちに つれて いってね! |
| path.up | Đi lên! | うえ! |
| path.down | Đi xuống! | した! |
| path.left | Sang trái! | ひだり! |
| path.right | Sang phải! | みぎ! |
| path.go | Đi nào! | しゅっぱつ! |
| path.bump | Ối, có cây! Mình đổi đường nhé. | あっ、きが あるよ。ちがう みちに しよう。 |
| path.home | Về tới nhà rồi! | おうちに ついた! |

**Ban nhạc thú (band)**: `band.hello` Mình cùng chơi nhạc nhé! / いっしょに えんそう しよう! · `band.slow` Chậm thôi! / ゆっくり! · `band.fast` Nhanh lên! / はやく!

## Không làm
Không sửa code app; không sửa các json khác.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md; T-022 (mẫu).
