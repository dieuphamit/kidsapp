import { describe, it, expect } from 'vitest';
import { ANIMALS, newRound, dropResult, type AnimalId } from './logic';
import { contentByKey } from '../../core/content';

describe('shadow logic', () => {
  describe('ANIMALS', () => {
    it('có 10 con thú khác nhau', () => {
      expect(ANIMALS.length).toBe(10);
      const unique = new Set(ANIMALS);
      expect(unique.size).toBe(10);
    });

    it('mỗi con có animal.<id> trong content', () => {
      const content = contentByKey();
      for (const id of ANIMALS) {
        const key = `animal.${id}`;
        expect(content.has(key), `Thiếu ${key}`).toBe(true);
        const item = content.get(key)!;
        expect(item.vi, `${key}.vi`).toBeTruthy();
        expect(item.ja, `${key}.ja`).toBeTruthy();
      }
    });
  });

  describe('newRound', () => {
    it('trả về đúng số lựa chọn', () => {
      let i = 0;
      const rand = () => [0.1, 0.3, 0.5, 0.7, 0.9][i++ % 5];

      const r2 = newRound(2, rand);
      expect(r2.choices.length).toBe(2);
      expect(r2.choices).toContain(r2.answer);

      const r3 = newRound(3, rand);
      expect(r3.choices.length).toBe(3);
      expect(r3.choices).toContain(r3.answer);
    });

    it('không có thú trùng trong choices', () => {
      for (let t = 0; t < 10; t++) {
        const round = newRound(3);
        const unique = new Set(round.choices);
        expect(unique.size).toBe(round.choices.length);
      }
    });

    it('answer luôn nằm trong choices', () => {
      for (let t = 0; t < 10; t++) {
        const round = newRound(3);
        expect(round.choices).toContain(round.answer);
      }
    });

    it('với cùng seed tạo ra cùng kết quả', () => {
      const makeRand = () => {
        let i = 0;
        return () => [0.2, 0.4, 0.6, 0.8, 0.1][i++ % 5];
      };
      const r1 = newRound(3, makeRand());
      const r2 = newRound(3, makeRand());
      expect(r1).toEqual(r2);
    });

    it('exclude loại trừ thú vừa chọn', () => {
      // Chạy 20 lần với exclude, không được có exclude trong answer
      for (let t = 0; t < 20; t++) {
        const exclude: AnimalId = 'elephant';
        const round = newRound(3, Math.random, exclude);
        expect(round.answer).not.toBe(exclude);
      }
    });
  });

  describe('dropResult', () => {
    it('thả xa => none', () => {
      const r = dropResult('elephant', 'elephant', 200, 150);
      expect(r).toBe('none');
    });

    it('thả gần đúng thú => snap', () => {
      const r = dropResult('elephant', 'elephant', 100, 150);
      expect(r).toBe('snap');
    });

    it('thả gần nhưng sai thú => wrong', () => {
      const r = dropResult('giraffe', 'elephant', 100, 150);
      expect(r).toBe('wrong');
    });

    it('custom radius', () => {
      expect(dropResult('elephant', 'elephant', 80, 100)).toBe('snap');
      expect(dropResult('elephant', 'elephant', 120, 100)).toBe('none');
    });
  });
});
