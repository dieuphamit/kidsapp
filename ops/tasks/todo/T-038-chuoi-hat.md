---
id: T-038
title: Chuỗi hạt quy luật
type: ui
depends_on:
  - T-033
  - T-034
scope:
  - app/src/games/pattern/**
  - app/e2e/pattern.spec.ts
acceptance:
  - npm run verify
  - Chọn đúng quả tiếp theo → pattern.yay; chọn chưa đúng → quả lăn về, đọc lại chuỗi; ảnh T-038-pattern.png, T-038-level.png
---
## Mục tiêu
Bé nhìn và nghe ra quy luật rồi chọn quả tiếp theo. Mockup: `game-ideas.html` trò 3.

## Chi tiết
- `logic.ts` (thuần, test): mức `'AB' | 'AAB' | 'ABB' | 'ABC'`; `newRound(level, seed)` → `{ shown: string[], answer: string, choices: string[] }`. Chuỗi hiện 5 hạt (mức ABC hiện 6) rồi một ô `?`; 3 lựa chọn gồm đáp án + 2 quả khác (trong đó có một quả đã xuất hiện trong chuỗi). Quả lấy từ thẻ trái cây có sẵn, chỉ những quả khác màu rõ: apple, banana, grapes, orange, pear, strawberry, watermelon. `nextLevel(level, streak)`: đúng 3 ván liên tiếp thì lên AB → AAB → ABB → ABC (ABC là cao nhất). Bé < 36 tháng chỉ dùng AB và AAB.
- `Game.tsx` (2.5D): dây cong trên đồi, hạt tròn 140px chứa ảnh `cards/<id>.png`, ô `?` nét đứt. Khi vào ván: Đậu Đậu đọc chuỗi theo nhịp (`fruit.<id>` từng hạt, cách 600ms, hạt đang đọc nảy lên), rồi `pattern.next`.
- 3 nút lựa chọn 160px phía dưới. Chạm hoặc kéo vào ô `?` đều được. Đúng → hạt bay vào ô, cả chuỗi nhún, `pattern.yay`, 2.5s sau ván mới. Chưa đúng → hạt lăn về, đọc lại chuỗi chậm hơn (800ms/hạt). Không âm sai, không đếm sai.
- Vào game `say('pattern.hello')`. `manifest`: id `pattern`, place `place.orchard`, order 3, titleKey `game.pattern`, icon 📿, color leaf, minAge 30, maxAge 72. `data-testid="game-pattern"`, `data-last-say`, `data-level`; `?e2e=1` có `window.__behocPattern = { answer(): string, pick(id): void }`.

## Kiểm thử
- Unit: mỗi mức sinh chuỗi đúng quy luật; đáp án luôn có trong lựa chọn; lựa chọn không trùng; nextLevel; giới hạn theo tuổi.
- E2E: Vườn quả → Chuỗi hạt (đặt tuổi ≥ 36 tháng); chụp `T-038-pattern.png`; chọn sai → không thành `pattern.yay`; chọn đúng 3 lần → `data-level` đổi; chụp `T-038-level.png`.

## Không làm
Không sửa content/core/ui.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md.
