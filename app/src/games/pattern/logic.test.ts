import { describe, it, expect } from 'vitest';
import { newRound, nextLevel, levelsForAge, FRUITS, LEVELS, type Level } from './logic';

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
