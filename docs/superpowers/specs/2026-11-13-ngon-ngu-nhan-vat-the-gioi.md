# Phase 4: tiếng Anh, bạn đồng hành, thế giới khám phá

Ngày: 2026-11-13. Bố mẹ giao Claude tự quyết chi tiết, tiêu chí: thông minh, hấp dẫn bé.

## A. Tiếng Anh
- `Lang = 'vi' | 'ja' | 'en'`; mọi item trong `src/content/*.json` có `en`; validate bắt buộc.
- TTS edge-tts giọng `en-US-AnaNeural` (dự phòng `en-US-JennyNeural`), cùng tốc độ chậm như vi/ja.
- Khu bố mẹ có nút English. Tên linh vật tiếng Anh: "Dau Dau".
- Nhánh `feat/en`, worktree `wt/en`.

## B. Bạn đồng hành (nhân vật + tên)
- 4 nhân vật đất sét dựng bằng code, chung khung với `DauDau.tsx`: mèo (có sẵn), cún, thỏ, gấu. Khác tai, đuôi, màu lông.
- 8 tên có sẵn, mỗi tên có vi/ja/en. Nhân vật và tên chọn độc lập. Mặc định: mèo + Đậu Đậu.
- Câu có tên (~56 câu) viết thành mẫu `{name}`; script TTS sinh mỗi câu × mỗi tên × 3 ngôn ngữ. Speaker chọn file theo tên đang dùng. Không gọi mạng lúc chạy.
- Khu bố mẹ: mục "Bạn đồng hành": chạm con vật, chạm tên; nhân vật nói thử "Chào bé, tớ là …!" ngay khi chọn.
- Làm sau A (cùng sửa content json và ParentArea).

## C. Thú cử động thật
- Thay model tĩnh bằng model có animation khung xương (Idle/Walk/Run/Eat/Swim/Fly), crossfade theo trạng thái `wander`, tốc độ clip khớp tốc độ di chuyển để chân không trượt.
- Nguồn và đội hình: chờ report nghiên cứu (agent R).

## D. Thế giới theo môi trường sống
- Các khu: đồng cỏ (sở thú hiện có), ao hồ, rừng, dưới biển, trên trời. Kéo ngang một ngón để qua khu bên cạnh (luật 6: chỉ kéo đơn giản), kèm nút mũi tên lớn ≥120px cho bé chưa biết vuốt.
- Mỗi khu ≤ ~50k tam giác, 4–6 con; chạm con vật thì nó phản ứng và kêu tiếng thật.
- Thiết kế chi tiết sau khi có report của agent R.
