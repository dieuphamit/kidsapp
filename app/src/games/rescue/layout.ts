/**
 * Bố cục trò "Đội cứu hộ" trong khung Stage 1194×834 (toạ độ khung, px).
 * - Ga-ra: bong bóng tình huống ở giữa phía trên, đội trưởng bên trái, dãy xe ở dưới.
 * - Lái xe: xe ở bên trái, cảnh trôi về phía sau.
 * - Cứu hộ: xe đỗ bên trái, bạn thú cần giúp ở bên phải; mỗi bước kéo có điểm đầu và đích.
 * Cổng phụ huynh chiếm góc trên-phải 120×120 nên thứ chạm được ở phần trên đều cách mép phải ≥144px.
 */
import type { Level } from '../../core/variety';
import type { MissionId, Step, VehicleId } from './logic';

export const STAGE_W = 1194;
export const STAGE_H = 834;
/** Mặt đất: chân xe, chân thú, gốc cây đều đặt ở đây. */
export const GROUND_Y = 700;
/** Vùng chạm của vật kéo được (thang, móc, phao, băng dán, giỏ). */
export const HANDLE = 132;
/** Hình xe vẽ trong khung 380×250, bánh chạm đáy khung. */
export const VEHICLE_BOX = { w: 380, h: 250 };

export interface Pt {
  x: number;
  y: number;
}
export interface Rect extends Pt {
  w: number;
  h: number;
}

/** Đội trưởng lúc ở ga-ra (to, cạnh bong bóng) và lúc đi cứu hộ (nhỏ, góc trên trái cạnh nút về nhà). */
export const CAPTAIN_PICK: Rect = { x: 176, y: 118, w: 204, h: 228 };
export const CAPTAIN: Rect = { x: 170, y: 16, w: 156, h: 176 };

/** Bong bóng tình huống (hình, không chữ). */
export const BUBBLE: Rect = { x: 418, y: 26, w: 400, h: 300 };
/** Lúc lái và cứu hộ bong bóng thu nhỏ lại, nằm trên cao làm "bảng nhắc". */
export const BUBBLE_SMALL_SCALE = 0.42;

/** Nhà ga-ra và các ô xe. */
export const GARAGE: Rect = { x: 40, y: 372, w: 1114, h: 356 };
export const BAY = { w: 240, h: 232, gap: 30, y: 474 };

export function layoutGarage(count: number): Rect[] {
  const step = BAY.w + BAY.gap;
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(STAGE_W / 2 + (i - (count - 1) / 2) * step - BAY.w / 2),
    y: BAY.y,
    w: BAY.w,
    h: BAY.h,
  }));
}

/** Xe chạy trên đường, trên nước hay trên trời. */
export type Medium = 'road' | 'water' | 'air';
export const MEDIUM: Record<VehicleId, Medium> = {
  firetruck: 'road',
  ladder: 'road',
  tractor: 'road',
  ambulance: 'road',
  boat: 'water',
  heli: 'air',
};

/** Chỗ xe lúc đang lái. */
export const DRIVE_VEHICLE: Record<Medium, Rect> = {
  road: { x: 170, y: 478, w: 380, h: 250 },
  water: { x: 170, y: 470, w: 380, h: 250 },
  air: { x: 190, y: 250, w: 380, h: 250 },
};
/** Mép trên của dải đường/nước lúc lái. */
export const ROAD_Y = 640;
/** Xe trôi cảnh bao nhiêu px cho mỗi ms giữ tay. */
export const DRIVE_PX_PER_MS = 0.55;

/** Điểm trên hình xe (toạ độ trong khung vẽ 380×250) → toạ độ khung Stage. */
export function vehiclePoint(rect: Rect, local: Pt): Pt {
  return { x: Math.round(rect.x + (local.x * rect.w) / VEHICLE_BOX.w), y: Math.round(rect.y + (local.y * rect.h) / VEHICLE_BOX.h) };
}

