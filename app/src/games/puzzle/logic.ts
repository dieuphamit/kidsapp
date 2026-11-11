/**
 * Logic thuần cho game ghép hình (puzzle).
 * Không phụ thuộc React hay DOM.
 */

import { FRUIT_IDS, isFruit } from '../../content/fruitIds';

/**
 * Danh sách ID các card (con vật và quả) để dùng làm ảnh ghép.
 * Lấy từ cards/index.json, chỉ dùng farm và fruit để phù hợp với bé nhỏ.
 */
const CARD_IDS = [
  // farm animals
  'cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit', 'cat',
  // fruits
  ...FRUIT_IDS,
];

export interface Piece {
  index: number;
  placed: boolean;
}

export interface PuzzleState {
  cardId: string;
  pieceCount: 2 | 3 | 4;
  pieces: Piece[];
  done: boolean;
  winsAtPieceCount: number; // số ván đã thắng ở pieceCount hiện tại
}

/** Chọn số mảnh ban đầu dựa vào tuổi bé (tháng). */
export function initialPieceCount(ageMonths: number): 2 | 3 | 4 {
  // < 42 tháng (3.5 tuổi) → 2 mảnh, >= 42 → 3 mảnh
  return ageMonths < 42 ? 2 : 3;
}

/** Số mảnh tiếp theo sau mỗi 2 ván thắng. */
function nextPieceCount(current: 2 | 3 | 4, winsAtCurrent: number): 2 | 3 | 4 {
  if (winsAtCurrent >= 2) {
    if (current === 2) return 3;
    if (current === 3) return 4;
  }
  return current;
}

/** Seeded random (LCG) để test deterministic. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Tạo một ván puzzle mới.
 * @param pieceCount số mảnh (2, 3, hoặc 4)
 * @param seed để chọn card deterministic (test), nếu 0 thì random
 * @param winsAtPieceCount số ván đã thắng ở pieceCount này
 */
export function newPuzzle(pieceCount: 2 | 3 | 4, seed = 0, winsAtPieceCount = 0): PuzzleState {
  const rand = seed > 0 ? seededRandom(seed) : Math.random;
  const cardIdx = Math.floor(rand() * CARD_IDS.length);
  const cardId = CARD_IDS[cardIdx];
  const pieces: Piece[] = Array.from({ length: pieceCount }, (_, i) => ({ index: i, placed: false }));
  return { cardId, pieceCount, pieces, done: false, winsAtPieceCount };
}

/**
 * Kiểm tra một mảnh có snap vào đúng chỗ không.
 * @param pieceIdx chỉ số mảnh (0-based)
 * @param x toạ độ x của mảnh (px trong khung puzzle)
 * @param y toạ độ y của mảnh (px trong khung puzzle)
 * @param frameWidth chiều rộng khung ghép (px)
 * @param frameHeight chiều cao khung ghép (px)
 * @param pieceCount số mảnh
 * @returns true nếu mảnh snap vào đúng chỗ (cách < 18% cạnh nhỏ hơn của khung)
 */
export function snap(
  pieceIdx: number,
  x: number,
  y: number,
  frameWidth: number,
  frameHeight: number,
  pieceCount: 2 | 3 | 4,
): boolean {
  const threshold = Math.min(frameWidth, frameHeight) * 0.18;
  const target = pieceTargetPosition(pieceIdx, frameWidth, frameHeight, pieceCount);
  const dx = Math.abs(x - target.x);
  const dy = Math.abs(y - target.y);
  return dx < threshold && dy < threshold;
}

/**
 * Tính vị trí đích (tâm) của một mảnh trong khung.
 */
export function pieceTargetPosition(
  pieceIdx: number,
  frameWidth: number,
  frameHeight: number,
  pieceCount: 2 | 3 | 4,
): { x: number; y: number } {
  if (pieceCount === 2) {
    // Cắt dọc: mảnh 0 bên trái, mảnh 1 bên phải
    const pieceW = frameWidth / 2;
    const x = pieceIdx * pieceW + pieceW / 2;
    const y = frameHeight / 2;
    return { x, y };
  }
  if (pieceCount === 3) {
    // Cắt dọc 3 phần
    const pieceW = frameWidth / 3;
    const x = pieceIdx * pieceW + pieceW / 2;
    const y = frameHeight / 2;
    return { x, y };
  }
  // pieceCount === 4: lưới 2×2
  // [0][1]
  // [2][3]
  const col = pieceIdx % 2;
  const row = Math.floor(pieceIdx / 2);
  const pieceW = frameWidth / 2;
  const pieceH = frameHeight / 2;
  const x = col * pieceW + pieceW / 2;
  const y = row * pieceH + pieceH / 2;
  return { x, y };
}

/**
 * Đặt một mảnh vào đúng chỗ.
 * @returns state mới
 */
export function placePiece(state: PuzzleState, pieceIdx: number): PuzzleState {
  const pieces = state.pieces.map((p, i) => (i === pieceIdx ? { ...p, placed: true } : p));
  const allPlaced = pieces.every((p) => p.placed);
  if (allPlaced) {
    const winsAtPieceCount = state.winsAtPieceCount + 1;
    return { ...state, pieces, done: true, winsAtPieceCount };
  }
  return { ...state, pieces };
}

/**
 * Tạo ván tiếp theo sau khi hoàn thành.
 */
export function nextRound(state: PuzzleState, seed = 0): PuzzleState {
  const newCount = nextPieceCount(state.pieceCount, state.winsAtPieceCount);
  const wins = newCount === state.pieceCount ? state.winsAtPieceCount : 0;
  return newPuzzle(newCount, seed, wins);
}

/**
 * Lấy key nội dung để say tên hình (animal.<id> hoặc fruit.<id>).
 */
export function cardContentKey(cardId: string): string {
  if (isFruit(cardId)) {
    return `fruit.${cardId}`;
  }
  return `animal.${cardId}`;
}
