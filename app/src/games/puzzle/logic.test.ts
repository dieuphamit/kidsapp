import { describe, test, expect } from 'vitest';
import {
  newPuzzle,
  snap,
  placePiece,
  nextRound,
  initialPieceCount,
  pieceTargetPosition,
  cardContentKey,
} from './logic';

describe('initialPieceCount', () => {
  test('bé < 42 tháng → 2 mảnh', () => {
    expect(initialPieceCount(24)).toBe(2);
    expect(initialPieceCount(30)).toBe(2);
    expect(initialPieceCount(41)).toBe(2);
  });

  test('bé >= 42 tháng → 3 mảnh', () => {
    expect(initialPieceCount(42)).toBe(3);
    expect(initialPieceCount(48)).toBe(3);
    expect(initialPieceCount(60)).toBe(3);
  });
});

describe('newPuzzle', () => {
  test('tạo puzzle với 2 mảnh', () => {
    const state = newPuzzle(2, 123);
    expect(state.pieceCount).toBe(2);
    expect(state.pieces).toHaveLength(2);
    expect(state.pieces[0]).toEqual({ index: 0, placed: false });
    expect(state.pieces[1]).toEqual({ index: 1, placed: false });
    expect(state.done).toBe(false);
  });

  test('tạo puzzle với 3 mảnh', () => {
    const state = newPuzzle(3, 456);
    expect(state.pieceCount).toBe(3);
    expect(state.pieces).toHaveLength(3);
  });

  test('tạo puzzle với 4 mảnh', () => {
    const state = newPuzzle(4, 789);
    expect(state.pieceCount).toBe(4);
    expect(state.pieces).toHaveLength(4);
  });

  test('seed khác nhau → card khác nhau (thường)', () => {
    const s1 = newPuzzle(2, 1);
    const s2 = newPuzzle(2, 999);
    // Với các seed khác nhau, thường sẽ chọn card khác
    // Không assert vì có thể trùng, chỉ cần không lỗi
    expect(s1.cardId).toBeTruthy();
    expect(s2.cardId).toBeTruthy();
  });
});

describe('pieceTargetPosition', () => {
  const W = 360;
  const H = 360;

  test('2 mảnh cắt dọc', () => {
    const p0 = pieceTargetPosition(0, W, H, 2);
    expect(p0.x).toBe(90); // 360/4
    expect(p0.y).toBe(180); // 360/2

    const p1 = pieceTargetPosition(1, W, H, 2);
    expect(p1.x).toBe(270); // 360*3/4
    expect(p1.y).toBe(180);
  });

  test('3 mảnh cắt dọc', () => {
    const p0 = pieceTargetPosition(0, W, H, 3);
    expect(p0.x).toBe(60); // 360/6
    expect(p0.y).toBe(180);

    const p1 = pieceTargetPosition(1, W, H, 3);
    expect(p1.x).toBe(180); // 360/2
    expect(p1.y).toBe(180);

    const p2 = pieceTargetPosition(2, W, H, 3);
    expect(p2.x).toBe(300); // 360*5/6
    expect(p2.y).toBe(180);
  });

  test('4 mảnh lưới 2x2', () => {
    const p0 = pieceTargetPosition(0, W, H, 4); // top-left
    expect(p0.x).toBe(90);
    expect(p0.y).toBe(90);

    const p1 = pieceTargetPosition(1, W, H, 4); // top-right
    expect(p1.x).toBe(270);
    expect(p1.y).toBe(90);

    const p2 = pieceTargetPosition(2, W, H, 4); // bottom-left
    expect(p2.x).toBe(90);
    expect(p2.y).toBe(270);

    const p3 = pieceTargetPosition(3, W, H, 4); // bottom-right
    expect(p3.x).toBe(270);
    expect(p3.y).toBe(270);
  });
});

