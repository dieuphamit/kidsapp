import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { contentByKey } from '../../core/content';
import {
  PAIRS,
  BABY_IDS,
  TURNS_PER_ROUND,
  mamaCountForAge,
  newRound,
  currentTurn,
  drop,
  advance,
  isDone,
  askKey,
  foundKey,
  soundKey,
  HELLO_KEY,
  DONE_KEY,
} from './logic';

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');

/** Random cố định để test lặp lại được. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('mama logic', () => {
  it('số thú mẹ theo tuổi: <30 tháng 2, <48 tháng 3, còn lại 4', () => {
    expect(mamaCountForAge(24)).toBe(2);
    expect(mamaCountForAge(29)).toBe(2);
    expect(mamaCountForAge(30)).toBe(3);
    expect(mamaCountForAge(47)).toBe(3);
    expect(mamaCountForAge(48)).toBe(4);
    expect(mamaCountForAge(72)).toBe(4);
  });

  it('một lượt có 5 thú con khác nhau, mỗi lượt có mẹ đúng và đủ số mẹ khác nhau', () => {
    for (const age of [24, 36, 60]) {
      for (let seed = 1; seed < 30; seed++) {
        const s = newRound(age, seeded(seed));
        expect(s.turns).toHaveLength(TURNS_PER_ROUND);
        expect(new Set(s.turns.map((t) => t.baby)).size).toBe(TURNS_PER_ROUND);
        for (const t of s.turns) {
          expect(t.mamas).toHaveLength(mamaCountForAge(age));
          expect(new Set(t.mamas).size).toBe(t.mamas.length);
          expect(t.mamas).toContain(t.baby);
        }
      }
    }
  });

  it('mẹ đúng không luôn đứng một chỗ', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed < 40; seed++) {
      const t = newRound(60, seeded(seed)).turns[0];
      positions.add(t.mamas.indexOf(t.baby));
    }
    expect(positions.size).toBeGreaterThan(2);
  });

  it('tránh thú con của lượt trước khi còn đủ', () => {
    const first = newRound(40, seeded(7));
    const firstBabies = first.turns.map((t) => t.baby);
    const second = newRound(40, seeded(8), firstBabies);
    const fresh = BABY_IDS.length - firstBabies.length;
    const newOnes = second.turns.filter((t) => !firstBabies.includes(t.baby));
    expect(newOnes.length).toBe(Math.min(fresh, TURNS_PER_ROUND));
    // con mới đi trước
    expect(second.turns.slice(0, fresh).every((t) => !firstBabies.includes(t.baby))).toBe(true);
  });

  it('thả đúng mẹ → ok, sai → wrong (không đổi lượt); advance sang con kế đến hết', () => {
    let s = newRound(60, seeded(3));
    for (let i = 0; i < TURNS_PER_ROUND; i++) {
      const t = currentTurn(s)!;
      const wrong = t.mamas.find((m) => m !== t.baby)!;
      expect(drop(s, wrong)).toBe('wrong');
      expect(s.index).toBe(i);
      expect(drop(s, t.baby)).toBe('ok');
      expect(isDone(s)).toBe(false);
      s = advance(s);
    }
    expect(isDone(s)).toBe(true);
    expect(currentTurn(s)).toBeUndefined();
    expect(drop(s, 'calf')).toBe('wrong');
    expect(advance(s).index).toBe(TURNS_PER_ROUND);
  });

  it('mọi câu nói có đủ vi, ja, en', () => {
    const content = contentByKey();
    const keys = [HELLO_KEY, DONE_KEY, 'game.mama', ...BABY_IDS.flatMap((b) => [askKey(b), foundKey(b)])];
    for (const k of keys) {
      const c = content.get(k);
      expect(c, k).toBeDefined();
      expect(c?.vi, k).toBeTruthy();
      expect(c?.ja, k).toBeTruthy();
      expect(c?.en, k).toBeTruthy();
    }
  });

  it('mỗi cặp có ảnh mẹ, ảnh con và tiếng kêu thật của mẹ', () => {
    for (const p of PAIRS) {
      expect(existsSync(join(PUBLIC, 'cards', `${p.mama}.png`)), p.mama).toBe(true);
      expect(existsSync(join(PUBLIC, 'cards', `${p.baby}.png`)), p.baby).toBe(true);
      expect(soundKey(p.id)).toBe(`animal.${p.sound}-sound`);
      expect(existsSync(join(PUBLIC, 'audio', 'sfx', `animal-${p.sound}.mp3`)), p.sound).toBe(true);
    }
  });
});