/** Chỗ gắn dụng cụ trên từng xe (toạ độ trong khung vẽ xe): đầu vòi, chân thang, tời, cọc dây, bụng trực thăng. */
export const MOUNT: Record<VehicleId, Pt> = {
  firetruck: { x: 318, y: 30 },
  ladder: { x: 330, y: 64 },
  tractor: { x: 366, y: 170 },
  boat: { x: 356, y: 146 },
  ambulance: { x: 120, y: 110 },
  heli: { x: 200, y: 222 },
};

export type DragGeo = {
  kind: 'drag';
  /** Tâm vật kéo lúc bắt đầu bước và đích phải kéo tới. */
  from: Pt;
  to: Pt;
  /** Bán kính bắt đích (px khung), rộng rãi cho tay bé. */
  r: number;
  /** 'y' = chỉ trượt lên xuống (thang). */
  axis: 'free' | 'y';
  /** Bạn thú đi theo vật kéo (kéo ra khỏi bùn, ngồi trong giỏ). */
  carry: boolean;
};
export type RubGeo = {
  kind: 'rub';
  /** Tâm các chỗ cần phun/chà. */
  targets: Pt[];
  r: number;
};
export type StepGeo = DragGeo | RubGeo;

export interface RescueLayout {
  /** Xe đỗ ở đâu. */
  vehicle: Rect;
  /** Chỗ gắn dụng cụ (đầu dây, đầu vòi) trong khung. */
  mount: Pt;
  animal: { w: number; h: number };
  /** Góc trên-trái ô bạn thú lúc bắt đầu bước i; phần tử cuối là chỗ sau khi được cứu. */
  spots: Pt[];
  steps: StepGeo[];
  /** Dụng cụ (móc, phao, giỏ, đầu thang) nằm ở đâu khi cứu xong. */
  rest: Pt | null;
}

const PARKED: Rect = { x: 40, y: GROUND_Y - 250, w: 380, h: 250 };

/* ---- Đạo cụ từng cảnh (để Game vẽ và test soát) ---- */
export const BARN: Rect = { x: 548, y: 318, w: 350, h: 382 };
/** Chỗ ngọn lửa trên chuồng: nóc, cửa sổ trái, bên phải. */
export const FLAMES: Pt[] = [
  { x: 723, y: 372 },
  { x: 622, y: 560 },
  { x: 838, y: 534 },
];
export const TREE = { trunkX: 852, ladderX: 560, animalX: 628 };
/** Mép trên cành bạn thú đang đứng: bé nhỏ cành thấp, bé lớn cành cao. */
export const BRANCH_Y: Record<Level, number> = { easy: 432, medium: 306, hard: 306 };
/** Đầu thang lúc chưa kéo. */
export const LADDER_REST_Y = 452;
export const PUDDLE: Rect = { x: 742, y: 648, w: 400, h: 96 };
/** Mặt nước hồ. */
export const WATER_Y = 600;
export const PIER: Rect = { x: 430, y: 606, w: 290, h: 150 };
export const ROCK: Rect = { x: 800, y: 512, w: 300, h: 240 };
export const MEDKIT: Rect = { x: 452, y: 588, w: 150, h: 112 };
export const HOME_PAD: Rect = { x: 196, y: 664, w: 280, h: 62 };

const center = (spot: Pt, size: { w: number; h: number }): Pt => ({ x: spot.x + size.w / 2, y: spot.y + size.h / 2 });

