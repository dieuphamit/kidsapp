import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ITEMS,
  ITEM_IDS,
  CUSTOMERS,
  CUSTOMER_COUNT,
  SHELF_SIZE,
  STOCK,
  MAX_TOTAL,
  newRound,
  currentTurn,
  addItem,
  startScan,
  scanNext,
  advance,
  isDone,
  missing,
  inBasket,
  stockLeft,
  progress,
  totalWanted,
  roundItems,
  wantKeys,
  itemKey,
  gotKey,
  numberKey,
  HELLO_KEY,
  WANT_KEY,
  NOPE_KEY,
  ENOUGH_KEY,
  NOT_YET_KEY,
  PAY_KEY,
  THANKS_KEY,
  DONE_KEY,
  type State,
} from './logic';
import {
  shelfSlots,
  ITEM_SIZE,
  SHELF,
  BUBBLE,
  CUSTOMER,
  KEEPER,
  REGISTER_BTN,
  BASKET_SHOP,
  BASKET_DESK,
  BASKET_W,
  BASKET_H,
  REPLAY,
  CUSTOMER_AREA,
  PARTY_BUDDY,
  PARTY_AREA,
  PARTY_MAX_W,
  PARTY_FLOOR,
  FLOOR_Y,
  fitArea,
  partySlots,
  wantSize,
  STAGE_W,
  STAGE_H,
} from './layout';
import type { Level } from '../../core/variety';

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');
const CONTENT = join(import.meta.dirname, '..', '..', 'content');
const LEVELS: Level[] = ['easy', 'medium', 'hard'];

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
  for (const f of readdirSync(CONTENT).filter((x) => x.endsWith('.json'))) {
    for (const item of JSON.parse(readFileSync(join(CONTENT, f), 'utf8'))) map.set(item.key, item);
  }
  return map;
}

describe('dữ liệu món hàng và khách', () => {
  it('ít nhất 24 món thuộc vài nhóm, mỗi món có thẻ hình, tên đọc và câu khen riêng đủ vi/ja/en', () => {
    expect(ITEM_IDS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(ITEM_IDS.map((i) => ITEMS[i].group)).size).toBeGreaterThanOrEqual(3);
    const content = contentKeys();
    for (const id of ITEM_IDS) {
      expect(existsSync(join(PUBLIC, 'cards', `${ITEMS[id].card}.png`)), id).toBe(true);
      for (const key of [itemKey(id), gotKey(id)]) {
        const c = content.get(key);
        expect(c, key).toBeDefined();
        for (const l of ['vi', 'ja', 'en'] as const) {
          expect(c![l], `${key}.${l}`).toBeTruthy();
          expect(existsSync(join(PUBLIC, 'audio', l, `${key}.mp3`)), `${l}/${key}.mp3`).toBe(true);
        }
      }
    }
  });

  it('ít nhất 8 khách thú, mỗi khách có ảnh và tiếng kêu thật', () => {
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CUSTOMERS.map((c) => c.id)).size).toBe(CUSTOMERS.length);
    for (const c of CUSTOMERS) {
      expect(existsSync(join(PUBLIC, c.img)), c.img).toBe(true);
      // cỡ ảnh ghi trong dữ liệu khớp file thật (đầu file PNG)
      const png = readFileSync(join(PUBLIC, c.img));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], c.id).toEqual([c.w, c.h]);
      expect(c.sound).toBe(`animal.${c.id}-sound`);
      expect(existsSync(join(PUBLIC, 'audio', 'sfx', `animal-${c.id}.mp3`)), c.id).toBe(true);
    }
  });

  it('mọi câu nói của trò có trong content đủ ba thứ tiếng; số đếm tới MAX_TOTAL có sẵn', () => {
    const content = contentKeys();
    const keys = ['game.shop', HELLO_KEY, WANT_KEY, NOPE_KEY, ENOUGH_KEY, NOT_YET_KEY, PAY_KEY, THANKS_KEY, DONE_KEY];
    for (let n = 1; n <= MAX_TOTAL; n++) keys.push(numberKey(n));
    for (const key of keys) {
      const c = content.get(key);
      expect(c, key).toBeDefined();
      for (const l of ['vi', 'ja', 'en'] as const) expect(c![l], `${key}.${l}`).toBeTruthy();
    }
  });
});

