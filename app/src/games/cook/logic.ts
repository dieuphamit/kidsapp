/**
 * Trò "Bếp nấu ăn": một khách thú (ảnh thật) đứng sau quầy, Đậu Đậu nói món khách muốn,
 * thẻ công thức hiện các nguyên liệu bằng hình. Bé kéo nguyên liệu vào nồi; đủ thì bật bếp,
 * khuấy vá cho nồi sôi, múc ra bát rồi kéo bát cho khách. Món không có trong công thức chỉ
 * lắc nhẹ rồi về chỗ (không âm báo sai, không điểm, không thua).
 */
import type { Level } from '../../core/variety';

export const INGREDIENTS = {
  carrot: { card: 'feed/carrot', say: 'feed.food.carrot' },
  potato: { card: 'cook/potato', say: 'cook.food.potato' },
  tomato: { card: 'cook/tomato', say: 'cook.food.tomato' },
  broccoli: { card: 'cook/broccoli', say: 'cook.food.broccoli' },
  noodles: { card: 'cook/noodles', say: 'cook.food.noodles' },
  egg: { card: 'story/chick-1', say: 'cook.food.egg' },
  mushroom: { card: 'cook/mushroom', say: 'cook.food.mushroom' },
  rice: { card: 'cook/rice', say: 'cook.food.rice' },
  corn: { card: 'feed/corn', say: 'feed.food.corn' },
  fish: { card: 'feed/fish', say: 'feed.food.fish' },
  apple: { card: 'apple', say: 'fruit.apple' },
  grapes: { card: 'grapes', say: 'fruit.grapes' },
  kiwi: { card: 'kiwi', say: 'fruit.kiwi' },
  pineapple: { card: 'pineapple', say: 'fruit.pineapple' },
  banana: { card: 'banana', say: 'fruit.banana' },
  strawberry: { card: 'strawberry', say: 'fruit.strawberry' },
  blueberry: { card: 'blueberry', say: 'fruit.blueberry' },
  peach: { card: 'peach', say: 'fruit.peach' },
} as const satisfies Record<string, { card: string; say: string }>;

export type IngredientId = keyof typeof INGREDIENTS;
export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

/** Màu món khi chín (biến trong tokens.css), dùng cho nồi, bát và thẻ công thức. */
export type Broth = 'learn-orange' | 'clay-butter' | 'scene-wood-light' | 'scene-sun' | 'clay-leaf' | 'clay-peach';

export interface Dish {
  id: string;
  /** Nguyên liệu theo thứ tự ưu tiên: bé nhỏ chỉ cần mấy món đầu. */
  items: readonly IngredientId[];
  broth: Broth;
  /** Đựng trong bát hay cốc (sinh tố). */
  vessel: 'bowl' | 'cup';
}

export const DISHES = [
  { id: 'soup', items: ['carrot', 'potato', 'tomato', 'broccoli'], broth: 'learn-orange', vessel: 'bowl' },
  { id: 'noodles', items: ['noodles', 'egg', 'mushroom', 'carrot'], broth: 'clay-butter', vessel: 'bowl' },
  { id: 'rice', items: ['rice', 'corn', 'egg', 'broccoli'], broth: 'scene-wood-light', vessel: 'bowl' },
  { id: 'fishsoup', items: ['fish', 'tomato', 'mushroom', 'potato'], broth: 'scene-sun', vessel: 'bowl' },
  { id: 'salad', items: ['apple', 'grapes', 'kiwi', 'pineapple'], broth: 'clay-leaf', vessel: 'bowl' },
  { id: 'smoothie', items: ['banana', 'strawberry', 'blueberry', 'peach'], broth: 'clay-peach', vessel: 'cup' },
] as const satisfies readonly Dish[];

export type DishId = (typeof DISHES)[number]['id'];
export const DISH_IDS: readonly DishId[] = DISHES.map((d) => d.id);

export interface Customer {
  id: string;
  /** Ảnh thú thật tách nền, đường dẫn trong public/ (không có BASE_URL). */
  img: string;
  /** Tiếng kêu (key câu nói): ghi âm thật 'animal.<x>-sound' hoặc câu TTS. */
  sound: string;
}

