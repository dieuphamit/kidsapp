# Tiếng kêu con vật (ghi âm thật)

File `animal-<id>.mp3` là tiếng thật của con vật, phát khi game gọi `say('animal.<id>-sound')`
(ánh xạ ở `speechUrl` trong `src/core/audio.ts`, không phụ thuộc ngôn ngữ).
Nguồn: Wikimedia Commons. Mỗi file đã được cắt đoạn, đổi mono, chuẩn hóa độ to (-18 LUFS) và nén mp3 —
đây là bản phái sinh (adapted) của tác phẩm gốc; giấy phép CC BY-SA áp dụng tiếp cho bản phái sinh tương ứng.
Sinh lại: trong `app/` chạy `node scripts/animal-sounds.mjs` (manifest: `scripts/animal-sounds.json`). File này được sinh tự động.

| id | Nguồn (trang file trên Commons) | Tác giả | Giấy phép | Nội dung | Đoạn dùng |
|---|---|---|---|---|---|
| cow | [Single Cow Moo.ogg](https://commons.wikimedia.org/wiki/File:Single_Cow_Moo.ogg) | MichaeltheFox8621 | CC BY-SA 4.0 | bò mẹ kêu "ò" (moo) ở trang trại Pitlochry | 0.95–2.62s |
| chicken | [Kukuriku.flac](https://commons.wikimedia.org/wiki/File:Kukuriku.flac) | Yosef Ben Melamed | CC BY-SA 4.0 | gà trống gáy | 0.66–2.75s |
| duck | [Anas platyrhynchos - Mallard - XC62258.ogg](https://commons.wikimedia.org/wiki/File:Anas_platyrhynchos_-_Mallard_-_XC62258.ogg) | Jonathon Jongsma | CC BY-SA 3.0 | vịt trời (mallard) kêu cạp cạp | 1.13–2.65s |
| pig | [Pig grunt - Erdie.ogg](https://commons.wikimedia.org/wiki/File:Pig_grunt_-_Erdie.ogg) | erdie | CC BY 3.0 | heo ủn ỉn (một tiếng, phát 2 lần) | 0–0.66s + 0–0.66s |
| dog | [Barking of a dog.ogg](https://commons.wikimedia.org/wiki/File:Barking_of_a_dog.ogg) | Amada44 | CC BY-SA 3.0 | chó sủa 3 tiếng | 0.1–2.15s |
| sheep | [Sheep bleating.ogg](https://commons.wikimedia.org/wiki/File:Sheep_bleating.ogg) | earthcalling | Public domain | cừu kêu be | 0.62–1.75s |
| horse | [Wiehern.ogg](https://commons.wikimedia.org/wiki/File:Wiehern.ogg) | Hü. | Public domain | ngựa hí | 0.05–1.8s |
| rabbit | [Rabbit oinks and squeaks.wav](https://commons.wikimedia.org/wiki/File:Rabbit_oinks_and_squeaks.wav) | kessir | CC0 | thỏ nhà kêu "ụt ụt" khe khẽ (honk/oink) — thỏ gần như không kêu | 20.15–21.5s |
| elephant | [Elephant voice - trumpeting.ogg](https://commons.wikimedia.org/wiki/File:Elephant_voice_-_trumpeting.ogg) | தகவலுழவன் | CC0 | voi (voi châu Á) rống bằng vòi | 0.12–1.44s |
| giraffe | [Giraffe snort.oga](https://commons.wikimedia.org/wiki/File:Giraffe_snort.oga) | Anton Baotic, Florian Sicks and Angela S. Stoeger | CC BY-SA 4.0 | hươu cao cổ khịt mũi (phát 2 lần) | 0–0.99s + 0–0.99s |
| lion | [Lion raring-sound1TamilNadu178.ogg](https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg) | த*உழவன் | Public domain | sư tử đực gầm (vườn thú) | 0.35–2.3s |
| tiger | [439280 schots angry-tiger.wav](https://commons.wikimedia.org/wiki/File:439280_schots_angry-tiger.wav) | schots | CC0 | hổ gầm gừ trong chuồng (một tiếng gừ, có vang); nguồn tải là bản chuyển mã của Commons | 2.95–5.3s |
| monkey | [Pant-hoot call made by a male chimpanzee.ogg](https://commons.wikimedia.org/wiki/File:Pant-hoot_call_made_by_a_male_chimpanzee.ogg) | Pawel Fedurek et al. | CC BY 4.0 | tinh tinh đực kêu "hú hú" (pant-hoot), đoạn đầu | 1.55–3.75s |
| panda | [Giant panda twittering.ogg](https://commons.wikimedia.org/wiki/File:Giant_panda_twittering.ogg) | Mizunoryu (người tải lên, "own work") | Public domain | gấu trúc lớn kêu ríu rít (vườn thú) | 0.75–2.4s |
| penguin | [Vocal-individuality-cues-in-the-African-penguin-(Spheniscus-demersus)-a-source-filter-theory-srep17255-s2.oga](https://commons.wikimedia.org/wiki/File:Vocal-individuality-cues-in-the-African-penguin-(Spheniscus-demersus)-a-source-filter-theory-srep17255-s2.oga) | Favaro L, Gamba M, Alfieri C, Pessani D, McElligott A | CC BY 4.0 | chim cánh cụt châu Phi kêu (một tiếng, phát 2 lần) | 0.48–1.08s + 0.48–1.08s |
| koala | [Perception-of-Male-Caller-Identity-in-Koalas-(Phascolarctos-cinereus)-Acoustic-Analysis-and-pone.0020329.s001.ogv](https://commons.wikimedia.org/wiki/File:Perception-of-Male-Caller-Identity-in-Koalas-(Phascolarctos-cinereus)-Acoustic-Analysis-and-pone.0020329.s001.ogv) | Charlton B, Ellis W, McKinnon A, Brumm J, Nilsson K, Fitch W | CC BY 2.5 | gấu túi đực kêu rống (bellow) ở Lone Pine Koala Sanctuary, lấy tiếng từ video; nguồn tải là bản chuyển mã của Commons | 17.95–20.55s |
| fox | [Bellender Fuchs.ogg](https://commons.wikimedia.org/wiki/File:Bellender_Fuchs.ogg) | Jugrü | CC BY-SA 3.0 | cáo đỏ sủa 2 tiếng (bỏ khoảng lặng giữa) | 0.58–1.45s + 3.98–4.75s |
| bear | [Bear growl.ogg](https://commons.wikimedia.org/wiki/File:Bear_growl.ogg) | Shizhao | CC BY 3.0 | gấu con gầm gừ | 0.15–2.15s |
| parrot | [Scarlet macaw 01.wav](https://commons.wikimedia.org/wiki/File:Scarlet_macaw_01.wav) | Ganesh Mohan T | CC BY-SA 4.0 | vẹt đỏ đuôi dài (scarlet macaw) kêu quác 2 tiếng (bỏ khoảng giữa) | 11–11.9s + 12.58–13.12s |
| fish | [Toberbreedia water bubbling.opus](https://commons.wikimedia.org/wiki/File:Toberbreedia_water_bubbling.opus) | A.-K. D. | CC0 | tiếng nước sủi bọt lục bục (cá không kêu) | 9.2–11.2s |
