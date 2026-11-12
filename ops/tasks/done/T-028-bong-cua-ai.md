---
id: T-028
title: Bóng của ai? (kéo thú vào bóng)
type: ui
depends_on:
  - T-020
  - T-022
  - T-023
scope:
  - app/src/games/shadow/**
  - app/e2e/shadow.spec.ts
acceptance:
  - npm run verify
  - Kéo đúng thẻ vào bóng → hút vào, animal.<id> rồi ui.great; sai → trôi về; ảnh T-028-shadow.png, T-028-done.png
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Ghép hình với bóng — luyện quan sát hình dạng (kỹ năng ghép cặp kiểu Montessori).

## Chi tiết
- `logic.ts` (thuần, test): `newRound(choiceCount, seed)`; `dropResult(draggedId, answerId, dist, radius)` → `'snap' | 'wrong' | 'none'`. 2 lựa chọn nếu < 36 tháng, 3 nếu ≥ 36. Chỉ chọn thú có dáng khác nhau rõ: elephant, giraffe, penguin, parrot, fish, horse, duck, sheep, monkey, chicken.
- `Game.tsx` (2D): trên giữa là cái bóng: ảnh card với CSS `filter: brightness(0) opacity(0.35)` cỡ ≥ 260px trên nền đồi cỏ; dưới là các thẻ (≥ 180px) để kéo. Kéo bằng pointer events có `setPointerCapture`, thẻ to lên 1.1 khi kéo. Thả trong bán kính → hút vào bóng, bóng hiện màu, `say('animal.<id>')`, 900ms sau `say('ui.great')`, 2.5s sau ván mới. Sai: trôi về 500ms, không âm báo sai. Chạm (không kéo) một thẻ: đọc tên thẻ đó.
- Vào game `say('shadow.hello')`. `manifest`: id `shadow`, place `place.zoo`, titleKey `game.shadow`, icon 👤, order 2, minAge 28, maxAge 72. `data-testid="game-shadow"`, `data-last-say`; `?e2e=1` có `window.__behocShadow = { answer(): string, drop(id: string): void }`.

## Kiểm thử
- Unit: dropResult, số lựa chọn, không trùng.
- E2E: Sở thú → Bóng của ai?; chụp `T-028-shadow.png`; thả sai → không thành ui.great; thả đúng → `ui.great`; chụp `T-028-done.png`. Một lần kéo thật bằng `page.mouse` từ thẻ đúng vào bóng.

## Không làm
Không sửa content/core.
