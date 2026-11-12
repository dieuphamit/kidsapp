/** Logic thuần của Tiệm bánh Đậu Đậu: chơi mở, không có đáp án đúng/sai. */

export const TOPPING_IDS = ['strawberry', 'cherries', 'blueberry', 'kiwi', 'candle', 'chocolate'] as const;
export type ToppingId = (typeof TOPPING_IDS)[number];

/** Topping là quả (ảnh `cards/<id>.png`); còn lại là đồ trang trí (ảnh `cards/extra/<id>.png`). */
export const FRUIT_TOPPINGS: readonly ToppingId[] = ['strawberry', 'cherries', 'blueberry', 'kiwi'];

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

/** Lời khen của khách theo bánh: có nến > nhiều quả (≥3) > khen chung. */
export function praiseKey(list: readonly Topping[]): string {
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
