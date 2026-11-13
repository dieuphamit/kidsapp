/** Logic thuần của trò "Đậu Đậu trốn ở đâu?": phòng, đồ vật, vùng thả, chọn câu nhờ. */

export type Prep = 'on' | 'under' | 'in' | 'beside';
export type ObjId =
  | 'table'
  | 'box'
  | 'bed'
  | 'chair'
  | 'pot'
  | 'basket'
  | 'tree'
  | 'bucket'
  | 'car'
  | 'slide'
  | 'bench'
  | 'tent'
  | 'umbrella'
  | 'boat';
export type RoomId = 'living' | 'kitchen' | 'garden' | 'park' | 'beach';

export interface Pair {
  prep: Prep;
  obj: ObjId;
}

/** Đồ vật trong phòng, toạ độ trong khung 1194×834. */
export interface RoomObject {
  id: ObjId;
  left: number;
  width: number;
  height: number; // đứng trên sàn: đáy ở FLOOR_Y
  surface: number; // y (tính từ đỉnh vật) của mặt trên / miệng vật
  gapTop: number; // y (tính từ đỉnh vật) nơi gầm bắt đầu (chỉ dùng khi có 'under')
  preps: Prep[];
}

export interface Room {
  id: RoomId;
  objects: RoomObject[];
}

/** Vùng thả hình chữ nhật trong khung, kèm điểm Đậu Đậu nằm vào (ax, ay = tâm ảnh) và tỉ lệ. */
export interface Zone extends Pair {
  left: number;
  top: number;
  right: number;
  bottom: number;
  ax: number;
  ay: number;
  scale: number;
}

export const FLOOR_Y = 700;
export const OBJ_W = 210;
export const BESIDE_W = 160;
/** Vị trí 3 đồ vật; bên phải mỗi vật chừa 160px cho vùng "cạnh". */
const SLOTS = [42, 412, 782];

/** Giới từ hợp lệ của từng đồ vật (bảng câu trong T-033). */
export const OBJECT_PREPS: Record<ObjId, Prep[]> = {
  table: ['on', 'under', 'beside'],
  box: ['in', 'on', 'beside'],
  bed: ['on', 'under', 'beside'],
  chair: ['on', 'under', 'beside'],
  pot: ['in', 'beside'],
  basket: ['in', 'beside'],
  tree: ['on', 'under', 'beside'],
  bucket: ['in', 'beside'],
  car: ['in', 'on', 'beside'],
  slide: ['on', 'under', 'beside'],
  bench: ['on', 'under', 'beside'],
  tent: ['in', 'beside'],
  umbrella: ['under', 'beside'],
  boat: ['in', 'beside'],
};

const SHAPES: Record<ObjId, { height: number; surface: number; gapTop: number }> = {
  table: { height: 200, surface: 0, gapTop: 34 },
  box: { height: 170, surface: 0, gapTop: 0 },
  bed: { height: 220, surface: 40, gapTop: 120 },
  chair: { height: 280, surface: 150, gapTop: 180 },
  pot: { height: 140, surface: 0, gapTop: 0 },
  basket: { height: 140, surface: 0, gapTop: 0 },
  tree: { height: 380, surface: 0, gapTop: 230 },
  bucket: { height: 150, surface: 0, gapTop: 0 },
  car: { height: 150, surface: 30, gapTop: 0 },
  slide: { height: 250, surface: 40, gapTop: 96 },
  bench: { height: 200, surface: 60, gapTop: 80 },
  tent: { height: 230, surface: 90, gapTop: 0 },
  umbrella: { height: 330, surface: 0, gapTop: 120 },
  boat: { height: 130, surface: 0, gapTop: 0 },
};

function room(id: RoomId, objs: [ObjId, ObjId, ObjId]): Room {
  return {
    id,
    objects: objs.map((o, i) => ({ id: o, left: SLOTS[i], width: OBJ_W, ...SHAPES[o], preps: OBJECT_PREPS[o] })),
  };
}

export const ROOMS: Room[] = [
  room('living', ['table', 'box', 'bed']),
  room('kitchen', ['chair', 'pot', 'basket']),
  room('garden', ['tree', 'bucket', 'car']),
  room('park', ['slide', 'bench', 'tent']),
  room('beach', ['umbrella', 'boat', 'bucket']),
];

/**
 * Thứ tự phòng của một lượt chơi: xáo trộn, phòng đầu khác phòng `avoid` (phòng vừa chơi lần trước).
 * `rand` trả về số trong [0, 1).
 */
