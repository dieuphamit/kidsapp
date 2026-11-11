# Bé Học phase 2: thêm con vật, trái cây và 6 trò chơi mới

Ngày: 11/11/2026. Bổ sung cho `2026-11-10-be-hoc-design.md`; mọi luật UX, phong cách đất sét, offline, giọng vi/ja giữ nguyên.

## Vì sao chọn những trò này

Tham khảo các app được nhắc nhiều cho trẻ 2–3 tuổi (Khan Academy Kids, Sago Mini, PBS Kids) và tài liệu phát triển nhận thức (AAP HealthyChildren, NAEYC, Lovevery):

- Ghép cặp và phân loại (theo hình, theo màu) là nền tảng của trí nhớ thị giác và tư duy toán; bắt đầu khoảng 15–30 tháng.
- Lật hình trí nhớ: bắt đầu 2–3 cặp, cho xem ngửa trước rồi mới úp, tăng dần khi bé quen; phiên ngắn 5–10 phút; hình to, quen thuộc.
- Ú òa / trốn tìm luyện "vật vẫn còn khi bị che" và rất hợp 2 tuổi.
- Ghép hình 2–4 mảnh: bé 2 tuổi bắt đầu giải được puzzle đơn giản.
- Chơi tự do, không điểm số, không thua; phản hồi vui, không phạt.

## Nội dung mới

- 12 thú hoang (Kenney Cube Pets, CC0, cùng phong cách khối vuông với trang trại): elephant, giraffe, lion, tiger, monkey, panda, penguin, koala, fox, bear (polar), parrot, fish.
- 10 trái cây (Kenney Food Kit, CC0): apple, banana, cherries, grapes, lemon, orange, pear, pineapple, strawberry, watermelon.
- "Thẻ hình" 2D: ảnh PNG nền trong suốt render từ chính các model 3D (31 thẻ: 9 thú trang trại + 12 thú hoang + 10 quả), để các trò 2D nhẹ máy mà vẫn cùng phong cách.
- Giọng đọc vi/ja cho tên, tiếng kêu/đặc điểm, màu của quả, câu dẫn của từng trò.

## Bản đồ

Thêm 2 địa điểm: **Sở thú** (`place.zoo`) và **Nhà Đậu Đậu** (`place.house`), tổng 6. Một địa điểm có nhiều trò thì chạm vào sẽ hiện màn **chọn trò** (2–3 nút đất sét to có icon, Đậu Đậu đọc tên trò khi chạm).

| Địa điểm | Trò |
|---|---|
| Trang trại | Con vật 3D (có), **Ai kêu đấy?** |
| Hồ nước | Màu và hình (có) |
| Vườn quả | Đếm quả (có), **Xếp quả theo màu** |
| Nhà âm nhạc | Vẽ và nhạc (có) |
| Sở thú | **Sở thú 3D**, **Ú òa**, **Bóng của ai?** |
| Nhà Đậu Đậu | **Lật hình**, **Ghép hình** |

## 6 trò mới (tóm tắt, chi tiết trong từng task)

1. **Lật hình** (T-025): 2 cặp → 3 → 4 → 6 cặp, tự tăng sau 2 ván thắng. Ván đầu mỗi cấp cho xem ngửa 2 giây. Lật thẻ nào đọc tên thẻ đó. Trùng: hai thẻ nảy, "Giống nhau rồi!". Không trùng: úp lại sau 1.2 giây, không âm báo sai.
2. **Ai kêu đấy?** (T-027): Đậu Đậu đọc tiếng kêu, bé chọn 1 trong 2 thẻ (3 thẻ khi bé ≥ 36 tháng). Sai thì thẻ lắc nhẹ, đọc lại tiếng kêu.
3. **Ú òa** (T-026): 3 bụi cây (5 khi ≥ 36 tháng); một bạn thú trốn sau một bụi. Chạm bụi trống thì bụi lắc; chạm đúng thì bạn thú nhảy ra "Ú òa!" và đọc tên.
4. **Bóng của ai?** (T-028): một cái bóng đen, bé kéo thẻ thú đúng vào bóng (2 → 3 lựa chọn).
5. **Xếp quả theo màu** (T-029): kéo quả vào giỏ cùng màu, 2 giỏ (đỏ, vàng) → 3 giỏ (thêm xanh lá).
6. **Ghép hình** (T-030): ảnh thẻ cắt 2 mảnh → 4 mảnh, kéo mảnh vào khung, mảnh hút vào khi gần đúng chỗ.
7. **Sở thú 3D** (T-024): như Trang trại, mỗi lần vào hiện 6 trong 12 bạn thú hoang.

## Thứ tự

T-019 (model) → T-020 (thẻ hình); T-021 → T-022 (giọng đọc, nối tiếp vì chung `.hashes.json`) → T-023 (bản đồ + chọn trò); các trò T-024…T-030 chạy song song sau đó; T-031 kiểm tra tổng.
