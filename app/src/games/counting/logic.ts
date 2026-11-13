import type { Topic } from '../../core/gameOptions';
import { LEARN_COLORS, type LearnColor } from '../../core/tokens';
import { FRUIT_IDS } from '../../content/fruitIds';
import { pickFresh, type Level } from '../../core/variety';

export interface State {
  picked: number[];
  /** Số cần hái/cất cho đủ lượt này. */
  target: number;
  done: boolean;
}

export interface PickResult {
  state: State;
  count: number | null;
}

export function initial(target = 10): State {
  return { picked: [], target, done: false };
}

/** Hái một món; món đã hái hoặc đã đủ số thì không đếm (count null). */
export function pick(state: State, fruitId: number): PickResult {
  if (state.done || state.picked.includes(fruitId)) {
    return { state, count: null };
  }
  const newPicked = [...state.picked, fruitId];
  const done = newPicked.length >= state.target;
  return {
    state: { picked: newPicked, target: state.target, done },
    count: newPicked.length,
  };
}

export function reset(target = 10): State {
  return initial(target);
}

// ---------- Nội dung và độ khó ----------

export type CountKind = 'fruits' | 'animals' | 'shapes';
export const COUNT_KINDS: readonly CountKind[] = ['fruits', 'animals', 'shapes'];

/** Quả có thẻ `cards/<id>.png` và tiếng đọc `fruit.<id>`. */
export const COUNT_FRUITS: readonly string[] = FRUIT_IDS;
/** Con vật có thẻ `cards/<id>.png` và tiếng đọc `animal.<id>`. */
export const COUNT_ANIMALS: readonly string[] = [
  'cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit',
  'elephant', 'giraffe', 'lion', 'tiger', 'monkey', 'panda', 'penguin', 'koala', 'fox', 'bear', 'parrot', 'fish',
];
/** Hình vẽ bằng SVG, tiếng đọc `shape.<id>`. */
export const COUNT_SHAPES: readonly string[] = ['circle', 'square', 'triangle', 'star', 'heart'];

export const POOL: Record<CountKind, readonly string[]> = {
  fruits: COUNT_FRUITS,
  animals: COUNT_ANIMALS,
  shapes: COUNT_SHAPES,
};

/**
 * Số cần đếm theo mức:
 * dễ 1–3 món (đếm hết), vừa 2–5 món (đếm hết),
 * khó: cây có 10 món, bé lấy đúng 2–10 món theo số Đậu Đậu nói (dấu chấm trên giỏ).
 */
export const TARGETS: Record<Level, readonly number[]> = {
  easy: [1, 2, 3],
  medium: [2, 3, 4, 5],
  hard: [2, 3, 4, 5, 6, 7, 8, 9, 10],
};

/** Số món hiện trên cây/bãi cỏ. */
export function shownFor(level: Level, target: number): number {
  return level === 'hard' ? 10 : target;
}

export interface Round {
  kind: CountKind;
  /** id quả / con vật / hình */
  item: string;
  /** màu của hình (chỉ kind 'shapes') */
  color: LearnColor | null;
  target: number;
  shown: number;
}

/** Lượt mới: loại món theo chủ đề ('mix' thì đổi loại mỗi lượt), món, màu và số đều khác lượt trước. */
export function newRound(level: Level, topic: Topic, last: Round | null, rand: () => number = Math.random): Round {
  const kind: CountKind = (COUNT_KINDS as readonly string[]).includes(topic)
    ? (topic as CountKind)
    : pickFresh(COUNT_KINDS, last?.kind, rand);
  const item = pickFresh(POOL[kind], last?.kind === kind ? last.item : null, rand);
  const color = kind === 'shapes' ? pickFresh(LEARN_COLORS, last?.color, rand) : null;
  const target = pickFresh(TARGETS[level], last?.target, rand);
  return { kind, item, color, target, shown: shownFor(level, target) };
}

/** Key tiếng đọc tên món. */
export function itemSayKey(kind: CountKind, item: string): string {
  if (kind === 'fruits') return `fruit.${item}`;
  if (kind === 'animals') return `animal.${item}`;
  return `shape.${item}`;
}

/** Câu chào lượt đầu theo loại món. */
export function helloKey(kind: CountKind): string {
  return kind === 'fruits' ? 'count.hello' : `count.hello-${kind}`;
}

/** Câu khen khi đủ: hái đủ 10 quả giữ câu "Mười quả!" cũ, còn lại khen chung. */
export function doneKey(round: Pick<Round, 'kind' | 'target'>): string {
  return round.kind === 'fruits' && round.target === 10 ? 'count.done' : 'count.all';
}

/** Nhãn đọc màn hình / e2e cho món thứ i. */
export function itemLabel(kind: CountKind, i: number): string {
  if (kind === 'fruits') return `Quả ${i}`;
  if (kind === 'animals') return `Bạn ${i}`;
  return `Hình ${i}`;
}
