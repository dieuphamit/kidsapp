---
id: T-037
title: Ban nhạc thú (vòng lặp 4 nhịp bằng tiếng kêu thật)
type: ui
depends_on:
  - T-033
  - T-034
scope:
  - app/src/games/band/**
  - app/e2e/band.spec.ts
acceptance:
  - npm run verify
  - Vòng lặp 4 nhịp chạy liên tục; nhịp có con vật thì phát animal.<id>-sound; ô trống là nghỉ; ảnh T-037-band.png
  - Có test kéo thật ở viewport 430×932
---
## Mục tiêu
Bé sáng tác nhạc không đúng sai bằng cách đặt con vật lên 4 ô nhịp. Mockup: `game-ideas.html` trò 6.

## Chi tiết
- Sân khấu 2.5D: rèm trên (lilac), bục gỗ, 4 ô nhịp 200px hàng ngang. Khay dưới 6 con vật có tiếng kêu ghi âm thật: cow, chicken, duck, pig, dog, sheep (ảnh `cards/<id>.png`, nút ≥120px).
- `logic.ts` (thuần, test): `type Slots = (string | null)[]` dài 4; `place(slots, i, id)`, `remove(slots, i)`; `beatMs(tempo)` với tempo `'slow' | 'normal' | 'fast'` = 900 / 650 / 450 ms.
- `Game.tsx`: một vòng lặp `setInterval` theo `beatMs`; mỗi nhịp sáng viền `--learn-yellow` ô đang phát, con vật trong ô nhún và `speaker.say('animal.<id>-sound')`. Vòng lặp chỉ chạy khi có ≥1 con vật trên sân khấu. Tiếng kêu dài hơn nhịp: nếu `speaker` không dừng được âm trước thì để chồng và ghi `CÂU HỎI:` trong report, không sửa core.
- Kéo con vật từ khay vào ô (`clientToStage`/`stageRect`); thả vào ô đã có con vật thì thay. Chạm con vật trên sân khấu → về khay. Chạm con vật ở khay (không kéo) → nghe tiếng kêu một lần.
- Nút rùa 🐢 và thỏ 🐇 (≥120px) góc phải trên: chậm (`band.slow`) / nhanh (`band.fast`); chạm lại nút đang chọn thì về bình thường.
- Vào game `say('band.hello')`, sân khấu có sẵn dog ở ô 1 để bé nghe ngay. `manifest`: id `band`, place `place.music`, order 1, titleKey `game.band`, icon 🥁, color lilac, minAge 24, maxAge 72. `data-testid="game-band"`, `data-last-say`, `data-beat` (0–3); `?e2e=1` có `window.__behocBand = { slots(): (string|null)[], put(i, id): void }`.

## Kiểm thử
- Unit: place/remove/thay; beatMs; vòng lặp dừng khi sân khấu trống (fake timers).
- E2E: Nhà âm nhạc → Ban nhạc thú; kéo thật bằng `page.mouse` con bò vào ô 3 → `slots()[2] === 'cow'`; đợi đủ một vòng → `data-last-say` từng là `animal.cow-sound`; chụp `T-037-band.png`. Một test kéo ở 430×932.

## Không làm
Không sửa content/core/ui, không thêm âm thanh mới.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md; CLAUDE.md (tiếng kêu ghi âm thật).
