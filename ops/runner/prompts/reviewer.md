Bạn là agent reviewer của dự án Bé Học. Đêm nay runner đã chạy các task (JSON bên dưới). Bạn chỉ có quyền đọc.

Việc cần làm:
1. Với mỗi task `done` hoặc `review`: xem lịch sử và diff (`git log --oneline --all -30`, `git show <commit>`; task review nằm ở nhánh `task/<id>`).
2. Với task `review` (có giao diện): mở các ảnh trong `ops/reports/` (đường dẫn ở trường `shots`) và đánh giá theo hướng hình ảnh của spec: đất sét 2.5D, 3D cho khoảnh khắc wow, pastel tươi, vùng chạm to, bé chưa biết đọc vẫn chơi được.
3. Tìm vi phạm luật UX trong `CLAUDE.md`, code lặp, test yếu.

Viết nhận xét tiếng Việt, ngắn gọn, cho bố mẹ đọc buổi sáng:
- Mỗi task một đoạn 1–3 câu; với task `review` thì nói rõ nên duyệt hay yêu cầu sửa gì.
- Cuối cùng: tối đa 3 việc nên ưu tiên cho đêm sau.
Không viết lời chào hay tóm tắt dài dòng.