export function roomOrder(rand: () => number, avoid: RoomId | null = null): number[] {
  const order = ROOMS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (avoid && ROOMS[order[0]].id === avoid && order.length > 1) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/** Nhịp chơi theo tuổi: số lần thả tự do, số lần đúng để sang phòng, có gợi ý vùng cần thả không. */
export interface HidePace {
  freeDrops: number;
  winsPerRoom: number;
  /** Bé nhỏ: vùng được nhờ sáng nhẹ lên. */
  glowTarget: boolean;
}

export function paceForAge(ageMonths: number): HidePace {
  if (ageMonths < 36) return { freeDrops: 3, winsPerRoom: 3, glowTarget: true };
  if (ageMonths < 54) return { freeDrops: 3, winsPerRoom: 3, glowTarget: false };
  return { freeDrops: 1, winsPerRoom: 4, glowTarget: false };
}

/** Đậu Đậu cao 160px; tỉ lệ theo giới từ. */
export const DAUDAU_SIZE = 160;
export const PREP_SCALE: Record<Prep, number> = { on: 1, beside: 1, in: 0.8, under: 0.7 };

/** Mọi vùng thả của một phòng. */
export function roomZones(r: Room): Zone[] {
  const zones: Zone[] = [];
  for (const o of r.objects) {
    const top = FLOOR_Y - o.height;
    const right = o.left + o.width;
    const cx = o.left + o.width / 2;
    const surfaceY = top + o.surface;
    const hasIn = o.preps.includes('in');
    for (const prep of o.preps) {
      const scale = PREP_SCALE[prep];
      const half = (DAUDAU_SIZE * scale) / 2;
      const base = { prep, obj: o.id, scale };
      if (prep === 'on') {
        // có "trong" thì "trên" dừng trước miệng vật để hai vùng không chồng
        const bottom = hasIn ? surfaceY - 20 : surfaceY + 20;
        zones.push({ ...base, left: o.left, right, top: bottom - 140, bottom, ax: cx, ay: surfaceY - half + 10 });
      } else if (prep === 'in') {
        zones.push({ ...base, left: o.left, right, top: surfaceY - 20, bottom: FLOOR_Y, ax: cx, ay: surfaceY + 20 });
      } else if (prep === 'under') {
        zones.push({ ...base, left: o.left, right, top: top + o.gapTop, bottom: FLOOR_Y + 20, ax: cx, ay: FLOOR_Y - half });
      } else {
        zones.push({
          ...base,
          left: right,
          right: right + BESIDE_W,
          top: FLOOR_Y - 180,
          bottom: FLOOR_Y + 20,
          ax: right + BESIDE_W / 2,
          ay: FLOOR_Y - half,
        });
      }
    }
  }
  return zones;
}

type Rect = { left: number; top: number; right: number; bottom: number };

/** Vùng chứa điểm; nhiều vùng chồng nhau thì lấy vùng nhỏ nhất. Ngoài mọi vùng → null. */
export function zoneAt(point: { x: number; y: number }, zones: (Rect & Pair)[]): Pair | null {
  let best: (Rect & Pair) | null = null;
  let bestArea = Infinity;
  for (const z of zones) {
    if (point.x < z.left || point.x > z.right || point.y < z.top || point.y > z.bottom) continue;
    const area = (z.right - z.left) * (z.bottom - z.top);
    if (area < bestArea) {
      best = z;
      bestArea = area;
    }
  }
  return best ? { prep: best.prep, obj: best.obj } : null;
}

/** Các cặp được hỏi trong phòng; bé dưới 36 tháng chỉ hỏi trên, trong, dưới. */
export function askPairs(r: Room, ageMonths = 72): Pair[] {
  const pairs: Pair[] = [];
  for (const o of r.objects) {
    for (const prep of o.preps) {
      if (ageMonths < 36 && prep === 'beside') continue;
      pairs.push({ prep, obj: o.id });
    }
  }
  return pairs;
}

export const pairKey = (p: Pair) => `${p.prep}-${p.obj}`;

/** Chọn câu nhờ theo seed (số nguyên ≥ 0), khác lần trước. */
export function nextAsk(r: Room, seed: number, last: Pair | null, ageMonths = 72): Pair {
  const all = askPairs(r, ageMonths);
  const pool = last ? all.filter((p) => pairKey(p) !== pairKey(last)) : all;
  const list = pool.length > 0 ? pool : all;
  return list[Math.abs(Math.floor(seed)) % list.length];
}
