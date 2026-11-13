| apple.glb | kenney-food-kit/Models/GLB format/apple.glb | Kenney | 136 | — (20 KB) | không có |
| banana.glb | kenney-food-kit/Models/GLB format/banana.glb | Kenney | 104 | — (19 KB) | không có |
| cherries.glb | kenney-food-kit/Models/GLB format/cherries.glb | Kenney | 134 | — (19 KB) | không có |
| grapes.glb | kenney-food-kit/Models/GLB format/grapes.glb | Kenney | 592 | — (26 KB) | không có |
| lemon.glb | kenney-food-kit/Models/GLB format/lemon.glb | Kenney | 104 | — (19 KB) | không có |
| orange.glb | kenney-food-kit/Models/GLB format/orange.glb | Kenney | 120 | — (19 KB) | không có |
| pear.glb | kenney-food-kit/Models/GLB format/pear.glb | Kenney | 136 | — (20 KB) | không có |
| pineapple.glb | kenney-food-kit/Models/GLB format/pineapple.glb | Kenney | 196 | — (20 KB) | không có |
| strawberry.glb | kenney-food-kit/Models/GLB format/strawberry.glb | Kenney | 154 | — (20 KB) | không có |
| watermelon.glb | kenney-food-kit/Models/GLB format/watermelon.glb | Kenney | 1356 | — (31 KB) | không có |
# Nguồn model 3D

Mọi model đều là CC0 (Public Domain). Không bắt buộc ghi công, nhưng vẫn ghi lại để biết nguồn.
Tải ngày 10/11/2026; file gốc nằm trong `assets-src/` (không commit). Đã nén bằng
`npm run model:opt -- ../assets-src/<đường-dẫn> public/models/<tên>.glb --compress meshopt`
(meshopt + quantize, texture nhúng sẵn trong GLB). Số tam giác và tên clip lấy từ
`npx gltf-transform inspect` / GLTFLoader sau khi nén. Đã render kiểm tra cả 9 file ngày 10/11/2026.

Hướng: mọi model nhìn về +Z, đứng trên y=0. Kích thước không đồng đều (xem cột "Cao"), game tự scale.

| File | Nguồn (trong `assets-src/`) | Tác giả | Tam giác | Cao | Clip animation |
|---|---|---|---|---|---|

## Chỉnh sửa sau khi nén
- `duck.glb`, `sheep.glb`: đặt metalness 0.4 → 0 (không có env map nên kim loại làm model tối, lệch tông đất sét).
- `sheep.glb`: đổi tên clip `AnimalArmature|AnimalArmature|AnimalArmature|Idle` → `Idle` (tương tự các clip khác); tô ô màu lông trong atlas từ xám `#a0a0a0` sang kem `#f6f2ea` để cừu trông trắng.

