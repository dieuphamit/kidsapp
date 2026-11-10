---
id: T-007
title: "Nội dung màu và hình vi/ja"
type: tts
depends_on: []
scope:
  - app/src/content/colors.json
  - app/src/content/shapes.json
  - app/public/audio/**
  - app/src/core/tokens.ts
  - app/src/core/tokens.css
  - app/src/core/tokens.test.ts
acceptance:
  - npm run verify
  - "colors.json có 6 key color.*, shapes.json có 4 key shape.* và 3 key pond.*; npm run check:audio xanh"
  - "tokens.ts export LEARN_COLORS và LEARN_HEX, tokens.css có 6 biến --learn-*"
---
## Mục tiêu
Chuẩn bị tên 6 màu, 4 hình và câu dẫn của Hồ nước để game Màu và hình (T-009, T-011) và phần vẽ (T-014) đọc lên được; đồng thời thêm bảng 6 "màu học" dùng chung cho các game.

## Chi tiết
- `app/src/content/colors.json`:
  | key | vi | ja |
  |---|---|---|
  | `color.red` | Màu đỏ | あか |
  | `color.yellow` | Màu vàng | きいろ |
  | `color.green` | Màu xanh lá | みどり |
  | `color.blue` | Màu xanh dương | あお |
  | `color.orange` | Màu cam | オレンジ |
  | `color.purple` | Màu tím | むらさき |
- `app/src/content/shapes.json`:
  | key | vi | ja |
  |---|---|---|
  | `shape.circle` | Hình tròn | まる |
  | `shape.square` | Hình vuông | しかく |
  | `shape.triangle` | Hình tam giác | さんかく |
  | `shape.star` | Ngôi sao | ほし |
  | `pond.hello` | Hồ nước có nhiều khối màu. Bé chạm thử nhé! | いけに いろんな かたちが あるよ。さわってみて! |
  | `pond.drag-hint` | Bé kéo khối vào cái bóng giống nó nhé! | おなじ かげに いれてみよう! |
  | `pond.try-again` | Ồ, thử cái bóng khác xem nào! | あれれ、ほかの かげかな? |
- Sinh mp3 từ gốc worktree: `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`, rồi `npm run check:audio`.
- Màu học dùng chung (các token đất sét pastel hiện có không đủ để dạy tên màu):
  - `app/src/core/tokens.ts`: thêm `export const LEARN_COLORS = ['red', 'yellow', 'green', 'blue', 'orange', 'purple'] as const;`, `export type LearnColor = (typeof LEARN_COLORS)[number];`, `export const LEARN_HEX: Record<LearnColor, string>` với giá trị: red `#ff6b6b`, yellow `#ffd84d`, green `#6fd17a`, blue `#5aa9ff`, orange `#ffa45b`, purple `#b085ff` (tươi, dễ phân biệt, vẫn mềm như đất sét). Id màu trùng phần sau `color.` trong content.
  - `app/src/core/tokens.css`: thêm `--learn-red`, `--learn-yellow`, `--learn-green`, `--learn-blue`, `--learn-orange`, `--learn-purple` cùng giá trị.
  - Không đổi `CLAY_COLORS` và các biến cũ.

## Kiểm thử
- `app/src/core/tokens.test.ts` thêm:
  - `LEARN_COLORS` có đúng 6 phần tử như trên, mỗi phần tử có trong `LEARN_HEX` và là mã `#rrggbb`.
  - Mỗi `LEARN_COLORS` có key `color.<id>` trong `contentByKey()` (import từ `./content`).
  - Đọc `tokens.css` bằng `fs` (đường dẫn từ `import.meta.dirname`), mỗi màu có dòng `--learn-<id>: <hex>` khớp `LEARN_HEX`.
- Test cũ "có đủ 5 màu đất sét" giữ nguyên.

## Không làm
- Không làm UI game, không đổi màu đất sét pastel hiện có, không sửa `ui.json`.

## Tham khảo
- Spec mục 6 (Màu và hình; Vẽ với 6 màu); CLAUDE.md luật 7.