export const CUSTOMERS = [
  { id: 'raccoon', img: 'world-photos/raccoon.png', sound: 'animal.raccoon-sound' },
  { id: 'koala', img: 'world-photos/koala.png', sound: 'animal.koala-sound' },
  { id: 'panda', img: 'world-photos/panda.png', sound: 'animal.panda-sound' },
  { id: 'penguin', img: 'world-photos/penguin.png', sound: 'animal.penguin-sound' },
  { id: 'rabbit', img: 'world-photos/rabbit.png', sound: 'animal.rabbit-sound' },
  { id: 'dog', img: 'world-photos/dog.png', sound: 'animal.dog-sound' },
  { id: 'cat', img: 'world-photos/cat.png', sound: 'animal.cat-sound' },
  { id: 'pig', img: 'world-photos/pig.png', sound: 'animal.pig-sound' },
] as const satisfies readonly Customer[];

export type CustomerId = (typeof CUSTOMERS)[number]['id'];
export const CUSTOMER_IDS: readonly CustomerId[] = CUSTOMERS.map((c) => c.id);

/** Số khách mỗi lượt trước khi ăn mừng. */
export const TURNS_PER_ROUND = 3;

export function dishById(id: DishId): Dish {
  const d = DISHES.find((x) => x.id === id);
  if (!d) throw new Error('không có món ' + id);
  return d;
}

export function customerById(id: CustomerId): Customer {
  const c = CUSTOMERS.find((x) => x.id === id);
  if (!c) throw new Error('không có khách ' + id);
  return c;
}

/** Số nguyên liệu trong công thức theo mức chơi: bé nhỏ (dễ) 2, vừa 3, khó 4. */
export const INGREDIENT_COUNT: Record<Level, number> = { easy: 2, medium: 3, hard: 4 };

/** Số món lạ (không có trong công thức) bày trên quầy: mức dễ không có. */
export const STRANGER_COUNT: Record<Level, number> = { easy: 0, medium: 1, hard: 2 };

/** Quãng khuấy (px khung) để món chín: mức dễ ít hơn. Chạm nồi cũng tính một chút. */
export const STIR_NEED: Record<Level, number> = { easy: 700, medium: 1100, hard: 1100 };

export interface Turn {
  customer: CustomerId;
  dish: DishId;
  /** Nguyên liệu cần cho món (mấy món đầu của công thức). */
  need: IngredientId[];
  /** Nguyên liệu bày trên quầy, đã xáo: đủ món cần và vài món lạ. */
  counter: IngredientId[];
}

export type Phase = 'gather' | 'ready' | 'stir' | 'bowl' | 'served';

