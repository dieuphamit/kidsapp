import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GROUPS, PICTURES, VIEW, circ, ell, picturesOf, pictureById, poly, rrect } from './pictures';
import { FILL_IDS, PAINTS, fillKey } from './paint';
import { contentByKey } from '../../core/content';

const content = contentByKey();
const tokensCss = readFileSync(join(import.meta.dirname, '..', '..', 'core', 'tokens.css'), 'utf8');

/** Path đóng hợp lệ: chỉ lệnh M L Q C A Z (hoa/thường) và số, bắt đầu bằng M, kết thúc bằng Z, toạ độ trong khung. */
function checkPath(d: string, where: string) {
  expect(d, where).toMatch(/^M/);
  expect(d, where).toMatch(/^[MLQCAZmlqcaz0-9.\s-]+$/);
  expect(d.trim(), where).toMatch(/Z$/);
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  expect(nums.length, where).toBeGreaterThanOrEqual(4);
  for (const v of nums) {
    expect(v, where).toBeGreaterThanOrEqual(0);
    expect(v, where).toBeLessThanOrEqual(VIEW);
  }
}

describe('dữ liệu tranh tô màu', () => {
  it('có ít nhất 24 tranh, id không trùng, chia đủ 7 nhóm, mỗi nhóm ≥3 tranh', () => {
    expect(PICTURES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length);
    expect(GROUPS.map((g) => g.id)).toEqual(['animals', 'sea', 'bugs', 'vehicles', 'fruits', 'things', 'daudau']);
    for (const g of GROUPS) expect(picturesOf(g.id).length, g.id).toBeGreaterThanOrEqual(3);
    for (const p of PICTURES) expect(GROUPS.some((g) => g.id === p.group), p.id).toBe(true);
  });

  it('mỗi tranh có ≥3 vùng kín, id vùng không trùng, path hợp lệ và nằm trong khung 400', () => {
    for (const p of PICTURES) {
      expect(p.regions.length, p.id).toBeGreaterThanOrEqual(3);
      expect(new Set(p.regions.map((r) => r.id)).size, p.id).toBe(p.regions.length);
      for (const r of p.regions) {
        expect(r.id, p.id).toMatch(/^[a-z0-9-]+$/);
        checkPath(r.d, `${p.id}/${r.id}`);
      }
      for (const [i, d] of p.details.entries()) {
        expect(d.d, `${p.id} nét ${i}`).toMatch(/^M[MLQCAZmlqcaz0-9.\s-]+$/);
      }
    }
  });

  it('mọi tranh và nhóm đều có câu đọc đủ vi/ja/en', () => {
    for (const p of PICTURES) expect(content.has(`coloring.pic.${p.id}`), p.id).toBe(true);
    for (const g of GROUPS) expect(content.has(`coloring.group.${g.id}`), g.id).toBe(true);
  });

  it('bảng có ≥12 màu, mỗi màu có token --paint-* và tên đọc', () => {
    expect(PAINTS.length).toBeGreaterThanOrEqual(12);
    for (const p of PAINTS) expect(tokensCss, p).toMatch(new RegExp(`--paint-${p}:\\s*#[0-9a-f]{6}`, 'i'));
    for (const f of FILL_IDS) expect(content.has(fillKey(f)), f).toBe(true);
  });

  it('hình cơ bản sinh path đóng', () => {
    for (const d of [circ(50, 50, 20), ell(100, 100, 30, 10), rrect(10, 10, 80, 40, 8), poly([0, 0], [10, 0], [5, 9])]) {
      checkPath(d, d);
    }
    expect(pictureById('pig')?.group).toBe('animals');
    expect(pictureById('nope')).toBeUndefined();
  });
});
