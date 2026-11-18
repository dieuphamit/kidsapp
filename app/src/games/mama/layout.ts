/**
 * Bố cục trò "Mẹ ơi, con đâu?" trong khung Stage 1194×834 (toạ độ khung, px).
 * Thú mẹ đứng thành hàng trên cỏ phía dưới, thú con đứng ở ổ rơm giữa màn.
 */

export const STAGE_W = 1194;
/** Chân thú mẹ chạm cỏ ở y này. */
export const GROUND_Y = 806;
/** Cỡ thú con ở ổ (vùng chạm ≥120). */
export const BABY_SIZE = 180;

export interface Box {
  x: number;
  y: number;
  size: number;
}

/** Cỡ một thú mẹ theo số mẹ trên màn (mẹ luôn to hơn con rõ rệt). */
export function mamaSize(count: number): number {
  if (count <= 2) return 290;
  if (count === 3) return 272;
  return 250;
}

/** Ô của từng thú mẹ, xếp đều quanh giữa khung; khoảng cách giữa hai ô ≥24px. */
export function layoutMamas(count: number): Box[] {
  const size = mamaSize(count);
  const step = count <= 2 ? 500 : count === 3 ? 340 : 274;
  return Array.from({ length: count }, (_, i) => {
    const cx = STAGE_W / 2 + (i - (count - 1) / 2) * step;
    return { x: Math.round(cx - size / 2), y: GROUND_Y - size, size };
  });
}

/** Ổ của thú con: giữa màn, phía trên hàng thú mẹ. */
export function nestBox(): Box {
  return { x: Math.round(STAGE_W / 2 - BABY_SIZE / 2), y: 262, size: BABY_SIZE };
}

/**
 * Chỗ thú con rúc vào mẹ: nhỏ lại, đứng sát trước mặt mẹ (phía mẹ nhìn).
 * @param mamaFaces 1 = ảnh mẹ nhìn sang phải, -1 = nhìn sang trái
 */
export function snuggleBox(mama: Box, mamaFaces: 1 | -1): Box {
  const size = Math.round(mama.size * 0.56);
  const x = mamaFaces < 0 ? mama.x - size * 0.22 : mama.x + mama.size - size * 0.78;
  return { x: Math.round(x), y: Math.round(mama.y + mama.size - size - 2), size };
}
