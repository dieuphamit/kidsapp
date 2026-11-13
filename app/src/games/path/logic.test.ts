import { describe, test, expect } from 'vitest';
import {
  COLS,
  ROWS,
  LEVELS,
  neighbors,
  run,
  levelFor,
  shortestPath,
  step,
  isTree,
  samePos,
  levelsFor,
  modeFor,
  nextLevelIdx,
  nextTheme,
  THEMES,
  type PathMap,
} from './logic';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { contentByKey } from '../../core/content';

const MAP: PathMap = {
  start: { r: 1, c: 0 },
  home: { r: 1, c: 2 },
  trees: [{ r: 0, c: 1 }, { r: 2, c: 1 }],
};

describe('LEVELS', () => {
  test('có ít nhất 8 bản đồ trên lưới 5×3', () => {
    expect(ROWS).toBe(3);
    expect(COLS).toBe(5);
    expect(LEVELS.length).toBeGreaterThanOrEqual(8);
  });

  test.each(LEVELS.map((m, i) => [i, m] as const))('bản đồ %i hợp lệ và luôn có đường 2–4 bước', (_i, map) => {
    const all = [map.start, map.home, ...map.trees];
    for (const p of all) {
      expect(p.r).toBeGreaterThanOrEqual(0);
      expect(p.r).toBeLessThan(ROWS);
      expect(p.c).toBeGreaterThanOrEqual(0);
      expect(p.c).toBeLessThan(COLS);
    }
    // không trùng ô
    expect(new Set(all.map((p) => `${p.r},${p.c}`)).size).toBe(all.length);
    const sol = shortestPath(map, map.start);
    expect(sol).not.toBeNull();
    expect(sol!.length).toBeGreaterThanOrEqual(2);
    expect(sol!.length).toBeLessThanOrEqual(4);
    // chạy lời giải thì về nhà
    const res = run(map, map.start, sol!);
    expect(res.home).toBe(true);
    expect(res.bumpAt).toBeNull();
  });

  test.each(LEVELS.map((m, i) => [i, m] as const))('bản đồ %i có cây cạnh đường đi (để mức 2 có chỗ đụng cây)', (_i, map) => {
    const sol = shortestPath(map, map.start)!;
    const cells = run(map, map.start, sol).path.slice(0, -1); // bỏ ô nhà
    const nearTree = cells.some((p) =>
      (['up', 'down', 'left', 'right'] as const).some((d) => isTree(map, step(p, d))),
    );
    expect(nearTree).toBe(true);
  });
});

describe('neighbors', () => {
  test('chỉ trả ô kề trong lưới và không phải cây', () => {
    const n = neighbors({ r: 1, c: 0 }, MAP);
    expect(n.map((x) => x.dir).sort()).toEqual(['down', 'right', 'up']);
    const n2 = neighbors({ r: 1, c: 1 }, MAP);
    expect(n2.map((x) => x.dir).sort()).toEqual(['left', 'right']);
    expect(n2.find((x) => x.dir === 'right')!.pos).toEqual({ r: 1, c: 2 });
  });

  test('ở góc lưới chỉ có 2 hướng', () => {
    expect(neighbors({ r: 0, c: 4 }, MAP).map((x) => x.dir).sort()).toEqual(['down', 'left']);
  });
});

describe('run', () => {
  test('về nhà: đường đủ bước, home = true', () => {
    const res = run(MAP, MAP.start, ['right', 'right']);
    expect(res).toEqual({
      path: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
      bumpAt: null,
      home: true,
    });
  });

  test('đụng cây thì dừng, bumpAt là chỉ số lệnh lỗi', () => {
    const res = run(MAP, MAP.start, ['right', 'up', 'right']);
    expect(res.bumpAt).toBe(1);
    expect(res.home).toBe(false);
    expect(res.path).toEqual([{ r: 1, c: 0 }, { r: 1, c: 1 }]);
  });

  test('ra ngoài lưới thì dừng', () => {
    const res = run(MAP, MAP.start, ['left', 'right']);
    expect(res.bumpAt).toBe(0);
    expect(res.path).toEqual([{ r: 1, c: 0 }]);
    expect(res.home).toBe(false);
  });

  test('chương trình ngắn hơn đường: không lỗi, chưa về nhà', () => {
    const res = run(MAP, MAP.start, ['right']);
    expect(res).toEqual({ path: [{ r: 1, c: 0 }, { r: 1, c: 1 }], bumpAt: null, home: false });
  });

  test('chương trình rỗng', () => {
    expect(run(MAP, MAP.start, [])).toEqual({ path: [{ r: 1, c: 0 }], bumpAt: null, home: false });
  });

  test('tới nhà thì dừng, bỏ qua lệnh thừa', () => {
    const res = run(MAP, MAP.start, ['right', 'right', 'up']);
    expect(res.home).toBe(true);
    expect(res.bumpAt).toBeNull();
    expect(samePos(res.path[res.path.length - 1], MAP.home)).toBe(true);
  });
});

