---
id: T-027
title: Ai kêu đấy? (nghe và chọn)
type: ui
depends_on:
  - T-020
  - T-022
  - T-023
scope:
  - app/src/games/sound-quiz/**
  - app/e2e/sound-quiz.spec.ts
acceptance:
  - npm run verify
  - Nghe animal.<id>-sound, chạm đúng thẻ → ui.great; chạm sai → quiz.again và đọc lại tiếng kêu; ảnh T-027-quiz.png
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Bé nghe tiếng kêu và chọn đúng bạn thú — luyện nghe và từ vựng.

## Chi tiết
- `logic.ts` (thuần, test): `newQuestion(choiceCount, seed, prevId)` chọn đáp án trong 8 thú trang trại `cow chicken duck pig dog sheep horse rabbit` + đáp án nhiễu khác nhau, không lặp đáp án ván trước. `choiceCount` = 2 nếu ageMonths < 36, 3 nếu ≥ 36.
- `Game.tsx` (2D): trên cùng là một nút loa to (ClayButton ≥160px, icon 🔊) để nghe lại; hàng thẻ ảnh (`cards/<id>.png` trên nền thẻ đất sét, ≥ 220px) giữa màn hình.
- Bắt đầu: `say('quiz.hello')` (chỉ câu đầu) rồi `say('animal.<id>-sound')`. Chạm đúng: thẻ nảy + lấp lánh, `say('animal.<id>')` rồi `say('ui.great')`, 2s sau câu mới. Chạm sai: thẻ lắc nhẹ (không màu đỏ, không âm báo sai), `say('quiz.again')` rồi đọc lại tiếng kêu. Nút loa: đọc lại tiếng kêu.
- `manifest`: id `sound-quiz`, place `place.farm`, titleKey `game.sound-quiz`, icon 🔊, order 1, minAge 24, maxAge 72. `data-testid="game-sound-quiz"`, `data-last-say`; `?e2e=1` có `window.__behocQuiz = { answer(): string }`.

## Kiểm thử
- Unit: số lựa chọn theo tuổi, đáp án có trong lựa chọn, không trùng, không lặp ván trước.
- E2E: Trang trại → picker → Ai kêu đấy?; chụp `T-027-quiz.png`; chạm thẻ sai → `quiz.again` rồi `-sound`; chạm đúng → `ui.great`. Thẻ ≥120px.

## Không làm
Không điểm, không thua, không sửa content/core.
