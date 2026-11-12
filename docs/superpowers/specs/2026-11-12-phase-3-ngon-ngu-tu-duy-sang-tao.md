# Bé Học phase 3: menu mới và 6 trò ngôn ngữ, tư duy, sáng tạo

Ngày: 12/11/2026. Bổ sung cho `2026-11-10-be-hoc-design.md` và `2026-11-11-phase-2-games.md`; mọi luật UX, phong cách đất sét, offline, giọng vi/ja giữ nguyên.
Mockup đã duyệt: `.superpowers/brainstorm/phase-3/game-ideas.html` (6 trò) và `.superpowers/brainstorm/phase-3/menu.html` (menu).

## Vì sao

11 trò hiện có chủ yếu dạy gọi tên và nhận biết. Còn thiếu: nói thành câu, kể theo trình tự, quy luật, lập kế hoạch, chơi mở.

- Bốn trụ cột app giáo dục (Hirsh-Pasek và cộng sự, 2015): chủ động suy nghĩ, tập trung, có ý nghĩa, có tương tác với người lớn.
- Đồ chơi mở kiểu Pok Pok: không màn, không thua, gần như không chữ.
- Bài tập ngôn ngữ 2–5 tuổi (NHS, Leeds SLT): giới từ, động từ, đóng vai, kể lại chuyện theo "đầu tiên, tiếp theo, cuối cùng".
- Tư duy tính toán mầm non (NAEYC): quy luật và trình tự trong tầm 3–6 tuổi; thiết kế thuật toán chỉ hợp nhóm lớn hơn.

## Menu chính: hai kiểu, bố mẹ chọn trong cài đặt

`Settings.menuStyle: 'map' | 'shelf'`, mặc định `'map'`. Khu bố mẹ có mục "Kiểu menu / メニュー" đổi ngay khi chạm (như ngôn ngữ).

**Kiểu bản đồ (B, mặc định).** 5 khu quanh Đậu Đậu, mỗi khu một màu, nút 200px có dải biểu tượng (tối đa 4) các trò bên trong. Chạm khu: nói tên khu ngay, Đậu Đậu quay về phía đó, mở màn trò sau 400ms (trước là 800ms). Khu có 1 trò hợp tuổi thì vào thẳng. Nút tròn **chơi lại** cạnh Đậu Đậu hiện biểu tượng trò vừa chơi, chạm là vào thẳng. Màn trò của khu: dải màu khu ở trên, tên khu, tối đa 5 thẻ 180×228 một hàng, Đậu Đậu (ảnh 2D) hỏi "Bé chơi trò nào?".

**Kiểu kệ đồ chơi (A).** Một màn duy nhất, mọi trò hợp tuổi là thẻ 132px (6 cột, khe 24px), xếp theo thứ tự khu, nền màu khu. Chạm thẻ nói tên trò rồi vào ngay.

| Khu (key) | Màu | Trò (thứ tự) |
|---|---|---|
| 🦁 Thế giới thú (`place.zoo`) | peach | Con vật, Sở thú, Ai kêu đấy?, Bóng của ai?, Ú òa |
| 🏠 Nhà Đậu Đậu (`place.house`) | butter | **Trốn ở đâu?**, **Chuyện ba tranh**, **Tiệm bánh** |
| 🍎 Vườn quả (`place.orchard`) | leaf | Đếm số, Xếp quả theo màu, Màu và hình, **Chuỗi hạt** |
| 🧩 Góc đố (`place.puzzle`, mới) | mint | Lật hình, Ghép hình, **Đường về nhà** |
| 🎵 Nhà âm nhạc (`place.music`) | lilac | Vẽ và nhạc, **Ban nhạc thú** |

`place.farm` và `place.pond` không còn trên bản đồ (giữ key content, không xóa audio).

## 6 trò mới (chi tiết trong từng task)

| id | Tên | Khu | Tuổi (tháng) | Kỹ năng |
|---|---|---|---|---|
| hide | Đậu Đậu trốn ở đâu? | house | 24–72 | giới từ, câu đầy đủ |
| story | Chuyện ba tranh | house | 30–72 | trình tự, kể chuyện |
| bakery | Tiệm bánh | house | 24–72 | chơi mở, tính từ, đếm |
| pattern | Chuỗi hạt | orchard | 30–72 | quy luật AB → AAB → ABC |
| path | Đường về nhà | puzzle | 36–72 | lập kế hoạch, sửa lỗi |
| band | Ban nhạc thú | music | 24–72 | sáng tác, nhịp |

Nguyên tắc chung: không âm báo sai, không điểm, chọn "chưa đúng" thì vật trôi về nhẹ nhàng và Đậu Đậu gợi ý lại. Cuối mỗi lượt có thể có một câu hỏi mở cho bố mẹ nói chuyện cùng bé (trụ cột "tương tác").

## Tài nguyên mới

- Ảnh Đậu Đậu 2D `public/cards/daudau.png` render từ `DauDau.tsx` (dùng ở màn chọn trò, kệ đồ chơi, Trốn ở đâu, Đường về nhà).
- 18 thẻ ảnh chuyện (`public/cards/story/`) và 2 thẻ topping (`public/cards/extra/`) qua `photo-cards.mjs`, ảnh Commons có giấy phép, không thêm vào `cards/index.json` (để Lật hình, Ghép hình không lấy nhầm).
- Ban nhạc thú chỉ dùng con vật đã có tiếng kêu ghi âm: cow, chicken, duck, pig, dog, sheep.

## Thứ tự

T-032 (tài nguyên) và T-033 (giọng đọc) chạy trước, song song. T-034 (bản đồ 5 khu, màn chọn trò, chơi lại) → T-035 (kệ đồ chơi + cài đặt). 6 trò T-036…T-041 chạy song song sau T-034. T-042 kiểm tra tổng.

## Rủi ro

- Quá 18 trò thì kệ đồ chơi không vừa 3 hàng: khi đó giảm thẻ còn 120px, 7 cột (tối đa 21). Nhiều hơn nữa thì cần thiết kế lại.
- Ảnh chuỗi chuyện lấy từ nhiều ảnh khác nhau nên không cùng một con vật/cây; chấp nhận được, ưu tiên ảnh rõ, nền đơn giản.
- Trái/phải trong Đường về nhà theo màn hình; khi điện thoại cầm dọc khung xoay 90° nhưng nội dung xoay theo nên vẫn đúng.
