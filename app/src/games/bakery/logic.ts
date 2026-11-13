/** Logic thuần của Tiệm bánh Đậu Đậu: chơi mở, không có đáp án đúng/sai. */
import type { Topic } from '../../core/gameOptions';
import { pickFresh, pickManyFresh, shuffle, type Level } from '../../core/variety';

/** Kệ cổ điển (mức vừa, chủ đề trộn): câu nói `topping.<id>`. */
export const TOPPING_IDS = ['strawberry', 'cherries', 'blueberry', 'kiwi', 'candle', 'chocolate'] as const;
/** Quả thêm cho kệ đổi mới: ảnh `cards/<id>.png`, câu nói `fruit.<id>`. */
export const EXTRA_FRUIT_TOPPINGS = ['banana', 'grapes', 'orange', 'peach', 'pineapple', 'lemon'] as const;
export type ToppingId = (typeof TOPPING_IDS)[number] | (typeof EXTRA_FRUIT_TOPPINGS)[number];
export const ALL_TOPPINGS: readonly ToppingId[] = [...TOPPING_IDS, ...EXTRA_FRUIT_TOPPINGS];

/** Topping là quả (ảnh `cards/<id>.png`); còn lại là đồ trang trí (ảnh `cards/extra/<id>.png`). */
export const FRUIT_TOPPINGS: readonly ToppingId[] = ['strawberry', 'cherries', 'blueberry', 'kiwi', ...EXTRA_FRUIT_TOPPINGS];

/** Khách: các bạn thú có thẻ `cards/<id>.png` và tiếng đọc `animal.<id>`. */
export const CUSTOMER_IDS = [
  'cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit',
  'elephant', 'giraffe', 'lion', 'tiger', 'monkey', 'panda', 'penguin', 'koala', 'fox', 'bear', 'parrot',
] as const;

export const MAX_TOPPINGS = 20;

/** Một topping đã đặt trên bánh; x, y tính trong khung bánh (px), n là số thứ tự duy nhất để làm key. */
export type Topping = { id: ToppingId; x: number; y: number; n: number };

export type Rect = { left: number; top: number; right: number; bottom: number };

export function toppingImage(id: ToppingId): string {
  return FRUIT_TOPPINGS.includes(id) ? `cards/${id}.png` : `cards/extra/${id}.png`;
}

/** Thêm topping; quá MAX_TOPPINGS thì bỏ cái cũ nhất. Không đổi list cũ. */
export function addTopping(list: readonly Topping[], id: ToppingId, x: number, y: number): Topping[] {
  const n = list.reduce((m, t) => Math.max(m, t.n), 0) + 1;
  const next = [...list, { id, x, y, n }];
  return next.length > MAX_TOPPINGS ? next.slice(next.length - MAX_TOPPINGS) : next;
}

export function removeTopping(list: readonly Topping[], n: number): Topping[] {
  return list.filter((t) => t.n !== n);
}

/** Điểm (toạ độ khung Stage) có nằm trên bánh không (tính cả mép). */
export function onCake(point: { x: number; y: number }, cakeRect: Rect): boolean {
  return point.x >= cakeRect.left && point.x <= cakeRect.right && point.y >= cakeRect.top && point.y <= cakeRect.bottom;
}

export function countSame(list: readonly Topping[], id: ToppingId): number {
  return list.filter((t) => t.id === id).length;
}

/** Lời khen của khách theo bánh: đúng điều ước > có nến > nhiều quả (≥3) > khen chung. */
export function praiseKey(list: readonly Topping[], wish?: Wish): string {
  if (wish && wish.length > 0 && wishMet(list, wish)) return 'bakery.yum-wish';
  if (list.some((t) => t.id === 'candle')) return 'bakery.yum-candle';
  if (list.filter((t) => FRUIT_TOPPINGS.includes(t.id)).length >= 3) return 'bakery.yum-fruit';
  return 'bakery.yum';
}

/** Key đếm sau khi thả: từ cái thứ 2 cùng loại, tối đa 10; không đếm thì null. */
export function countKey(list: readonly Topping[], id: ToppingId): string | null {
  const n = countSame(list, id);
  return n >= 2 && n <= 10 ? `number.${n}` : null;
}

/** Chọn khách ngẫu nhiên, khác khách hiện tại. */
export function nextCustomer(current: string | null, rand: () => number = Math.random): string {
  const pool = CUSTOMER_IDS.filter((id) => id !== current);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** Câu nói tên topping: topping cổ điển có câu riêng, quả thêm dùng `fruit.<id>`. */
export function toppingSayKey(id: ToppingId): string {
  return (TOPPING_IDS as readonly string[]).includes(id) ? `topping.${id}` : `fruit.${id}`;
}

export function isToppingId(id: string): id is ToppingId {
  return (ALL_TOPPINGS as readonly string[]).includes(id);
}

// ---------- Độ khó: số món trên kệ và điều ước của khách ----------

/** Khách ước: bánh có `count` cái `id` (mỗi mục một loại). Không đúng ý vẫn được khen, chỉ là khen khác. */
export type Wish = { id: ToppingId; count: number }[];

/** Kệ có chỗ cho tối đa 6 món (3 hàng trên quầy). */
export const SHELF_SIZE: Record<Level, number> = { easy: 4, medium: 6, hard: 6 };

/**
 * Kệ cho một khách. Chủ đề trái cây: chỉ quả, đổi mỗi khách.
 * Trộn: mức vừa giữ kệ cổ điển 6 món; dễ 4 món cổ điển; khó 6 món lấy từ cả 12 món (có quả mới), đổi mỗi khách.
 */
export function shelfFor(level: Level, topic: Topic, recent: readonly ToppingId[] = [], rand: () => number = Math.random): ToppingId[] {
  const size = SHELF_SIZE[level];
  if (topic === 'fruits') return pickManyFresh(FRUIT_TOPPINGS, size, recent, rand);
  if (level === 'medium') return [...TOPPING_IDS];
  if (level === 'easy') return shuffle(pickManyFresh(TOPPING_IDS, size, recent, rand), rand);
  return pickManyFresh(ALL_TOPPINGS, size, recent, rand);
}

/**
 * Điều ước theo mức: dễ 1 cái một loại; vừa 2–3 cái một loại; khó hai loại, mỗi loại 1–3 cái.
 * Chọn từ kệ đang có, khác món ước của khách trước (`last`).
 */
export function wishFor(level: Level, shelf: readonly ToppingId[], last: Wish | null = null, rand: () => number = Math.random): Wish {
  const lastIds = last?.map((w) => w.id) ?? [];
  if (level === 'easy') return [{ id: pickFresh(shelf, lastIds[0], rand), count: 1 }];
  if (level === 'medium') return [{ id: pickFresh(shelf, lastIds[0], rand), count: pickFresh([2, 3], null, rand) }];
  const ids = pickManyFresh(shelf, 2, lastIds, rand);
  return ids.map((id) => ({ id, count: pickFresh([1, 2, 3], null, rand) }));
}

/** Bánh đã có đủ mọi món khách ước chưa (thừa vẫn tính là đủ). */
export function wishMet(list: readonly Topping[], wish: Wish): boolean {
  return wish.every((w) => countSame(list, w.id) >= w.count);
}

/** Các câu khách nói để kể điều ước: "Tớ muốn bánh có cái này!", rồi (số) + tên từng món. */
export function wishSayKeys(wish: Wish): string[] {
  const keys = ['bakery.wish'];
  for (const w of wish) {
    if (w.count >= 2) keys.push(`number.${w.count}`);
    keys.push(toppingSayKey(w.id));
  }
  return keys;
}
