/** Dữ liệu 12 con thú hoang cho game Sở thú */
import type { Gait } from '../../ui/wander';
import type { Area } from '../../core/steer';
import { WORLD_ANIMALS, type FakeGait, type WorldAnimal } from '../../core/worldAnimals';

export type WildAnimalData = {
  id: string;
  model: string;
  /** chiều cao hiển thị (mặc định 1.2); hươu cao cổ cần cao hơn ~1.8 */
  height?: number;
  /** quay quanh trục y (radian) để mặt nhìn về camera */
  rotY?: number;
  /** dáng đi (mặc định đi bộ) */
  gait?: Gait;
  /** false: không bao giờ đi dạo trên cỏ (cá chỉ uốn mình bơi tại chỗ) */
  canWander?: boolean;
  /** id trong WORLD_ANIMALS nếu có model cử động thật (khung xương + clip) */
  world?: string;
};

/**
 * 12 con thú hoang dùng trong sở thú.
 * Mỗi lần vào game sẽ chọn ngẫu nhiên 6 con từ danh sách này.
 */
export const WILD_ANIMALS: WildAnimalData[] = [
  { id: 'elephant', model: 'elephant.glb', height: 1.9 },
  { id: 'giraffe', model: 'giraffe.glb', height: 2.5 },
  { id: 'lion', model: 'lion.glb', height: 1.1 },
  { id: 'tiger', model: 'tiger.glb', height: 1.1 },
  { id: 'monkey', model: 'monkey.glb', height: 1 },
  { id: 'panda', model: 'panda.glb', height: 1.1 },
  { id: 'penguin', model: 'penguin.glb', height: 0.9, gait: 'waddle' },
  { id: 'koala', model: 'koala.glb', height: 0.75 },
  { id: 'fox', model: 'world/fox.glb', height: 0.8, world: 'fox' },
  { id: 'bear', model: 'bear.glb', height: 1.5 },
  { id: 'parrot', model: 'parrot.glb', height: 0.7, gait: 'hop' },
  { id: 'fish', model: 'fish.glb', height: 0.6, gait: 'swim', canWander: false },
];

/**
 * Seeded random number generator (Mulberry32).
 * Cho kết quả nhất quán khi cùng seed, hữu ích cho test.
 */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle với PRNG cho phép đặt seed.
 */
function shuffleWithSeed<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Chọn ngẫu nhiên 6 con thú từ 12 con trong WILD_ANIMALS.
 * @param seed Nếu truyền seed (số nguyên), kết quả sẽ nhất quán. Không truyền thì dùng Math.random.
 * @returns Mảng 6 WildAnimalData khác nhau.
 */
export function pickSixAnimals(seed?: number): WildAnimalData[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const shuffled = shuffleWithSeed(WILD_ANIMALS, rand);
  return shuffled.slice(0, 6);
}

export type ZooPlacement = {
  data: WildAnimalData;
  pos: [number, number, number];
  rotY: number;
  /** vùng đi dạo (steering, xem core/steer.ts); không có = đứng yên một chỗ */
  area?: Area;
};

/**
 * 3 vùng đi dạo ở 3 dải độ sâu khác nhau (sau → trước): mỗi con tự chọn đích trong vùng của mình, đi chéo
 * nhẹ, nghỉ, rồi đi tiếp; các con lướt qua nhau ở dải khác nhau nên ít che nhau. Con to (hươu, voi) đi dải
 * sau cùng để không che con khác. Mỗi con bắt đầu ở chỗ khác nhau.
 */
const ZOO_ZONES: { pos: [number, number, number]; area: Area }[] = [
  { pos: [0.5, 0, -2.1], area: { xMin: -4.6, xMax: 4.6, zMin: -2.6, zMax: -1.6 } },
  // dải giữa tránh hai chỗ đứng yên ở hai góc (x = ±4)
  { pos: [-2.8, 0, 0.8], area: { xMin: -3.0, xMax: 3.0, zMin: 0.3, zMax: 1.3 } },
  // dải trước dừng ở x = 2.2 để không chui ra sau con đứng góc phải hàng trước
  { pos: [1.8, 0, 2.0], area: { xMin: -3.4, xMax: 2.2, zMin: 1.7, zMax: 2.4 } },
];

/** 3 chỗ đứng yên: hai góc hàng giữa và góc phải hàng trước (giữa cảnh để trống cho các con đi qua lại) */
const ZOO_SPOTS: { pos: [number, number, number]; rotY: number }[] = [
  { pos: [-4.0, 0, -0.6], rotY: 0.7 },
  { pos: [4.0, 0, -0.6], rotY: -0.7 },
  { pos: [3.6, 0, 3.0], rotY: -0.6 },
];

/**
 * Xếp 6 con vào chỗ: 3 con đầu (theo thứ tự đã chọn) có thể đi dạo thì đi dạo, còn lại đứng yên.
 * Trong mỗi nhóm, con cao hơn đứng/đi phía sau.
 */
export function placeZooAnimals(animals: WildAnimalData[]): ZooPlacement[] {
  const walkers: WildAnimalData[] = [];
  const idle: WildAnimalData[] = [];
  for (const a of animals) {
    if (a.canWander !== false && walkers.length < ZOO_ZONES.length) walkers.push(a);
    else idle.push(a);
  }
  const tall = (a: WildAnimalData) => a.height ?? 1.2;
  walkers.sort((a, b) => tall(b) - tall(a));
  idle.sort((a, b) => tall(b) - tall(a));
  return [
    ...walkers.map((data, i) => ({ data, pos: ZOO_ZONES[i].pos, rotY: 0, area: ZOO_ZONES[i].area })),
    ...idle.map((data, i) => ({ data, pos: ZOO_SPOTS[i].pos, rotY: ZOO_SPOTS[i].rotY })),
  ];
}

const FAKE_OF: Record<Gait, FakeGait> = { walk: 'walk', waddle: 'waddle', hop: 'hop', swim: 'swim' };

/**
 * Định nghĩa dùng cho AnimatedAnimal: con có model cử động thật (cáo) lấy từ WORLD_ANIMALS, còn lại là model
 * tĩnh với dáng đi giả bằng code như trước.
 */
export function zooDef(a: WildAnimalData): WorldAnimal {
  const w = a.world ? WORLD_ANIMALS[a.world] : undefined;
  const height = a.height ?? 1.2;
  // Sở thú giữ bán kính đẩy nhau 0.5 như trước (thế giới thú tính theo chiều dài thân)
  if (w) return { ...w, id: a.id, model: a.model, height, radius: w.radius ?? 0.5 };
  return {
    id: a.id,
    model: a.model,
    habitat: 'meadow',
    height,
    motion: 'walk',
    clips: [],
    fake: FAKE_OF[a.gait ?? 'walk'],
    speed: 0.45,
    len: 1,
    radius: 0.25 + height * 0.25,
    tris: 0,
  };
}
