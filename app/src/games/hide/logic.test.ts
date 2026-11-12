import { describe, it, expect } from 'vitest';
import { ROOMS, roomZones, zoneAt, nextAsk, askPairs, pairKey, OBJECT_PREPS, type Pair } from './logic';
import { contentByKey } from '../../core/content';

describe('hide: ROOMS', () => {
  it('3 phòng, mỗi phòng đúng 3 đồ vật theo đề', () => {
    expect(ROOMS.map((r) => r.objects.map((o) => o.id))).toEqual([
      ['table', 'box', 'bed'],
      ['chair', 'pot', 'basket'],
      ['tree', 'bucket', 'car'],
    ]);
  });

  it('mọi vùng thả có câu hide.<prep>-<obj> và hide.ask-… (vi, ja)', () => {
    const content = contentByKey();
    for (const r of ROOMS) {
      for (const z of roomZones(r)) {
        for (const key of [`hide.${z.prep}-${z.obj}`, `hide.ask-${z.prep}-${z.obj}`]) {
          const item = content.get(key);
          expect(item?.vi, key).toBeTruthy();
          expect(item?.ja, key).toBeTruthy();
        }
      }
    }
  });

  it('mỗi vùng ≥160×120, nằm trong khung, đủ mọi giới từ hợp lệ', () => {
    for (const r of ROOMS) {
      const zones = roomZones(r);
      const want = r.objects.flatMap((o) => OBJECT_PREPS[o.id].map((prep) => `${prep}-${o.id}`)).sort();
      expect(zones.map(pairKey).sort()).toEqual(want);
      for (const z of zones) {
        expect(z.right - z.left, pairKey(z)).toBeGreaterThanOrEqual(160);
        expect(z.bottom - z.top, pairKey(z)).toBeGreaterThanOrEqual(120);
        expect(z.left).toBeGreaterThanOrEqual(0);
        expect(z.right).toBeLessThanOrEqual(1194);
        expect(z.top).toBeGreaterThanOrEqual(150); // không đè nút Về nhà
        expect(z.bottom).toBeLessThanOrEqual(834);
      }
    }
  });

  it('điểm neo của mỗi vùng rơi đúng vào chính vùng đó', () => {
    for (const r of ROOMS) {
      const zones = roomZones(r);
      for (const z of zones) {
        const cx = (z.left + z.right) / 2;
        const cy = (z.top + z.bottom) / 2;
        expect(zoneAt({ x: cx, y: cy }, zones), pairKey(z)).toEqual({ prep: z.prep, obj: z.obj });
      }
    }
  });
});

describe('hide: zoneAt', () => {
  const zones = [
    { prep: 'on' as const, obj: 'box' as const, left: 0, top: 0, right: 300, bottom: 300 },
    { prep: 'in' as const, obj: 'box' as const, left: 100, top: 100, right: 200, bottom: 200 },
  ];

  it('điểm trong vùng → cặp của vùng', () => {
    expect(zoneAt({ x: 20, y: 20 }, zones)).toEqual({ prep: 'on', obj: 'box' });
  });

  it('điểm ngoài mọi vùng → null', () => {
    expect(zoneAt({ x: 400, y: 20 }, zones)).toBeNull();
    expect(zoneAt({ x: 10, y: 10 }, [])).toBeNull();
  });

  it('vùng chồng nhau → ưu tiên vùng nhỏ nhất', () => {
    expect(zoneAt({ x: 150, y: 150 }, zones)).toEqual({ prep: 'in', obj: 'box' });
    expect(zoneAt({ x: 150, y: 150 }, [...zones].reverse())).toEqual({ prep: 'in', obj: 'box' });
  });

  it('gầm bàn trong phòng khách', () => {
    const z = roomZones(ROOMS[0]).find((v) => v.prep === 'under' && v.obj === 'table')!;
    expect(zoneAt({ x: z.ax, y: z.ay }, roomZones(ROOMS[0]))).toEqual({ prep: 'under', obj: 'table' });
  });
});

describe('hide: nextAsk', () => {
  it('không lặp lại câu vừa hỏi, với mọi seed', () => {
    for (const r of ROOMS) {
      for (const last of askPairs(r)) {
        for (let seed = 0; seed < 30; seed++) {
          expect(pairKey(nextAsk(r, seed, last))).not.toBe(pairKey(last));
        }
      }
    }
  });

  it('chỉ chọn cặp hợp lệ của phòng và phủ đủ các cặp', () => {
    const r = ROOMS[1];
    const valid = new Set(askPairs(r).map(pairKey));
    const seen = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const p = nextAsk(r, seed, null);
      expect(valid.has(pairKey(p))).toBe(true);
      seen.add(pairKey(p));
    }
    expect(seen).toEqual(valid);
  });

  it('chuỗi hỏi liên tiếp không có hai câu giống nhau kề nhau', () => {
    let last: Pair | null = null;
    for (let i = 0; i < 40; i++) {
      const p = nextAsk(ROOMS[2], (i * 7) % 11, last);
      if (last) expect(pairKey(p)).not.toBe(pairKey(last));
      last = p;
    }
  });
});

describe('hide: bộ hỏi theo tuổi', () => {
  it('dưới 36 tháng chỉ hỏi on, in, under', () => {
    for (const r of ROOMS) {
      const pairs = askPairs(r, 30);
      expect(pairs.length).toBeGreaterThanOrEqual(2);
      for (const p of pairs) expect(['on', 'in', 'under']).toContain(p.prep);
      for (let seed = 0; seed < 20; seed++) {
        expect(['on', 'in', 'under']).toContain(nextAsk(r, seed, pairs[0], 30).prep);
      }
    }
  });

  it('từ 36 tháng có cả beside', () => {
    expect(askPairs(ROOMS[0], 48).some((p) => p.prep === 'beside')).toBe(true);
  });
});
