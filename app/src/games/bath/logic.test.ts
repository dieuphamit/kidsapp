import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  BATH_ANIMALS,
  DirtGrid,
  afterShower,
  alphaAt,
  animalOrder,
  isBathAnimal,
  isClean,
  levelForAge,
  makeMud,
  nextAnimal,
  rng,
  stampsAlong,
  type AlphaMap,
} from './logic';
import { contentByKey } from '../../core/content';

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');

/** Mặt nạ giả: hình chữ nhật đặc ở giữa (x 0.25..0.75, y 0.3..0.7). */
function boxMask(n = 32): AlphaMap {
  const data = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const fx = (x + 0.5) / n;
      const fy = (y + 0.5) / n;
      data[y * n + x] = fx > 0.25 && fx < 0.75 && fy > 0.3 && fy < 0.7 ? 255 : 0;
    }
  }
  return { w: n, h: n, data };
}

describe('thú tắm', () => {
  it('6–8 con, mỗi con có ảnh lớn, tiếng kêu thật và câu nói vi/ja/en', () => {
    expect(BATH_ANIMALS.length).toBeGreaterThanOrEqual(6);
    expect(BATH_ANIMALS.length).toBeLessThanOrEqual(8);
    const content = contentByKey();
    for (const id of BATH_ANIMALS) {
      expect(existsSync(join(PUBLIC, 'cards', 'bath', `${id}.png`)), `cards/bath/${id}.png`).toBe(true);
      expect(existsSync(join(PUBLIC, 'audio', 'sfx', `animal-${id}.mp3`)), `sfx animal-${id}`).toBe(true);
      for (const key of [`bath.dirty.${id}`, `bath.clean.${id}`]) {
        const item = content.get(key);
        expect(item?.vi, key).toBeTruthy();
        expect(item?.ja, key).toBeTruthy();
        expect(item?.en, key).toBeTruthy();
      }
    }
    for (const key of ['game.bath', 'bath.hint', 'bath.shower', 'bath.towel']) expect(content.has(key), key).toBe(true);
  });

  it('isBathAnimal', () => {
    expect(isBathAnimal('pig')).toBe(true);
    expect(isBathAnimal('lion')).toBe(false);
  });

  it('thứ tự thú: đủ cả bộ, không trùng, cùng seed thì giống nhau, ép được con đầu', () => {
    const a = animalOrder(42);
    expect([...a].sort()).toEqual([...BATH_ANIMALS].sort());
    expect(animalOrder(42)).toEqual(a);
    expect(animalOrder(7, 'panda')[0]).toBe('panda');
    expect([...animalOrder(7, 'panda')].sort()).toEqual([...BATH_ANIMALS].sort());
  });

  it('nextAnimal đi vòng', () => {
    const o = animalOrder(3);
    expect(nextAnimal(o, o[0])).toBe(o[1]);
    expect(nextAnimal(o, o[o.length - 1])).toBe(o[0]);
  });
});

describe('mức theo tuổi', () => {
  it('bé nhỏ: bùn ít, nét to, ngưỡng ~70%, không lau khăn', () => {
    const l = levelForAge(26);
    expect(l.threshold).toBeCloseTo(0.7);
    expect(l.towel).toBe(false);
  });
  it('bé lớn: ngưỡng ~85%, bùn nhiều hơn, nét nhỏ hơn, có lau khăn', () => {
    const s = levelForAge(26);
    const b = levelForAge(60);
    expect(b.threshold).toBeCloseTo(0.85);
    expect(b.blobs).toBeGreaterThan(s.blobs);
    expect(b.brush).toBeLessThan(s.brush);
    expect(b.towel).toBe(true);
  });
  it('ngưỡng tăng dần theo tuổi', () => {
    const t = [24, 40, 72].map((a) => levelForAge(a).threshold);
    expect(t[0]).toBeLessThan(t[1]);
    expect(t[1]).toBeLessThan(t[2]);
  });
  it('sau vòi sen: bé lớn sang lau khăn, bé nhỏ xong luôn', () => {
    expect(afterShower(levelForAge(30))).toBe('done');
    expect(afterShower(levelForAge(60))).toBe('towel');
  });
});

describe('rng', () => {
  it('trong [0, 1) và lặp lại theo seed', () => {
    const a = rng(5);
    const b = rng(5);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(b()).toBe(v);
    }
  });
});

