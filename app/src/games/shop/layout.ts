/**
 * Bố cục trò "Cửa hàng" trong khung Stage 1194×834 (toạ độ khung, px).
 * Kệ hàng hai tầng ở giữa phía trên; khách đứng trên sàn bên phải, bong bóng suy nghĩ phía trên khách;
 * quầy tính tiền ở góc dưới-trái có chủ tiệm (bạn đồng hành) và máy tính tiền; giỏ nằm trên sàn
 * lúc gom hàng rồi trượt lên quầy khi đủ món.
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

/** Mép trên của sàn (tường ở trên, sàn ở dưới). */
export const FLOOR_Y = 540;

/** Khung kệ gỗ. */
export const SHELF: Rect = { x: 160, y: 80, w: 640, h: 344 };
/** Mép trên hai tấm ván kệ (món hàng đứng trên ván). */
export const SHELF_BOARDS = [238, 402];
export const ITEM_SIZE = 130;
const ROW_Y = [104, 268];
/** Khoảng cách tâm hai ô cạnh nhau theo số cột: ít món thì bày thưa. */
const STEP: Record<number, number> = { 2: 230, 3: 190, 4: 159 };

/** Ô từng món trên kệ: hai tầng, mỗi tầng `count / 2` món, căn giữa kệ. */
export function shelfSlots(count: number): Rect[] {
  const cols = Math.max(2, Math.ceil(count / 2));
  const step = STEP[cols] ?? 159;
  const cx = SHELF.x + SHELF.w / 2;
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cx + (col - (cols - 1) / 2) * step - ITEM_SIZE / 2;
    return { x: Math.round(x), y: ROW_Y[row] ?? ROW_Y[1], w: ITEM_SIZE, h: ITEM_SIZE };
  });
}

/** Khách: đứng trên sàn bên phải. */
export const CUSTOMER: Rect = { x: 880, y: 330, w: 300, h: 310 };

/** Bong bóng suy nghĩ (trên khách, lệch trái để tránh góc cổng phụ huynh). */
export const BUBBLE: Rect = { x: 814, y: 118, w: 232, h: 168 };

/** Cỡ hình trong bong bóng theo tổng số hình. */
export function wantSize(total: number): number {
  return total <= 2 ? 84 : 60;
}

/** Quầy tính tiền (mặt quầy bắt đầu ở y). */
export const DESK: Rect = { x: -20, y: 600, w: 690, h: 254 };

/** Chủ tiệm (bạn đồng hành) đứng sau quầy, dưới nút về nhà. */
export const KEEPER: Rect = { x: 14, y: 426, w: 176, h: 206 };

/** Máy tính tiền: thân máy và nút bấm to. */
export const REGISTER: Rect = { x: 220, y: 560, w: 180, h: 250 };
export const REGISTER_BTN = { x: 240, y: 652, size: 140 };

/** Giỏ: lúc gom hàng nằm trên sàn; đủ món thì trượt lên quầy. */
export const BASKET_W = 240;
export const BASKET_H = 190;
export const BASKET_SHOP = { x: 668, y: 612 };
export const BASKET_DESK = { x: 414, y: 508 };

export const BASKET_ITEM = 80;
/** Chỗ món thứ `i` trong giỏ (toạ độ trong giỏ): 3 món hàng trước, 3 món sau chồng lên cao hơn. */
export function basketSpot(i: number): { x: number; y: number } {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return { x: 10 + col * 70 + (row % 2 ? 0 : 0), y: row === 0 ? 4 : -50 };
}

/** Nút chơi lại lúc ăn mừng. */
export const REPLAY = { x: STAGE_W / 2 - 80, y: 610, size: 160 };
