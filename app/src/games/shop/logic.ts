/**
 * Trò "Cửa hàng": bé làm người bán hàng cùng bạn đồng hành. Khách thú bước vào, bong bóng suy nghĩ
 * hiện các món khách cần bằng hình. Bé kéo món từ kệ vào giỏ; đủ món thì giỏ trượt tới quầy,
 * bé bấm máy tính tiền, từng món kêu "bíp" và được đếm 1, 2, 3… rồi khách cầm túi ra về.
 * Món khách không cần chỉ nhẹ nhàng về kệ (không âm báo sai, không điểm, không thua).
 */
import type { Level } from '../../core/variety';

export type Group = 'fruit' | 'veg' | 'toy' | 'wear';

/** Món hàng: thẻ hình (public/cards/<card>.png) và key đọc tên đã có sẵn trong content. */
export const ITEMS = {
  apple: { card: 'apple', say: 'fruit.apple', group: 'fruit' },
  banana: { card: 'banana', say: 'fruit.banana', group: 'fruit' },
  cherries: { card: 'cherries', say: 'fruit.cherries', group: 'fruit' },
  grapes: { card: 'grapes', say: 'fruit.grapes', group: 'fruit' },
  lemon: { card: 'lemon', say: 'fruit.lemon', group: 'fruit' },
  orange: { card: 'orange', say: 'fruit.orange', group: 'fruit' },
  pear: { card: 'pear', say: 'fruit.pear', group: 'fruit' },
  pineapple: { card: 'pineapple', say: 'fruit.pineapple', group: 'fruit' },
  strawberry: { card: 'strawberry', say: 'fruit.strawberry', group: 'fruit' },
  watermelon: { card: 'watermelon', say: 'fruit.watermelon', group: 'fruit' },
  carrot: { card: 'feed/carrot', say: 'feed.food.carrot', group: 'veg' },
  corn: { card: 'feed/corn', say: 'feed.food.corn', group: 'veg' },
  tomato: { card: 'cook/tomato', say: 'cook.food.tomato', group: 'veg' },
  potato: { card: 'cook/potato', say: 'cook.food.potato', group: 'veg' },
  broccoli: { card: 'cook/broccoli', say: 'cook.food.broccoli', group: 'veg' },
  mushroom: { card: 'cook/mushroom', say: 'cook.food.mushroom', group: 'veg' },
  egg: { card: 'story/chick-1', say: 'cook.food.egg', group: 'veg' },
  fish: { card: 'feed/fish', say: 'feed.food.fish', group: 'veg' },
  ball: { card: 'words/ball', say: 'words.ball', group: 'toy' },
  teddy: { card: 'words/teddy', say: 'words.teddy', group: 'toy' },
  book: { card: 'words/book', say: 'words.book', group: 'toy' },
  car: { card: 'words/car', say: 'words.car', group: 'toy' },
  train: { card: 'words/train', say: 'words.train', group: 'toy' },
  boat: { card: 'words/boat', say: 'words.boat', group: 'toy' },
  airplane: { card: 'words/airplane', say: 'words.airplane', group: 'toy' },
  hat: { card: 'words/hat', say: 'words.hat', group: 'wear' },
  socks: { card: 'words/socks', say: 'words.socks', group: 'wear' },
  shoes: { card: 'words/shoes', say: 'words.shoes', group: 'wear' },
  boots: { card: 'words/boots', say: 'words.boots', group: 'wear' },
  shirt: { card: 'words/shirt', say: 'words.shirt', group: 'wear' },
} as const satisfies Record<string, { card: string; say: string; group: Group }>;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export interface Customer {
  id: string;
  /** Ảnh thú thật tách nền, đường dẫn trong public/ (không có BASE_URL). */
  img: string;
  /** Tiếng kêu thật: say('animal.<id>-sound') phát public/audio/sfx/animal-<id>.mp3. */
  sound: string;
  /** Ảnh gốc nhìn sang phải: lật ngang để khách quay mặt về phía kệ hàng. */
  flip: boolean;
  /** Cỡ ảnh gốc (px): để cân cỡ hiển thị giữa khách dáng ngang và dáng đứng. */
  w: number;
  h: number;
}

export const CUSTOMERS = [
  { id: 'rabbit', img: 'world-photos/rabbit.png', sound: 'animal.rabbit-sound', flip: false, w: 640, h: 613 },
  { id: 'panda', img: 'world-photos/panda.png', sound: 'animal.panda-sound', flip: true, w: 570, h: 640 },
  { id: 'koala', img: 'world-photos/koala.png', sound: 'animal.koala-sound', flip: true, w: 493, h: 532 },
  { id: 'penguin', img: 'world-photos/penguin.png', sound: 'animal.penguin-sound', flip: true, w: 377, h: 640 },
  { id: 'raccoon', img: 'world-photos/raccoon.png', sound: 'animal.raccoon-sound', flip: true, w: 640, h: 516 },
  { id: 'dog', img: 'world-photos/dog.png', sound: 'animal.dog-sound', flip: true, w: 640, h: 444 },
  { id: 'pig', img: 'world-photos/pig.png', sound: 'animal.pig-sound', flip: true, w: 640, h: 319 },
  { id: 'sheep', img: 'world-photos/sheep.png', sound: 'animal.sheep-sound', flip: false, w: 640, h: 500 },
  { id: 'cow', img: 'world-photos/cow.png', sound: 'animal.cow-sound', flip: true, w: 640, h: 356 },
  { id: 'chicken', img: 'world-photos/chicken.png', sound: 'animal.chicken-sound', flip: true, w: 640, h: 535 },
] as const satisfies readonly Customer[];

