import { describe, it, expect } from 'vitest';
import {
  seasonFor, parseIsoDate, seasonToday, seasonFromLocation, greetingKey, dayStamp,
  TET_DATES, TRUNGTHU_DATES, TET_WINDOW, TRUNGTHU_WINDOW, SEASON_IDS,
} from './season';
import { contentByKey } from './content';

/** Ngày giờ địa phương; giờ khác nhau để chắc chỉ ngày lịch mới quan trọng. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const shift = ([y, m, d]: readonly [number, number, number], days: number) => new Date(y, m - 1, d + days, 9);

describe('seasonFor', () => {
  it('ngày thường không có mùa', () => {
    expect(seasonFor(at(2026, 11, 19))).toBeNull();
    expect(seasonFor(at(2027, 6, 1))).toBeNull();
    expect(seasonFor(at(2027, 4, 30))).toBeNull();
  });

  it('bảng Tết đúng các ngày đã biết', () => {
    expect(TET_DATES).toContainEqual([2026, 2, 17]);
    expect(TET_DATES).toContainEqual([2027, 2, 6]);
    expect(TET_DATES).toContainEqual([2028, 1, 26]);
    expect(TET_DATES).toContainEqual([2032, 2, 11]);
    for (let y = 2026; y <= 2032; y++) expect(TET_DATES.some(([ty]) => ty === y), `thiếu Tết ${y}`).toBe(true);
    for (let y = 2026; y <= 2032; y++) expect(TRUNGTHU_DATES.some(([ty]) => ty === y), `thiếu Trung thu ${y}`).toBe(true);
  });

  for (const tet of TET_DATES) {
    it(`Tết ${tet[0]}: từ ${TET_WINDOW.before} ngày trước đến ${TET_WINDOW.after} ngày sau`, () => {
      expect(seasonFor(shift(tet, 0))).toBe('tet');
      expect(seasonFor(shift(tet, -TET_WINDOW.before))).toBe('tet');
      expect(seasonFor(shift(tet, TET_WINDOW.after))).toBe('tet');
      expect(seasonFor(shift(tet, -TET_WINDOW.before - 1))).toBeNull();
      expect(seasonFor(shift(tet, TET_WINDOW.after + 1))).toBeNull();
    });
  }

  for (const tt of TRUNGTHU_DATES) {
    it(`Trung thu ${tt[0]}: từ ${TRUNGTHU_WINDOW.before} ngày trước đến ${TRUNGTHU_WINDOW.after} ngày sau`, () => {
      expect(seasonFor(shift(tt, 0))).toBe('trungthu');
      expect(seasonFor(shift(tt, -TRUNGTHU_WINDOW.before))).toBe('trungthu');
      expect(seasonFor(shift(tt, TRUNGTHU_WINDOW.after))).toBe('trungthu');
      expect(seasonFor(shift(tt, -TRUNGTHU_WINDOW.before - 1))).toBeNull();
      expect(seasonFor(shift(tt, TRUNGTHU_WINDOW.after + 1))).toBeNull();
    });
  }

  it('Giáng Sinh: 15/12 đến 31/12, mọi năm', () => {
    for (const y of [2026, 2030, 2040]) {
      expect(seasonFor(at(y, 12, 14))).toBeNull();
      expect(seasonFor(at(y, 12, 15, 0))).toBe('xmas');
      expect(seasonFor(at(y, 12, 24))).toBe('xmas');
      expect(seasonFor(at(y, 12, 31, 23))).toBe('xmas');
      expect(seasonFor(at(y + 1, 1, 1, 0))).not.toBe('xmas');
    }
  });

  it('nửa đêm và cuối ngày vẫn tính theo ngày lịch địa phương', () => {
    expect(seasonFor(at(2027, 1, 27, 0))).toBe('tet'); // đúng 10 ngày trước 6/2/2027
    expect(seasonFor(at(2027, 1, 26, 23))).toBeNull();
    expect(seasonFor(at(2027, 2, 13, 23))).toBe('tet'); // 7 ngày sau
    expect(seasonFor(at(2027, 2, 14, 0))).toBeNull();
  });

  it('ngoài bảng năm thì không có Tết, Trung thu', () => {
    expect(seasonFor(at(2040, 2, 12))).toBeNull();
    expect(seasonFor(at(2040, 9, 20))).toBeNull();
  });
});

describe('parseIsoDate, seasonToday', () => {
  it('đọc ngày ISO, từ chối chuỗi sai', () => {
    expect(dayStamp(parseIsoDate('2027-02-06')!)).toBe('2027-02-06');
    expect(parseIsoDate('2027-02-30')).toBeNull();
    expect(parseIsoDate('06/02/2027')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });
  it('chỉ ép ngày khi có e2e=1', () => {
    const now = at(2026, 11, 19);
    expect(dayStamp(seasonToday('?e2e=1&date=2027-12-20', now))).toBe('2027-12-20');
    expect(seasonToday('?date=2027-12-20', now)).toBe(now);
    expect(seasonToday('?e2e=1&date=xx', now)).toBe(now);
    expect(seasonToday('', now)).toBe(now);
  });
  it('seasonFromLocation: e2e không ép ngày thì không trang trí', () => {
    const xmasDay = at(2026, 12, 20);
    expect(seasonFromLocation('', xmasDay)).toBe('xmas');
    expect(seasonFromLocation('?e2e=1', xmasDay)).toBeNull();
    expect(seasonFromLocation('?e2e=1&date=2027-02-06', xmasDay)).toBe('tet');
    expect(seasonFromLocation('?e2e=1&date=2026-09-25', xmasDay)).toBe('trungthu');
    expect(seasonFromLocation('?e2e=1&date=2026-11-19', xmasDay)).toBeNull();
  });
});

describe('câu chào theo mùa', () => {
  it('mỗi mùa có câu chào đủ vi, ja, en', () => {
    const content = contentByKey();
    for (const id of SEASON_IDS) {
      const item = content.get(greetingKey(id));
      expect(item, greetingKey(id)).toBeDefined();
    }
  });
});
