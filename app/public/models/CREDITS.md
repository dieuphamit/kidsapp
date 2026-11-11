| elephant.glb | kenney-cube-pets/Models/GLB format/animal-elephant.glb | Kenney | 676 | — (60 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| giraffe.glb | kenney-cube-pets/Models/GLB format/animal-giraffe.glb | Kenney | 598 | — (53 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| lion.glb | kenney-cube-pets/Models/GLB format/animal-lion.glb | Kenney | 883 | — (64 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| tiger.glb | kenney-cube-pets/Models/GLB format/animal-tiger.glb | Kenney | 945 | — (63 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| monkey.glb | kenney-cube-pets/Models/GLB format/animal-monkey.glb | Kenney | 910 | — (64 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| panda.glb | kenney-cube-pets/Models/GLB format/animal-panda.glb | Kenney | 734 | — (53 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| penguin.glb | kenney-cube-pets/Models/GLB format/animal-penguin.glb | Kenney | 558 | — (53 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| koala.glb | kenney-cube-pets/Models/GLB format/animal-koala.glb | Kenney | 594 | — (53 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| fox.glb | kenney-cube-pets/Models/GLB format/animal-fox.glb | Kenney | 568 | — (58 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| bear.glb | kenney-cube-pets/Models/GLB format/animal-polar.glb | Kenney | 522 | — (47 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| parrot.glb | kenney-cube-pets/Models/GLB format/animal-parrot.glb | Kenney | 530 | — (63 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| fish.glb | kenney-cube-pets/Models/GLB format/animal-fish.glb | Kenney | 414 | — (43 KB) | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
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
| `cat.glb` | `kenney-cube-pets/Models/GLB format/animal-cat.glb` | Kenney | 678 | 1.71 | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |
| `chicken.glb` | `kenney-cube-pets/Models/GLB format/animal-chick.glb` (gà con) | Kenney | 490 | 1.61 | như trên |
| `cow.glb` | `kenney-cube-pets/Models/GLB format/animal-cow.glb` | Kenney | 578 | 1.63 | như trên |
| `dog.glb` | `kenney-cube-pets/Models/GLB format/animal-dog.glb` | Kenney | 490 | 1.60 | như trên |
| `pig.glb` | `kenney-cube-pets/Models/GLB format/animal-pig.glb` | Kenney | 424 | 1.60 | như trên |
| `rabbit.glb` | `kenney-cube-pets/Models/GLB format/animal-bunny.glb` | Kenney | 575 | 2.02 | như trên |
| `duck.glb` | `polypizza-cc0/ducky-IsaLousberg.glb` (https://poly.pizza/m/gt2eYOyOvU) | Isa Lousberg | 604 | 0.40 | không có (model tĩnh, cho nhún/xoay trong app) |
| `sheep.glb` | `polypizza-cc0/sheep-Quaternius-2.glb` (https://poly.pizza/m/rgJXF570ZK) | Quaternius | 2,148 | 1.58 | Death, Headbutt, Idle, Idle_Eating, Jump_Loop, Jump_Start, Run, Walk |
| `horse.glb` | `quaternius-ultimate-animated-animals/glTF/Horse.gltf` (Ultimate Animated Animals) | Quaternius | 2,179 | 4.84 | Attack_Headbutt, Attack_Kick, Death, Eating, Gallop, Gallop_Jump, Idle, Idle_2, Idle_Headlow, Idle_HitReact1, Idle_HitReact2, Jump_toIdle, Walk |

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
