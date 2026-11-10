---
id: T-015
title: "Game Vẽ và nhạc: đàn và trống"
type: ui
depends_on:
  - T-012
  - T-014
scope:
  - app/src/games/music/**
  - app/e2e/music.spec.ts
acceptance:
  - npm run verify
  - Trong Nhà âm nhạc chuyển được giữa vẽ và nhạc; chạm phím gọi synth.playNote(i), chạm trống gọi synth.playDrum(kind)
  - Có ảnh app/test-results/shots/T-015-instruments.png
attempts: 0
---
## Mục tiêu
Nhà âm nhạc có hai trò: vẽ (đã có ở T-014) và chơi nhạc. Ở trò nhạc, bé thấy 8 phím đàn đất sét cầu vồng xếp hàng dưới và 4 cái trống tròn phía trên. Chạm phím: phím lún xuống, vang một nốt đô-rê-mi, một nốt nhạc ♪ nhỏ bay lên. Chạm trống: trống nhún "bùm", rung nhẹ.

## Chi tiết
- `Game.tsx`: thêm chế độ `'draw' | 'play'` (mặc định `'draw'`). Hai `ClayButton` chuyển chế độ ở giữa mép trên: `🖍️` (`label="Vẽ"`, `color="peach"`) và `🎹` (`label="Nhạc"`, `color="mint"`), `size={120}`, khe ≥24px, tránh nút 🏠 (trái) và vùng cổng phụ huynh (phải 120px). Nút đang bật nhô lên và có vòng sáng như nút màu ở T-014. Chuyển sang vẽ rồi quay lại thì bức vẽ vẫn còn (giữ `DrawPad` mounted, ẩn bằng CSS, hoặc lưu bitmap).
- `app/src/games/music/Instruments.tsx` + `Instruments.module.css`, nhận `synth` qua prop (mặc định `synth` từ `src/core/synth`, để test truyền bản giả):
  - Đàn: 8 `ClayButton`, mỗi phím rộng 120 cao ~230 (truyền `style` cao hơn: ClayButton ép `width/height` bằng `size`, nên bọc phím trong khung hoặc dùng `size={120}` và kéo dài bằng phần tử trang trí phía trên — chọn cách nào miễn vùng chạm ≥120×120 và nhìn giống phím đàn). Khe 24px: 8×120 + 7×24 = 1128px, vừa 1194px. Màu cầu vồng: `color` của ClayButton lần lượt `peach, butter, leaf, mint, lilac, peach, butter, leaf`; bên trong mỗi phím có một chấm tròn lớn màu theo thứ tự `LEARN_HEX` red, orange, yellow, green, blue, purple, rồi `var(--clay-mint)`, `var(--clay-lilac)`. `label` là "Phím 1"…"Phím 8".
  - Chạm phím (pointerdown) → `synth.playNote(i)` ngay trong handler, phím lún (ClayButton sẵn có) và một `♪` bay lên mờ dần 700ms (CSS animation, tự gỡ khỏi DOM).
  - Trống: 4 `ClayButton` tròn (`style={{ borderRadius: '50%' }}`) `size={170}`, hàng ngang phía trên đàn: `boom` 🥁 (`color="peach"`, "Trống to"), `tap` 🪘 (`color="butter"`, "Trống nhỏ"), `shaker` 🪇 (`color="leaf"`, "Cái lắc"), `bell` 🔔 (`color="lilac"`, "Cái chuông"). Chạm → `synth.playDrum(kind)` + rung (keyframe lắc ±4° 300ms).
  - Không dùng `speaker.say` cho từng nốt (để nhạc không bị giọng nói cắt).
- Cập nhật các chỗ cần thiết trong `music/` để chế độ vẽ của T-014 vẫn chạy như cũ.

## Kiểm thử
- Unit `app/src/games/music/Instruments.test.tsx` với synth giả `{ playNote: vi.fn(), playDrum: vi.fn() }`:
  - `pointerDown` "Phím 1" → `playNote(0)`; "Phím 8" → `playNote(7)`.
  - Mỗi trống gọi `playDrum` đúng kind (`boom`, `tap`, `shaker`, `bell`).
  - Có đúng 8 phím và 4 trống.
- E2E `app/e2e/music.spec.ts` thêm test (giữ test T-014):
  - Vào Nhà âm nhạc, chạm "Nhạc" → 8 nút "Phím 1"…"Phím 8" và 4 trống hiện, đều ≥120×120, cách nhau ≥24px (tính từ `boundingBox`).
  - `page.addInitScript` để đếm `AudioContext.prototype.createOscillator` (bọc hàm gốc, tăng `window.__osc`); chạm "Phím 3" → `__osc` > 0. Không có lỗi console.
  - Chạm "Phím 5" rồi chụp ngay `test-results/shots/T-015-instruments.png` (thấy phím lún và ♪ bay).
  - Chạm "Vẽ" → `paper` hiện lại, nét đã vẽ trước đó vẫn còn.

## Không làm
- Không sửa `src/core/synth.ts` (thiếu gì thì ghi `CÂU HỎI:`), không sửa `src/ui`, content.
- Không thêm bài hát mẫu, ghi âm, nhịp tự chạy hay metronome.
- Không thêm file âm thanh.

## Tham khảo
- Spec mục 6 (đàn 8 phím, 4 trống); CLAUDE.md luật 1, 2, 4.
