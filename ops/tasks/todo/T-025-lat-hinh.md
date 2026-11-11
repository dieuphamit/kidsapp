---
id: T-025
title: Lật hình (trí nhớ)
type: ui
depends_on: [T-020, T-022, T-023]
scope:
  - app/src/games/memory/**
  - app/e2e/memory.spec.ts
acceptance:
  - npm run verify
  - "Ván 2 cặp: lật 2 thẻ trùng → memory.match; lật hết → memory.done; ảnh T-025-preview.png, T-025-play.png, T-025-6pairs.png"
attempts: 0
---
## Mục tiêu
Trò lật hai hình giống nhau cho bé 2–3 tuổi, tăng độ khó rất từ từ.

## Chi tiết
- `logic.ts` (thuần, có test): `newRound(level, seed)`; level → số cặp: 1→2, 2→3, 3→4, 4→6. Hình lấy từ `public/cards/index.json` (farm + fruit; thêm wild ở level ≥3), trộn có seed. `flip(state, i)`: không lật thẻ đang ngửa/đã ghép, tối đa 2 thẻ ngửa chưa xử lý; trả `'first' | 'match' | 'nomatch'`. `isDone`. Tiến cấp: thắng 2 ván liên tiếp ở cấp hiện tại thì +1 (tối đa 4); `startLevel(ageMonths)` = 1 nếu < 36 tháng, 2 nếu ≥ 36. Lưu cấp bằng `idb-keyval` key `memory.level`.
- `Game.tsx` (2D, CSS): lưới thẻ căn giữa (2 cặp: 2×2; 3 cặp: 3×2; 4 cặp: 4×2; 6 cặp: 4×3), thẻ vuông bo tròn kiểu đất sét (`--shadow-clay`), mặt úp màu `--clay-lilac` có hình chân mèo nhỏ, mặt ngửa nền kem với ảnh `cards/<id>.png` (dùng `import.meta.env.BASE_URL`). Thẻ ≥ 160px khi ≤ 4 cặp, ≥ 130px khi 6 cặp, khe ≥24px. Lật bằng CSS 3D `rotateY` 350ms.
- Lần đầu chơi một cấp: cho xem ngửa tất cả 2s rồi úp. Vào game `say('memory.hello')`.
- Lật thẻ: phản hồi trong 100ms, đọc tên (`animal.<id>` hoặc `fruit.<id>`). Trùng: hai thẻ nảy + lấp lánh, `say('memory.match')`, giữ ngửa. Không trùng: chờ 1.2s rồi úp lại, không âm báo sai. Xong ván: sao bay + `say('memory.done')`, 3s sau ván mới.
- `manifest.ts`: id `memory`, place `place.house`, titleKey `game.memory`, icon 🃏, order 0, minAge 24, maxAge 72. `data-testid="game-memory"`, `data-last-say`, `data-level`; khi `?e2e=1` có `window.__behocMemory = { reveal(): string[] }` trả id theo vị trí.

## Kiểm thử
- Unit `logic.test.ts`: số thẻ theo cấp, mỗi id đúng 2 lần, flip trùng/không trùng, không lật quá 2, tiến cấp sau 2 thắng, startLevel theo tuổi.
- E2E: vào Nhà Đậu Đậu → Lật hình; chụp `T-025-preview.png` lúc đang xem ngửa; chờ úp, lật 1 cặp đúng (dùng `__behocMemory.reveal()`) → `memory.match`; chụp `T-025-play.png`; lật hết → `memory.done`. Đặt `memory.level`=4 qua idb trước khi vào → 12 thẻ, chụp `T-025-6pairs.png`, mọi thẻ ≥130px, nằm trong khung.

## Không làm
Không đếm giờ, không điểm, không thua. Không sửa content/core.
