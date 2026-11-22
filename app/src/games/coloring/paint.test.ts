import { describe, it, expect } from 'vitest';
import { MAX_UNDO, canRedo, canUndo, filledCount, isComplete, isFillId, newHistory, paint, redo, undo, fillKey } from './paint';

describe('tô màu: hoàn tác / làm lại', () => {
  it('tô vùng tạo bước mới; tô lại đúng màu cũ thì không', () => {
    const h0 = newHistory();
    const h1 = paint(h0, 'head', 'red');
    expect(h1.present).toEqual({ head: 'red' });
    expect(canUndo(h1)).toBe(true);
    expect(paint(h1, 'head', 'red')).toBe(h1);
    const h2 = paint(h1, 'head', 'blue');
    expect(h2.present).toEqual({ head: 'blue' });
    expect(h2.past).toHaveLength(2);
  });

  it('hoàn tác rồi làm lại về đúng trạng thái; tô mới thì xoá nhánh làm lại', () => {
    let h = newHistory({ ear: 'pink' });
    h = paint(h, 'head', 'red');
    h = paint(h, 'nose', 'black');
    h = undo(h);
    expect(h.present).toEqual({ ear: 'pink', head: 'red' });
    expect(canRedo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toEqual({ ear: 'pink' });
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h.present).toEqual({ ear: 'pink', head: 'red' });
    h = paint(h, 'head', 'rainbow');
    expect(canRedo(h)).toBe(false);
    expect(redo(h)).toBe(h);
  });

  it(`giữ tối đa ${MAX_UNDO} bước`, () => {
    let h = newHistory();
    for (let i = 0; i < MAX_UNDO + 10; i++) h = paint(h, `r${i}`, i % 2 ? 'red' : 'blue');
    expect(h.past).toHaveLength(MAX_UNDO);
  });

  it('tô xong khi mọi vùng đều có màu', () => {
    const ids = ['a', 'b', 'c'];
    expect(isComplete({ a: 'red', b: 'red' }, ids)).toBe(false);
    expect(isComplete({ a: 'red', b: 'red', c: 'sparkle' }, ids)).toBe(true);
    expect(isComplete({}, [])).toBe(false);
    expect(filledCount({ a: 'red', z: 'red' }, ids)).toBe(1);
  });

  it('mã màu và câu đọc', () => {
    expect(isFillId('red')).toBe(true);
    expect(isFillId('rainbow')).toBe(true);
    expect(isFillId('magenta')).toBe(false);
    expect(isFillId(3)).toBe(false);
    expect(fillKey('red')).toBe('color.red');
    expect(fillKey('sparkle')).toBe('coloring.sparkle');
  });
});