export type CustomerId = (typeof CUSTOMERS)[number]['id'];
export const CUSTOMER_IDS: readonly CustomerId[] = CUSTOMERS.map((c) => c.id);

export function customerById(id: CustomerId): Customer {
  const c = CUSTOMERS.find((x) => x.id === id);
  if (!c) throw new Error('không có khách ' + id);
  return c;
}

/** Số khách mỗi lượt trước khi ăn mừng. */
export const CUSTOMER_COUNT: Record<Level, number> = { easy: 3, medium: 4, hard: 5 };
/** Số ô trên kệ (món khách cần + món lạ). */
export const SHELF_SIZE: Record<Level, number> = { easy: 4, medium: 6, hard: 8 };
/** Mỗi ô kệ có mấy cái: mức khó khách mua nhiều cái cùng loại nên mỗi ô có 3. */
export const STOCK: Record<Level, number> = { easy: 1, medium: 1, hard: 3 };
/** Tổng số cái nhiều nhất trong một danh sách (mức khó). */
export const MAX_TOTAL = 6;

export interface Want {
  item: ItemId;
  qty: number;
}

export interface Turn {
  customer: CustomerId;
  /** Danh sách khách cần (theo thứ tự hiện trong bong bóng). */
  need: Want[];
  /** Các món bày trên kệ, đã xáo: đủ món cần và vài món lạ. */
  shelf: ItemId[];
}

export type Phase = 'shop' | 'checkout' | 'scan' | 'paid';

