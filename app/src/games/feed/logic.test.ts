import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { contentByKey } from '../../core/content';
import {
  ANIMALS,
  ANIMAL_IDS,
  FOODS,
  FOOD_IDS,
  TURNS_PER_ROUND,
  foodCountForAge,
  bitesForAge,
  newRound,
  currentTurn,
  feed,
  advance,
  isDone,
  animalById,
  hungryKey,
  likesKey,
  hintKey,
  fullKey,
  foodKey,
  soundKey,
  HELLO_KEY,
  DONE_KEY,
} from './logic';
import { animalBox, layoutFoods, mouthPoint, FOOD_SIZE, STAGE_W } from './layout';

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');

/** Random cố định để test lặp lại được. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('Cho thú ăn: dữ liệu', () => {
  it('6–8 cặp thú–món, mỗi thú một món riêng (món "không hợp" không bao giờ là món thú cũng thích)', () => {
    expect(ANIMALS.length).toBeGreaterThanOrEqual(6);
    expect(ANIMALS.length).toBeLessThanOrEqual(8);
    const foods = ANIMALS.map((a) => a.food);
    expect(new Set(foods).size).toBe(foods.length);
    expect(new Set(ANIMAL_IDS).size).toBe(ANIMAL_IDS.length);
    for (const f of foods) expect(FOOD_IDS).toContain(f);
  });

  it('các cặp đúng thực tế', () => {
    const pairs = Object.fromEntries(ANIMALS.map((a) => [a.id, a.food]));
    expect(pairs).toMatchObject({ rabbit: 'carrot', monkey: 'banana', panda: 'bamboo', cat: 'fish', horse: 'apple' });
  });

  it('ảnh thú và ảnh món là ảnh thật có sẵn trong public/cards', () => {
    for (const a of ANIMALS) expect(existsSync(join(PUBLIC, 'cards', `${a.card}.png`)), a.card).toBe(true);
    for (const f of FOOD_IDS) expect(existsSync(join(PUBLIC, 'cards', `${FOODS[f].card}.png`)), f).toBe(true);
  });

  it('tiếng kêu: ghi âm thật nếu có mp3, không thì câu TTS trong content', () => {
    const content = contentByKey();
    for (const a of ANIMALS) {
      const m = /^animal\.([a-z]+)-sound$/.exec(a.sound);
      if (m) expect(existsSync(join(PUBLIC, 'audio', 'sfx', `animal-${m[1]}.mp3`)), a.sound).toBe(true);
      else expect(content.get(a.sound), a.sound).toBeDefined();
    }
  });

  it('mọi câu nói có đủ vi, ja, en', () => {
    const content = contentByKey();
    const keys = [HELLO_KEY, DONE_KEY, 'game.feed'];
    for (const a of ANIMAL_IDS) keys.push(hungryKey(a), likesKey(a), hintKey(a), fullKey(a), `feed.nope.${a}`);
    for (const f of FOOD_IDS) keys.push(foodKey(f));
    for (const k of keys) {
      const item = content.get(k);
      expect(item, k).toBeDefined();
      expect(item?.vi, k).toBeTruthy();
      expect(item?.ja, k).toBeTruthy();
      expect(item?.en, k).toBeTruthy();
    }
  });

  it('miệng nằm trong ảnh', () => {
    for (const a of ANIMALS) {
      expect(a.mouth[0]).toBeGreaterThan(0);
      expect(a.mouth[0]).toBeLessThan(1);
      expect(a.mouth[1]).toBeGreaterThan(0);
      expect(a.mouth[1]).toBeLessThan(1);
    }
  });
});

describe('Cho thú ăn: theo tuổi', () => {
  it('số món trên khay: <30 tháng 2, <48 tháng 3, còn lại 4', () => {
    expect(foodCountForAge(24)).toBe(2);
    expect(foodCountForAge(29)).toBe(2);
    expect(foodCountForAge(30)).toBe(3);
    expect(foodCountForAge(47)).toBe(3);
    expect(foodCountForAge(48)).toBe(4);
    expect(foodCountForAge(72)).toBe(4);
  });

  it('số miếng để no: 2 cho bé nhỏ, 3 cho bé lớn', () => {
    expect(bitesForAge(24)).toBe(2);
    expect(bitesForAge(36)).toBe(3);
  });
});

describe('Cho thú ăn: lượt chơi', () => {
  it('lượt mới: các con khác nhau, khay đúng số món, luôn có món thú thích, không trùng món', () => {
    for (const age of [24, 40, 60]) {
      for (let seed = 1; seed < 30; seed++) {
        const s = newRound(age, seeded(seed));
        expect(s.turns).toHaveLength(TURNS_PER_ROUND);
        expect(new Set(s.turns.map((t) => t.animal)).size).toBe(TURNS_PER_ROUND);
        for (const t of s.turns) {
          expect(t.foods).toHaveLength(foodCountForAge(age));
          expect(new Set(t.foods).size).toBe(t.foods.length);
          expect(t.foods).toContain(animalById(t.animal).food);
        }
        expect(s.index).toBe(0);
        expect(s.bites).toBe(0);
        expect(s.need).toBe(bitesForAge(age));
      }
    }
  });

  it('tránh các con vừa chơi lượt trước nếu còn đủ', () => {
    const avoid = ANIMAL_IDS.slice(0, ANIMAL_IDS.length - TURNS_PER_ROUND);
    const s = newRound(40, seeded(7), avoid);
    for (const t of s.turns) expect(avoid).not.toContain(t.animal);
  });

  it('đưa đúng món: no dần (chỉ tăng), miếng cuối là full; đưa món khác: không đổi gì', () => {
    const s0 = newRound(40, seeded(3));
    const t = currentTurn(s0)!;
    const right = animalById(t.animal).food;
    const wrong = t.foods.find((f) => f !== right)!;

    const n = feed(s0, wrong);
    expect(n.result).toBe('nope');
    expect(n.state).toBe(s0);

    let s = s0;
    for (let i = 1; i <= s0.need; i++) {
      const r = feed(s, right);
      expect(r.result).toBe(i < s0.need ? 'yum' : 'full');
      expect(r.state.bites).toBe(i);
      s = r.state;
    }
    // no rồi thì không ăn thêm, thanh no không giảm
    expect(feed(s, right).result).toBe('nope');
    expect(feed(s, wrong).state.bites).toBe(s0.need);
  });

  it('sang con kế: bites về 0 cho con mới; hết lượt thì isDone', () => {
    let s = newRound(60, seeded(11));
    for (let i = 0; i < TURNS_PER_ROUND; i++) {
      expect(isDone(s)).toBe(false);
      const food = animalById(currentTurn(s)!.animal).food;
      for (let b = 0; b < s.need; b++) s = feed(s, food).state;
      s = advance(s);
      expect(s.bites).toBe(0);
    }
    expect(isDone(s)).toBe(true);
    expect(currentTurn(s)).toBeUndefined();
  });

  it('soundKey trả tiếng kêu thật (ghi âm), kể cả mèo', () => {
    expect(soundKey('horse')).toBe('animal.horse-sound');
    expect(soundKey('cat')).toBe('animal.cat-sound');
    for (const id of ANIMAL_IDS) expect(soundKey(id)).toBe(`animal.${id}-sound`);
  });
});

describe('Cho thú ăn: bố cục khung 1194×834', () => {
  it('món ≥120px, cách nhau ≥24px, nằm trong khung và tránh góc phải 144px', () => {
    for (const n of [2, 3, 4]) {
      const boxes = layoutFoods(n);
      expect(boxes).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        expect(boxes[i].size).toBeGreaterThanOrEqual(120);
        expect(boxes[i].x).toBeGreaterThanOrEqual(144);
        expect(boxes[i].x + boxes[i].size).toBeLessThanOrEqual(STAGE_W - 144);
        expect(boxes[i].y + boxes[i].size).toBeLessThanOrEqual(834);
        if (i > 0) expect(boxes[i].x - (boxes[i - 1].x + FOOD_SIZE)).toBeGreaterThanOrEqual(24);
      }
    }
  });

  it('thú ở giữa, không chồng lên khay, không chạm góc cổng bố mẹ', () => {
    const a = animalBox();
    expect(a.x + a.size / 2).toBeCloseTo(STAGE_W / 2, 0);
    expect(a.y).toBeGreaterThanOrEqual(120);
    expect(a.x + a.size).toBeLessThanOrEqual(STAGE_W - 144);
    expect(a.y + a.size).toBeLessThanOrEqual(layoutFoods(4)[0].y);
  });

  it('điểm miệng tính theo tỉ lệ trong ảnh', () => {
    expect(mouthPoint({ x: 100, y: 200, size: 400 }, [0.25, 0.5])).toEqual({ x: 200, y: 400 });
  });
});
