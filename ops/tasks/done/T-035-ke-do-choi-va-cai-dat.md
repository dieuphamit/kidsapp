---
id: T-035
title: Menu kiểu kệ đồ chơi và lựa chọn kiểu menu trong cài đặt
type: ui
depends_on:
  - T-034
scope:
  - app/src/ui/ShelfMenu.tsx
  - app/src/ui/ShelfMenu.module.css
  - app/src/ui/ShelfMenu.test.tsx
  - app/src/ui/ParentArea.tsx
  - app/src/ui/ParentArea.test.tsx
  - app/src/ui/screens.module.css
  - app/src/core/settings.ts
  - app/src/core/settings.test.ts
  - app/src/App.tsx
  - app/e2e/shelf.spec.ts
acceptance:
  - npm run verify
  - Settings có menuStyle 'map' | 'shelf', mặc định 'map'; bản lưu cũ không có trường này vẫn chạy (ra 'map')
  - Khu bố mẹ đổi kiểu menu ngay khi chạm, không cần bấm Lưu
  - Kệ hiện mọi trò hợp tuổi, thẻ ≥132px, khe ≥24px, trong khung; ảnh T-035-shelf.png, T-035-settings.png
attempts: 1
last_error: npm run verify thất bại
---
## Mục tiêu
Bố mẹ chọn được kiểu menu: bản đồ 5 khu (mặc định) hoặc kệ đồ chơi một màn (một chạm vào bất kỳ trò nào). Mockup: `.superpowers/brainstorm/phase-3/menu.html` phương án A.

## Chi tiết
- `settings.ts`: thêm `menuStyle: 'map' | 'shelf'`, `DEFAULT_SETTINGS.menuStyle = 'map'`.
- `ParentArea`: mục "Kiểu menu / メニュー" với 2 nút `aria-pressed` giống hàng ngôn ngữ: "🗺️ Bản đồ / ちず" và "🧸 Kệ đồ chơi / たな". Chạm là `onSave` ngay.
- `ShelfMenu.tsx`: góc trên trái Đậu Đậu ảnh `cards/daudau.png` 108px + bong bóng `ui.pick-game` (nói khi vào). Lưới 6 cột, thẻ `ClayButton` 132px chỉ có icon trò, nền màu khu (`PLACES` trong `src/core/places.ts`), xếp theo thứ tự khu rồi `order`. Nếu > 18 trò: thẻ 120px, 7 cột. Chạm thẻ: `say(titleKey ?? place)` ngay, mở trò sau 300ms. `data-testid="shelf"`, `data-last-say`. Không có nút Về nhà (đây là màn chính).
- `App.tsx`: `settings.menuStyle === 'shelf'` thì hiện `ShelfMenu` thay `WorldMap`; vẫn gọi `saveLastGame`. Móc e2e `?e2e=1&menu=shelf` ép kiểu kệ.

## Kiểm thử
- Unit: `settings.test.ts` (mặc định, bản lưu thiếu trường); `ShelfMenu.test.tsx` (số thẻ theo tuổi, thứ tự theo khu, chạm gọi onPick); `ParentArea.test.tsx` đổi kiểu menu gọi onSave với menuStyle mới.
- E2E `shelf.spec.ts`: `?e2e=1&menu=shelf` → mọi thẻ ≥132 và không chồng, trong khung 1194×834; chạm một thẻ vào đúng trò; chụp `T-035-shelf.png`. Mở cổng phụ huynh (giữ 3 giây như test sẵn có), chọn Kệ đồ chơi, đóng → thấy kệ; chụp `T-035-settings.png` lúc khu bố mẹ đang mở. Kiểm thêm ở viewport 430×932.

## Không làm
Không đổi bản đồ (T-034).

## Tham khảo
docs/superpowers/specs/2026-11-12-phase-3-ngon-ngu-tu-duy-sang-tao.md mục Menu chính.
