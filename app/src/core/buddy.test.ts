import { describe, it, expect } from 'vitest';
import {
  BUDDY_CHARACTERS,
  BUDDY_NAMES,
  DEFAULT_BUDDY,
  DEFAULT_NAME_ID,
  buddyImageUrl,
  buddyName,
  fillName,
  sanitizeBuddy,
} from './buddy';

describe('buddy', () => {
  it('mặc định mèo + Đậu Đậu (hành vi cũ)', () => {
    expect(DEFAULT_BUDDY).toEqual({ character: 'cat', name: 'dau' });
    expect(DEFAULT_NAME_ID).toBe('dau');
    expect(buddyName('dau', 'vi')).toBe('Đậu Đậu');
    expect(buddyName('dau', 'ja')).toBe('ダウダウ');
    expect(buddyName('dau', 'en')).toBe('Dau Dau');
  });
  it('4 nhân vật, 8 tên không trùng, đủ vi/ja/en, id hợp lệ cho tên file', () => {
    expect(BUDDY_CHARACTERS).toHaveLength(4);
    expect(BUDDY_NAMES).toHaveLength(8);
    expect(new Set(BUDDY_NAMES.map((n) => n.id)).size).toBe(8);
    for (const n of BUDDY_NAMES) {
      expect(n.id).toMatch(/^[a-z0-9]+$/);
      for (const lang of ['vi', 'ja', 'en'] as const) expect(n[lang].trim(), `${n.id}.${lang}`).not.toBe('');
    }
    for (const lang of ['vi', 'ja', 'en'] as const) {
      expect(new Set(BUDDY_NAMES.map((n) => n[lang])).size, lang).toBe(8);
    }
  });
  it('fillName thay mọi {name} theo ngôn ngữ, câu không có mẫu giữ nguyên', () => {
    expect(fillName('{name} trốn ở đâu?', 'vi', 'mimi')).toBe('Mi Mi trốn ở đâu?');
    expect(fillName('{name}を かくして あげてね!', 'ja', 'tom')).toBe('トムを かくして あげてね!');
    expect(fillName("{name}'s house, {name}!", 'en', 'lulu')).toBe("Lulu's house, Lulu!");
    expect(fillName('Giỏi quá!', 'vi', 'mimi')).toBe('Giỏi quá!');
    expect(fillName('{name}', 'vi', 'không-có')).toBe('Đậu Đậu');
  });
  it('sanitizeBuddy vá từng phần dữ liệu sai', () => {
    expect(sanitizeBuddy(undefined)).toEqual(DEFAULT_BUDDY);
    expect(sanitizeBuddy(null)).toEqual(DEFAULT_BUDDY);
    expect(sanitizeBuddy('x')).toEqual(DEFAULT_BUDDY);
    expect(sanitizeBuddy({ character: 'bunny', name: 'kiki' })).toEqual({ character: 'bunny', name: 'kiki' });
    expect(sanitizeBuddy({ character: 'dragon', name: 'kiki' })).toEqual({ character: 'cat', name: 'kiki' });
    expect(sanitizeBuddy({ character: 'bear', name: 'Bob' })).toEqual({ character: 'bear', name: 'dau' });
  });
  it('ảnh 2D: mèo giữ daudau.png, con khác buddy-<id>.png', () => {
    expect(buddyImageUrl('cat', '/k/')).toBe('/k/cards/daudau.png');
    expect(buddyImageUrl('bunny', '/k/')).toBe('/k/cards/buddy-bunny.png');
  });
});
