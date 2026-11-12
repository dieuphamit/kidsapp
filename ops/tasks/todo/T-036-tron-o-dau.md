---
id: T-036
title: Đậu Đậu trốn ở đâu? (giới từ)
type: ui
depends_on:
  - T-032
  - T-033
  - T-034
scope:
  - app/src/games/hide/**
  - app/e2e/hide.spec.ts
acceptance:
  - npm run verify
  - Thả Đậu Đậu vào vùng nào thì nói đúng câu hide.<prep>-<obj> của vùng đó; ảnh T-036-room.png, T-036-ask.png
  - Có test kéo thật ở viewport 430×932
---
## Mục tiêu
Bé kéo Đậu Đậu đi trốn trong phòng và nghe câu đầy đủ có giới từ: "Đậu Đậu ở dưới cái bàn!". Mockup: `game-ideas.html` trò 1.

## Chi tiết
- 3 phòng, mỗi phòng 3 đồ vật vẽ bằng CSS (2.5D, màu token): phòng khách (table, box, bed), bếp (chair, pot, basket), vườn (tree, bucket, car). Giới từ hợp lệ theo bảng trong T-033. Mỗi cặp (prep, obj) là một vùng thả hình chữ nhật trong khung (vùng `on` nằm trên mặt vật, `under` dưới gầm, `in` trong lòng vật, `beside` sát bên phải hoặc trái). Vùng thả đủ lớn (≥160×120).
- `logic.ts` (thuần, test): `ROOMS`, `zoneAt(point, zones)` → `{prep,obj} | null` (ưu tiên vùng nhỏ nhất chứa điểm), `nextAsk(room, seed, last)` chọn một cặp khác lần trước.
- `Game.tsx`: Đậu Đậu ảnh `cards/daudau.png` 160px, kéo bằng pointer events + `setPointerCapture`, toạ độ qua `clientToStage`/`stageRect`. Thả trong vùng → Đậu Đậu nằm vào vị trí đó (có thể nhỏ lại 0.8 khi `in`, nằm sau mép vật), `say('hide.<prep>-<obj>')`. Thả ngoài mọi vùng → nằm ở đó, chỉ có tiếng "bụp" nhẹ của synth.
- Hai chế độ tự đổi: 3 lần thả đầu tiên của phòng là chơi tự do; sau đó Đậu Đậu nhờ `hide.ask-<prep>-<obj>`. Thả đúng → `hide.yay`, Đậu Đậu nhún; sau 3 lần đúng chuyển phòng kế tiếp (phòng 3 xong quay về phòng 1). Thả chỗ khác → nói câu vị trí thật, 1.2s sau nhắc lại câu nhờ. Không âm sai.
- Bé < 36 tháng: chỉ hỏi `on`, `in`, `under`.
- Vào game `say('hide.hello')`. `manifest`: id `hide`, place `place.house`, order 0, titleKey `game.hide`, icon 📦, color butter, minAge 24, maxAge 72. `data-testid="game-hide"`, `data-last-say`; `?e2e=1` có `window.__behocHide = { zones(): {prep,obj,x,y}[], drop(prep, obj): void, ask(): string | null }`.

## Kiểm thử
- Unit: zoneAt (điểm trong/ngoài, vùng chồng nhau), nextAsk không lặp, bộ hỏi theo tuổi.
- E2E: Nhà Đậu Đậu → Trốn ở đâu; kéo thật bằng `page.mouse` Đậu Đậu xuống gầm bàn → `data-last-say` = `hide.under-table`; chụp `T-036-room.png`. Dùng hook cho đủ 3 lần thả tự do, rồi kiểm có câu nhờ; chụp `T-036-ask.png`. Một test kéo ở viewport 430×932.

## Không làm
Không sửa content/core/ui.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md; T-028 (mẫu kéo thả).
