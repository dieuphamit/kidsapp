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