/** Bố cục phần cứu hộ của một nhiệm vụ theo mức chơi và các bước của nó. */
export function rescueLayout(mission: MissionId, level: Level, steps: readonly Step[]): RescueLayout {
  const n = steps.length;
  switch (mission) {
    case 'fire': {
      const vehicle = PARKED;
      const animal = { w: 206, h: 206 };
      const spot = { x: 934, y: GROUND_Y - animal.h };
      return {
        vehicle,
        mount: vehiclePoint(vehicle, MOUNT.firetruck),
        animal,
        spots: Array.from({ length: n + 1 }, () => spot),
        steps: steps.map((s) => ({ kind: 'rub', targets: FLAMES.slice(0, s.targets), r: 130 })),
        rest: null,
      };
    }
    case 'tree': {
      const vehicle: Rect = { ...PARKED, x: TREE.ladderX - 330 };
      const animal = { w: 176, h: 176 };
      const branch = { x: TREE.animalX, y: BRANCH_Y[level] - animal.h };
      const ground = { x: TREE.animalX, y: GROUND_Y - animal.h };
      const top = BRANCH_Y[level] - 78;
      const geo: Record<string, DragGeo> = {
        ladderUp: { kind: 'drag', from: { x: TREE.ladderX, y: LADDER_REST_Y }, to: { x: TREE.ladderX, y: top }, r: 30, axis: 'y', carry: false },
        animalDown: { kind: 'drag', from: center(branch, animal), to: center(ground, animal), r: 100, axis: 'free', carry: true },
        ladderDown: { kind: 'drag', from: { x: TREE.ladderX, y: top }, to: { x: TREE.ladderX, y: LADDER_REST_Y }, r: 30, axis: 'y', carry: false },
      };
      const down = steps.findIndex((s) => s.act === 'animalDown');
      return {
        vehicle,
        mount: vehiclePoint(vehicle, MOUNT.ladder),
        animal,
        // chưa có bước "đưa bạn xuống" thì bạn tự trèo xuống khi thang tới
        spots: Array.from({ length: n + 1 }, (_, i) => (down < 0 ? (i < n ? branch : ground) : i <= down ? branch : ground)),
        steps: steps.map((s) => geo[s.act]),
        rest: { x: TREE.ladderX, y: steps.some((s) => s.act === 'ladderDown') ? LADDER_REST_Y : top },
      };
    }
    case 'mud':
    case 'lake': {
      const mud = mission === 'mud';
      const vehicle: Rect = mud ? PARKED : { ...PARKED, y: WATER_Y + 62 - 250 };
      const mount = vehiclePoint(vehicle, mud ? MOUNT.tractor : MOUNT.boat);
      const animal = mud ? { w: 230, h: 210 } : { w: 200, h: 200 };
      const stuck = mud ? { x: 826, y: GROUND_Y + 16 - animal.h } : { x: 880, y: WATER_Y + 22 - animal.h };
      const safe = mud ? { x: 500, y: GROUND_Y - animal.h } : { x: PIER.x + 44, y: PIER.y + 6 - animal.h };
      const grab: Pt = { x: stuck.x + animal.w * 0.42, y: stuck.y + animal.h * 0.56 };
      const off = { x: grab.x - stuck.x, y: grab.y - stuck.y };
      const home: Pt = { x: safe.x + off.x, y: safe.y + off.y };
      const start: Pt = { x: mount.x + 78, y: mount.y + (mud ? 4 : -8) };
      const geo: Record<string, StepGeo> = {
        hook: { kind: 'drag', from: start, to: grab, r: 118, axis: 'free', carry: false },
        buoy: { kind: 'drag', from: start, to: grab, r: 118, axis: 'free', carry: false },
        pull: { kind: 'drag', from: grab, to: home, r: 104, axis: 'free', carry: true },
        tow: { kind: 'drag', from: grab, to: home, r: 104, axis: 'free', carry: true },
        wash: { kind: 'rub', targets: [center(safe, animal)], r: 150 },
        dry: { kind: 'rub', targets: [center(safe, animal)], r: 150 },
      };
      return {
        vehicle,
        mount,
        animal,
        // chỉ có bước móc/ném phao thì xe tự kéo bạn về chỗ an toàn
        spots: Array.from({ length: n + 1 }, (_, i) => (i === 0 || (i === 1 && n > 1) ? stuck : safe)),
        steps: steps.map((s) => geo[s.act]),
        rest: home,
      };
    }
    case 'hurt': {
      const vehicle = PARKED;
      const animal = { w: 250, h: 250 };
      const spot = { x: 812, y: GROUND_Y - animal.h };
      const sore: Pt[] = [
        { x: spot.x + animal.w * 0.3, y: spot.y + animal.h * 0.76 },
        { x: spot.x + animal.w * 0.72, y: spot.y + animal.h * 0.7 },
      ];
      const tray: Pt = { x: MEDKIT.x + MEDKIT.w / 2, y: MEDKIT.y - 52 };
      return {
        vehicle,
        mount: vehiclePoint(vehicle, MOUNT.ambulance),
        animal,
        spots: Array.from({ length: n + 1 }, () => spot),
        steps: steps.map((s) =>
          s.act === 'clean' ? { kind: 'rub', targets: [sore[0]], r: 140 } : { kind: 'drag', from: tray, to: sore[s.n % sore.length], r: 96, axis: 'free', carry: false },
        ),
        rest: null,
      };
    }
    case 'sky': {
      const vehicle: Rect = { x: 500, y: 14, w: 342, h: 225 };
      const mount = vehiclePoint(vehicle, MOUNT.heli);
      const animal = { w: 186, h: 186 };
      const ledge = { x: ROCK.x + 62, y: ROCK.y + 10 - animal.h };
      const pad = { x: HOME_PAD.x + (HOME_PAD.w - animal.w) / 2, y: GROUND_Y - animal.h };
      // cứu xong bạn nhảy ra đứng cạnh giỏ (giỏ không che bạn đang mừng)
      const home = { x: HOME_PAD.x + HOME_PAD.w - 40, y: GROUND_Y - animal.h };
      // giỏ ôm lấy bạn thú: tâm giỏ thấp hơn tâm bạn một chút
      const inBasket = (spot: Pt): Pt => ({ x: spot.x + animal.w / 2, y: spot.y + animal.h * 0.66 });
      const hang: Pt = { x: mount.x, y: mount.y + 96 };
      const geo: Record<string, DragGeo> = {
        basketDown: { kind: 'drag', from: hang, to: inBasket(ledge), r: 112, axis: 'free', carry: false },
        basketUp: { kind: 'drag', from: inBasket(ledge), to: hang, r: 92, axis: 'free', carry: true },
        basketHome: { kind: 'drag', from: steps.some((s) => s.act === 'basketUp') ? hang : inBasket(ledge), to: inBasket(pad), r: 108, axis: 'free', carry: true },
      };
      const up = steps.findIndex((s) => s.act === 'basketUp');
      const riding = { x: hang.x - animal.w / 2, y: hang.y - animal.h * 0.66 };
      return {
        vehicle,
        mount,
        animal,
        spots: Array.from({ length: n + 1 }, (_, i) => (i === n ? home : i === 0 ? ledge : up >= 0 && i > up ? riding : ledge)),
        steps: steps.map((s) => geo[s.act]),
        rest: inBasket(pad),
      };
    }
  }
}

/** Vật kéo đã tới đích chưa. Thang ('y') chỉ so độ cao và tính cả khi kéo quá đích. */
export function reached(geo: DragGeo, p: Pt): boolean {
  if (geo.axis === 'y') return geo.to.y < geo.from.y ? p.y <= geo.to.y + geo.r : p.y >= geo.to.y - geo.r;
  return Math.hypot(p.x - geo.to.x, p.y - geo.to.y) <= geo.r;
}

/** Giữ vật kéo trong khung và đúng trục (thang chỉ trượt giữa hai đầu). */
export function clampHandle(geo: DragGeo, p: Pt): Pt {
  if (geo.axis === 'y') {
    const lo = Math.min(geo.from.y, geo.to.y);
    const hi = Math.max(geo.from.y, geo.to.y);
    return { x: geo.from.x, y: Math.max(lo, Math.min(hi, p.y)) };
  }
  const m = HANDLE / 2;
  return { x: Math.max(m, Math.min(STAGE_W - m, p.x)), y: Math.max(m, Math.min(STAGE_H - m, p.y)) };
}
