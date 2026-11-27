import { describe, test, expect } from 'vitest';
import {
  COLS,
  ROWS,
  LEVELS,
  neighbors,
  run,
  canStep,
  cellAt,
  extendTrail,
  trailDirs,
  trailReachesHome,
  walkerSound,
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

describe('chạm ô (canStep)', () => {
  test('chỉ ô kề trên/dưới/trái/phải, trong lưới, không phải cây', () => {
    const from = MAP.start; // (1,0)
    expect(canStep(MAP, from, { r: 1, c: 1 })).toBe(true);
    expect(canStep(MAP, from, { r: 0, c: 0 })).toBe(true);
    expect(canStep(MAP, from, { r: 2, c: 0 })).toBe(true);
    expect(canStep(MAP, from, { r: 1, c: 2 })).toBe(false); // xa 2 ô
    expect(canStep(MAP, from, { r: 0, c: 1 })).toBe(false); // chéo (và là cây)
    expect(canStep(MAP, from, { r: 1, c: -1 })).toBe(false); // ngoài lưới
    expect(canStep(MAP, { r: 0, c: 0 }, { r: 0, c: 1 })).toBe(false); // cây
    expect(canStep(MAP, from, from)).toBe(false); // chính ô đang đứng
  });
});

describe('vẽ đường (extendTrail)', () => {
  const S = MAP.start;
  test('nối ô kề liên tiếp tới đích', () => {
    let t = extendTrail(MAP, [S], { r: 1, c: 1 });
    expect(t).toEqual([S, { r: 1, c: 1 }]);
    t = extendTrail(MAP, t, { r: 1, c: 2 });
    expect(trailReachesHome(MAP, t)).toBe(true);
    expect(trailDirs(MAP, t)).toEqual(['right', 'right']);
  });

  test('kéo vào cây hay ô chéo: nét giữ nguyên ở ô trước', () => {
    const t = [S, { r: 1, c: 1 }];
    expect(extendTrail(MAP, t, { r: 0, c: 1 })).toEqual(t); // cây
    expect(extendTrail(MAP, [S], { r: 0, c: 1 })).toEqual([S]); // cây (chéo)
    expect(extendTrail(MAP, [S], { r: 2, c: 1 })).toEqual([S]); // chéo
  });

  test('lướt nhanh qua vài ô thẳng hàng: nối cả dãy, dừng trước cây', () => {
    expect(extendTrail(MAP, [S], { r: 1, c: 2 })).toEqual([S, { r: 1, c: 1 }, { r: 1, c: 2 }]);
    const m: PathMap = { start: { r: 0, c: 0 }, home: { r: 2, c: 4 }, trees: [{ r: 0, c: 3 }] };
    expect(extendTrail(m, [m.start], { r: 0, c: 4 })).toEqual([m.start, { r: 0, c: 1 }, { r: 0, c: 2 }]);
  });

  test('kéo ngược lại: xoá bớt đoạn vừa vẽ', () => {
    const t = [S, { r: 1, c: 1 }, { r: 1, c: 2 }];
    expect(extendTrail(MAP, t, { r: 1, c: 1 })).toEqual([S, { r: 1, c: 1 }]);
    expect(extendTrail(MAP, t, S)).toEqual([S]);
  });

  test('tới đích rồi thì không nối thêm', () => {
    const t = [S, { r: 1, c: 1 }, { r: 1, c: 2 }];
    expect(extendTrail(MAP, t, { r: 1, c: 3 })).toEqual(t);
  });

  test('không sửa mảng gốc', () => {
    const t = [S];
    extendTrail(MAP, t, { r: 1, c: 1 });
    expect(t).toEqual([S]);
  });

  test('đường chưa tới đích vẫn hợp lệ; đường có bước nhảy thì không', () => {
    expect(trailReachesHome(MAP, [S, { r: 1, c: 1 }])).toBe(false);
    expect(trailDirs(MAP, [S, { r: 1, c: 1 }])).toEqual(['right']);
    expect(trailDirs(MAP, [S, { r: 1, c: 2 }])).toBeNull();
    expect(trailDirs(MAP, [S, { r: 0, c: 0 }, { r: 0, c: 1 }])).toBeNull(); // cây
    expect(trailReachesHome(MAP, [MAP.home])).toBe(false);
  });
});

describe('cellAt', () => {
  test('ô 120px khe 24px; khe chia đôi; ngoài lưới là null', () => {
    expect(cellAt(60, 60, 120, 24)).toEqual({ r: 0, c: 0 });
    expect(cellAt(131, 10, 120, 24)).toEqual({ r: 0, c: 0 });
    expect(cellAt(133, 10, 120, 24)).toEqual({ r: 0, c: 1 });
    expect(cellAt(4 * 144 + 60, 2 * 144 + 60, 120, 24)).toEqual({ r: 2, c: 4 });
    expect(cellAt(-40, 10, 120, 24)).toBeNull();
    expect(cellAt(10, 3 * 144 + 20, 120, 24)).toBeNull();
  });
});

describe('tiếng kêu khi tới đích', () => {
  test('mỗi người đi đều có tiếng kêu thật (file sfx có thật)', () => {
    const sfx = join(import.meta.dirname, '../../../public/audio/sfx');
    const keys = [
      ...THEMES.filter((t) => t.walker !== 'buddy').map((t) => walkerSound(t.walker, 'cat')),
      ...['cat', 'dog', 'bunny', 'bear'].map((c) => walkerSound('buddy', c)),
    ];
    for (const k of keys) {
      expect(k).toMatch(/^animal.[a-z]+-sound$/);
      const id = /^animal.([a-z]+)-sound$/.exec(k!)![1];
      expect(existsSync(join(sfx, `animal-${id}.mp3`)), id).toBe(true);
    }
    expect(walkerSound('unicorn', 'cat')).toBeNull();
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

  test('Dễ: chỉ đích gần (2 bước); Khó: chỉ đường ≥ 3 bước, có đường 4 bước', () => {
    const easy = levelsFor('easy');
    const hard = levelsFor('hard');
    expect(easy.length).toBeGreaterThanOrEqual(5);
    expect(hard.length).toBeGreaterThanOrEqual(5);
    for (const i of easy) expect(len(i)).toBeLessThanOrEqual(2);
    for (const i of easy) expect(LEVELS[i].trees.length).toBeLessThanOrEqual(2);
    for (const i of hard) expect(len(i)).toBeGreaterThanOrEqual(3);
    expect(hard.some((i) => len(i) === 4)).toBe(true);
    expect(levelsFor('auto')).toHaveLength(LEVELS.length);
    // bé dưới 36 tháng (Tự động) cũng được bản đồ dễ
    expect(levelsFor('auto', 24)).toEqual(easy);
    expect(levelsFor('auto', 40)).toHaveLength(LEVELS.length);
  });

  test('bản đồ dễ chỉ có một cây', () => {
    expect(levelsFor('easy').filter((i) => LEVELS[i].trees.length === 1).length).toBeGreaterThanOrEqual(4);
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

  test('cách chơi mặc định: Dễ chạm ô, Khó mũi tên; Tự động/Vừa theo tuổi', () => {
    expect(modeFor('easy', 72)).toBe('tap');
    expect(modeFor('hard', 36)).toBe('program');
    expect(modeFor('auto', 24)).toBe('tap');
    expect(modeFor('auto', 47)).toBe('tap');
    expect(modeFor('auto', 48)).toBe('draw');
    expect(modeFor('auto', 59)).toBe('draw');
    expect(modeFor('auto', 60)).toBe('program');
    expect(modeFor('medium', 36)).toBe('tap');
    expect(modeFor('medium', 54)).toBe('draw');
  });
});
