import { describe, it, expect } from 'vitest';
import {
  applyToAll,
  bulkTopics,
  commonDifficulty,
  commonTopic,
  type Topic,
  effectiveAge,
  gameSetting,
  optionsFor,
  sanitizeGameSetting,
  sanitizeGameSettings,
  DEFAULT_GAME_SETTING,
  pickFresh,
  pickFreshRemembered,
  recentPicks,
  rememberPicks,
  clearRecentPicks,
} from './gameOptions';
import { ALL_GAMES } from './games';

describe('effectiveAge', () => {
  it('auto giữ tuổi thật, dễ/vừa/khó ra 24/36/54 tháng', () => {
    expect(effectiveAge(30, 'auto')).toBe(30);
    expect(effectiveAge(30, 'easy')).toBe(24);
    expect(effectiveAge(30, 'medium')).toBe(36);
    expect(effectiveAge(30, 'hard')).toBe(54);
  });
  it('kẹp trong khoảng tuổi của trò', () => {
    expect(effectiveAge(30, 'easy', { minAge: 36, maxAge: 72 })).toBe(36);
    expect(effectiveAge(30, 'hard', { minAge: 24, maxAge: 48 })).toBe(48);
    expect(effectiveAge(40, 'auto', { minAge: 24, maxAge: 72 })).toBe(40);
  });
});

describe('sanitizeGameSetting', () => {
  it('thiếu hoặc sai thì về bật/auto/mix', () => {
    expect(sanitizeGameSetting(undefined)).toEqual(DEFAULT_GAME_SETTING);
    expect(sanitizeGameSetting({ enabled: 'no', difficulty: 'super', topic: 42 })).toEqual(DEFAULT_GAME_SETTING);
    expect(sanitizeGameSetting({ enabled: false })).toEqual({ enabled: false, difficulty: 'auto', topic: 'mix' });
    expect(sanitizeGameSetting({ enabled: true, difficulty: 'hard', topic: 'fruits' })).toEqual({
      enabled: true, difficulty: 'hard', topic: 'fruits',
    });
  });
  it('bảng không phải object thì rỗng, từng mục được vá', () => {
    expect(sanitizeGameSettings(null)).toEqual({});
    expect(sanitizeGameSettings([1, 2])).toEqual({});
    expect(sanitizeGameSettings('x')).toEqual({});
    expect(sanitizeGameSettings({ memory: { difficulty: 'easy' }, path: 7 })).toEqual({
      memory: { enabled: true, difficulty: 'easy', topic: 'mix' },
      path: DEFAULT_GAME_SETTING,
    });
  });
  it('gameSetting trả mặc định khi trò chưa có mục', () => {
    expect(gameSetting(undefined, 'memory')).toEqual(DEFAULT_GAME_SETTING);
    expect(gameSetting({ memory: { enabled: false, difficulty: 'easy', topic: 'mix' } }, 'memory').enabled).toBe(false);
  });
});

describe('optionsFor', () => {
  it('trò không khai báo thì về auto/mix', () => {
    expect(optionsFor({}, { enabled: true, difficulty: 'hard', topic: 'fruits' })).toEqual({ difficulty: 'auto', topic: 'mix' });
  });
  it('chỉ nhận chủ đề trò khai báo', () => {
    const m = { options: { difficulty: true, topics: ['animals' as const] } };
    expect(optionsFor(m, { enabled: true, difficulty: 'hard', topic: 'animals' })).toEqual({ difficulty: 'hard', topic: 'animals' });
    expect(optionsFor(m, { enabled: true, difficulty: 'easy', topic: 'shapes' })).toEqual({ difficulty: 'easy', topic: 'mix' });
  });
});

describe('manifest options', () => {
  it('các trò có logic theo tuổi khai báo difficulty', () => {
    const withDiff = ALL_GAMES.filter((g) => g.options?.difficulty).map((g) => g.id).sort();
    expect(withDiff).toEqual(
      [
        'bakery', 'band', 'bath', 'cook', 'counting', 'dots', 'feed', 'hide', 'mama', 'memory', 'music', 'path', 'pattern',
        'peekaboo', 'puzzle', 'rescue',
        'shadow', 'shapes', 'shop', 'sort', 'sound-quiz', 'story', 'words',
      ],
    );
  });
  it('chủ đề khai báo không chứa mix', () => {
    for (const g of ALL_GAMES) expect(g.options?.topics ?? [], g.id).not.toContain('mix');
  });
});

