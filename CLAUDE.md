# Bé Học: luật cho agent

App PWA học và chơi cho bé 2–5 tuổi trên iPad. Spec: `docs/superpowers/specs/2026-11-10-be-hoc-design.md`. Linh vật: mèo Đậu Đậu (ja: ダウダウ).

## Lệnh
- Trong `app/`: `npm run verify` (= `tsc -b && oxlint && vitest run && npm run check:audio && playwright test`). Task chỉ được tính là xong khi lệnh này qua.
- Lint là oxlint (không phải eslint). E2E chạy Chromium giả lập iPad (WebKit bị chặn trên máy này), nên đừng dựa vào hành vi chỉ có ở WebKit; iPad Safari thật do bố mẹ kiểm tra.
- Sinh giọng đọc sau khi sửa `app/src/content/*.json` (chạy từ thư mục gốc):
  `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`

## Luật UX trẻ em (không được vi phạm)
1. Vùng chạm ≥120×120px, cách nhau ≥24px. Dùng `ClayButton` (đã ép sàn 120px kể cả khi truyền `style`, và đặt `data-pressed` lúc pointerdown), không tự viết nút.
2. Mọi lần chạm đều có phản hồi trong 100ms (`onPointerDown`, âm thanh hoặc chuyển động).
3. Không âm báo sai, không điểm số, không thua.
4. Không cần biết đọc: mọi chỉ dẫn qua `speaker.say(key)`; mọi câu nói phải có trong `src/content/*.json` với cả `vi` và `ja`. iOS mở khóa âm thanh ở lần chạm đầu bằng `unlockAudioOnFirstGesture()` (`src/core/audio.ts`, đã nối sẵn trong App), đừng tự làm lại.
5. Không link ra ngoài, không gọi mạng lúc chạy, không thu thập dữ liệu.
6. Chỉ chạm và kéo đơn giản. Không vuốt nhiều ngón, không chạm đúp.
7. Chỉ dùng màu và bóng từ `src/core/tokens.css`. Scene 3D dùng lại `Scene3D` (`src/ui/Scene3D.tsx`, prop `view` tùy chỉnh camera): màu phẳng, ánh sáng ấm, chỉ ContactShadows; không thêm shadow map. Model chỉ lấy từ gói CC0 (Kenney, Quaternius) và ghi nguồn vào `app/public/models/CREDITS.md`.
8. Mỗi scene 3D ≤ ~50k tam giác; nén GLB, chạy trong `app/`: `npm run model:opt -- ../assets-src/<đường-dẫn> public/models/<tên>.glb --compress meshopt`.

## Cấu trúc
- Game mới: `app/src/games/<id>/manifest.ts` export `manifest: GameManifest` (xem `src/core/games.ts`), `Game.tsx`, test unit, và `app/e2e/<id>.spec.ts` có chụp ảnh vào `app/test-results/shots/<task-id>-<tên>.png` (trong test viết `test-results/shots/...`, tính từ `app/`; runner lấy mọi file .png ở đó).
- Game không import lẫn nhau; dùng chung chỉ qua `src/core` và `src/ui`.

## Thư viện được phép
react, three, @react-three/fiber, @react-three/drei, howler, idb-keyval, @fontsource/*. Muốn thêm thư viện khác thì ghi vào phần câu hỏi trong report, không tự cài.

## Cấm
Sửa `ops/`, `git push`, xóa/skip/làm yếu test, sửa file ngoài `scope` của task, đổi `base` trong `vite.config.ts`.
