import type { Difficulty, Topic } from './gameOptions';
import { DIFFICULTIES, TOPICS } from './gameOptions';

/** Mức chơi thật của một lượt (đã quy 'auto' theo tuổi). */
export type Level = 'easy' | 'medium' | 'hard';

/**
 * Mức chơi từ độ khó bố mẹ chọn; 'auto' thì theo tuổi:
 * dưới 36 tháng → dễ, 36–47 → vừa, từ 48 → khó.
 */
export function levelFor(ageMonths: number, difficulty: Difficulty = 'auto'): Level {
  if (difficulty !== 'auto') return difficulty;
  if (ageMonths < 36) return 'easy';
  if (ageMonths < 48) return 'medium';
  return 'hard';
}

function e2eParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  return p.get('e2e') === '1' ? p : null;
}

/**
 * Mức chơi và chủ đề cho trò. Chỉ khi chạy e2e (`?e2e=1`), có thể ép bằng
 * `&level=easy|medium|hard` và `&topic=...` để test lặp lại được.
 */
export function playSetup(
  ageMonths: number,
  options?: { difficulty: Difficulty; topic: Topic },
): { level: Level; topic: Topic } {
  let level = levelFor(ageMonths, options?.difficulty ?? 'auto');
  let topic: Topic = options?.topic ?? 'mix';
  const p = e2eParams();
  const forcedLevel = p?.get('level');
  if (forcedLevel && (DIFFICULTIES as readonly string[]).includes(forcedLevel) && forcedLevel !== 'auto') {
    level = forcedLevel as Level;
  }
  const forcedTopic = p?.get('topic');
  if (forcedTopic && (TOPICS as readonly string[]).includes(forcedTopic)) topic = forcedTopic as Topic;
  return { level, topic };
}

/** Xáo trộn (Fisher–Yates), không sửa mảng gốc. */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Chọn một phần tử khác `last` (nếu kho có hơn một phần tử). */
export function pickFresh<T>(pool: readonly T[], last: T | null | undefined, rand: () => number = Math.random): T {
  const fresh = pool.length > 1 ? pool.filter((x) => x !== last) : [...pool];
  return fresh[Math.min(fresh.length - 1, Math.floor(rand() * fresh.length))];
}

/**
 * Chọn n phần tử khác nhau, ưu tiên phần tử không có trong `recent` (lượt vừa chơi);
 * kho mới không đủ thì bù bằng phần tử cũ.
 */
export function pickManyFresh<T>(
  pool: readonly T[],
  n: number,
  recent: readonly T[] = [],
  rand: () => number = Math.random,
): T[] {
  const fresh = shuffle(pool.filter((x) => !recent.includes(x)), rand);
  const old = shuffle(pool.filter((x) => recent.includes(x)), rand);
  return [...fresh, ...old].slice(0, Math.min(n, pool.length));
}