describe('xáo trộn có trí nhớ ngắn', () => {
  it('pickFresh: n món khác nhau, tránh món trong avoid khi đủ', () => {
    for (let i = 0; i < 30; i++) {
      const got = pickFresh(['a', 'b', 'c', 'd', 'e'], 3, ['a', 'b']);
      expect(new Set(got).size).toBe(3);
      expect(got.sort()).toEqual(['c', 'd', 'e']);
    }
  });

  it('pickFresh: thiếu món mới thì lấy thêm món cũ cho đủ', () => {
    const got = pickFresh(['a', 'b', 'c'], 3, ['a', 'b']);
    expect(got[0]).toBe('c');
    expect([...got].sort()).toEqual(['a', 'b', 'c']);
    expect(pickFresh(['a'], 3)).toEqual(['a']);
  });

  it('rememberPicks chỉ giữ số lượt gần nhất, theo từng key', () => {
    clearRecentPicks();
    rememberPicks('x', ['a'], 2);
    rememberPicks('x', ['b'], 2);
    rememberPicks('x', ['c'], 2);
    rememberPicks('y', ['z']);
    expect(recentPicks('x')).toEqual(['b', 'c']);
    expect(recentPicks('y')).toEqual(['z']);
    clearRecentPicks();
    expect(recentPicks('x')).toEqual([]);
  });

  it('pickFreshRemembered không lặp lượt vừa chơi', () => {
    clearRecentPicks();
    let prev: string | undefined;
    for (let i = 0; i < 50; i++) {
      const [cur] = pickFreshRemembered('k', ['a', 'b', 'c'], 1, 1);
      expect(cur).not.toBe(prev);
      prev = cur;
    }
  });

  it('mọi chủ đề trò khai báo là chủ đề hợp lệ', () => {
    for (const g of ALL_GAMES) {
      for (const t of g.options?.topics ?? []) expect(sanitizeGameSetting({ topic: t }).topic, g.id).toBe(t);
    }
  });
});

describe('áp cho tất cả trò', () => {
  const games = [
    { id: 'a', options: { difficulty: true, topics: ['animals', 'fruits'] as Topic[] } },
    { id: 'b' },
    { id: 'c', options: { difficulty: true } },
    { id: 's', options: { difficulty: true, topics: ['colors', 'kinds'] as Topic[] } },
  ];

  it('bulkTopics: mix + chủ đề nội dung có trò hỗ trợ, bỏ kiểu phân loại riêng', () => {
    expect(bulkTopics(games)).toEqual(['mix', 'animals', 'fruits']);
  });

  it('độ khó áp cho mọi trò có độ khó, không đụng trò khác và bật/tắt', () => {
    const cur = { c: { enabled: false, difficulty: 'easy' as const, topic: 'mix' as const } };
    const next = applyToAll(cur, games, { difficulty: 'hard' });
    expect(next.a.difficulty).toBe('hard');
    expect(next.c).toEqual({ enabled: false, difficulty: 'hard', topic: 'mix' });
    expect(next.s.difficulty).toBe('hard');
    expect(next.b).toBeUndefined();
    expect(commonDifficulty(next, games)).toBe('hard');
  });

  it('chủ đề chỉ áp cho trò có chủ đề đó; mix đưa mọi trò có chủ đề về trộn', () => {
    const fr = applyToAll(undefined, games, { topic: 'fruits' });
    expect(fr.a.topic).toBe('fruits');
    expect(fr.s).toBeUndefined(); // trò Xếp vào giỏ không có chủ đề trái cây: giữ nguyên
    expect(commonTopic(fr, games)).toBe('fruits');
    const mixed = applyToAll({ ...fr, s: { enabled: true, difficulty: 'auto', topic: 'colors' } }, games, { topic: 'mix' });
    expect(mixed.a.topic).toBe('mix');
    expect(mixed.s.topic).toBe('mix');
    expect(commonTopic(mixed, games)).toBe('mix');
  });

  it('các trò đang khác nhau thì không có giá trị chung', () => {
    const cur = { a: { enabled: true, difficulty: 'easy' as const, topic: 'animals' as const } };
    expect(commonDifficulty(cur, games)).toBeNull();
    expect(commonTopic(cur, games)).toBe('animals');
    expect(commonTopic({ ...cur, s: { enabled: true, difficulty: 'auto', topic: 'colors' } }, games)).toBe('animals');
  });
});
