---
id: T-026
title: Ú òa (tìm bạn thú trốn sau bụi)
type: ui
depends_on: [T-020, T-022, T-023]
scope:
  - app/src/games/peekaboo/**
  - app/e2e/peekaboo.spec.ts
acceptance:
  - npm run verify
  - "Chạm bụi có thú → peek.found rồi animal.<id>; chạm bụi trống → peek.empty; ảnh T-026-bushes.png, T-026-found.png"
attempts: 0
---
## Mục tiêu
Trò trốn tìm: bé chạm bụi cây để tìm bạn thú đang trốn. Luyện "vật vẫn còn khi bị che".

## Chi tiết
- `logic.ts` (thuần, test): `newRound(bushCount, seed, prevId)` chọn 1 thú (cards farm + wild, khác ván trước) và vị trí bụi; `tap(state, i)` → `'empty' | 'found'`. Số bụi: 3 nếu ageMonths < 36, 4 nếu 36–47, 5 nếu ≥ 48.
- `Game.tsx` (2.5D CSS): đồng cỏ, bụi tròn đất sét `--clay-leaf` to (≥ 200px) xếp hàng ngang hơi so le; 2 ván đầu, tai/đuôi thú lấp ló sau bụi (ảnh card đặt sau bụi lộ ~15%) làm gợi ý; sau đó bỏ gợi ý. Bụi có thú rung nhẹ mỗi 3s.
- Chạm bụi trống: bụi lắc 400ms, `say('peek.empty')`. Chạm đúng: bụi tách sang hai bên, thú nhảy lên nảy, `say('peek.found')` rồi 900ms sau `say('animal.<id>')`; 2.5s sau ván mới.
- Vào game `say('peek.hello')`. `manifest`: id `peekaboo`, place `place.zoo`, titleKey `game.peekaboo`, icon 🌳, order 1, minAge 24, maxAge 60. `data-testid="game-peekaboo"`, `data-last-say`; khi `?e2e=1` có `window.__behocPeek = { answer(): number }`.

## Kiểm thử
- Unit: số bụi theo tuổi, tap đúng/sai, thú khác ván trước.
- E2E: vào Sở thú → Ú òa; chụp `T-026-bushes.png`; chạm 1 bụi trống → `peek.empty`; chạm bụi đúng → `peek.found`, sau 1.2s `animal.<id>`; chụp `T-026-found.png`. Mọi bụi ≥120px.

## Không làm
Không đếm giờ, không thua, không sửa content/core.
