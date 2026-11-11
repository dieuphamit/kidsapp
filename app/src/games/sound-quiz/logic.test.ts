import { describe, it, expect } from 'vitest';
import { newQuestion, choiceCountForAge, FARM_ANIMALS, type FarmAnimal } from './logic';

describe('choiceCountForAge', () => {
  it('trả về 2 cho bé dưới 36 tháng', () => {
    expect(choiceCountForAge(24)).toBe(2);
    expect(choiceCountForAge(30)).toBe(2);
    expect(choiceCountForAge(35)).toBe(2);
  });

  it('trả về 3 cho bé từ 36 tháng trở lên', () => {
    expect(choiceCountForAge(36)).toBe(3);
    expect(choiceCountForAge(48)).toBe(3);
    expect(choiceCountForAge(72)).toBe(3);
  });
});

describe('newQuestion', () => {
  it('trả về đúng số lựa chọn theo choiceCount', () => {
    const q2 = newQuestion(2, 12345);
    expect(q2.choices).toHaveLength(2);

    const q3 = newQuestion(3, 12345);
    expect(q3.choices).toHaveLength(3);
  });

  it('đáp án luôn nằm trong danh sách lựa chọn', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q2 = newQuestion(2, seed);
      expect(q2.choices).toContain(q2.answer);

      const q3 = newQuestion(3, seed);
      expect(q3.choices).toContain(q3.answer);
    }
  });

  it('các lựa chọn không trùng nhau', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q2 = newQuestion(2, seed);
      expect(new Set(q2.choices).size).toBe(q2.choices.length);

      const q3 = newQuestion(3, seed);
      expect(new Set(q3.choices).size).toBe(q3.choices.length);
    }
  });

  it('tất cả lựa chọn đều là thú trang trại', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q = newQuestion(3, seed);
      for (const choice of q.choices) {
        expect(FARM_ANIMALS).toContain(choice);
      }
      expect(FARM_ANIMALS).toContain(q.answer);
    }
  });

  it('không lặp đáp án ván trước khi truyền prevId', () => {
    // Chạy nhiều lần với các prevId khác nhau
    for (const prevId of FARM_ANIMALS) {
      for (let seed = 0; seed < 10; seed++) {
        const q = newQuestion(3, seed, prevId);
        expect(q.answer).not.toBe(prevId);
      }
    }
  });

  it('seed cố định cho kết quả giống nhau', () => {
    const q1 = newQuestion(3, 99999);
    const q2 = newQuestion(3, 99999);
    expect(q1.answer).toBe(q2.answer);
    expect(q1.choices).toEqual(q2.choices);
  });

  it('seed khác nhau có thể cho kết quả khác nhau', () => {
    const answers = new Set<FarmAnimal>();
    for (let seed = 0; seed < 50; seed++) {
      const q = newQuestion(3, seed);
      answers.add(q.answer);
    }
    // Với 50 seeds, nên có nhiều hơn 1 đáp án khác nhau
    expect(answers.size).toBeGreaterThan(1);
  });
});
