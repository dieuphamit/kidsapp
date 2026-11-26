// Bố cục màn tô (toạ độ khung Stage 1194×834).
//
// 17 màu/công cụ không thể hiện cùng lúc với ô 120px cách nhau 24px mà tranh vẫn to: diện tích
// 21 nút × 144² cộng tranh ~700² đã vượt cả khung. Nên bảng màu chia 3 bộ, mỗi bộ ≤6 ô hiện đủ
// cùng lúc (không cuộn), cùng một nút "đổi bộ màu" ngay trong bảng.
//
// Bảng màu hình chữ L ở bên phải tranh: cột A (x=906) chạy hết chiều cao, cột B (x=1050) chỉ ở
// nửa dưới, vì dải 144px sát mép phải ở nửa trên phải để trống cho cổng bố mẹ (góc trên-phải).
import type { FillId } from './paint';

export const STAGE = { w: 1194, h: 834 } as const;
/** Không nút nào của trò được nằm trong vùng này (cổng bố mẹ ở góc trên-phải). */
export const GATE_ZONE = { left: STAGE.w - 144, top: 0, right: STAGE.w, bottom: Math.floor(STAGE.h / 2) } as const;

export const BTN = 120;
export const GAP = 24;

export type Rect = { left: number; top: number; width: number; height: number };
export type Slot = { left: number; top: number };

const COL_A = 906;
const COL_B = COL_A + BTN + GAP; // 1050
/** 5 hàng trải đều trong chiều cao tranh (24…810). */
const ROWS = [24, 190, 356, 522, 688] as const;

/** Giấy vẽ: từ sau cột nút trái tới trước bảng màu. */
export const PAPER: Rect = { left: 168, top: 24, width: COL_A - GAP - 168, height: 786 };
const ART_SIZE = 690;
/** Tranh vuông nằm giữa giấy. */
export const ART = {
  size: ART_SIZE,
  left: PAPER.left + (PAPER.width - ART_SIZE) / 2,
  top: PAPER.top + (PAPER.height - ART_SIZE) / 2,
} as const;

/** Ô màu theo thứ tự đọc: cột A từ trên xuống, rồi cột B (nửa dưới). */
export const SWATCH_SLOTS: readonly Slot[] = [
  ...ROWS.map((top) => ({ left: COL_A, top })),
  { left: COL_B, top: ROWS[3] },
];
/** Nút đổi bộ màu: góc dưới-phải, ngón cái với tới dễ. */
export const SWAP_SLOT: Slot = { left: COL_B, top: ROWS[4] };

/** Các bộ màu: bộ đầu là màu cơ bản; công cụ vui (cầu vồng, lấp lánh) ở bộ cuối như trước. */
export const PALETTE_SETS: readonly (readonly FillId[])[] = [
  ['red', 'orange', 'yellow', 'green', 'blue', 'purple'],
  ['pink', 'sky', 'lime', 'teal', 'brown', 'cream'],
  ['gray', 'white', 'black', 'rainbow', 'sparkle'],
];

export function setOf(f: FillId): number {
  const i = PALETTE_SETS.findIndex((s) => s.includes(f));
  return i < 0 ? 0 : i;
}

/** Nút cố định bên trái (về nhà là BackHome ở 24,24). */
export const LEFT = {
  home: { left: 24, top: 24 },
  easel: { left: 24, top: 168 },
  undo: { left: 24, top: 546 },
  redo: { left: 24, top: 690 },
} as const satisfies Record<string, Slot>;

/** Ô màu đang cầm (chỉ để nhìn), giữa nút giá vẽ và hoàn tác. */
export const CURRENT: Rect = { left: 24, top: 336, width: BTN, height: 160 };

/** Mọi nút của màn tô, để kiểm luật vùng chạm. */
export function paintButtons(): Rect[] {
  const box = (s: Slot): Rect => ({ ...s, width: BTN, height: BTN });
  return [...Object.values(LEFT), ...SWATCH_SLOTS, SWAP_SLOT].map(box);
}

/** Khoảng cách giữa hai hình chữ nhật (âm nếu chồng nhau). */
export function gapBetween(a: Rect, b: Rect): number {
  const gx = Math.max(b.left - (a.left + a.width), a.left - (b.left + b.width));
  const gy = Math.max(b.top - (a.top + a.height), a.top - (b.top + b.height));
  return Math.max(gx, gy);
}

export function inGateZone(r: Rect): boolean {
  return r.left + r.width > GATE_ZONE.left && r.top < GATE_ZONE.bottom;
}