describe('makeMud', () => {
  it('đúng số vệt, tâm vệt nằm trong thân thú, có lốm đốm', () => {
    const mask = boxMask();
    const level = levelForAge(60);
    const blobs = makeMud(level, mask, 11);
    expect(blobs).toHaveLength(level.blobs);
    for (const b of blobs) {
      expect(alphaAt(mask, b.x, b.y)).toBeGreaterThan(200);
      expect(b.r).toBeGreaterThan(0);
      expect(b.specks.length).toBeGreaterThanOrEqual(10);
      expect(b.wobble.every((w) => w > 0.5 && w < 1.3)).toBe(true);
    }
  });
  it('cùng seed thì cùng bùn', () => {
    const mask = boxMask();
    expect(makeMud(levelForAge(30), mask, 3)).toEqual(makeMud(levelForAge(30), mask, 3));
  });
  it('các vệt trải ra, không dồn một chỗ', () => {
    const blobs = makeMud(levelForAge(60), boxMask(), 9);
    const xs = blobs.map((b) => b.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.15);
  });
});

describe('DirtGrid', () => {
  const all = (n: number) => Array.from({ length: n * n }, () => true);

  it('chà một chấm: chỉ ô trong chấm sạch, ô xa vẫn bẩn', () => {
    const g = new DirtGrid(400, 400, all(10), 10, 10); // ô 40px
    expect(g.cleanFraction).toBe(0);
    const n = g.scrub(100, 100, 30);
    expect(n).toBeGreaterThan(0);
    expect(g.isDirty(2, 2)).toBe(false); // ô (2,2) có tâm (100,100)
    expect(g.isDirty(9, 9)).toBe(true);
    expect(g.cleanFraction).toBeCloseTo(n / 100);
  });

  it('ô có tâm trong bán kính thì sạch', () => {
    const g = new DirtGrid(400, 400, all(10), 10, 10);
    g.scrub(100, 100, 5);
    expect(g.isDirty(2, 2)).toBe(false); // tâm (100,100)
    expect(g.isDirty(3, 3)).toBe(true);
  });

  it('% sạch chỉ tính trên ô bẩn ban đầu; chà chỗ sạch không làm tăng', () => {
    const cells = Array.from({ length: 100 }, (_, i) => i < 50); // nửa trên bẩn
    const g = new DirtGrid(100, 100, cells, 10, 10);
    expect(g.dirtyTotal).toBe(50);
    g.scrub(50, 90, 100); // chà hết
    expect(g.cleanFraction).toBe(1);
    const h = new DirtGrid(100, 100, cells, 10, 10);
    h.scrub(50, 85, 12); // chỉ chạm vùng dưới (sạch sẵn)
    expect(h.cleanFraction).toBe(0);
  });

  it('chà dọc đoạn không sót khe; chà lại không đếm hai lần', () => {
    const g = new DirtGrid(400, 40, Array.from({ length: 160 }, () => true), 40, 4); // ô 10px
    g.scrubLine(0, 20, 400, 20, 12);
    const once = g.cleanFraction;
    expect(once).toBeGreaterThanOrEqual(0.5); // hai hàng giữa sạch hết
    g.scrubLine(0, 20, 400, 20, 12);
    expect(g.cleanFraction).toBe(once);
  });

  it('không có bùn thì coi như sạch', () => {
    expect(new DirtGrid(10, 10, [], 2, 2).cleanFraction).toBe(1);
  });

  it('isClean so ngưỡng theo tuổi', () => {
    const g = new DirtGrid(100, 100, all(10), 10, 10);
    const small = levelForAge(26);
    const big = levelForAge(60);
    g.scrub(50, 50, 39); // ~ π·3.9² ≈ 48 ô
    expect(isClean(g, small)).toBe(false);
    g.scrub(50, 50, 60);
    expect(g.cleanFraction).toBeGreaterThanOrEqual(0.7);
    expect(isClean(g, small)).toBe(g.cleanFraction >= 0.7);
    g.scrub(50, 50, 200);
    expect(isClean(g, big)).toBe(true);
  });

  it('dirtyCellNear trả ô bẩn gần nhất, null khi sạch hết', () => {
    const cells = Array.from({ length: 16 }, (_, i) => i === 15);
    const g = new DirtGrid(40, 40, cells, 4, 4);
    expect(g.dirtyCellNear(0, 0)).toEqual({ x: 35, y: 35 });
    g.scrub(35, 35, 2);
    expect(g.dirtyCellNear(0.5, 0.5)).toBeNull();
  });
});

describe('stampsAlong', () => {
  it('chấm cách nhau không quá khoảng cho trước, điểm cuối đúng đích', () => {
    const s = stampsAlong(0, 0, 100, 0, 10);
    expect(s).toHaveLength(10);
    expect(s[s.length - 1]).toEqual([100, 0]);
    for (let i = 1; i < s.length; i++) expect(s[i][0] - s[i - 1][0]).toBeLessThanOrEqual(10);
  });
  it('chạm tại chỗ vẫn có một chấm', () => {
    expect(stampsAlong(5, 5, 5, 5, 10)).toEqual([[5, 5]]);
  });
});
