import { describe, it, expect } from 'vitest';
import {
  newRound,
  nextLevel,
  levelsForAge,
  choiceCountForAge,
  kindsForTopic,
  nextKey,
  pickKind,
  sayKey,
  startLevel,
  FRUITS,
  ITEMS,
  KINDS,
  LEVELS,
  type Level,
} from './logic';
import { contentByKey } from '../../core/content';

const UNIT: Record<Level, number[]> = {
  AB: [0, 1],
  AAB: [0, 0, 1],
  ABB: [0, 1, 1],
  ABC: [0, 1, 2],
};

/** Chuyển chuỗi quả thành dạng chữ: quả gặp đầu tiên là A, quả thứ hai là B... */
function shape(seq: string[]): string {
  const seen: string[] = [];
  return seq
    .map((f) => {
      if (!seen.includes(f)) seen.push(f);
      return 'ABC'[seen.indexOf(f)];
    })
    .join('');
}

describe('newRound', () => {
  for (const level of LEVELS) {
    it(`mức ${level}: chuỗi + đáp án đúng quy luật`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const r = newRound(level, seed);
        expect(r.shown.length).toBe(level === 'ABC' ? 6 : 5);
        const full = [...r.shown, r.answer];
        const unit = UNIT[level];
        const expected = full.map((_, i) => 'ABC'[unit[i % unit.length]]).join('');
        expect(shape(full)).toBe(expected);
        // số quả khác nhau đúng bằng số chữ khác nhau của mức
        expect(new Set(full).size).toBe(new Set(unit).size);
      }
    });

    it(`mức ${level}: 3 lựa chọn không trùng, có đáp án, có một quả trong chuỗi`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const r = newRound(level, seed);
        expect(r.choices.length).toBe(3);
        expect(new Set(r.choices).size).toBe(3);
        expect(r.choices).toContain(r.answer);
        const others = r.choices.filter((c) => c !== r.answer);
        expect(others.some((c) => r.shown.includes(c))).toBe(true);
      }
    });
  }

  it('chỉ dùng quả khác màu rõ', () => {
    expect(FRUITS).toEqual(['apple', 'banana', 'grapes', 'orange', 'pear', 'strawberry', 'watermelon']);
    for (let seed = 1; seed <= 100; seed++) {
      for (const level of LEVELS) {
        const r = newRound(level, seed);
        for (const f of [...r.shown, ...r.choices]) expect(FRUITS).toContain(f);
      }
    }
  });

  it('cùng seed thì cùng ván, khác seed thì có ván khác nhau', () => {
    expect(newRound('AB', 42)).toEqual(newRound('AB', 42));
    const keys = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(newRound('AB', i + 1))));
    expect(keys.size).toBeGreaterThan(5);
  });

  it('vị trí đáp án trong lựa chọn thay đổi', () => {
    const pos = new Set(
      Array.from({ length: 50 }, (_, i) => {
        const r = newRound('AAB', i + 1);
        return r.choices.indexOf(r.answer);
      }),
    );
    expect(pos.size).toBe(3);
  });
});

describe('nextLevel', () => {
  it('chưa đủ 3 ván liên tiếp thì giữ mức', () => {
    expect(nextLevel('AB', 0)).toBe('AB');
    expect(nextLevel('AB', 2)).toBe('AB');
  });

  it('đủ 3 ván thì lên AB → AAB → ABB → ABC', () => {
    expect(nextLevel('AB', 3)).toBe('AAB');
    expect(nextLevel('AAB', 3)).toBe('ABB');
    expect(nextLevel('ABB', 3)).toBe('ABC');
  });

  it('ABC là cao nhất', () => {
    expect(nextLevel('ABC', 3)).toBe('ABC');
    expect(nextLevel('ABC', 10)).toBe('ABC');
  });

  it('bé < 36 tháng chỉ tới AAB', () => {
    expect(nextLevel('AB', 3, 30)).toBe('AAB');
    expect(nextLevel('AAB', 3, 30)).toBe('AAB');
    expect(nextLevel('AAB', 3, 35)).toBe('AAB');
    expect(nextLevel('AAB', 3, 36)).toBe('ABB');
  });
});

