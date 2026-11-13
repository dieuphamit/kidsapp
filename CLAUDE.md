# Bé Học: luật cho agent

App PWA học và chơi cho bé 2–5 tuổi trên iPad. Spec: `docs/superpowers/specs/2026-11-10-be-hoc-design.md`. Linh vật: mèo Đậu Đậu (ja: ダウダウ, en: Dau Dau).

## Lệnh
- Trong `app/`: `npm run verify` (= `tsc -b && oxlint && vitest run && npm run check:audio && playwright test`). Task chỉ được tính là xong khi lệnh này qua.
- Lint là oxlint (không phải eslint). E2E chạy Chromium giả lập iPad (WebKit bị chặn trên máy này), nên đừng dựa vào hành vi chỉ có ở WebKit; iPad Safari thật do bố mẹ kiểm tra.
- Sinh giọng đọc sau khi sửa `app/src/content/*.json` (chạy từ thư mục gốc):
  `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`
- Tiếng kêu con vật là ghi âm thật, không phải TTS: `say('animal.<id>-sound')` phát `public/audio/sfx/animal-<id>.mp3` (`speechUrl` trong `src/core/audio.ts`), nên key này không có trong content json. Thêm/đổi con vật: sửa `app/scripts/animal-sounds.json` (nguồn Commons CC0/PD/CC BY/CC BY-SA) rồi chạy trong `app/`: `node scripts/animal-sounds.mjs` (sinh lại mp3 và `CREDITS.md`).

## Kiểm thử
- Chạy lệnh từ gốc worktree dạng `cd app && <lệnh>`. Tool Bash trả về sẵn output và exit code: không thêm `; echo $?`, `| tee`, redirect ra file, `|| true`, tiền tố `E2E_PORT=` (đã có trong env) hay `node -e`; các dạng đó bị từ chối.
- Một file: `npx vitest run src/x.test.ts`, `npx playwright test e2e/x.spec.ts`; toàn bộ: `npm run verify`.
- Test unit (`src/**/*.test.ts(x)`, `src/test-setup.ts`) dùng `tsconfig.test.json`, có type Node; code app (`tsconfig.app.json`) thì không, đừng import `node:*` ngoài test. Đọc file thật trong test: `readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8')` (mẫu: `src/core/tokensCss.test.ts`); không dùng `?raw` (Vitest trả về '').
- R3F (`<Canvas>`, `useFrame`) không chạy trong jsdom. Để phần 3D ở file riêng (ví dụ `WorldMapScene.tsx`), test unit thì `vi.mock('./WorldMapScene', ...)` thay bằng một `<div>` (mẫu: `src/ui/Home.test.tsx`); phần 3D chỉ kiểm tra bằng Playwright.

## Luật UX trẻ em (không được vi phạm)
1. Vùng chạm ≥120×120px, cách nhau ≥24px. Dùng `ClayButton` (đã ép sàn 120px kể cả khi truyền `style`, và đặt `data-pressed` lúc pointerdown), không tự viết nút.
2. Mọi lần chạm đều có phản hồi trong 100ms (`onPointerDown`, âm thanh hoặc chuyển động).
3. Không âm báo sai, không điểm số, không thua.
4. Không cần biết đọc: mọi chỉ dẫn qua `speaker.say(key)`; mọi câu nói phải có trong `src/content/*.json` với cả `vi`, `ja` và `en`. iOS mở khóa âm thanh ở lần chạm đầu bằng `unlockAudioOnFirstGesture()` (`src/core/audio.ts`, đã nối sẵn trong App), đừng tự làm lại.
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

## Khung Stage (iPad, iPhone ngang/dọc)

Cả app nằm trong khung cố định 1194×834 (`src/ui/Stage.tsx`), được co giãn bằng CSS `transform: scale()` và **xoay 90°** khi điện thoại cầm dọc. Hệ quả bắt buộc:

- Thiết kế mọi màn hình theo khung 1194×834 (luật 120px, 24px tính trong khung). Phần tử `position: fixed; inset: 0` tự lấp đúng khung.
- **Không** dùng `getBoundingClientRect()` hay `clientX/clientY` để đo kích thước hay tính toạ độ trong khung — chúng là toạ độ màn hình đã co giãn/xoay. Thay bằng:
  - kích thước: `el.offsetWidth` / `el.offsetHeight`;
  - toạ độ chạm trong chính phần tử nhận sự kiện: `e.nativeEvent.offsetX/offsetY`;
  - kéo thả qua nhiều phần tử: `clientToStage(e.clientX, e.clientY)` để có điểm trong khung, và `stageRect(el)` để có hình chữ nhật vùng thả trong khung (cả hai export từ `src/ui/Stage.tsx`).
- `Scene3D` đã đặt `resize={{ offsetSize: true }}`; Canvas 3D tự tạo mới cũng phải đặt như vậy.
- E2E chạy ở viewport iPad 1194×834 (khung không co giãn); `e2e/mobile.spec.ts` kiểm iPhone ngang/dọc — trò mới có kéo thả nên thêm một test kéo ở `viewport: { width: 430, height: 932 }`.
