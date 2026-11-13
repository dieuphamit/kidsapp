// Đường về nhà: logic thuần (lưới 5×3, đi từng bước, chạy chương trình mũi tên)

export const ROWS = 3;
export const COLS = 5;

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export interface Pos {
  r: number;
  c: number;
}

export interface PathMap {
  start: Pos;
  home: Pos;
  trees: Pos[];
}

export interface RunResult {
  /** Các ô đã đi qua, bắt đầu bằng ô xuất phát. */
  path: Pos[];
  /** Chỉ số lệnh làm Đậu Đậu đụng cây hoặc ra ngoài lưới; null nếu không lỗi. */
  bumpAt: number | null;
  home: boolean;
}

const p = (r: number, c: number): Pos => ({ r, c });

/** Bản đồ viết tay; đường ngắn nhất 2–4 bước, luôn có cây cạnh đường đi. */
export const LEVELS: PathMap[] = [
  { start: p(1, 0), home: p(1, 2), trees: [p(0, 1), p(2, 1), p(0, 3)] },
  { start: p(0, 0), home: p(2, 1), trees: [p(1, 1), p(0, 2)] },
  { start: p(2, 4), home: p(0, 4), trees: [p(1, 4), p(2, 2)] },
  { start: p(1, 1), home: p(1, 4), trees: [p(0, 3), p(2, 2)] },
  { start: p(0, 4), home: p(2, 3), trees: [p(1, 4), p(0, 2)] },
  { start: p(2, 0), home: p(0, 1), trees: [p(1, 0), p(2, 2)] },
  { start: p(0, 1), home: p(0, 3), trees: [p(0, 2), p(2, 1)] },
  { start: p(1, 2), home: p(2, 4), trees: [p(1, 3), p(0, 1)] },
  { start: p(2, 2), home: p(0, 2), trees: [p(1, 2), p(0, 4)] },
  { start: p(1, 4), home: p(1, 2), trees: [p(0, 3), p(2, 0)] },
  // E4: thêm bản đồ, có cả đường vòng 4 bước cho mức Khó
  { start: p(0, 0), home: p(0, 2), trees: [p(0, 1), p(2, 2)] },
  { start: p(2, 1), home: p(1, 3), trees: [p(2, 2), p(0, 3), p(1, 4)] },
  { start: p(0, 2), home: p(2, 0), trees: [p(1, 1), p(0, 0)] },
  { start: p(1, 0), home: p(0, 3), trees: [p(0, 1), p(2, 1), p(1, 3)] },
  { start: p(2, 3), home: p(2, 1), trees: [p(2, 2), p(0, 2)] },
  { start: p(0, 3), home: p(2, 4), trees: [p(1, 3), p(2, 2)] },
  { start: p(1, 2), home: p(0, 0), trees: [p(1, 1), p(2, 3)] },
  { start: p(2, 4), home: p(0, 3), trees: [p(1, 3), p(2, 2)] },
];

/**
 * Chủ đề bản đồ: ai đi (bạn đồng hành hoặc ảnh thẻ thú), đích đến, vật cản và câu nói.
 * `home`, `tree` vẫn là data-kind của ô đích/ô cản cho mọi chủ đề (test e2e dựa vào đó).
 */
export type ThemeId = 'home' | 'sea' | 'nest' | 'burrow' | 'flower';
export type Goal = 'house' | 'sea' | 'nest' | 'burrow' | 'flower';
export type Obstacle = 'tree' | 'rock';

export interface Theme {
  id: ThemeId;
  /** 'buddy' = bạn đồng hành; còn lại là id thẻ ảnh `cards/<id>.png`. */
  walker: 'buddy' | string;
  goal: Goal;
  obstacle: Obstacle;
  hello: string;
  home: string;
  bump: string;
}

export const THEMES: Theme[] = [
  { id: 'home', walker: 'buddy', goal: 'house', obstacle: 'tree', hello: 'path.hello', home: 'path.home', bump: 'path.bump' },
  { id: 'sea', walker: 'fish', goal: 'sea', obstacle: 'rock', hello: 'path.hello-sea', home: 'path.home-sea', bump: 'path.bump-rock' },
  { id: 'nest', walker: 'parrot', goal: 'nest', obstacle: 'tree', hello: 'path.hello-nest', home: 'path.home-nest', bump: 'path.bump' },
  { id: 'burrow', walker: 'rabbit', goal: 'burrow', obstacle: 'rock', hello: 'path.hello-burrow', home: 'path.home-burrow', bump: 'path.bump-rock' },
  { id: 'flower', walker: 'bee', goal: 'flower', obstacle: 'tree', hello: 'path.hello-flower', home: 'path.home-flower', bump: 'path.bump' },
];

