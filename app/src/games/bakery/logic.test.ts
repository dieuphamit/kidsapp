import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addTopping, removeTopping, onCake, praiseKey, countSame, countKey, nextCustomer, toppingImage,
  TOPPING_IDS, CUSTOMER_IDS, MAX_TOPPINGS, type Topping, type ToppingId,
  ALL_TOPPINGS, FRUIT_TOPPINGS, SHELF_SIZE, shelfFor, wishFor, wishMet, wishSayKeys, toppingSayKey,
} from './logic';
import { contentByKey } from '../../core/content';

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

describe('độ khó: kệ và điều ước', () => {
  it('kệ: dễ 4, vừa 6 (cổ điển), khó 6 món đổi theo khách; chủ đề trái cây chỉ có quả', () => {
    for (let i = 0; i < 20; i++) {
      expect(shelfFor('easy', 'mix')).toHaveLength(SHELF_SIZE.easy);
      expect(shelfFor('medium', 'mix')).toEqual([...TOPPING_IDS]);
      const hard = shelfFor('hard', 'mix');
      expect(hard).toHaveLength(6);
      expect(new Set(hard).size).toBe(6);
      // khách sau có món mới
      const next = shelfFor('hard', 'mix', hard);
      expect(next.filter((id) => !hard.includes(id)).length).toBeGreaterThanOrEqual(6);
      for (const lv of ['easy', 'medium', 'hard'] as const) {
        const f = shelfFor(lv, 'fruits');
        expect(f).toHaveLength(SHELF_SIZE[lv]);
        f.forEach((id) => expect(FRUIT_TOPPINGS).toContain(id));
      }
    }
  });

  it('kệ trái cây lần sau đổi món', () => {
    const a = shelfFor('easy', 'fruits');
    const b = shelfFor('easy', 'fruits', a);
    expect(b.some((id) => a.includes(id))).toBe(false);
  });

  it('điều ước: dễ 1 món, vừa 2–3 cái một loại, khó 2 loại; luôn có trên kệ; khác điều ước trước', () => {
    for (let i = 0; i < 30; i++) {
      const shelf = shelfFor('hard', 'mix');
      const e = wishFor('easy', shelf);
      expect(e).toEqual([{ id: e[0].id, count: 1 }]);
      const m = wishFor('medium', shelf, e);
      expect(m).toHaveLength(1);
      expect([2, 3]).toContain(m[0].count);
      expect(m[0].id).not.toBe(e[0].id);
      const h = wishFor('hard', shelf);
      expect(h).toHaveLength(2);
      expect(h[0].id).not.toBe(h[1].id);
      for (const w of [...e, ...m, ...h]) expect(shelf).toContain(w.id);
    }
  });

  it('đủ điều ước thì khen riêng, thiếu vẫn được khen thường (không có "sai")', () => {
    const wish = [{ id: 'kiwi' as const, count: 2 }];
    expect(wishMet(build(['kiwi']), wish)).toBe(false);
    expect(praiseKey(build(['kiwi', 'candle']), wish)).toBe('bakery.yum-candle');
    expect(wishMet(build(['kiwi', 'kiwi', 'banana']), wish)).toBe(true);
    expect(praiseKey(build(['kiwi', 'kiwi', 'candle']), wish)).toBe('bakery.yum-wish');
    expect(praiseKey(build(['kiwi']), [])).toBe('bakery.yum');
  });

  it('câu kể điều ước: số chỉ nói khi từ 2 cái', () => {
    expect(wishSayKeys([{ id: 'candle', count: 1 }])).toEqual(['bakery.wish', 'topping.candle']);
    expect(wishSayKeys([{ id: 'banana', count: 3 }, { id: 'kiwi', count: 1 }])).toEqual([
      'bakery.wish', 'number.3', 'fruit.banana', 'topping.kiwi',
    ]);
  });

  it('mọi topping có ảnh và câu nói đủ vi/ja/en', () => {
    const content = contentByKey();
    for (const id of ALL_TOPPINGS) {
      expect(existsSync(join(appDir, 'public', toppingImage(id))), id).toBe(true);
      const c = content.get(toppingSayKey(id));
      expect(c?.vi && c.ja && c.en, id).toBeTruthy();
    }
    for (const k of ['bakery.wish', 'bakery.yum-wish']) expect(content.has(k), k).toBe(true);
  });
});
