/**
 * Bố cục trò "Bếp nấu ăn" trong khung Stage 1194×834 (toạ độ khung, px).
 * Khách đứng sau quầy ở giữa phía trên, nồi to giữa quầy, thẻ công thức bên phải,
 * nút bật bếp bên trái nồi, hàng nguyên liệu ở mép dưới.
 * Cổng phụ huynh chiếm góc trên-phải 120×120 nên mọi thứ chạm được đều tránh góc đó.
 */

export const STAGE_W = 1194;
export const STAGE_H = 834;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Mép trên mặt quầy (khách đứng sau, bị quầy che phần chân). */
export const COUNTER_Y = 372;

/** Khách: giữa màn, phía trên nồi. */
export const CUSTOMER: Rect = { x: 407, y: 70, w: 380, h: 380 };

/** Nồi (thân nồi; miệng nồi là phần trên). */
export const POT: Rect = { x: 437, y: 408, w: 320, h: 236 };
/** Tâm và bán kính mặt nước trong nồi. */
export const POT_SURFACE = { cx: POT.x + POT.w / 2, cy: POT.y + 34, rx: 132, ry: 30 };

/** Nút bật bếp (bên trái nồi). */
export const STOVE_SIZE = 140;
export const STOVE = { x: 252, y: 472 };

/** Thẻ công thức (bên phải, dưới góc cổng phụ huynh). */
export const CARD: Rect = { x: 846, y: 132, w: 196, h: 358 };

/** Chỗ bát/cốc múc ra (dưới thẻ công thức). */
export const BOWL: Rect = { x: 812, y: 522, w: 164, h: 140 };

/** Đầu bếp (bạn đồng hành) đứng sau quầy bên trái, dưới nút về nhà. */
export const CHEF: Rect = { x: 172, y: 146, w: 214, h: 226 };

/** Hàng nguyên liệu ở mép dưới. */
export const ITEM_SIZE = 130;
export const ITEM_GAP = 34;
export const ITEM_Y = 684;

/** Ô từng nguyên liệu trên quầy, xếp đều quanh giữa nồi. */
export function layoutItems(count: number): Rect[] {
  const step = ITEM_SIZE + ITEM_GAP;
  return Array.from({ length: count }, (_, i) => {
    const cx = POT_SURFACE.cx + (i - (count - 1) / 2) * step;
    return { x: Math.round(cx - ITEM_SIZE / 2), y: ITEM_Y, w: ITEM_SIZE, h: ITEM_SIZE };
  });
}

/** Vị trí nguyên liệu nổi trong nồi: rải quanh mặt nước, quay theo vòng khuấy `turn` (radian). */
export function floatSpot(i: number, count: number, turn: number): { x: number; y: number } {
  const a = (i / Math.max(count, 1)) * Math.PI * 2 + 0.6 + turn;
  const r = count === 1 ? 0 : 0.62;
  return {
    x: Math.round(POT_SURFACE.cx + Math.cos(a) * POT_SURFACE.rx * r),
    y: Math.round(POT_SURFACE.cy + Math.sin(a) * POT_SURFACE.ry * r),
  };
}

/** Chỗ bát đặt trước mặt khách khi được phục vụ. */
export const SERVED: Rect = { x: CUSTOMER.x + CUSTOMER.w / 2 - 80, y: COUNTER_Y - 96, w: 160, h: 136 };
