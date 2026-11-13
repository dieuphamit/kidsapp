import { describe, it, expect } from 'vitest';
import { validateContent, textOf, LANGS } from './i18n';

describe('validateContent', () => {
  it('nhận mảng hợp lệ', () => {
    const items = validateContent([{ key: 'animal.cow', vi: 'Con bò', ja: 'うし', en: 'Cow' }], 'x.json');
    expect(textOf(items[0], 'ja')).toBe('うし');
    expect(textOf(items[0], 'en')).toBe('Cow');
  });
  it('LANGS có đủ vi, ja, en', () => {
    expect(LANGS).toEqual(['vi', 'ja', 'en']);
  });
  it('báo lỗi khi thiếu tiếng Nhật', () => {
    expect(() => validateContent([{ key: 'a.b', vi: 'A', ja: '', en: 'A' }], 'x.json')).toThrow(/x.json.*a.b.*ja/);
  });
  it('báo lỗi khi thiếu hoặc rỗng tiếng Anh', () => {
    expect(() => validateContent([{ key: 'a.b', vi: 'A', ja: 'B' }], 'x.json')).toThrow(/x.json.*a.b.*en/);
    expect(() => validateContent([{ key: 'a.b', vi: 'A', ja: 'B', en: '  ' }], 'x.json')).toThrow(/x.json.*a.b.*en/);
  });
  it('báo lỗi key sai định dạng', () => {
    expect(() => validateContent([{ key: 'Bad Key', vi: 'A', ja: 'B', en: 'C' }], 'x.json')).toThrow(/key/);
  });
  it('câu có {name} phải có mẫu ở cả vi, ja, en', () => {
    const ok = validateContent([{ key: 'a.b', vi: '{name} ở đây', ja: '{name}は ここ', en: '{name} is here' }], 'x.json');
    expect(ok[0].ja).toBe('{name}は ここ');
    expect(() => validateContent([{ key: 'a.b', vi: '{name} ở đây', ja: 'ダウダウは ここ', en: '{name} is here' }], 'x.json'))
      .toThrow(/x.json.*a.b.*\{name\}.*ja/);
    expect(() => validateContent([{ key: 'a.b', vi: 'Đậu Đậu', ja: 'ダウダウ', en: '{name}' }], 'x.json')).toThrow(/vi, ja/);
  });
});
