import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addTopping, removeTopping, onCake, praiseKey, countSame, countKey, nextCustomer, toppingImage,
  TOPPING_IDS, CUSTOMER_IDS, MAX_TOPPINGS, type Topping, type ToppingId,
} from './logic';

const build = (ids: ToppingId[]): Topping[] => ids.reduce<Topping[]>((l, id, i) => addTopping(l, id, i, i), []);

const appDir = join(import.meta.dirname, '../../..');
const contentKeys = (file: string): Set<string> =>
  new Set((JSON.parse(readFileSync(join(appDir, 'src/content', file), 'utf8')) as { key: string }[]).map((e) => e.key));

describe('addTopping', () => {
  it('thêm đúng chỗ, không đổi list cũ, n tăng dần', () => {
    const a = addTopping([], 'kiwi', 10, 20);
    const b = addTopping(a, 'candle', 30, 40);
    expect(a).toHaveLength(1);
    expect(b).toEqual([
      { id: 'kiwi', x: 10, y: 20, n: 1 },
      { id: 'candle', x: 30, y: 40, n: 2 },
    ]);
  });

  it('tối đa 20, quá thì bỏ cái cũ nhất', () => {
    let list: Topping[] = [];
    for (let i = 0; i < MAX_TOPPINGS; i++) list = addTopping(list, 'kiwi', i, 0);
    expect(MAX_TOPPINGS).toBe(20);
    expect(list).toHaveLength(20);
    list = addTopping(list, 'candle', 99, 99);
    expect(list).toHaveLength(20);
    expect(list[0].x).toBe(1);
    expect(list[19]).toMatchObject({ id: 'candle', x: 99, y: 99 });
    expect(new Set(list.map((t) => t.n)).size).toBe(20);
  });

  it('removeTopping bỏ đúng cái', () => {
    const list = build(['kiwi', 'candle', 'kiwi']);
    expect(removeTopping(list, 2).map((t) => t.id)).toEqual(['kiwi', 'kiwi']);
  });
});

describe('onCake', () => {
  const rect = { left: 100, top: 200, right: 500, bottom: 400 };
  it('trong và trên mép là trên bánh', () => {
    expect(onCake({ x: 300, y: 300 }, rect)).toBe(true);
    expect(onCake({ x: 100, y: 200 }, rect)).toBe(true);
    expect(onCake({ x: 500, y: 400 }, rect)).toBe(true);
  });
  it('ngoài là không', () => {
    expect(onCake({ x: 99, y: 300 }, rect)).toBe(false);
    expect(onCake({ x: 300, y: 401 }, rect)).toBe(false);
    expect(onCake({ x: 501, y: 199 }, rect)).toBe(false);
  });
});

describe('praiseKey', () => {
  it('có nến → yum-candle (kể cả nhiều quả)', () => {
    expect(praiseKey(build(['candle']))).toBe('bakery.yum-candle');
    expect(praiseKey(build(['kiwi', 'kiwi', 'strawberry', 'candle']))).toBe('bakery.yum-candle');
  });
  it('≥3 quả → yum-fruit', () => {
    expect(praiseKey(build(['kiwi', 'blueberry', 'cherries']))).toBe('bakery.yum-fruit');
    expect(praiseKey(build(['strawberry', 'strawberry', 'strawberry', 'chocolate']))).toBe('bakery.yum-fruit');
  });
  it('còn lại → yum', () => {
    expect(praiseKey([])).toBe('bakery.yum');
    expect(praiseKey(build(['kiwi', 'strawberry', 'chocolate', 'chocolate']))).toBe('bakery.yum');
  });
});

describe('countSame / countKey', () => {
  it('đếm đúng loại', () => {
    const list = build(['kiwi', 'candle', 'kiwi', 'kiwi']);
    expect(countSame(list, 'kiwi')).toBe(3);
    expect(countSame(list, 'candle')).toBe(1);
    expect(countSame(list, 'chocolate')).toBe(0);
  });
  it('chỉ nói số từ cái thứ 2 đến 10', () => {
    expect(countKey(build(['kiwi']), 'kiwi')).toBeNull();
    expect(countKey(build(['kiwi', 'kiwi']), 'kiwi')).toBe('number.2');
    expect(countKey(build(Array<ToppingId>(10).fill('candle')), 'candle')).toBe('number.10');
    expect(countKey(build(Array<ToppingId>(11).fill('candle')), 'candle')).toBeNull();
  });
});

describe('nextCustomer', () => {
  it('không lặp lại khách vừa rồi', () => {
    for (const r of [0, 0.3, 0.999]) {
      expect(nextCustomer('cow', () => r)).not.toBe('cow');
      expect(CUSTOMER_IDS).toContain(nextCustomer('cow', () => r));
    }
  });
});

describe('nội dung có sẵn', () => {
  it('mọi topping có ảnh và câu nói topping.<id>', () => {
    const keys = contentKeys('games3.json');
    for (const id of TOPPING_IDS) {
      expect(existsSync(join(appDir, 'public', toppingImage(id))), id).toBe(true);
      expect(keys.has(`topping.${id}`), id).toBe(true);
    }
    for (const k of ['bakery.hello', 'bakery.order', 'bakery.yum', 'bakery.yum-fruit', 'bakery.yum-candle', 'bakery.ask', 'game.bakery']) {
      expect(keys.has(k), k).toBe(true);
    }
  });
  it('mọi khách có thẻ ảnh và câu nói animal.<id>', () => {
    const keys = new Set([...contentKeys('animals.json'), ...contentKeys('wild.json')]);
    for (const id of CUSTOMER_IDS) {
      expect(existsSync(join(appDir, 'public/cards', `${id}.png`)), id).toBe(true);
      expect(keys.has(`animal.${id}`), id).toBe(true);
    }
  });
});