describe('snap', () => {
  const W = 360;
  const H = 360;
  const threshold = Math.min(W, H) * 0.18; // 64.8

  test('mảnh 0 đặt đúng chỗ → true', () => {
    // Mảnh 0 của 2 mảnh: target là (90, 180)
    expect(snap(0, 90, 180, W, H, 2)).toBe(true);
  });

  test('mảnh 0 gần đúng (trong ngưỡng) → true', () => {
    // Cách 50px < 64.8
    expect(snap(0, 90 + 50, 180, W, H, 2)).toBe(true);
    expect(snap(0, 90, 180 + 50, W, H, 2)).toBe(true);
  });

  test('mảnh 0 xa đúng (ngoài ngưỡng) → false', () => {
    // Cách 70px > 64.8
    expect(snap(0, 90 + 70, 180, W, H, 2)).toBe(false);
    expect(snap(0, 90, 180 + 70, W, H, 2)).toBe(false);
  });

  test('mảnh 1 của 2 mảnh', () => {
    // Target: (270, 180)
    expect(snap(1, 270, 180, W, H, 2)).toBe(true);
    expect(snap(1, 270, 180 + 100, W, H, 2)).toBe(false);
  });

  test('4 mảnh: mảnh 3 bottom-right', () => {
    // Target: (270, 270)
    expect(snap(3, 270, 270, W, H, 4)).toBe(true);
    expect(snap(3, 100, 100, W, H, 4)).toBe(false);
  });
});

describe('placePiece', () => {
  test('đặt một mảnh → pieces cập nhật, done = false', () => {
    const state = newPuzzle(2, 123);
    const next = placePiece(state, 0);
    expect(next.pieces[0].placed).toBe(true);
    expect(next.pieces[1].placed).toBe(false);
    expect(next.done).toBe(false);
  });

  test('đặt mảnh cuối → done = true, winsAtPieceCount tăng', () => {
    let state = newPuzzle(2, 123);
    state = placePiece(state, 0);
    state = placePiece(state, 1);
    expect(state.done).toBe(true);
    expect(state.winsAtPieceCount).toBe(1);
  });
});

describe('nextRound', () => {
  test('sau 1 ván thắng → vẫn giữ pieceCount', () => {
    let state = newPuzzle(2, 111);
    state = placePiece(state, 0);
    state = placePiece(state, 1);
    expect(state.winsAtPieceCount).toBe(1);

    const next = nextRound(state, 222);
    expect(next.pieceCount).toBe(2);
    expect(next.winsAtPieceCount).toBe(1);
    expect(next.done).toBe(false);
  });

  test('sau 2 ván thắng với 2 mảnh → tăng lên 3 mảnh', () => {
    let state = newPuzzle(2, 111);
    // Ván 1
    state = placePiece(state, 0);
    state = placePiece(state, 1);
    state = nextRound(state, 222);
    // Ván 2
    state = placePiece(state, 0);
    state = placePiece(state, 1);
    expect(state.winsAtPieceCount).toBe(2);

    const next = nextRound(state, 333);
    expect(next.pieceCount).toBe(3);
    expect(next.winsAtPieceCount).toBe(0); // reset khi tăng level
  });

  test('sau 2 ván thắng với 3 mảnh → tăng lên 4 mảnh', () => {
    let state = newPuzzle(3, 111);
    // Ván 1
    state = placePiece(state, 0);
    state = placePiece(state, 1);
    state = placePiece(state, 2);
    state = nextRound(state, 222);
    // Ván 2
    state = placePiece(state, 0);
    state = placePiece(state, 1);
    state = placePiece(state, 2);
    expect(state.winsAtPieceCount).toBe(2);

    const next = nextRound(state, 333);
    expect(next.pieceCount).toBe(4);
  });

  test('4 mảnh đã là max → vẫn giữ 4', () => {
    let state = newPuzzle(4, 111);
    // Ván 1
    for (let i = 0; i < 4; i++) state = placePiece(state, i);
    state = nextRound(state, 222);
    // Ván 2
    for (let i = 0; i < 4; i++) state = placePiece(state, i);

    const next = nextRound(state, 333);
    expect(next.pieceCount).toBe(4);
  });
});

describe('cardContentKey', () => {
  test('animal card → animal.xxx', () => {
    expect(cardContentKey('cow')).toBe('animal.cow');
    expect(cardContentKey('dog')).toBe('animal.dog');
  });

  test('fruit card → fruit.xxx', () => {
    expect(cardContentKey('apple')).toBe('fruit.apple');
    expect(cardContentKey('banana')).toBe('fruit.banana');
  });
});
