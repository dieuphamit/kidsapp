---
id: T-013
title: Game Đếm quả
type: ui
depends_on:
  - T-005
  - T-010
scope:
  - app/src/games/counting/**
  - app/e2e/counting.spec.ts
acceptance:
  - npm run verify
  - Chạm lần lượt 10 quả thì nghe number.1 … number.10 rồi count.done, quả rơi vào giỏ
  - Có ảnh app/test-results/shots/T-013-tree.png và T-013-basket.png
attempts: 0
---
## Mục tiêu
Bé vào Vườn quả: một cây đất sét to tròn có 10 quả táo. Bé chạm quả nào thì quả đó rơi lộp bộp xuống chiếc giỏ dưới gốc cây và Đậu Đậu đếm "Một!", "Hai!"… Hái đủ 10 quả thì Đậu Đậu khen "Mười quả! Bé đếm giỏi quá!", sao lấp lánh bay lên, rồi cây mọc quả mới.

## Chi tiết
- `app/src/games/counting/manifest.ts`: `{ id: 'counting', title: { vi: 'Đếm số', ja: 'かず' }, place: 'place.orchard', icon: '🍎', color: 'leaf', minAge: 24, maxAge: 72, Component: lazy(() => import('./Game')) }` (minAge 24 để bé 28 tháng dùng được, mặc định cài đặt là 28).
- `app/src/games/counting/logic.ts` (thuần, có test): `type State = { picked: number[]; done: boolean }`; `pick(state, fruitId)` thêm id nếu chưa hái, trả `{ state, count }` (count = số đã hái sau lần này, hoặc `null` nếu quả đã hái rồi); `done` khi đủ 10; `reset()`.
- `app/src/games/counting/Game.tsx` (2.5D, chỉ CSS, không dùng Scene3D) + `Game.module.css`:
  - Gốc `<div data-testid="game-counting" data-last-say={...}>`, nền gradient trời + đồi cỏ `--grass`.
  - Cây: thân bo tròn màu nâu ấm (được phép pha từ `--clay-peach`/`--ink` bằng `color-mix`, không thêm mã màu mới), tán là khối lớn `--clay-leaf` bo tròn với `--shadow-clay`, chiếm ~60% bề ngang phía trên.
  - 10 quả: mỗi quả là `ClayButton` `color="peach"` `size={120}`, `label` là "Quả 1" … "Quả 10", với `style={{ borderRadius: '50%' }}` và con là `🍎` cỡ ~64px; xếp 2 hàng × 5 trong tán, khe ≥24px (5×120 + 4×24 = 696px). Hơi lệch y ngẫu nhiên cố định cho tự nhiên.
  - Giỏ: khối `--clay-butter` bo tròn dưới gốc, có vân đan bằng `repeating-linear-gradient` nhẹ; quả đã hái hiện xếp chồng trong giỏ (chỉ trang trí, không phải nút). Cạnh giỏ là số đếm hiện tại cỡ chữ lớn (trang trí, `aria-hidden`).
  - Chạm quả (ClayButton gọi ở pointerdown): `pick`; nếu `count` khác `null` thì quả bay rơi vào giỏ (CSS transform 600ms, đường cong `--ease-squish`, nảy nhẹ khi chạm giỏ), sau đó gỡ khỏi cây; `say('number.' + count)`. Khi `done`: 1200ms sau `say('count.done')`, sao trang trí bay lên (CSS), 4s sau `reset()` và 10 quả "mọc" lại bằng animation phóng to từ 0.
  - Vào game gọi `say('count.hello')`. `say(key)` = `speaker.say(key)` + ghi `data-last-say`.
  - `<BackHome onExit={onExit} />` (góc trên trái); tán cây không đè lên nút này hay vùng cổng phụ huynh góc trên phải.

## Kiểm thử
- Unit `app/src/games/counting/logic.test.ts`: hái 3 quả khác nhau → count 1, 2, 3; hái lại quả đã hái → `null`, count không tăng; đủ 10 → `done`; `reset` về 0. Kiểm thêm `number.1`…`number.10`, `count.hello`, `count.done` có trong `contentByKey()`.
- E2E `app/e2e/counting.spec.ts`:
  - `goto('./')`, chạm "Vườn quả" → `getByTestId('game-counting')` hiện; đợi 600ms, chụp `test-results/shots/T-013-tree.png`.
  - 10 nút `Quả 1`…`Quả 10` đều ≥120×120.
  - Chạm "Quả 3" → `data-last-say="number.1"`; chạm "Quả 7" → `"number.2"`. Chụp `test-results/shots/T-013-basket.png` (giỏ có 2 quả).
  - Chạm nốt 8 quả còn lại (đợi ~150ms giữa các lần) → `data-last-say="number.10"`, sau 1.5s → `"count.done"`.
  - Nút "Về nhà" → `getByTestId('home')` hiện.

## Không làm
- Không 3D, không sửa `src/core`, `src/ui`, content.
- Không có câu hỏi "có mấy quả?", không điểm số, không bắt hái theo thứ tự.

## Tham khảo
- Spec mục 6 (Đếm 1–10, 2.5D); CLAUDE.md luật UX 1–3.
