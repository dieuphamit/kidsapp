---
id: T-002
title: Nút về nhà
type: ui
depends_on: []
scope:
  - app/src/ui/BackHome.tsx
  - app/src/ui/BackHome.test.tsx
  - app/e2e/backhome.spec.ts
  - app/src/ui/Demo.tsx
  - app/src/main.tsx
acceptance:
  - npm run verify
  - BackHome.test.tsx kiểm tra pointerdown gọi onExit đúng 1 lần
  - Có ảnh app/test-results/shots/T-002-backhome.png
attempts: 0
---
## Mục tiêu
Trong mọi game, góc trên bên trái luôn có một nút đất sét 🏠 màu lilac. Bé chạm vào là về ngay bản đồ, nút lún xuống tức thì (cảm giác "bóp đất sét").

## Chi tiết
- Tạo `app/src/ui/BackHome.tsx` export `BackHome({ onExit, label = 'Về nhà' }: { onExit(): void; label?: string })`.
  - Dùng lại `ClayButton` (không tự viết `<button>`): `color="lilac"`, `size={120}`, `label={label}`, con là emoji `🏠`, `onPress={onExit}` (ClayButton gọi `onPress` ở `onPointerDown`, nên phản hồi < 100ms).
  - Truyền `style={{ position: 'fixed', top: 24, left: 24, zIndex: 40 }}`: nằm trên canvas 3D (Scene3D là `position:absolute`), dưới vùng cổng phụ huynh (`z-index: 50`, góc trên **phải**) nên không đè nhau.
- Vì chưa có game nào để đặt nút vào, tạo trang thử:
  - `app/src/ui/Demo.tsx` export `Demo({ name }: { name: string })`: nền full màn hình (`position: fixed; inset: 0`, gradient `var(--sky-top)` → `var(--sky-bottom)`). Khi `name === 'backhome'` thì hiện `<BackHome onExit={...} />`; bấm xong hiện một chữ "🏡" to giữa màn hình có `data-testid="demo-exited"`. `name` khác thì hiện `null`.
  - `app/src/main.tsx`: đọc `new URLSearchParams(location.search).get('demo')`; có giá trị thì render `<Demo name={demo} />` thay cho `<App />`, còn lại giữ nguyên như cũ (StrictMode, font, index.css).

## Kiểm thử
- Unit `app/src/ui/BackHome.test.tsx` (Testing Library):
  - `fireEvent.pointerDown(getByRole('button', { name: 'Về nhà' }))` → `onExit` được gọi đúng 1 lần.
  - Nút có `style.width` và `style.height` là `120px`; `label="Thoát"` thì tên nút đổi theo.
- E2E `app/e2e/backhome.spec.ts`:
  - `page.goto('./?demo=backhome')`; nút `getByRole('button', { name: 'Về nhà' })` hiện, `boundingBox()` có `width ≥ 120`, `height ≥ 120`, `x ≤ 40`, `y ≤ 40`.
  - Chụp `test-results/shots/T-002-backhome.png`.
  - Chạm nút (`tap` hoặc `click`) → `getByTestId('demo-exited')` hiện.
  - `page.goto('./')` vẫn ra màn hình chính (`getByTestId('home')`), tức trang demo không phá App.

## Không làm
- Không đặt BackHome vào Home/WorldMap hay App (mỗi game tự đặt khi được làm).
- Không thêm router, không thêm route demo nào khác ngoài `backhome`.
- Không thêm âm thanh cho nút (chưa có file sfx).

## Tham khảo
- CLAUDE.md luật UX 1, 2; spec mục 4.
