# Nguồn tài nguyên của trang demo `?demo=realism`

Chỉ dùng cho trang demo so sánh (bố mẹ xem ở local), không nằm trong app thật và không được precache
(`vite.config.ts` bỏ qua `demo-realism/**`). Giấy phép giữ nguyên như bản gốc; bản đã chỉnh sửa
(tách nền, cắt, đổi cỡ, giảm tam giác, nén texture) của tác phẩm CC BY-SA vẫn theo CC BY-SA.

## Phương án B: ảnh chụp thật (`photos/*.png`)

Lấy từ Wikimedia Commons, tách nền bằng BiRefNet-lite, cắt sát thân và thu nhỏ bằng
`scripts/demo-realism-photos.mjs`.

| File | Ảnh gốc | Tác giả | Giấy phép | Dung lượng |
|---|---|---|---|---|
| photos/whale.png | [Humpback Whale underwater shot.jpg](https://commons.wikimedia.org/wiki/File:Humpback_Whale_underwater_shot.jpg) | (Commons không ghi tên tác giả) | Public domain | 18 KB |
| photos/dolphin.png | [A spinner dolphin in the Red Sea.jpg](https://commons.wikimedia.org/wiki/File:A_spinner_dolphin_in_the_Red_Sea.jpg) | Alexander Vasenin | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 27 KB |
| photos/clownfish.png | [Clownfisch (Amphiprion ocellaris).jpg](https://commons.wikimedia.org/wiki/File:Clownfisch_(Amphiprion_ocellaris).jpg) | Raimond Spekking | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 51 KB |
| photos/puffer.png | [Pez globo (Arothron diadematus), mar Rojo, Egipto, 2023-04-17, DD 19.jpg](https://commons.wikimedia.org/wiki/File:Pez_globo_(Arothron_diadematus),_mar_Rojo,_Egipto,_2023-04-17,_DD_19.jpg) | Diego Delso | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 55 KB |
| photos/manta.png | [Manta alfredi cruising - journal.pone.0046170.g002A.jpg](https://commons.wikimedia.org/wiki/File:Manta_alfredi_cruising_-_journal.pone.0046170.g002A.jpg) | Jaine FRA, Couturier LIE, Weeks SJ, Townsend KA, Bennett MB, et al. (2012) | [CC BY 2.5](https://creativecommons.org/licenses/by/2.5) | 33 KB |
| photos/horse.png | [Horse in Calchaquí Valleys, Argentina.jpg](https://commons.wikimedia.org/wiki/File:Horse_in_Calchaqu%C3%AD_Valleys,_Argentina.jpg) | Bernard Gagnon | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 56 KB |
| photos/cow.png | [HF in der Rhön auf der Weide.jpg](https://commons.wikimedia.org/wiki/File:HF_in_der_Rh%C3%B6n_auf_der_Weide.jpg) | Verum | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | 50 KB |
| photos/zebra.png | [Plains zebra standing close up - DPLA - 5a17abfc936af2a7cad34115b462e9a3.jpg](https://commons.wikimedia.org/wiki/File:Plains_zebra_standing_close_up_-_DPLA_-_5a17abfc936af2a7cad34115b462e9a3.jpg) | Garst, Warren, 1922-2016, photographer | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 69 KB |
| photos/deer.png | [Sika deer october.jpg](https://commons.wikimedia.org/wiki/File:Sika_deer_october.jpg) | วิชิต กองคำ | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | 72 KB |
| photos/fox.png | [Red fox walking across the sand and rocks. (cd648e7a-155d-451f-67c2-22e947c5a1c6).jpg](https://commons.wikimedia.org/wiki/File:Red_fox_walking_across_the_sand_and_rocks._(cd648e7a-155d-451f-67c2-22e947c5a1c6).jpg) | NPS | Public domain | 60 KB |

## Phương án C: model 3D có texture (`models/*.glb`)

Chuyển và nén bằng `scripts/demo-realism-models.mjs` (meshopt, texture WebP, giảm tam giác; ngựa, bò đổi từ
OBJ và hươu từ FBX sang GLB, chỉ giữ hình và texture màu). File GLB của Sketchfab lấy qua bản sao công khai
Objaverse (huggingface.co/datasets/allenai/objaverse), giấy phép đối chiếu bằng API công khai của Sketchfab.

| File | Model gốc | Tác giả | Giấy phép | Tam giác | Dung lượng |
|---|---|---|---|---|---|
| models/whale.glb | [Humpback Whale (Swimming)](https://sketchfab.com/3d-models/f4912be9163a4f45b2480df8ccb8b2c6) | Connlan_Immure | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 6 174 (có xương, clip bơi) | 203 KB |
| models/dolphin.glb | [Game-Ready dolphin (Swimming)](https://sketchfab.com/3d-models/b621ec8894734bc79c04338edff3cd0d) | Allie2k | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 1 414 (có xương, clip bơi) | 72 KB |
| models/clownfish.glb | [Clownfish](https://sketchfab.com/3d-models/47ba2679d91a4f14b3fc0bf8e3805af5) | zixisun02 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 1 596 | 79 KB |
| models/puffer.glb | [CC0 Grass Puffer, Takifugu niphobles](https://sketchfab.com/3d-models/586210558f404005bf25d8a19720de41) (scan) | ffish.asia / floraZia.com | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 5 340 (giảm từ 707 080) | 233 KB |
| models/ray.glb | [CC0 Japanese Eagle Ray, Myliobatis tobijei](https://sketchfab.com/3d-models/9c71e0342a454334b6dce9e33ed1e31b) (scan; cá đuối ó, không phải manta) | ffish.asia / floraZia.com | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 6 630 (giảm từ 707 789) | 222 KB |
| models/horse.glb | [Realtime Rancher's 3D Model Pack: horse](https://opengameart.org/content/realtime-ranchers-3d-model-pack) | Lyndon Daniels | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 14 982 | 770 KB |
| models/cow.glb | [Realtime Rancher's 3D Model Pack: cow](https://opengameart.org/content/realtime-ranchers-3d-model-pack) | Lyndon Daniels | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 6 284 | 336 KB |
| models/zebra.glb | [Plain Zebra](https://sketchfab.com/3d-models/ff2875fb1a5b4771805a5fd35c8fe7bb) | Jeffery Lopez (đăng bởi GentryHS EAST) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 8 106 (giảm từ 16 212) | 109 KB |
| models/deer.glb | [Deer Female](https://opengameart.org/content/deer-female) | Čestmír Dammer (CDmir), TinyWorlds | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 4 735 | 285 KB |
| models/fox.glb | [Fox (glTF Sample Assets)](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox) | PixelMannen (model), tomkranis (xương, clip), AsoboStudio & scurest (glTF) | model [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); xương & clip [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 486 (có xương: Survey/Walk/Run) | 53 KB |
