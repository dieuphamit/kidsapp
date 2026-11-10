---
id: T-006
title: "Đậu Đậu dùng model CC0"
type: ui
depends_on: [T-003, T-005]
scope:
  - app/src/ui/DauDau.tsx
  - app/e2e/daudau.spec.ts
acceptance:
  - npm run verify
  - "Màn hình chính tải models/cat.glb (HTTP 200) và Đậu Đậu vẫn nhảy, nói ui.hello khi chạm"
  - "Có ảnh app/test-results/shots/T-006-daudau.png"
---
## Mục tiêu
Đậu Đậu trên bản đồ là con mèo 3D thật (model CC0 `cat.glb` từ T-003) thay cho mèo ghép từ quả cầu. Vẫn xoay qua lại nhè nhẹ, chạm vào thì nhảy lên co giãn kiểu đất sét và chào bé.

## Chi tiết
- Trong `app/src/ui/DauDau.tsx`:
  - Giữ nguyên chữ ký `export function DauDau({ onTap }: { onTap(): void })` và toàn bộ logic nhảy/xoay hiện có (ref `jump`, `useFrame`: xoay `sin(t*0.8)*0.4`, nhảy 0.6s cao 0.6, squash `1 ± sin(2πp)*0.06`).
  - Đổi phần hình: `const MODEL = import.meta.env.BASE_URL + 'models/cat.glb'`, `useGLTF(MODEL)` (drei; meshopt đã bật mặc định) và `<primitive object={scene} />` bên trong group nhận `onPointerDown`. Gọi `useGLTF.preload(...)` ở cấp module.
  - Chuẩn hóa kích thước: tính `Box3` của scene một lần (`useMemo`), scale sao cho cao ~3 đơn vị và chân chạm y=0, căn giữa x/z (khung `DEFAULT_VIEW` của Scene3D dành cho nhân vật cao ~3 đứng ở gốc). Quay mặt về camera.
  - Nếu CREDITS.md ghi model có clip `Idle` (hoặc tên tương tự): `useAnimations` chạy Idle lặp; có clip `Jump` thì phát một lần khi chạm (vẫn giữ squash). Không có thì bỏ qua.
  - Màu: nếu màu lông chính của model không phải kem cam, clone material chính và đặt `#f6c27a` (giữ màu mắt); `roughness ~0.6` cho cảm giác đất sét. Không sửa file .glb.
  - Đổi tên bản mèo ghép cầu hiện tại thành `DauDauClay` (trong cùng file, không export cũng được) và dùng nó làm `fallback` của `<Suspense>` bọc model, để lúc đang tải vẫn có Đậu Đậu.
  - Vùng chạm: thêm một khối cầu/hộp trong suốt (`meshBasicMaterial transparent opacity={0} depthWrite={false}`) bao quanh mèo để chạm dễ, trên màn hình ≥120px.
- Nếu `app/public/models/cat.glb` chưa có (T-003 bỏ qua mèo): không làm gì khác, dừng và ghi `CÂU HỎI:`.

## Kiểm thử
- E2E `app/e2e/daudau.spec.ts`:
  - `page.waitForResponse(r => r.url().endsWith('/models/cat.glb'))` khi `goto('./')`, status 200.
  - Ghi lại `page.on('console')` loại `error`, cuối test kỳ vọng rỗng (không lỗi GLTF/WebGL).
  - Đợi 1.5s, chụp `test-results/shots/T-006-daudau.png`.
  - Chạm giữa canvas Đậu Đậu (giữa `getByRole('img', { name: 'Đậu Đậu' })`, hơi thấp hơn tâm) → `getByTestId('home')` có `data-last-say="ui.hello"`.
- `ux-rules.spec.ts` và `worldmap.spec.ts` vẫn xanh.

## Không làm
- Không sửa `Scene3D.tsx`, `WorldMap.tsx`, model trong `public/models/`.
- Không thêm shadow map, không thêm đèn (Scene3D đã có ánh sáng ấm và ContactShadows).
- Không xóa bản mèo ghép cầu (giữ làm fallback).

## Tham khảo
- Spec mục 3 (linh vật Đậu Đậu: kem cam, mắt to); CLAUDE.md luật 7, 8; `app/public/models/CREDITS.md`.
