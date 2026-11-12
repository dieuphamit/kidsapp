---
id: T-040
title: Tiệm bánh Đậu Đậu (trang trí bánh, chơi mở)
type: ui
depends_on:
  - T-032
  - T-033
  - T-034
scope:
  - app/src/games/bakery/**
  - app/e2e/bakery.spec.ts
acceptance:
  - npm run verify
  - Thả topping lên bánh → nằm đúng chỗ thả, nói topping.<id>; rung chuông → khách khen theo bánh; ảnh T-040-bakery.png, T-040-served.png
  - Có test kéo thật ở viewport 430×932
---
## Mục tiêu
Bé tự trang trí bánh cho bạn thú, không có đáp án; nghe tên kèm tính từ và đếm. Mockup: `game-ideas.html` trò 5.

## Chi tiết
- Cảnh 2.5D: quầy (peach), đĩa, bánh 2 tầng vẽ CSS (tầng dưới peach, tầng trên butter). Kệ trái 6 topping, 2 cột (≥120px, khe 24px): strawberry, cherries, blueberry, kiwi (ảnh `cards/<id>.png`), candle, chocolate (ảnh `cards/extra/<id>.png`, T-032). Khách bên phải: một bạn thú ngẫu nhiên từ thẻ con vật (`cards/<id>.png`, 240px). Nút chuông 🛎️ (≥120px, nền `--learn-green`) góc phải dưới.
- `logic.ts` (thuần, test): `addTopping(list, id, x, y)` (tối đa 20, quá thì bỏ cái cũ nhất); `onCake(point, cakeRect)`; `praiseKey(list)` → `bakery.yum-candle` nếu có nến, else `bakery.yum-fruit` nếu ≥3 quả, else `bakery.yum`; `countSame(list, id)`.
- Kéo topping thả lên bánh: dính đúng chỗ thả (toạ độ trong khung bánh qua `stageRect`), `say('topping.<id>')`; từ cái thứ 2 cùng loại, 700ms sau nói số (`number.<n>`, n ≤ 10). Thả ngoài bánh → trôi về kệ, không nói. Chạm topping trên bánh → bỏ ra.
- Rung chuông (khi bánh có ≥1 topping): khách tiến lại, bánh thu nhỏ biến mất kiểu "ăn", `say(praiseKey)`, 1.5s sau `bakery.ask` (câu hỏi mở cho bố mẹ), 3s sau khách mới, bánh trống. Bánh trống mà rung chuông → nói lại `bakery.order`.
- Vào game `say('bakery.hello')`; khi khách đến `say('animal.<id>')` rồi `bakery.order`. `manifest`: id `bakery`, place `place.house`, order 2, titleKey `game.bakery`, icon 🎂, color butter, minAge 24, maxAge 72. `data-testid="game-bakery"`, `data-last-say`; `?e2e=1` có `window.__behocBakery = { toppings(): {id,x,y}[], add(id): void, serve(): void }`.

## Kiểm thử
- Unit: addTopping giới hạn 20, praiseKey các nhánh, onCake, countSame.
- E2E: Nhà Đậu Đậu → Tiệm bánh; kéo thật dâu tây lên bánh → `topping.strawberry`; thêm nến bằng hook; chụp `T-040-bakery.png`; rung chuông → `bakery.yum-candle`; chụp `T-040-served.png`. Một test kéo ở 430×932.

## Không làm
Không sửa content/core/ui.

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md.