describe('levelsForAge', () => {
  it('< 36 tháng: AB, AAB', () => {
    expect(levelsForAge(30)).toEqual(['AB', 'AAB']);
    expect(levelsForAge(35)).toEqual(['AB', 'AAB']);
  });
  it('≥ 36 tháng: đủ 4 mức', () => {
    expect(levelsForAge(36)).toEqual(['AB', 'AAB', 'ABB', 'ABC']);
    expect(levelsForAge(72)).toEqual(['AB', 'AAB', 'ABB', 'ABC']);
  });
});

describe('loại hạt (quả, con vật, tiếng kêu, màu, hình)', () => {
  for (const kind of KINDS) {
    it(`${kind}: chuỗi đúng quy luật, chỉ dùng hạt của loại đó, lựa chọn 2–4 không trùng`, () => {
      for (const level of LEVELS) {
        for (const choices of [2, 3, 4]) {
          for (let seed = 1; seed <= 60; seed++) {
            const r = newRound(level, seed, { kind, choices });
            const full = [...r.shown, r.answer];
            const unit = UNIT[level];
            expect(shape(full)).toBe(full.map((_, i) => 'ABC'[unit[i % unit.length]]).join(''));
            for (const id of [...full, ...r.choices]) expect(ITEMS[kind]).toContain(id);
            expect(r.choices).toHaveLength(choices);
            expect(new Set(r.choices).size).toBe(choices);
            expect(r.choices).toContain(r.answer);
            expect(r.choices.some((c) => c !== r.answer && r.shown.includes(c))).toBe(true);
          }
        }
      }
    });
  }

  it('mọi hạt và câu hỏi đều có câu đọc (tiếng kêu là ghi âm thật, key animal.<id>-sound)', () => {
    const content = contentByKey();
    for (const kind of KINDS) {
      expect(content.has(nextKey(kind)), nextKey(kind)).toBe(true);
      for (const id of ITEMS[kind]) {
        const key = sayKey(kind, id);
        if (kind === 'sound') expect(key).toBe(`animal.${id}-sound`);
        else expect(content.has(key), key).toBe(true);
      }
    }
    // thú dùng cho tiếng kêu đều có tên (check:audio buộc có tiếng kêu thật)
    for (const id of ITEMS.sound) expect(content.has(`animal.${id}`), id).toBe(true);
  });

  it('chủ đề quyết định loại hạt', () => {
    expect(kindsForTopic('mix')).toEqual(KINDS);
    expect(kindsForTopic('fruits')).toEqual(['fruit']);
    expect(kindsForTopic('animals')).toEqual(['animal', 'sound']);
    expect(kindsForTopic('shapes')).toEqual(['color', 'shape']);
  });

  it('ván kế đổi loại hạt (không lặp loại vừa chơi) và đi qua đủ loại', () => {
    let last = pickKind(KINDS, null, 1);
    const seen = new Set([last]);
    for (let seed = 2; seed < 80; seed++) {
      const k = pickKind(KINDS, last, seed);
      expect(k).not.toBe(last);
      seen.add(k);
      last = k;
    }
    expect(seen.size).toBe(KINDS.length);
    expect(pickKind(['fruit'], 'fruit', 5)).toBe('fruit');
  });
});

describe('độ khó', () => {
  it('số lựa chọn: Dễ 2, Vừa 3, Khó 4', () => {
    expect(choiceCountForAge(30)).toBe(2);
    expect(choiceCountForAge(36)).toBe(3);
    expect(choiceCountForAge(53)).toBe(3);
    expect(choiceCountForAge(54)).toBe(4);
  });

  it('mức bắt đầu: Khó vào thẳng AAB', () => {
    expect(startLevel(30)).toBe('AB');
    expect(startLevel(48)).toBe('AB');
    expect(startLevel(54)).toBe('AAB');
  });
});
