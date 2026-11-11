---
id: T-029
title: Xếp quả theo màu
type: ui
depends_on: [T-020, T-022, T-023]
scope:
  - app/src/games/sort/**
  - app/e2e/sort.spec.ts
acceptance:
  - npm run verify
  - "Kéo quả vào giỏ đúng màu → fruit.<id>-color; sai → trôi về; xếp hết → sort.done; ảnh T-029-sort.png, T-029-done.png"
attempts: 0
---
## Mục tiêu
Phân loại theo màu — nền tảng tư duy toán cho bé 2–3 tuổi.

## Chi tiết
- Màu: đỏ = apple, cherries, strawberry; vàng = banana, lemon, pineapple; xanh lá = pear, watermelon.
- `logic.ts` (thuần, test): `newRound(basketCount, seed)` → giỏ (2: đỏ+vàng nếu < 36 tháng; 3: thêm xanh lá nếu ≥ 36) và 4–6 quả của các màu đó (mỗi giỏ ≥ 2 quả); `drop(state, fruitIdx, basketColor)` → `'ok' | 'wrong'`; `isDone`.
- `Game.tsx` (2.5D CSS): nền vườn; giỏ đất sét to (≥ 240px rộng) ở dưới, mỗi giỏ có viền màu và một quả mẫu cùng màu in mờ làm gợi ý; quả (`cards/<id>.png`, ≥ 140px) rải phía trên. Kéo thả bằng pointer events có `setPointerCapture`. Thả vào giỏ đúng: quả rơi vào, giỏ nảy, `say('fruit.<id>-color')`. Sai: trôi về, không âm báo sai. Chạm (không kéo): `say('fruit.<id>')`. Hết quả: `say('sort.done')`, sao bay, 3s sau ván mới.
- Vào game `say('sort.hello')`. `manifest`: id `sort`, place `place.orchard`, titleKey `game.sort`, icon 🧺, order 1, minAge 24, maxAge 72. `data-testid="game-sort"`, `data-last-say`; `?e2e=1` có `window.__behocSort = { fruits(): {id:string,color:string}[], drop(i:number,color:string):void }`.

## Kiểm thử
- Unit: số giỏ theo tuổi, mỗi giỏ ≥2 quả, drop đúng/sai, done.
- E2E: Vườn quả → picker → Xếp quả; chụp `T-029-sort.png`; thả sai → không đổi; thả đúng hết → `sort.done`; chụp `T-029-done.png`; một lần kéo thật bằng `page.mouse`.

## Không làm
Không sửa content/core, không sửa game counting.
