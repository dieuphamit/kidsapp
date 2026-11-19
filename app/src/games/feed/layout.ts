/**
 * Bố cục trò "Cho thú ăn" trong khung Stage 1194×834 (toạ độ khung, px).
 * Thú đứng giữa màn, thanh no bụng ở trên, khay món ăn ở dưới.
 */

export const STAGE_W = 1194;
/** Cỡ một món trên khay (vùng chạm ≥120). */
export const FOOD_SIZE = 150;
/** Khoảng cách giữa hai món (≥24). */
export const FOOD_GAP = 64;
/** Mép trên của hàng món. */
export const TRAY_Y = 642;

export interface Box {
  x: number;
  y: number;
  size: number;
}

/** Ô của con thú: giữa màn, chân chạm ngay trên khay. */
export function animalBox(): Box {
  const size = 450;
  return { x: Math.round(STAGE_W / 2 - size / 2), y: 148, size };
}

/** Ô của từng món trên khay, xếp đều quanh giữa khung. */
export function layoutFoods(count: number): Box[] {
  const step = FOOD_SIZE + FOOD_GAP;
  return Array.from({ length: count }, (_, i) => {
    const cx = STAGE_W / 2 + (i - (count - 1) / 2) * step;
    return { x: Math.round(cx - FOOD_SIZE / 2), y: TRAY_Y, size: FOOD_SIZE };
  });
}

/** Ô của khay (đế mây dưới các món). */
export function trayBox(count: number): { x: number; y: number; w: number; h: number } {
  const foods = layoutFoods(count);
  const left = foods[0].x - 40;
  const right = foods[foods.length - 1].x + FOOD_SIZE + 40;
  return { x: left, y: TRAY_Y + 26, w: right - left, h: FOOD_SIZE - 4 };
}

/** Điểm miệng thú trong khung, từ tỉ lệ miệng trong ảnh. */
export function mouthPoint(animal: Box, mouth: readonly [number, number]): { x: number; y: number } {
  return { x: Math.round(animal.x + mouth[0] * animal.size), y: Math.round(animal.y + mouth[1] * animal.size) };
}