describe('newRound', () => {
  it('số khách, số ô kệ, số món theo mức chơi; kệ luôn có đủ món khách cần', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 40; seed++) {
        const s = newRound(level, seeded(seed));
        expect(s.turns).toHaveLength(CUSTOMER_COUNT[level]);
        expect(new Set(s.turns.map((t) => t.customer)).size).toBe(s.turns.length);
        expect(s.stock).toBe(STOCK[level]);
        s.turns.forEach((t, i) => {
          expect(t.shelf).toHaveLength(SHELF_SIZE[level]);
          expect(new Set(t.shelf).size).toBe(t.shelf.length);
          for (const w of t.need) {
            expect(t.shelf).toContain(w.item);
            expect(w.qty).toBeLessThanOrEqual(s.stock);
            expect(w.qty).toBeGreaterThanOrEqual(1);
          }
          expect(new Set(t.need.map((w) => w.item)).size).toBe(t.need.length);
          if (level === 'easy') {
            expect(t.need).toHaveLength(i === 0 ? 1 : 2);
            expect(totalWanted(t)).toBe(t.need.length);
          } else if (level === 'medium') {
            expect(t.need).toHaveLength(3);
            expect(totalWanted(t)).toBe(3);
            expect(t.shelf.length).toBeGreaterThan(t.need.length); // có món lạ
          } else {
            expect([2, 3]).toContain(t.need.length);
            expect(totalWanted(t)).toBeLessThanOrEqual(MAX_TOTAL);
            expect(t.need.some((w) => w.qty >= 2)).toBe(true); // có số lượng
          }
        });
        // món cần của các khách trong một lượt không trùng nhau
        const items = roundItems(s);
        expect(new Set(items).size).toBe(items.length);
      }
    }
  });

  it('lượt sau tránh khách và món của lượt trước khi kho còn đủ', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = newRound('medium', seeded(seed));
      const b = newRound('medium', seeded(seed + 100), { customers: a.turns.map((t) => t.customer), items: roundItems(a) });
      for (const t of b.turns) expect(a.turns.map((x) => x.customer)).not.toContain(t.customer);
      for (const it of roundItems(b)) expect(roundItems(a)).not.toContain(it);
    }
  });
});

