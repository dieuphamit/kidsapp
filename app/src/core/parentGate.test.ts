import { describe, it, expect } from 'vitest';
import { makeQuestion, checkAnswer, HOLD_MS } from './parentGate';

describe('parentGate', () => {
  it('giữ 3 giây', () => expect(HOLD_MS).toBe(3000));
  it('phép cộng 2 chữ số', () => {
    const q = makeQuestion(() => 0.5);
    expect(q.a).toBeGreaterThanOrEqual(10);
    expect(q.a).toBeLessThanOrEqual(49);
    expect(q.answer).toBe(q.a + q.b);
  });
  it('kiểm tra đáp án, bỏ khoảng trắng', () => {
    const q = { a: 12, b: 30, answer: 42 };
    expect(checkAnswer(q, ' 42 ')).toBe(true);
    expect(checkAnswer(q, '41')).toBe(false);
    expect(checkAnswer(q, '')).toBe(false);
  });
});
