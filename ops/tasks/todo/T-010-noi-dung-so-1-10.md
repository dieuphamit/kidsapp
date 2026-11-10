---
id: T-010
title: Nội dung số 1–10 vi/ja
type: tts
depends_on: [T-004]
scope:
  - app/src/content/numbers.json
  - app/public/audio/**
acceptance:
  - npm run verify
  - numbers.json có number.1 … number.10, count.hello, count.done; npm run check:audio xanh
attempts: 0
---
## Mục tiêu
Chuẩn bị giọng đếm cho game Đếm quả (T-013): mỗi lần bé hái một quả, Đậu Đậu đếm "Một!", "Hai!"…, đủ mười thì khen.

## Chi tiết
Tạo `app/src/content/numbers.json`:

| key | vi | ja |
|---|---|---|
| `number.1` | Một! | いち! |
| `number.2` | Hai! | に! |
| `number.3` | Ba! | さん! |
| `number.4` | Bốn! | よん! |
| `number.5` | Năm! | ご! |
| `number.6` | Sáu! | ろく! |
| `number.7` | Bảy! | なな! |
| `number.8` | Tám! | はち! |
| `number.9` | Chín! | きゅう! |
| `number.10` | Mười! | じゅう! |
| `count.hello` | Vườn quả chín rồi! Bé hái quả nào! | くだものが いっぱい!とってみよう! |
| `count.done` | Mười quả! Bé đếm giỏi quá! | じゅっこ!かぞえるの じょうずだね! |

Sinh mp3 từ gốc worktree: `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`. Nghe thử `ja/number.2.mp3` ("に!") và `vi/number.1.mp3`: chữ một âm tiết có thể bị đọc quá ngắn. Nếu nghe không rõ, chỉ được kéo dài bằng cách viết hợp lệ (ví dụ "に!" → "にー!"), không viết sai chính tả, và ghi lại thay đổi trong tóm tắt.

## Kiểm thử
- `npm run check:audio` xanh; `src/core/content.test.ts` xanh (key `number.10` hợp lệ theo regex).

## Không làm
- Không làm UI game đếm, không thêm số > 10, không sửa content khác.

## Tham khảo
- Spec mục 6 (Đếm 1–10).