describe('vòng chơi', () => {
  const start = (level: Level, seed = 7): State => newRound(level, seeded(seed));

  it('món lạ và món đã đủ không đổi gì; món đúng vào giỏ; đủ món thì ra quầy', () => {
    let s = start('hard');
    const t = currentTurn(s)!;
    const odd = t.shelf.find((x) => !t.need.some((w) => w.item === x))!;
    expect(addItem(s, odd)).toEqual({ state: s, result: 'stranger' });
    expect(progress(s)).toBe(0);

    const first = t.need[0];
    for (let k = 0; k < first.qty; k++) {
      const r = addItem(s, first.item);
      expect(['added', 'complete']).toContain(r.result);
      s = r.state;
    }
    expect(inBasket(s, first.item)).toBe(first.qty);
    expect(stockLeft(s, first.item)).toBe(STOCK.hard - first.qty);
    expect(missing(s).map((w) => w.item)).not.toContain(first.item);
    const again = addItem(s, first.item);
    expect(again.result).toBe('enough');
    expect(again.state).toBe(s);

    for (const w of t.need.slice(1)) {
      for (let k = 0; k < w.qty; k++) s = addItem(s, w.item).state;
    }
    expect(s.phase).toBe('checkout');
    expect(s.basket).toHaveLength(totalWanted(t));
    expect(missing(s)).toEqual([]);
    expect(progress(s)).toBe(1);
    expect(addItem(s, odd).result).toBe('ignored');
  });

  it('máy tính tiền: chỉ bấm được khi giỏ ở quầy; mỗi lần bíp đếm thêm một; món cuối xong thì khách trả tiền xong', () => {
    let s = start('medium');
    expect(startScan(s).ok).toBe(false);
    const t = currentTurn(s)!;
    for (const w of t.need) s = addItem(s, w.item).state;
    const scan = startScan(s);
    expect(scan.ok).toBe(true);
    s = scan.state;
    expect(s.phase).toBe('scan');
    const counts: number[] = [];
    for (let k = 0; k < 3; k++) {
      const r = scanNext(s);
      counts.push(r.count);
      expect(r.done).toBe(k === 2);
      s = r.state;
    }
    expect(counts).toEqual([1, 2, 3]);
    expect(s.phase).toBe('paid');
    expect(scanNext(s).state).toBe(s);
  });

  it('phục vụ hết khách thì xong lượt', () => {
    let s = start('easy');
    for (let i = 0; i < CUSTOMER_COUNT.easy; i++) {
      expect(isDone(s)).toBe(false);
      for (const w of currentTurn(s)!.need) s = addItem(s, w.item).state;
      s = startScan(s).state;
      while (s.phase === 'scan') s = scanNext(s).state;
      expect(s.phase).toBe('paid');
      s = advance(s);
      expect(s.basket).toEqual([]);
    }
    expect(isDone(s)).toBe(true);
    expect(currentTurn(s)).toBeUndefined();
  });

  it('chuỗi câu đọc danh sách: có số đếm khi mua nhiều cái', () => {
    const s = start('hard');
    const t = currentTurn(s)!;
    const keys = wantKeys(t);
    expect(keys[0]).toBe(WANT_KEY);
    for (const w of t.need) {
      const at = keys.indexOf(itemKey(w.item));
      expect(at).toBeGreaterThan(0);
      if (w.qty > 1) expect(keys[at - 1]).toBe(numberKey(w.qty));
    }
    const easy = currentTurn(start('easy'))!;
    expect(wantKeys(easy)).toEqual([WANT_KEY, itemKey(easy.need[0].item)]);
  });
});

