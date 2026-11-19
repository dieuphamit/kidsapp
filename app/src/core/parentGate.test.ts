import { describe, it, expect } from 'vitest';
import { makeQuestion, checkAnswer, questionText, HOLD_MS, CHOICE_COUNT } from './parentGate';

/** Dãy số giả ngẫu nhiên lặp lại được (LCG) để quét nhiều câu hỏi. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('parentGate', () => {
  it('giữ 3 giây', () => expect(HOLD_MS).toBe(3000));

  it('rand nhỏ: phép nhân bảng cửu chương', () => {
    const q = makeQuestion(() => 0);
    expect(q.op).toBe('×');
    expect(q.a).toBe(3);
    expect(q.b).toBe(3);
    expect(q.answer).toBe(9);
    expect(questionText(q)).toBe('3 × 3 = ?');
  });

  it('rand lớn: phép cộng hai số có 2 chữ số', () => {
    const q = makeQuestion(() => 0.99);
    expect(q.op).toBe('+');
    expect(q.a).toBeGreaterThanOrEqual(15);
    expect(q.a).toBeLessThanOrEqual(49);
    expect(q.answer).toBe(q.a + q.b);
    expect(questionText(q)).toBe(`${q.a} + ${q.b} = ?`);
  });

  it('500 câu: luôn 4 đáp án dương khác nhau, đúng một đáp án đúng, phép tính đúng', () => {
    const rand = seeded(42);
    const ops = new Set<string>();
    const answerSlots = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion(rand);
      ops.add(q.op);
      expect(q.answer).toBe(q.op === '×' ? q.a * q.b : q.a + q.b);
      expect(q.choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(q.choices).size).toBe(CHOICE_COUNT);
      expect(q.choices.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
      expect(q.choices.filter((n) => checkAnswer(q, n))).toEqual([q.answer]);
      answerSlots.add(q.choices.indexOf(q.answer));
    }
    expect(ops).toEqual(new Set(['×', '+']));
    // đáp án đúng không nằm cố định một chỗ
    expect(answerSlots.size).toBe(CHOICE_COUNT);
  });

  it('kiểm tra đáp án', () => {
    const q = makeQuestion(() => 0);
    expect(checkAnswer(q, 9)).toBe(true);
    expect(checkAnswer(q, 12)).toBe(false);
  });
});
