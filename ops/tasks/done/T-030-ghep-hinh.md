---
id: T-030
title: Ghép hình 2–4 mảnh
type: ui
depends_on:
  - T-020
  - T-022
  - T-023
scope:
  - app/src/games/puzzle/**
  - app/e2e/puzzle.spec.ts
acceptance:
  - npm run verify
  - Ghép đủ mảnh → puzzle.done rồi tên hình; ảnh T-030-start.png, T-030-done.png
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Ghép hình đơn giản cho bé 2 tuổi: ảnh một bạn thú hoặc quả cắt 2 mảnh, rồi tăng dần.

## Chi tiết
- `logic.ts` (thuần, test): `newPuzzle(pieceCount, seed)` chọn ảnh card; số mảnh tăng trong phiên: 2 (cắt dọc) → 3 (cắt dọc) → 4 (2×2) sau mỗi 2 ván xong; bắt đầu 2 nếu ageMonths < 42, 3 nếu ≥ 42. `snap(pieceIdx, x, y)` → true nếu cách đúng chỗ < 18% cạnh khung.
- `Game.tsx` (2D): khung ghép giữa màn hình (≥ 360px) có ảnh mờ 20% làm gợi ý và viền đất sét; các mảnh (cắt bằng `background-image` + `background-position`/`background-size` từ cùng ảnh card, viền trắng, bóng đất sét) đặt rải hai bên. Kéo bằng pointer events; gần đúng chỗ thì hút vào; sai chỗ thì nằm yên chỗ thả, không âm báo sai. Đủ mảnh: ảnh liền lại, nảy, `say('puzzle.done')` rồi tên (`animal.<id>` hoặc `fruit.<id>`), 3s sau ván mới.
- Vào game `say('puzzle.hello')`. `manifest`: id `puzzle`, place `place.house`, titleKey `game.puzzle`, icon 🧩, order 1, minAge 24, maxAge 72. `data-testid="game-puzzle"`, `data-last-say`; `?e2e=1` có `window.__behocPuzzle = { solveOne(): void }`.

## Kiểm thử
- Unit: số mảnh, snap trong/ngoài ngưỡng, done.
- E2E: Nhà Đậu Đậu → Ghép hình; chụp `T-030-start.png`; một lần kéo thật mảnh 1 vào đúng chỗ bằng `page.mouse` → mảnh hút vào; `solveOne` hết → `puzzle.done`; chụp `T-030-done.png`. Mảnh ≥120px.

## Không làm
Không xoay mảnh, không đếm giờ, không sửa content/core.
