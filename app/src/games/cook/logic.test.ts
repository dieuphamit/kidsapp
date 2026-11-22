import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DISHES,
  DISH_IDS,
  CUSTOMERS,
  INGREDIENTS,
  INGREDIENT_IDS,
  TURNS_PER_ROUND,
  newRound,
  currentTurn,
  addIngredient,
  turnOn,
  stir,
  stirProgress,
  serve,
  advance,
  isDone,
  missing,
  dishById,
  INGREDIENT_COUNT,
  STRANGER_COUNT,
  STIR_NEED,
  wantKey,
  dishKey,
  foodKey,
  type State,
} from './logic';
import { layoutItems, CARD, BOWL, STOVE, STOVE_SIZE, ITEM_SIZE, STAGE_W } from './layout';

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');
const CONTENT = join(import.meta.dirname, '..', '..', 'content');

/** Số giả ngẫu nhiên cố định cho test lặp lại được. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function contentKeys(): Map<string, { vi: string; ja: string; en: string }> {
  const map = new Map();
  for (const f of ['cook.json', 'feed.json', 'fruits.json']) {
    for (const item of JSON.parse(readFileSync(join(CONTENT, f), 'utf8'))) map.set(item.key, item);
  }
  return map;
}

describe('dữ liệu món và nguyên liệu', () => {
  it('ít nhất 5 món, mỗi món 4 nguyên liệu khác nhau, có thật trong kho', () => {
    expect(DISHES.length).toBeGreaterThanOrEqual(5);
    for (const d of DISHES) {
      expect(new Set(d.items).size).toBe(4);
      for (const it of d.items) expect(INGREDIENT_IDS).toContain(it);
    }
    expect(new Set(DISH_IDS).size).toBe(DISHES.length);
  });

  it('hai nguyên liệu đầu (bé nhỏ) của các món không trùng nhau hoàn toàn', () => {
    const pairs = DISHES.map((d) => [...d.items.slice(0, 2)].sort().join('+'));
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('mọi ảnh nguyên liệu và ảnh khách có trong public/', () => {
    for (const id of INGREDIENT_IDS) expect(existsSync(join(PUBLIC, 'cards', `${INGREDIENTS[id].card}.png`)), id).toBe(true);
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(6);
    for (const c of CUSTOMERS) expect(existsSync(join(PUBLIC, c.img)), c.id).toBe(true);
  });

  it('mọi câu nói có đủ vi/ja/en; tiếng kêu khách là ghi âm thật hoặc câu có sẵn', () => {
    const keys = contentKeys();
    const all = [
      ...DISH_IDS.flatMap((d) => [wantKey(d), dishKey(d)]),
      ...INGREDIENT_IDS.map(foodKey),
      'game.cook', 'cook.hello', 'cook.done', 'cook.nope', 'cook.look', 'cook.ready', 'cook.notyet',
      'cook.stir', 'cook.cooked', 'cook.serve', 'cook.yum',
    ];
    for (const k of all) {
      const item = keys.get(k);
      expect(item, k).toBeDefined();
      for (const lang of ['vi', 'ja', 'en'] as const) expect(item![lang].length, `${k}.${lang}`).toBeGreaterThan(0);
    }
    for (const c of CUSTOMERS) {
      const m = /^animal\.([a-z]+)-sound$/.exec(c.sound);
      if (m) expect(existsSync(join(PUBLIC, 'audio', 'sfx', `animal-${m[1]}.mp3`)), c.sound).toBe(true);
      else expect(keys.has(c.sound), c.sound).toBe(true);
    }
  });
});

describe('độ khó theo mức chơi', () => {
  it('dễ 2 nguyên liệu không món lạ; vừa 3 + 1 món lạ; khó 4 + 2 món lạ', () => {
    expect([INGREDIENT_COUNT.easy, STRANGER_COUNT.easy]).toEqual([2, 0]);
    expect([INGREDIENT_COUNT.medium, STRANGER_COUNT.medium]).toEqual([3, 1]);
    expect([INGREDIENT_COUNT.hard, STRANGER_COUNT.hard]).toEqual([4, 2]);
    expect(STIR_NEED.easy).toBeLessThan(STIR_NEED.hard);
  });

  it('lượt mới: khách và món khác nhau; quầy có đủ món cần, món lạ không thuộc công thức', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      for (let seed = 1; seed < 30; seed++) {
        const s = newRound(level, seeded(seed));
        expect(s.turns).toHaveLength(TURNS_PER_ROUND);
        expect(new Set(s.turns.map((t) => t.customer)).size).toBe(TURNS_PER_ROUND);
        expect(new Set(s.turns.map((t) => t.dish)).size).toBe(TURNS_PER_ROUND);
        for (const t of s.turns) {
          const dish = dishById(t.dish);
          expect(t.need).toEqual(dish.items.slice(0, INGREDIENT_COUNT[level]));
          expect(t.counter).toHaveLength(t.need.length + STRANGER_COUNT[level]);
          expect(new Set(t.counter).size).toBe(t.counter.length);
          for (const it of t.need) expect(t.counter).toContain(it);
          for (const it of t.counter.filter((x) => !t.need.includes(x))) expect(dish.items).not.toContain(it);
        }
      }
    }
  });

  it('tránh khách và món vừa gặp ở lượt trước nếu còn đủ', () => {
    const s = newRound('hard', seeded(7), { customers: ['raccoon', 'koala', 'panda'], dishes: ['soup', 'noodles', 'rice'] });
    for (const t of s.turns) {
      expect(['raccoon', 'koala', 'panda']).not.toContain(t.customer);
      expect(['soup', 'noodles', 'rice']).not.toContain(t.dish);
    }
  });
});

describe('logic nồi', () => {
  const round = (): State => newRound('hard', seeded(3));

  it('thêm đúng nguyên liệu: vào nồi, còn thiếu; món cuối thì đủ (ready)', () => {
    let s = round();
    const t = currentTurn(s)!;
    for (let i = 0; i < t.need.length; i++) {
      const r = addIngredient(s, t.need[i]);
      expect(r.result).toBe(i === t.need.length - 1 ? 'ready' : 'added');
      s = r.state;
      expect(s.added).toEqual(t.need.slice(0, i + 1));
    }
    expect(s.phase).toBe('ready');
    expect(missing(s)).toEqual([]);
  });

  it('món lạ bị bỏ qua, không đổi trạng thái; thả trùng cũng không đổi', () => {
    let s = round();
    const t = currentTurn(s)!;
    const odd = t.counter.find((x) => !t.need.includes(x))!;
    const r = addIngredient(s, odd);
    expect(r.result).toBe('stranger');
    expect(r.state).toBe(s);
    s = addIngredient(s, t.need[0]).state;
    const again = addIngredient(s, t.need[0]);
    expect(again.result).toBe('ignored');
    expect(again.state).toBe(s);
  });

  it('chưa đủ thì bật bếp không được; đủ thì bật, khuấy tới chín, múc ra bát, đưa khách', () => {
    let s = round();
    const t = currentTurn(s)!;
    expect(turnOn(s).ok).toBe(false);
    expect(stir(s, 500).state).toBe(s);
    expect(serve(s).ok).toBe(false);
    for (const it of t.need) s = addIngredient(s, it).state;
    const on = turnOn(s);
    expect(on.ok).toBe(true);
    s = on.state;
    expect(s.phase).toBe('stir');
    // sau khi bật bếp không thêm nguyên liệu được nữa
    expect(addIngredient(s, t.need[0]).result).toBe('ignored');
    let r = stir(s, s.stirNeed / 2);
    expect(r.cooked).toBe(false);
    expect(stirProgress(r.state)).toBeCloseTo(0.5);
    r = stir(r.state, s.stirNeed);
    expect(r.cooked).toBe(true);
    expect(r.state.phase).toBe('bowl');
    expect(stirProgress(r.state)).toBe(1);
    const sv = serve(r.state);
    expect(sv.ok).toBe(true);
    expect(sv.state.phase).toBe('served');
  });

  it('phục vụ đủ khách thì xong lượt', () => {
    let s = round();
    for (let i = 0; i < TURNS_PER_ROUND; i++) {
      expect(isDone(s)).toBe(false);
      const t = currentTurn(s)!;
      for (const it of t.need) s = addIngredient(s, it).state;
      s = turnOn(s).state;
      s = stir(s, s.stirNeed).state;
      s = serve(s).state;
      s = advance(s);
      expect(s.added).toEqual([]);
      expect(s.phase).toBe('gather');
    }
    expect(isDone(s)).toBe(true);
    expect(addIngredient(s, 'carrot').result).toBe('ignored');
  });
});

describe('bố cục', () => {
  it('nguyên liệu ≥120px, cách nhau ≥24px, nằm trong khung', () => {
    for (let n = 2; n <= 6; n++) {
      const items = layoutItems(n);
      expect(ITEM_SIZE).toBeGreaterThanOrEqual(120);
      for (let i = 1; i < n; i++) expect(items[i].x - (items[i - 1].x + items[i - 1].w)).toBeGreaterThanOrEqual(24);
      expect(items[0].x).toBeGreaterThanOrEqual(24);
      expect(items[n - 1].x + items[n - 1].w).toBeLessThanOrEqual(STAGE_W - 24);
    }
  });

  it('thẻ công thức, bát, nút bếp tránh góc cổng phụ huynh (≥144px từ mép phải ở phần trên)', () => {
    expect(CARD.y).toBeGreaterThanOrEqual(120);
    expect(CARD.x + CARD.w).toBeLessThanOrEqual(STAGE_W - 144);
    expect(BOWL.x + BOWL.w).toBeLessThanOrEqual(STAGE_W - 144);
    expect(BOWL.y - (CARD.y + CARD.h)).toBeGreaterThanOrEqual(24);
    expect(STOVE_SIZE).toBeGreaterThanOrEqual(120);
    expect(STOVE.y).toBeGreaterThan(144);
  });
});