/** Chủ đề kế tiếp: khác chủ đề vừa chơi. `rand` trong [0, 1). */
export function nextTheme(last: ThemeId | null, rand: number): Theme {
  const pool = THEMES.filter((t) => t.id !== last);
  return pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))];
}

export type Difficulty = 'auto' | 'easy' | 'medium' | 'hard';

/**
 * Bản đồ theo độ khó: Dễ chỉ đường ngắn (≤ 3 bước), Khó chỉ đường dài (≥ 3 bước, có đường vòng 4 bước).
 * Trả về chỉ số trong LEVELS.
 */
export function levelsFor(difficulty: Difficulty): number[] {
  const len = (m: PathMap) => shortestPath(m, m.start)?.length ?? 0;
  const ok = (m: PathMap) =>
    difficulty === 'easy' ? len(m) <= 3 : difficulty === 'hard' ? len(m) >= 3 : true;
  return LEVELS.flatMap((m, i) => (ok(m) ? [i] : []));
}

/** Bản đồ kế: trong `pool`, khác bản đồ vừa chơi. */
export function nextLevelIdx(pool: number[], last: number | null, rand: number): number {
  const list = pool.length > 1 ? pool.filter((i) => i !== last) : pool;
  return list[Math.min(list.length - 1, Math.floor(rand * list.length))];
}

/**
 * Chế độ chơi: Dễ luôn đi từng bước; Khó xếp lệnh ngay; Vừa đi từng bước rồi lên xếp lệnh sau 4 lần về nhà;
 * Tự động theo tuổi (levelFor).
 */
export function modeFor(difficulty: Difficulty, ageMonths: number, wins: number): 'step' | 'program' {
  if (difficulty === 'easy') return 'step';
  if (difficulty === 'hard') return 'program';
  if (difficulty === 'medium') return wins >= 4 ? 'program' : 'step';
  return levelFor(ageMonths, wins) === 2 ? 'program' : 'step';
}

const DELTA: Record<Dir, Pos> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

export function step(pos: Pos, dir: Dir): Pos {
  return { r: pos.r + DELTA[dir].r, c: pos.c + DELTA[dir].c };
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function inGrid(pos: Pos): boolean {
  return pos.r >= 0 && pos.r < ROWS && pos.c >= 0 && pos.c < COLS;
}

export function isTree(map: PathMap, pos: Pos): boolean {
  return map.trees.some((t) => samePos(t, pos));
}

/** Hướng đi từ `from` sang ô kề `to`, hoặc null nếu không kề. */
export function dirTo(from: Pos, to: Pos): Dir | null {
  return DIRS.find((d) => samePos(step(from, d), to)) ?? null;
}

/** Các ô kề đi được (trong lưới, không phải cây). */
export function neighbors(pos: Pos, map: PathMap): { dir: Dir; pos: Pos }[] {
  return DIRS.map((dir) => ({ dir, pos: step(pos, dir) })).filter(
    (n) => inGrid(n.pos) && !isTree(map, n.pos),
  );
}

/** Chạy chương trình từ `start`: dừng khi đụng cây/ra ngoài lưới hoặc khi tới nhà. */
export function run(map: PathMap, start: Pos, program: Dir[]): RunResult {
  const path: Pos[] = [start];
  let cur = start;
  for (let i = 0; i < program.length; i++) {
    const next = step(cur, program[i]);
    if (!inGrid(next) || isTree(map, next)) return { path, bumpAt: i, home: false };
    path.push(next);
    cur = next;
    if (samePos(cur, map.home)) return { path, bumpAt: null, home: true };
  }
  return { path, bumpAt: null, home: false };
}

/** Đường ngắn nhất (BFS) từ `from` tới nhà; null nếu không có đường. */
export function shortestPath(map: PathMap, from: Pos): Dir[] | null {
  const key = (q: Pos) => `${q.r},${q.c}`;
  const prev = new Map<string, { from: Pos; dir: Dir } | null>([[key(from), null]]);
  const queue: Pos[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (samePos(cur, map.home)) {
      const dirs: Dir[] = [];
      let k = key(cur);
      let link = prev.get(k);
      while (link) {
        dirs.unshift(link.dir);
        k = key(link.from);
        link = prev.get(k);
      }
      return dirs;
    }
    for (const n of neighbors(cur, map)) {
      if (prev.has(key(n.pos))) continue;
      prev.set(key(n.pos), { from: cur, dir: n.dir });
      queue.push(n.pos);
    }
  }
  return null;
}

/** Mức chơi: dưới 48 tháng đi từng bước, lên xếp lệnh sau 4 lần về nhà; từ 48 tháng xếp lệnh ngay. */
export function levelFor(ageMonths: number, wins: number): 1 | 2 {
  if (ageMonths >= 48) return 2;
  return wins >= 4 ? 2 : 1;
}
