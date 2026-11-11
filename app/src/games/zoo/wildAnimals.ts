/** Dữ liệu 12 con thú hoang cho game Sở thú */
import type { Gait, Lane } from '../../ui/wander';

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
};

/**
 * 12 con thú hoang dùng trong sở thú.
 * Mỗi lần vào game sẽ chọn ngẫu nhiên 6 con từ danh sách này.
 */
export const WILD_ANIMALS: WildAnimalData[] = [
  { id: 'elephant', model: 'elephant.glb', height: 1.5 },
  { id: 'giraffe', model: 'giraffe.glb', height: 1.8 },
  { id: 'lion', model: 'lion.glb' },
  { id: 'tiger', model: 'tiger.glb' },
  { id: 'monkey', model: 'monkey.glb' },
  { id: 'panda', model: 'panda.glb' },
  { id: 'penguin', model: 'penguin.glb', gait: 'waddle' },
  { id: 'koala', model: 'koala.glb' },
  { id: 'fox', model: 'fox.glb' },
  { id: 'bear', model: 'bear.glb', height: 1.4 },
  { id: 'parrot', model: 'parrot.glb', gait: 'hop' },
  { id: 'fish', model: 'fish.glb', gait: 'swim', canWander: false },
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
  lane?: Lane;
};

/**
 * 3 làn đi dạo ở 3 độ sâu khác nhau (sau → trước) nên các con đi lướt qua nhau mà không đâm nhau;
 * con to (hươu, voi) đi làn sau cùng để không che con khác. Mỗi làn bắt đầu ở chỗ khác nhau.
 */
const ZOO_LANES: { pos: [number, number, number]; lane: Lane }[] = [
  { pos: [0.5, 0, -2.1], lane: { xMin: -4.6, xMax: 4.6, speed: 0.42, dir: 1 } },
  { pos: [-3.4, 0, 0.8], lane: { xMin: -4.0, xMax: 4.0, speed: 0.5, dir: 1 } },
  // làn trước dừng ở x = 2.2 để không chui ra sau con đứng góc phải hàng trước
  { pos: [2.2, 0, 1.8], lane: { xMin: -3.4, xMax: 2.2, speed: 0.4, dir: -1 } },
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
    if (a.canWander !== false && walkers.length < ZOO_LANES.length) walkers.push(a);
    else idle.push(a);
  }
  const tall = (a: WildAnimalData) => a.height ?? 1.2;
  walkers.sort((a, b) => tall(b) - tall(a));
  idle.sort((a, b) => tall(b) - tall(a));
  return [
    ...walkers.map((data, i) => ({ data, pos: ZOO_LANES[i].pos, rotY: 0, lane: ZOO_LANES[i].lane })),
    ...idle.map((data, i) => ({ data, pos: ZOO_SPOTS[i].pos, rotY: ZOO_SPOTS[i].rotY })),
  ];
}