describe('bố cục', () => {
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, gap = 0) =>
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
  const GATE = { x: STAGE_W - 144, y: 0, w: 144, h: 120 };
  const BACK = { x: 24, y: 24, w: 120, h: 120 };

  it('ô kệ ≥120px, cách nhau ≥24px, nằm trong kệ, tránh nút về nhà và góc cổng bố mẹ', () => {
    for (const n of [4, 6, 8]) {
      const slots = shelfSlots(n);
      expect(slots).toHaveLength(n);
      slots.forEach((a, i) => {
        expect(a.w).toBeGreaterThanOrEqual(120);
        expect(a.h).toBeGreaterThanOrEqual(120);
        expect(a.x).toBeGreaterThanOrEqual(SHELF.x);
        expect(a.x + a.w).toBeLessThanOrEqual(SHELF.x + SHELF.w);
        expect(overlap(a, BACK, 24)).toBe(false);
        expect(overlap(a, GATE)).toBe(false);
        expect(overlap(a, BUBBLE, 24)).toBe(false);
        slots.slice(i + 1).forEach((b) => expect(overlap(a, b, 24)).toBe(false));
      });
    }
    expect(ITEM_SIZE).toBeGreaterThanOrEqual(120);
  });

  it('khách, bong bóng, chủ tiệm, máy tính tiền, giỏ, nút chơi lại: đủ to, trong khung, không đè nhau, tránh góc cổng bố mẹ', () => {
    const btn = { x: REGISTER_BTN.x, y: REGISTER_BTN.y, w: REGISTER_BTN.size, h: REGISTER_BTN.size };
    const shop = { x: BASKET_SHOP.x, y: BASKET_SHOP.y, w: BASKET_W, h: BASKET_H };
    const desk = { x: BASKET_DESK.x, y: BASKET_DESK.y, w: BASKET_W, h: BASKET_H };
    const replay = { x: REPLAY.x, y: REPLAY.y, w: REPLAY.size, h: REPLAY.size };
    for (const r of [CUSTOMER, BUBBLE, KEEPER, btn, shop, desk, replay]) {
      expect(r.w).toBeGreaterThanOrEqual(120);
      expect(r.h).toBeGreaterThanOrEqual(120);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(STAGE_W);
      expect(r.y + r.h).toBeLessThanOrEqual(STAGE_H);
      expect(overlap(r, GATE)).toBe(false);
    }
    expect(overlap(KEEPER, BACK, 24)).toBe(false);
    expect(overlap(KEEPER, btn, 24)).toBe(false);
    expect(overlap(btn, desk, 24)).toBe(false);
    expect(overlap(btn, shop, 24)).toBe(false);
    expect(overlap(BUBBLE, CUSTOMER)).toBe(false);
  });

  it('khách dáng ngang và dáng đứng chiếm diện tích nhìn tương đương, chân chạm sàn, không tràn khung', () => {
    const areas = CUSTOMERS.map((c) => {
      const f = fitArea(c.w, c.h, CUSTOMER_AREA, CUSTOMER.w, CUSTOMER.h);
      expect(f.w, c.id).toBeLessThanOrEqual(CUSTOMER.w);
      expect(f.h, c.id).toBeLessThanOrEqual(CUSTOMER.h);
      expect(f.w / f.h, c.id).toBeCloseTo(c.w / c.h, 1);
      return f.w * f.h;
    });
    // con nhỏ nhất không dưới 85% con to nhất (trước đây heo chỉ bằng nửa gấu trúc)
    expect(Math.min(...areas) / Math.max(...areas)).toBeGreaterThan(0.85);
    expect(CUSTOMER.x + CUSTOMER.w).toBeLessThanOrEqual(STAGE_W);
    expect(CUSTOMER.y + CUSTOMER.h).toBeGreaterThan(FLOOR_Y);
  });

  it('ăn mừng: khách xếp hàng trên sàn hai bên bạn đồng hành, cách nhau ≥24px, nút chơi lại không đè ai', () => {
    const replay = { x: REPLAY.x, y: REPLAY.y, w: REPLAY.size, h: REPLAY.size };
    for (const n of [3, 4, 5]) {
      const slots = partySlots(n);
      expect(slots).toHaveLength(n);
      const all = [...slots, PARTY_BUDDY];
      all.forEach((a, i) => {
        expect(a.w).toBeGreaterThanOrEqual(120);
        expect(a.h).toBeGreaterThanOrEqual(120);
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x + a.w).toBeLessThanOrEqual(STAGE_W);
        expect(a.y + a.h).toBe(PARTY_FLOOR);
        expect(overlap(a, replay, 24)).toBe(false);
        all.slice(i + 1).forEach((b) => expect(overlap(a, b, 24)).toBe(false));
      });
    }
    expect(PARTY_FLOOR).toBeGreaterThan(FLOOR_Y);
    for (const c of CUSTOMERS) {
      const f = fitArea(c.w, c.h, PARTY_AREA, PARTY_MAX_W, 190);
      expect(f.h, c.id).toBeLessThanOrEqual(190);
      expect(f.w, c.id).toBeLessThanOrEqual(PARTY_MAX_W);
    }
  });

  it('bong bóng chứa vừa mọi hình (tới MAX_TOTAL hình)', () => {
    for (let n = 1; n <= MAX_TOTAL; n++) {
      const size = wantSize(n);
      const perRow = Math.min(n, 3);
      const rows = Math.ceil(n / 3);
      expect(perRow * size + (perRow - 1) * 8).toBeLessThanOrEqual(BUBBLE.w - 2 * 17);
      expect(rows * size + (rows - 1) * 8).toBeLessThanOrEqual(BUBBLE.h - 2 * 15);
    }
  });
});
