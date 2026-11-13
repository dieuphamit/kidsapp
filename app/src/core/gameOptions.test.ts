import { describe, it, expect } from 'vitest';
import {
  effectiveAge,
  gameSetting,
  optionsFor,
  sanitizeGameSetting,
  sanitizeGameSettings,
  DEFAULT_GAME_SETTING,
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
      ['hide', 'memory', 'path', 'pattern', 'peekaboo', 'puzzle', 'shadow', 'sort', 'sound-quiz', 'story'],
    );
  });
  it('chủ đề khai báo không chứa mix', () => {
    for (const g of ALL_GAMES) expect(g.options?.topics ?? [], g.id).not.toContain('mix');
  });
});