describe('levelFor', () => {
  test('dưới 48 tháng bắt đầu mức 1, lên mức 2 sau 4 lần về nhà', () => {
    expect(levelFor(36, 0)).toBe(1);
    expect(levelFor(47, 3)).toBe(1);
    expect(levelFor(40, 4)).toBe(2);
    expect(levelFor(40, 9)).toBe(2);
  });

  test('từ 48 tháng bắt đầu mức 2', () => {
    expect(levelFor(48, 0)).toBe(2);
    expect(levelFor(72, 0)).toBe(2);
  });
});

describe('shortestPath', () => {
  test('tránh cây', () => {
    const map: PathMap = { start: { r: 0, c: 1 }, home: { r: 0, c: 3 }, trees: [{ r: 0, c: 2 }] };
    const sol = shortestPath(map, map.start)!;
    expect(sol.length).toBe(4);
    expect(run(map, map.start, sol).home).toBe(true);
  });

  test('đang đứng ở nhà thì lời giải rỗng', () => {
    expect(shortestPath(MAP, MAP.home)).toEqual([]);
  });
});

describe('chủ đề bản đồ', () => {
  test('đủ câu chào / về đích / đụng vật cản (vi, ja, en); ảnh người đi có thật', () => {
    const content = contentByKey();
    const pub = join(import.meta.dirname, '../../../public');
    for (const t of THEMES) {
      for (const key of [t.hello, t.home, t.bump]) {
        const item = content.get(key);
        expect(item?.vi && item.ja && item.en, key).toBeTruthy();
      }
      if (t.walker !== 'buddy') expect(existsSync(join(pub, 'cards', `${t.walker}.png`)), t.walker).toBe(true);
    }
    expect(THEMES.length).toBeGreaterThanOrEqual(5);
  });

  test('chủ đề kế khác chủ đề vừa chơi', () => {
    for (const t of THEMES) {
      for (let i = 0; i < 20; i++) expect(nextTheme(t.id, i / 20).id).not.toBe(t.id);
    }
    const seen = new Set(Array.from({ length: 50 }, (_, i) => nextTheme(null, i / 50).id));
    expect(seen.size).toBe(THEMES.length);
  });
});

describe('độ khó', () => {
  const len = (i: number) => shortestPath(LEVELS[i], LEVELS[i].start)!.length;

  test('Dễ: chỉ đường ≤ 3 bước; Khó: chỉ đường ≥ 3 bước, có đường 4 bước', () => {
    const easy = levelsFor('easy');
    const hard = levelsFor('hard');
    expect(easy.length).toBeGreaterThanOrEqual(5);
    expect(hard.length).toBeGreaterThanOrEqual(5);
    for (const i of easy) expect(len(i)).toBeLessThanOrEqual(3);
    for (const i of hard) expect(len(i)).toBeGreaterThanOrEqual(3);
    expect(hard.some((i) => len(i) === 4)).toBe(true);
    expect(levelsFor('auto')).toHaveLength(LEVELS.length);
  });

  test('bản đồ kế khác bản đồ vừa chơi, trong kho của độ khó', () => {
    const pool = levelsFor('hard');
    for (const last of pool) {
      for (let i = 0; i < 10; i++) {
        const n = nextLevelIdx(pool, last, i / 10);
        expect(n).not.toBe(last);
        expect(pool).toContain(n);
      }
    }
  });

  test('chế độ: Dễ luôn đi từng bước, Khó xếp lệnh ngay, Vừa lên xếp lệnh sau 4 lần', () => {
    expect(modeFor('easy', 72, 20)).toBe('step');
    expect(modeFor('hard', 36, 0)).toBe('program');
    expect(modeFor('medium', 36, 3)).toBe('step');
    expect(modeFor('medium', 36, 4)).toBe('program');
    expect(modeFor('auto', 40, 0)).toBe('step');
    expect(modeFor('auto', 48, 0)).toBe('program');
  });
});
