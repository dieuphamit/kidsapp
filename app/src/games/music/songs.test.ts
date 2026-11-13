import { describe, it, expect } from 'vitest';
import { SONGS, MUSIC_LEVELS, melodyFor, songsFor, nextSong, follow } from './songs';
import { contentByKey } from '../../core/content';

describe('bài hát', () => {
  it('mọi nốt nằm trong 8 phím, phách dương; mọi bài có tên đọc đủ vi/ja/en', () => {
    const content = contentByKey();
    expect(SONGS.length).toBeGreaterThanOrEqual(8);
    for (const s of SONGS) {
      for (const [k, b] of s.phrases.flat()) {
        expect(Number.isInteger(k) && k >= 0 && k <= 7, `${s.id}:${k}`).toBe(true);
        expect(b).toBeGreaterThan(0);
      }
      const c = content.get(`song.${s.id}`);
      expect(c?.vi && c.ja && c.en, s.id).toBeTruthy();
    }
    for (const k of ['music.follow', 'music.song-done']) expect(content.has(k), k).toBe(true);
  });

  it('dễ: 5 phím, 2 trống, chỉ câu đầu; vừa: 2 câu; khó: cả bài', () => {
    expect(MUSIC_LEVELS.easy.keys).toBe(5);
    expect(MUSIC_LEVELS.easy.drums).toHaveLength(2);
    expect(MUSIC_LEVELS.medium.keys).toBe(8);
    expect(MUSIC_LEVELS.hard.drums).toHaveLength(4);
    const twinkle = SONGS.find((s) => s.id === 'twinkle')!;
    expect(melodyFor(twinkle, 'medium')).toHaveLength(twinkle.phrases[0].length + twinkle.phrases[1].length);
    expect(melodyFor(twinkle, 'hard')).toHaveLength(twinkle.phrases.flat().length);
    for (const s of songsFor('easy')) {
      expect(melodyFor(s, 'easy')).toEqual([...s.phrases[0]]);
      expect(melodyFor(s, 'easy').every(([k]) => k < 5), s.id).toBe(true);
    }
    // giai điệu khó dài hơn dễ
    const avg = (lv: 'easy' | 'hard') => songsFor(lv).reduce((t, s) => t + melodyFor(s, lv).length, 0) / songsFor(lv).length;
    expect(avg('hard')).toBeGreaterThan(avg('easy') * 3);
  });

  it('mức nào cũng có nhiều bài, bài sau khác bài trước', () => {
    for (const lv of ['easy', 'medium', 'hard'] as const) {
      expect(songsFor(lv).length, lv).toBeGreaterThanOrEqual(5);
      let last: string | null = null;
      for (let i = 0; i < 20; i++) {
        const s = nextSong(lv, last);
        expect(s.id).not.toBe(last);
        last = s.id;
      }
    }
  });

  it('follow: đúng phím sáng thì tiến, phím khác đứng chờ (không có "sai")', () => {
    const melody = [[0, 1], [2, 1], [4, 2]] as const;
    expect(follow(melody, 0, 0)).toEqual({ pos: 1, done: false });
    expect(follow(melody, 1, 7)).toEqual({ pos: 1, done: false });
    expect(follow(melody, 1, 2)).toEqual({ pos: 2, done: false });
    expect(follow(melody, 2, 4)).toEqual({ pos: 3, done: true });
  });
});
