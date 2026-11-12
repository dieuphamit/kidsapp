---
id: T-041
title: Đường về nhà (đi từng bước, rồi xếp lệnh)
type: ui
depends_on:
  - T-032
  - T-033
  - T-034
scope:
  - app/src/games/path/**
  - app/e2e/path.spec.ts
acceptance:
  - npm run verify
  - Mức 1 chạm ô kề để đi; mức 2 xếp ≤4 mũi tên rồi ▶; đụng cây thì dừng và sáng ô lệnh lỗi; ảnh T-041-step.png, T-041-program.png
attempts: 0
---
## Mục tiêu
Tiền lập trình: bé đưa Đậu Đậu về nhà; mức 2 lập kế hoạch trước rồi chạy, thấy lỗi thì sửa đúng bước đó. Mockup: `game-ideas.html` trò 4.

## Chi tiết
- `logic.ts` (thuần, test): lưới 5×3; `LEVELS` gồm ≥8 bản đồ viết tay (vị trí Đậu Đậu, nhà, cây), đường ngắn nhất 2–4 bước, luôn có đường. `neighbors(pos, map)`; `run(map, start, program)` → `{ path: Pos[], bumpAt: number | null, home: boolean }` (đụng cây hoặc ra ngoài lưới thì dừng, `bumpAt` là chỉ số lệnh lỗi). `levelFor(ageMonths, wins)`: < 48 tháng mức 1, lên mức 2 sau 4 lần về nhà trong phiên; ≥ 48 tháng bắt đầu mức 2.
- `Game.tsx` (2.5D): ô 120px khe 24px (lưới 696×408) trên nền cỏ (`--clay-leaf`); cây vẽ CSS (tán tròn `--scene-leaf` trên thân nâu); nhà vẽ CSS. Đậu Đậu ảnh `cards/daudau.png` trong ô.
- **Mức 1**: ô kề Đậu Đậu (không phải cây) có viền nét đứt nhấp nháy nhẹ; chạm → Đậu Đậu nhảy sang, nói hướng (`path.up/down/left/right`). Chạm ô cây → cây lắc, không nói lỗi.
- **Mức 2**: không có viền gợi ý. Bên phải dải lệnh 4 ô; dưới là 4 nút mũi tên ↑ ↓ ← → và nút ▶ (`ClayButton` ≥120px, khe 24px). Chạm mũi tên → thêm vào ô trống đầu tiên và nói hướng. Chạm ô lệnh → xóa ô đó (các ô sau dồn lên). ▶ → `path.go`, Đậu Đậu đi từng bước 500ms, ô lệnh đang chạy sáng, nói hướng. Đụng cây → dừng, Đậu Đậu gãi đầu, ô lệnh lỗi nháy `--learn-yellow`, `path.bump`, Đậu Đậu về ô xuất phát sau 1.5s, dải lệnh giữ nguyên để bé sửa.
- Về nhà → `path.home`, nhà sáng, 2.5s sau bản đồ mới.
- Vào game `say('path.hello')`. `manifest`: id `path`, place `place.puzzle`, order 2, titleKey `game.path`, icon 🗺️, color mint, minAge 36, maxAge 72. `data-testid="game-path"`, `data-last-say`, `data-mode` (`step`|`program`); `?e2e=1&path=program` ép mức 2, và `window.__behocPath = { solution(): string[], tapDir(dir): void }`.

## Kiểm thử
- Unit: mọi LEVELS có đường; run (về nhà, đụng cây, ra ngoài lưới, chương trình ngắn hơn đường); levelFor.
- E2E (đặt tuổi ≥ 36 tháng): Góc đố → Đường về nhà (mức 1): chạm ô kề theo `solution()` tới nhà → `path.home`; chụp `T-041-step.png`. `?e2e=1&path=program`: xếp lệnh có đụng cây → `path.bump`, sửa ô lỗi rồi ▶ → `path.home`; chụp `T-041-program.png`. Chạy thêm một test ở viewport 430×932.

## Không làm
Không sửa content/core/ui. Không làm bản 3D.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md.
