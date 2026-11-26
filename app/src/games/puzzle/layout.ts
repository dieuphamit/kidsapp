/** Bố cục trò Ghép hình trong khung Stage 1194×834: khung ghép ở giữa, mảnh xếp hai bên. */
export const FRAME_SIZE = 360; // px, khung ghép ≥ 360px theo spec
export const PIECE_MIN_SIZE = 120; // luật UX: vùng chạm ≥ 120px
export const STAGE_W = 1194;
export const STAGE_H = 834;
/** Mép phải: cổng bố mẹ ở góc trên-phải, mảnh ghép cách mép phải ≥144px. */
export const RIGHT_EDGE = STAGE_W - 144;
/** Mép trái: nút về nhà 24..144 ở góc trên-trái; mảnh bắt đầu từ đây. */
export const LEFT_EDGE = 80;
export const GAP = 24;
/** Mảnh đang kéo luôn còn ít nhất chừng này px nằm trong khung (không kéo mất ra ngoài). */
export const KEEP_IN = 60;


export interface PiecePosition {
  x: number; // toạ độ tâm trong stage
  y: number;
}

/** Tính kích thước một mảnh. */
export function pieceDimensions(pieceCount: 2 | 3 | 4): { w: number; h: number } {
  if (pieceCount === 2) return { w: FRAME_SIZE / 2, h: FRAME_SIZE };
  if (pieceCount === 3) return { w: FRAME_SIZE / 3, h: FRAME_SIZE };
  // pieceCount === 4
  return { w: FRAME_SIZE / 2, h: FRAME_SIZE / 2 };
}

/**
 * Vị trí ban đầu của các mảnh ở hai bên khung. Mảnh bên phải không vào dải 144px mép phải
 * (cổng bố mẹ), mảnh bên trái không đè nút về nhà (24..144 ở góc trên-trái); các mảnh cách nhau ≥24px.
 */
export function initialTrayPositions(pieceCount: 2 | 3 | 4): PiecePosition[] {
  const { w, h } = pieceDimensions(pieceCount);
  const centerY = STAGE_H / 2;
  const left = LEFT_EDGE + w / 2;
  const right = RIGHT_EDGE - w / 2;
  if (pieceCount === 2) return [{ x: left + 20, y: centerY }, { x: right, y: centerY }];
  if (pieceCount === 3) {
    // mảnh cao 360px: hai mảnh bên trái đứng cạnh nhau (xếp chồng thì đè nút về nhà)
    return [
      { x: left, y: centerY },
      { x: left + w + GAP, y: centerY },
      { x: right, y: centerY },
    ];
  }
  const dy = h / 2 + GAP / 2;
  return [
    { x: left, y: centerY - dy },
    { x: left, y: centerY + dy },
    { x: right, y: centerY - dy },
    { x: right, y: centerY + dy },
  ];
}