export interface State {
  turns: Turn[];
  /** Khách đang phục vụ (0..turns.length); bằng turns.length là xong lượt. */
  index: number;
  phase: Phase;
  /** Các món đã vào giỏ (theo thứ tự thả, món mua nhiều cái thì lặp lại). */
  basket: ItemId[];
  /** Số món đã "bíp" ở quầy. */
  scanned: number;
  /** Mỗi ô kệ có mấy cái lúc đầu. */
  stock: number;
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ưu tiên phần tử không nằm trong `avoid`, rồi mới tới phần tử đã dùng gần đây. */
function freshFirst<T>(all: readonly T[], avoid: readonly T[], rand: () => number): T[] {
  return [...shuffle(all.filter((x) => !avoid.includes(x)), rand), ...shuffle(all.filter((x) => avoid.includes(x)), rand)];
}

/** Số loại món trong danh sách của khách thứ `i`. */
function kindCount(level: Level, i: number, rand: () => number): number {
  if (level === 'easy') return i === 0 ? 1 : 2; // khách đầu chỉ một món cho bé làm quen
  if (level === 'medium') return 3;
  return rand() < 0.5 ? 2 : 3;
}

/** Số lượng từng loại ở mức khó: mỗi loại 1–3 cái, ít nhất một loại ≥2, tổng ≤ MAX_TOTAL. */
function quantities(kinds: number, rand: () => number): number[] {
  const q = Array.from({ length: kinds }, () => 1 + Math.min(2, Math.floor(rand() * 3)));
  if (!q.some((n) => n > 1)) q[0] = 2;
  let i = 0;
  while (q.reduce((a, b) => a + b, 0) > MAX_TOTAL) {
    if (q[i % kinds] > 1) q[i % kinds] -= 1;
    i += 1;
  }
  return q;
}

/**
 * Lượt mới: CUSTOMER_COUNT khách khác nhau; món cần của các khách trong lượt không trùng nhau
 * và tránh `avoid` (lượt vừa chơi) khi kho còn đủ. Món lạ trên kệ lấy ngẫu nhiên trong các món còn lại.
 */
export function newRound(
  level: Level,
  rand: () => number = Math.random,
  avoid: { customers?: readonly CustomerId[]; items?: readonly ItemId[] } = {},
): State {
  const count = CUSTOMER_COUNT[level];
  const customers = freshFirst(CUSTOMER_IDS, avoid.customers ?? [], rand);
  const pool = freshFirst(ITEM_IDS, avoid.items ?? [], rand);
  let used = 0;
  const turns = Array.from({ length: count }, (_, i): Turn => {
    const kinds = kindCount(level, i, rand);
    const items = Array.from({ length: kinds }, () => pool[used++ % pool.length]);
    const qty: number[] = level === 'hard' ? quantities(kinds, rand) : items.map(() => 1);
    const odd = shuffle(ITEM_IDS.filter((x) => !items.includes(x)), rand).slice(0, SHELF_SIZE[level] - kinds);
    return {
      customer: customers[i % customers.length],
      need: items.map((item, k) => ({ item, qty: qty[k] })),
      shelf: shuffle([...items, ...odd], rand),
    };
  });
  return { turns, index: 0, phase: 'shop', basket: [], scanned: 0, stock: STOCK[level] };
}

export function currentTurn(state: State): Turn | undefined {
  return state.turns[state.index];
}

/** Số cái `item` đang nằm trong giỏ. */
export function inBasket(state: State, item: ItemId): number {
  return state.basket.filter((x) => x === item).length;
}

/** Tổng số cái khách cần. */
export function totalWanted(turn: Turn): number {
  return turn.need.reduce((a, w) => a + w.qty, 0);
}

/** Những món còn thiếu và còn thiếu mấy cái. */
export function missing(state: State): Want[] {
  const t = currentTurn(state);
  if (!t) return [];
  return t.need.map((w) => ({ item: w.item, qty: w.qty - inBasket(state, w.item) })).filter((w) => w.qty > 0);
}

/** Ô kệ của `item` còn mấy cái. */
export function stockLeft(state: State, item: ItemId): number {
  return Math.max(0, state.stock - inBasket(state, item));
}

/** Tiến độ gom hàng 0..1 (để khách vui dần). */
export function progress(state: State): number {
  const t = currentTurn(state);
  if (!t) return 1;
  return state.basket.length / totalWanted(t);
}

export type AddResult = 'added' | 'complete' | 'stranger' | 'enough' | 'ignored';

/**
 * Thả `item` vào giỏ. 'added' = vào giỏ, còn thiếu; 'complete' = món cuối, giỏ ra quầy;
 * 'stranger' = khách không cần món này; 'enough' = món này đã đủ số (cả hai: không đổi gì);
 * 'ignored' = không phải lúc gom hàng.
 */
export function addItem(state: State, item: ItemId): { state: State; result: AddResult } {
  const t = currentTurn(state);
  if (!t || state.phase !== 'shop') return { state, result: 'ignored' };
  const want = t.need.find((w) => w.item === item);
  if (!want) return { state, result: 'stranger' };
  if (inBasket(state, item) >= want.qty) return { state, result: 'enough' };
  const basket = [...state.basket, item];
  const complete = basket.length >= totalWanted(t);
  return { state: { ...state, basket, phase: complete ? 'checkout' : 'shop' }, result: complete ? 'complete' : 'added' };
}

/** Bấm máy tính tiền: chỉ khi giỏ đã ở quầy. */
export function startScan(state: State): { state: State; ok: boolean } {
  if (state.phase !== 'checkout') return { state, ok: false };
  return { state: { ...state, phase: 'scan', scanned: 0 }, ok: true };
}

/** "Bíp" món kế tiếp; món cuối xong thì khách trả tiền xong (phase 'paid'). */
export function scanNext(state: State): { state: State; count: number; done: boolean } {
  if (state.phase !== 'scan') return { state, count: state.scanned, done: false };
  const scanned = Math.min(state.basket.length, state.scanned + 1);
  const done = scanned >= state.basket.length;
  return { state: { ...state, scanned, phase: done ? 'paid' : 'scan' }, count: scanned, done };
}

/** Sang khách kế (sau khi khách cầm túi ra về). */
export function advance(state: State): State {
  return { ...state, index: Math.min(state.index + 1, state.turns.length), phase: 'shop', basket: [], scanned: 0 };
}

export function isDone(state: State): boolean {
  return state.index >= state.turns.length;
}

/** Mọi món cần của cả lượt (để lượt sau tránh lặp). */
export function roundItems(state: State): ItemId[] {
  return state.turns.flatMap((t) => t.need.map((w) => w.item));
}

/** Key câu nói. */
export const itemKey = (i: ItemId) => ITEMS[i].say;
export const gotKey = (i: ItemId) => `shop.got.${i}`;
export const numberKey = (n: number) => `number.${n}`;
export const HELLO_KEY = 'shop.hello';
export const WANT_KEY = 'shop.want';
export const NOPE_KEY = 'shop.nope';
export const ENOUGH_KEY = 'shop.enough';
export const NOT_YET_KEY = 'shop.notyet';
export const PAY_KEY = 'shop.pay';
export const THANKS_KEY = 'shop.thanks';
export const DONE_KEY = 'shop.done';

/** Chuỗi câu đọc danh sách của khách: "Bạn muốn mua…", rồi (số lượng nếu >1) và tên từng món. */
export function wantKeys(turn: Turn): string[] {
  return [WANT_KEY, ...turn.need.flatMap((w) => (w.qty > 1 ? [numberKey(w.qty), itemKey(w.item)] : [itemKey(w.item)]))];
}
