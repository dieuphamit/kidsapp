---
id: T-014
title: "Game Vẽ và nhạc: phần vẽ"
type: ui
depends_on: [T-005, T-007]
scope:
  - app/src/games/music/**
  - app/e2e/music.spec.ts
acceptance:
  - npm run verify
  - "Vẽ bằng một ngón tay để lại nét màu đang chọn; nút xóa làm trang giấy trắng lại"
  - "Có ảnh app/test-results/shots/T-014-draw.png"
---
## Mục tiêu
Bé vào Nhà âm nhạc và thấy một tờ giấy trắng bo tròn như tấm bảng đồ chơi. Bé lấy ngón tay vẽ, nét to tròn mềm. Dưới tờ giấy là 6 "hũ màu" đất sét; chạm hũ nào thì hũ đó phồng to lên, Đậu Đậu đọc tên màu, nét vẽ đổi màu. Có một nút xóa to: chạm vào thì tờ giấy mờ dần rồi trắng tinh.

## Chi tiết
- **Cần T-007 đã xong** (dùng `LEARN_COLORS`, `LEARN_HEX` trong `src/core/tokens.ts` và key `color.*`). Nếu `LEARN_COLORS` chưa có: dừng, không tự thêm (ngoài scope), ghi `CÂU HỎI: T-014 cần T-007 xong trước`.
- `app/src/games/music/manifest.ts`: `{ id: 'music', title: { vi: 'Vẽ và nhạc', ja: 'おえかきとおんがく' }, place: 'place.music', icon: '🎵', color: 'lilac', minAge: 24, maxAge: 72, Component: lazy(() => import('./Game')) }`.
- `app/src/games/music/Game.tsx` chỉ là khung: gốc `<div data-testid="game-music" data-last-say={...}>`, nền gradient trời, `<BackHome onExit={onExit} />`, và `<DrawPad say={say} />`. (T-015 sẽ thêm chế độ đàn/trống vào khung này, nên tách DrawPad riêng.)
- `app/src/games/music/DrawPad.tsx` + `DrawPad.module.css`:
  - Tờ giấy: `<canvas data-testid="paper">` nền `--paper`, bo `--radius-clay`, bóng `--shadow-clay`, chiếm phần giữa (khoảng 1000×560 trên 1194×834), không đè nút 🏠 hay vùng cổng phụ huynh. `touch-action: none` để không cuộn trang.
  - Canvas theo `devicePixelRatio` (tối đa 2); đổi kích thước thì giữ hình đã vẽ (vẽ lại từ bitmap cũ).
  - Vẽ: chỉ một con trỏ — nhớ `pointerId` của lần pointerdown đầu, bỏ qua pointer khác cho tới pointerup/cancel. Nét `lineWidth` 22px, `lineCap/lineJoin = 'round'`, nối các điểm bằng `quadraticCurveTo` cho mượt. Pointerdown cũng chấm một chấm tròn ngay (phản hồi < 100ms).
  - Hàng dưới: 6 `ClayButton` màu `size={120}` (khe 24px), mỗi nút `label` là text `color.<id>` theo `lang`, `color="peach"` nhưng hình bên trong là một chấm tròn lớn màu `LEARN_HEX[id]` (ClayButton chỉ nhận màu đất sét, nên màu học đặt trong con). Nút đang chọn có vòng sáng quanh (wrapper với `outline`/`box-shadow` dùng `--paper`) và nhô lên 8px. Chạm → chọn màu + `say('color.<id>')`. Màu mặc định: `red`.
  - Nút xóa: `ClayButton` `color="lilac"` `size={140}` `label="Xóa"`, con là `🧽`, đặt cuối hàng, cách các nút màu ≥ 48px để bé không chạm nhầm. Chạm → tờ giấy mờ dần 400ms (CSS opacity) rồi `clearRect` và hiện lại. Không hỏi xác nhận.
- `say(key)` = `speaker.say(key)` + ghi `data-last-say` ở gốc Game.

## Kiểm thử
- Unit `app/src/games/music/DrawPad.test.tsx` (jsdom: stub `HTMLCanvasElement.prototype.getContext` trả object giả ghi lại lệnh):
  - pointerDown/Move/Up với `pointerId: 1` → có gọi `stroke` hoặc `arc`/`fill`; pointerMove với `pointerId: 2` trong lúc 1 đang vẽ không vẽ thêm.
  - Chạm nút màu "Màu xanh dương" → `say` nhận `'color.blue'` và `strokeStyle` sau đó là `LEARN_HEX.blue`.
  - Chạm "Xóa" → sau khi chạy hết timer, `clearRect` được gọi.
- E2E `app/e2e/music.spec.ts`:
  - `goto('./')`, chạm "Nhà âm nhạc" → `getByTestId('game-music')` hiện.
  - Chạm "Màu xanh dương" → `data-last-say="color.blue"`. Dùng `page.mouse` vẽ một đường cong ngoằn ngoèo trên `paper` (down, 20 bước move, up), rồi đổi "Màu đỏ" vẽ thêm một vòng. Chụp `test-results/shots/T-014-draw.png`.
  - `page.evaluate` đọc `getImageData` của canvas: có pixel không trong suốt/không trắng.
  - Chạm "Xóa", đợi 600ms → mọi pixel trở lại trống.
  - 7 nút (6 màu + Xóa) đều ≥120×120.
  - Nút "Về nhà" → `getByTestId('home')` hiện.

## Không làm
- Không làm đàn, trống (T-015), không lưu bức vẽ, không tẩy từng phần, không chọn cỡ bút.
- Không sửa `src/core`, `src/ui`, content.

## Tham khảo
- Spec mục 6 (Vẽ và âm nhạc: 6 màu, nút xóa to); CLAUDE.md luật 1, 2, 6.