export interface State {
  turns: Turn[];
  /** Khách đang phục vụ (0..turns.length); bằng turns.length là xong lượt. */
  index: number;
  phase: Phase;
  /** Nguyên liệu đã vào nồi (theo thứ tự thả). */
  added: IngredientId[];
  /** Đã khuấy được bao nhiêu (px khung). */
  stirred: number;
  stirNeed: number;
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ưu tiên phần tử không nằm trong `avoid`, rồi mới tới phần tử đã dùng gần đây. */
function freshFirst<T>(all: readonly T[], avoid: readonly T[], rand: () => number): T[] {
  return [...shuffle(all.filter((x) => !avoid.includes(x)), rand), ...shuffle(all.filter((x) => avoid.includes(x)), rand)];
}

/**
 * Lượt mới: TURNS_PER_ROUND khách khác nhau, mỗi khách một món khác nhau (tránh `avoid` nếu còn).
 * Món lạ lấy từ nguyên liệu không có trong cả công thức của món (kể cả phần bé nhỏ không cần).
 */
export function newRound(
  level: Level,
  rand: () => number = Math.random,
  avoid: { customers?: readonly CustomerId[]; dishes?: readonly DishId[] } = {},
): State {
  const n = INGREDIENT_COUNT[level];
  const strangers = STRANGER_COUNT[level];
  const customers = freshFirst(CUSTOMER_IDS, avoid.customers ?? [], rand);
  const dishes = freshFirst(DISH_IDS, avoid.dishes ?? [], rand);
  const turns = Array.from({ length: TURNS_PER_ROUND }, (_, i) => {
    const dish = dishById(dishes[i % dishes.length]);
    const need = dish.items.slice(0, n);
    const odd = shuffle(INGREDIENT_IDS.filter((x) => !dish.items.includes(x)), rand).slice(0, strangers);
    return { customer: customers[i % customers.length], dish: dish.id as DishId, need, counter: shuffle([...need, ...odd], rand) };
  });
  return { turns, index: 0, phase: 'gather', added: [], stirred: 0, stirNeed: STIR_NEED[level] };
}

export function currentTurn(state: State): Turn | undefined {
  return state.turns[state.index];
}

/** Nguyên liệu còn thiếu trong nồi. */
export function missing(state: State): IngredientId[] {
  const t = currentTurn(state);
  return t ? t.need.filter((x) => !state.added.includes(x)) : [];
}

export type AddResult = 'added' | 'ready' | 'stranger' | 'ignored';

/**
 * Thả `item` vào nồi. 'added' = vào nồi, còn thiếu; 'ready' = món cuối, đủ để bật bếp;
 * 'stranger' = không có trong công thức (không đổi gì); 'ignored' = đã có rồi hoặc không phải lúc.
 */
export function addIngredient(state: State, item: IngredientId): { state: State; result: AddResult } {
  const t = currentTurn(state);
  if (!t || state.phase !== 'gather') return { state, result: 'ignored' };
  if (!t.need.includes(item)) return { state, result: 'stranger' };
  if (state.added.includes(item)) return { state, result: 'ignored' };
  const added = [...state.added, item];
  const ready = t.need.every((x) => added.includes(x));
  return { state: { ...state, added, phase: ready ? 'ready' : 'gather' }, result: ready ? 'ready' : 'added' };
}

/** Bật bếp: chỉ khi đủ nguyên liệu; chưa đủ thì không đổi gì. */
export function turnOn(state: State): { state: State; ok: boolean } {
  if (state.phase !== 'ready') return { state, ok: false };
  return { state: { ...state, phase: 'stir', stirred: 0 }, ok: true };
}

/** Khuấy thêm `amount` px. Đủ quãng thì món chín, múc ra bát (phase 'bowl'). */
export function stir(state: State, amount: number): { state: State; cooked: boolean } {
  if (state.phase !== 'stir' || amount <= 0) return { state, cooked: false };
  const stirred = Math.min(state.stirNeed, state.stirred + amount);
  const cooked = stirred >= state.stirNeed;
  return { state: { ...state, stirred, phase: cooked ? 'bowl' : 'stir' }, cooked };
}

/** Tiến độ khuấy 0..1. */
export function stirProgress(state: State): number {
  return state.stirNeed > 0 ? state.stirred / state.stirNeed : 1;
}

/** Đưa bát cho khách. */
export function serve(state: State): { state: State; ok: boolean } {
  if (state.phase !== 'bowl') return { state, ok: false };
  return { state: { ...state, phase: 'served' }, ok: true };
}

/** Sang khách kế (sau khi khách ăn xong). */
export function advance(state: State): State {
  return { ...state, index: Math.min(state.index + 1, state.turns.length), phase: 'gather', added: [], stirred: 0 };
}

export function isDone(state: State): boolean {
  return state.index >= state.turns.length;
}

/** Key câu nói. */
export const wantKey = (d: DishId) => `cook.want.${d}`;
export const dishKey = (d: DishId) => `cook.dish.${d}`;
export const foodKey = (i: IngredientId) => INGREDIENTS[i].say;
export const HELLO_KEY = 'cook.hello';
export const NOPE_KEY = 'cook.nope';
export const LOOK_KEY = 'cook.look';
export const READY_KEY = 'cook.ready';
export const NOT_YET_KEY = 'cook.notyet';
export const STIR_KEY = 'cook.stir';
export const COOKED_KEY = 'cook.cooked';
export const SERVE_KEY = 'cook.serve';
export const YUM_KEY = 'cook.yum';
export const DONE_KEY = 'cook.done';