## Giấy phép
- Kenney, Cube Pets 2.0 (https://kenney.nl/assets/cube-pets), `License.txt`:
  > License: (Creative Commons Zero, CC0) http://creativecommons.org/publicdomain/zero/1.0/
  > You can use this content for personal, educational, and commercial purposes.
- Quaternius, Ultimate Animated Animals (https://quaternius.com/packs/ultimateanimatedanimals.html), `License.txt`:
  > License: CC0 1.0 Universal (CC0 1.0) Public Domain Dedication https://creativecommons.org/publicdomain/zero/1.0/
- poly.pizza (vịt của Isa Lousberg, cừu của Quaternius): trang model ghi "Public Domain (CC0)"
  (ghi lại trong `assets-src/polypizza-cc0/SOURCES.txt`).

- Kenney Cube Pets (thú hoang) và Kenney Food Kit 2.0 (trái cây, tải 11/11/2026 từ kenney.nl): License.txt ghi CC0 1.0.


## Con vật giống thật: Google Poly (CC-BY 3.0)

21 con vật thay bộ Kenney/Quaternius ngày 11/11/2026. Giấy phép **CC-BY 3.0**: được dùng tự do, **phải ghi tác giả** (ghi cả trong khu phụ huynh của app). Nguồn tải: poly.pizza (lưu trữ Google Poly). File gốc ở `assets-src/poly-google/` (không commit), nén `--compress meshopt --texture-size 512`.

| File | Model | Tác giả | Giấy phép |
|---|---|---|---|
| cow.glb | https://poly.pizza/m/0OToIgkcVM7 | Poly by Google | CC-BY 3.0 |
| chicken.glb | https://poly.pizza/m/6NTegstc5Jy | Poly by Google | CC-BY 3.0 |
| duck.glb | https://poly.pizza/m/frSLi6b6Vid | Poly by Google | CC-BY 3.0 |
| pig.glb | https://poly.pizza/m/6XC3XssJIU_ | Poly by Google | CC-BY 3.0 |
| dog.glb | https://poly.pizza/m/0BnDT3T1wTE | Poly by Google | CC-BY 3.0 |
| sheep.glb | https://poly.pizza/m/dXBMV4AY2DL | Poly by Google | CC-BY 3.0 |
| horse.glb | https://poly.pizza/m/5ocnVSh_ZF- | Poly by Google | CC-BY 3.0 |
| rabbit.glb | https://poly.pizza/m/3vvONbRCuEF | Poly by Google | CC-BY 3.0 |
| cat.glb | https://poly.pizza/m/6dM1J6f6pm9 | Poly by Google | CC-BY 3.0 |
| elephant.glb | https://poly.pizza/m/a27MA0rXyyj | Poly by Google | CC-BY 3.0 |
| giraffe.glb | https://poly.pizza/m/80w8kwQU0QH | Poly by Google | CC-BY 3.0 |
| lion.glb | https://poly.pizza/m/3XAJojWxSWz | Poly by Google | CC-BY 3.0 |
| tiger.glb | https://poly.pizza/m/5A3w06FXUup | Poly by Google | CC-BY 3.0 |
| monkey.glb | https://poly.pizza/m/6m3diqGPysx | Poly by Google | CC-BY 3.0 |
| panda.glb | https://poly.pizza/m/2T6A0o4Kq2h | Poly by Google | CC-BY 3.0 |
| penguin.glb | https://poly.pizza/m/fBXvsC6pe_V | Poly by Google | CC-BY 3.0 |
| koala.glb | https://poly.pizza/m/fzCu8FM0HfB | Poly by Google | CC-BY 3.0 |
| fox.glb | https://poly.pizza/m/10u8FYPC5Br | Poly by Google | CC-BY 3.0 |
| bear.glb | https://poly.pizza/m/0PXWfxfb0Hu | Poly by Google | CC-BY 3.0 |
| parrot.glb | https://poly.pizza/m/dfNjMLtO0pd | Poly by Google | CC-BY 3.0 |
| fish.glb | https://poly.pizza/m/3GPUntjwqCa | Poly by Google | CC-BY 3.0 |

## Trái cây thêm (poly.pizza)

| File | Nguồn | Tác giả | Giấy phép |
|---|---|---|---|
| kiwi.glb | https://poly.pizza/m/9wlRP9sLbd- | Jarlan Perez | CC-BY 3.0 |
| papaya.glb | https://poly.pizza/m/0yGd5C0sZ12 | Poly by Google | CC-BY 3.0 |
| avocado.glb | https://poly.pizza/m/ZUN3itcCyX | Quaternius | CC0 (Public Domain) |
| coconut.glb | https://poly.pizza/m/fY5jzVAVuCl | Poly by Google | CC-BY 3.0 |
| blueberry.glb | https://poly.pizza/m/ecQMbKzX7Mo | sirkitree | CC-BY 3.0 |
| peach.glb | https://poly.pizza/m/0cVeALx2mxi | jeremy | CC-BY 3.0 |

## Thú cử động thật (`world/*.glb`): Quaternius, CC0 1.0

Dùng cho "thế giới thú" và Sở thú (`src/core/worldAnimals.ts`, `src/ui/AnimatedAnimal.tsx`). Tải 13/11/2026.
Xử lý bằng `node scripts/world-models.mjs` (trong `app/`): bỏ mọi clip không dùng và clip đáng sợ/thua
(Attack, Bite, Headbutt, Death, HitReact/HitRecieve, Out_Of_Water, Punch, Weapon, No; luật UX 3), đổi tên clip
gọn, đặt metalness 0.4 → 0 (không có env map nên kim loại làm model tối), roughness ≥ 0.8, rồi
`gltf-transform optimize --compress meshopt` (giống `npm run model:opt`). Tốc độ neo của clip đo bằng
`node scripts/measure-gait.mjs public/models/world/<id>.glb`. Đã render kiểm tra 13/11/2026
(`e2e/anim.spec.ts`, ảnh `test-results/shots/anim-<khu>.png`). Tất cả nhìn về +Z, đứng trên y = 0.

Nguồn poly.pizza (bản GLB poly.pizza chuyển từ gói Quaternius; trang model ghi "CC0 1.0"), file gốc trong
`assets-src/polypizza-quaternius-animated/` (`SOURCES.json`). Nguồn Ultimate Animated Animals:
https://quaternius.com/packs/ultimateanimatedanimals.html (`assets-src/quaternius-ultimate-animated-animals/glTF/`).

| File | Nguồn | URL | Tác giả | Giấy phép | Tam giác | Clip (tên gọn ← tên gốc) |
|---|---|---|---|---|---|---|
| world/whale.glb | whale.glb | https://poly.pizza/m/JGFwp6xWgk | Quaternius | CC0 1.0 | 447 | Swim |
| world/dolphin.glb | dolphin.glb | https://poly.pizza/m/3LzFgI3GLO | Quaternius | CC0 1.0 | 436 | Swim |
| world/manta.glb | manta.glb (Mantaray) | https://poly.pizza/m/yzD8b7ZHZm | Quaternius | CC0 1.0 | 696 | Swim |
| world/clownfish.glb | clownfish.glb | https://poly.pizza/m/769fHo3eEB | Quaternius | CC0 1.0 | 1528 | Swim ← Swimming_Normal, Run ← Swimming_Fast, Jump ← Swimming_Impulse |
| world/puffer.glb | puffer.glb | https://poly.pizza/m/UKHtgpxTOk | Quaternius | CC0 1.0 | 2138 | Swim, Run, Jump (như cá hề) |
| world/yellow-tang.glb | yellow-tang.glb | https://poly.pizza/m/CrDlkPLon0 | Quaternius | CC0 1.0 | 1336 | Swim, Run, Jump (như cá hề) |
| world/crab.glb | crab-enemy.glb | https://poly.pizza/m/Gs3yfsV5lB | Quaternius | CC0 1.0 | 3592 | Idle, Walk, Jump, Happy ← Dance |
| world/koi.glb | koi.glb | https://poly.pizza/m/qyGtRmhgzl | Quaternius | CC0 1.0 | 1490 | Swim, Run, Jump (như cá hề) |
| world/goldfish.glb | goldfish.glb | https://poly.pizza/m/qS6CgsWFAh | Quaternius | CC0 1.0 | 1586 | Swim, Run, Jump (như cá hề) |
| world/frog.glb | frog-b.glb | https://poly.pizza/m/9Z2V8fpazF | Quaternius | CC0 1.0 | 4920 | Idle ← Frog_Idle, Jump ← Frog_Jump |
| world/raccoon.glb | raccoon.glb | https://poly.pizza/m/xMmx6VQP3r | Quaternius | CC0 1.0 | 2698 | Idle, Walk, Run, Eat ← Idle_Eating, Jump ← Jump_Loop |
| world/horse.glb | horse.glb | https://poly.pizza/m/D3hAeqeDBE | Quaternius | CC0 1.0 | 2244 | Idle, Walk, Run, Eat ← Idle_Eating, Jump ← Jump_Loop |
| world/zebra.glb | zebra.glb | https://poly.pizza/m/iclPBR6SBZ | Quaternius | CC0 1.0 | 1354 | Idle, Walk, Run, Jump |
| world/bee.glb | bee-enemy.glb | https://poly.pizza/m/6HsU6GQt3a | Quaternius | CC0 1.0 | 2996 | Fly ← Flying |
| world/bat.glb | bat.glb | https://poly.pizza/m/hNO9XvjlKa | Quaternius | CC0 1.0 | 1046 | Fly ← Bat_Flying |
| world/pigeon.glb | pigeon.glb | https://poly.pizza/m/9NGlBTpDEr | Quaternius | CC0 1.0 | 2164 | Idle, Walk, Jump, Happy ← Dance (không có clip bay) |
| world/deer.glb | glTF/Deer.gltf | (gói Ultimate Animated Animals) | Quaternius | CC0 1.0 | 2098 | Idle, Walk, Run ← Gallop, Eat ← Eating, Jump ← Jump_toIdle |
| world/stag.glb | glTF/Stag.gltf | (gói Ultimate Animated Animals) | Quaternius | CC0 1.0 | 3670 | Idle, Walk, Run ← Gallop, Eat ← Eating, Jump ← Jump_toIdle |
| world/fox.glb | glTF/Fox.gltf | (gói Ultimate Animated Animals) | Quaternius | CC0 1.0 | 1848 | Idle, Walk, Run ← Gallop, Eat ← Eating, Jump ← Jump_ToIdle |

Tổng tam giác mỗi khu (kể cả đàn cá, model tĩnh Poly dùng lại): đồng cỏ 6874, ao hồ 13568, rừng 12844,
biển 23569, trời 9019 (test `src/core/worldAnimals.test.ts` kiểm ≤ 50k từ file thật).
