import { describe, it, expect } from 'vitest';
import { ANIMALS, POOLS, newRound, dropResult, choiceCountForAge, type AnimalId } from './logic';
import { pictureSayKey } from '../../content/pictures';
import { contentByKey } from '../../core/content';

describe('shadow logic', () => {
  describe('ANIMALS', () => {
    it('có ít nhất 20 con thú khác nhau', () => {
      expect(ANIMALS.length).toBeGreaterThanOrEqual(20);
      expect(new Set(ANIMALS).size).toBe(ANIMALS.length);
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

  describe('chủ đề và kho hình', () => {
    it('mọi hình trong kho có câu đọc tên vi/ja/en', () => {
      const content = contentByKey();
      for (const id of [...POOLS.animals, ...POOLS.fruits, ...POOLS.shapes]) {
        const item = content.get(pictureSayKey(id));
        expect(item, pictureSayKey(id)).toBeTruthy();
        expect(item!.en, `${id}.en`).toBeTruthy();
      }
    });

    it('chủ đề cố định thì đáp án và lựa chọn đều trong nhóm đó', () => {
      for (const topic of ['animals', 'fruits', 'shapes'] as const) {
        for (let t = 0; t < 20; t++) {
          const r = newRound(4, Math.random, undefined, topic);
          expect(r.group).toBe(topic);
          for (const c of r.choices) expect(POOLS[topic]).toContain(c);
        }
      }
    });

    it('trộn: mỗi ván một nhóm, lựa chọn cùng nhóm đáp án, đủ cả 3 nhóm', () => {
      const groups = new Set<string>();
      for (let t = 0; t < 60; t++) {
        const r = newRound(3, Math.random, undefined, 'mix');
        groups.add(r.group);
        for (const c of r.choices) expect(POOLS[r.group]).toContain(c);
      }
      expect(groups.size).toBe(3);
    });

    it('không lặp hình của vài ván gần nhất', () => {
      const recent: AnimalId[] = [];
      for (let t = 0; t < 40; t++) {
        const r = newRound(2, Math.random, recent, 'shapes');
        expect(recent).not.toContain(r.answer);
        recent.push(r.answer);
        if (recent.length > 3) recent.shift();
      }
    });

    it('số lựa chọn theo tuổi: 2 / 3 / 4', () => {
      expect(choiceCountForAge(24)).toBe(2);
      expect(choiceCountForAge(36)).toBe(3);
      expect(choiceCountForAge(54)).toBe(4);
      expect(newRound(4, Math.random, undefined, 'fruits').choices).toHaveLength(4);
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
