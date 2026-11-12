---
id: T-039
title: Chuyện ba tranh (xếp trình tự, kể lại)
type: ui
depends_on:
  - T-032
  - T-033
  - T-034
scope:
  - app/src/games/story/**
  - app/e2e/story.spec.ts
acceptance:
  - npm run verify
  - Xếp đúng 3 tranh → đọc lại story.<id>-1..3 liên tiếp rồi story.done; thả sai ô → tranh trôi về; ảnh T-039-story.png, T-039-done.png
  - Có test kéo thật ở viewport 430×932
---
## Mục tiêu
Bé xếp tranh theo thứ tự và nghe Đậu Đậu kể chuyện bằng "đầu tiên, tiếp theo, cuối cùng". Mockup: `game-ideas.html` trò 2.

## Chi tiết
- Chuyện: plant, chick, butterfly, frog, banana, rain; ảnh `cards/story/<id>-<n>.png` (T-032).
- `logic.ts` (thuần, test): `STORIES`; `newRound(seed, last, ageMonths)` chọn chuyện khác lần trước; `canDrop(slotIndex, cardStep, filled)` → đúng khi `cardStep === slotIndex + 1` và các ô trước đã đầy.
- `Game.tsx` (2D): 3 ô 260px hàng ngang, dưới mỗi ô 1/2/3 chấm (không dùng chữ số), mũi tên mờ giữa các ô. Ô 1 có sẵn tranh 1, Đậu Đậu đọc `story.<id>-1` rồi `story.next`. Khay dưới chứa các tranh còn lại xáo trộn, nghiêng nhẹ, 240px.
- Kéo tranh vào ô (`clientToStage`/`stageRect`). `canDrop` đúng → tranh hút vào, `say('story.<id>-<n>')`, sau đó `story.next` nếu còn ô. Sai → tranh trôi về khay trong 500ms, Đậu Đậu nói lại câu của ô trước rồi `story.next`. Chạm (không kéo) một tranh ở khay: tranh phóng to 1.1 trong 300ms, không nói đáp án.
- Đủ ô: các tranh lần lượt sáng và nảy theo câu `story.<id>-1..3` (chờ hết câu trước), rồi `story.done`; 3s sau chuyện mới.
- Bé < 36 tháng: chỉ 2 tranh (bước 1 và 3), 2 ô; câu đọc là `-1` và `-3`.
- Vào game `say('story.hello')`. `manifest`: id `story`, place `place.house`, order 1, titleKey `game.story`, icon 📖, color butter, minAge 30, maxAge 72. `data-testid="game-story"`, `data-last-say`; `?e2e=1` có `window.__behocStory = { story(): string, drop(step: number): void }`.

## Kiểm thử
- Unit: canDrop, newRound không lặp, bản 2 tranh theo tuổi.
- E2E (đặt tuổi ≥ 36 tháng): Nhà Đậu Đậu → Chuyện ba tranh; chụp `T-039-story.png`; thả tranh 3 vào ô 2 → trôi về; kéo thật tranh 2 vào ô 2, rồi tranh 3 → `data-last-say` cuối là `story.done`; chụp `T-039-done.png`. Một test kéo ở 430×932.

## Không làm
Không sửa content/core/ui.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md.
