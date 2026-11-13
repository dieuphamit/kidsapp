/**
 * Bảng dữ liệu thú cho "thế giới thú" (5 khu: đồng cỏ, ao hồ, rừng, biển, trời) và Sở thú.
 *
 * Model animated (Quaternius, CC0) nằm ở `public/models/world/<id>.glb`, đã bỏ clip đáng sợ/thua và đổi tên clip
 * gọn bằng `scripts/world-models.mjs`. Model tĩnh (Poly Google) dùng chuyển động giả bằng code.
 *
 * `anchor`: tốc độ neo của clip, tính bằng "chiều cao con vật / giây": ở timeScale = 1 chân không trượt khi con
 * vật cao `height` đi với tốc độ `anchor × height`. Đo bằng `node scripts/measure-gait.mjs` (bàn chân lúc chạm
 * đất); Swim/Fly không có chân nên là ước lượng nhịp vẫy đuôi/vỗ cánh trông tự nhiên.
 * `tris`: số tam giác của file GLB (test `worldAnimals.test.ts` đối chiếu với file thật).
 */
import type { Area, Motion } from './steer';

export type Habitat = 'meadow' | 'pond' | 'forest' | 'sea' | 'sky';
export const HABITAT_IDS: readonly Habitat[] = ['meadow', 'pond', 'forest', 'sea', 'sky'];

/** Tên clip gọn sau khi xử lý. Happy = nhảy múa vui (Dance) */
export type ClipName = 'Idle' | 'Walk' | 'Run' | 'Eat' | 'Jump' | 'Happy' | 'Swim' | 'Fly';
export const CLIP_NAMES: readonly ClipName[] = ['Idle', 'Walk', 'Run', 'Eat', 'Jump', 'Happy', 'Swim', 'Fly'];

/** Chuyển động giả cho model tĩnh (không có clip) */
export type FakeGait = 'walk' | 'waddle' | 'hop' | 'swim' | 'flap';

export type WorldAnimal = {
  id: string;
  /** đường dẫn trong public/models/ */
  model: string;
  habitat: Habitat;
  /** chiều cao hiển thị (đơn vị 3D) */
  height: number;
  motion: Motion;
  /** clip có trong file; rỗng = model tĩnh */
  clips: readonly ClipName[];
  /** tốc độ neo (chiều cao/giây) của clip di chuyển */
  anchor?: Partial<Record<'Walk' | 'Run' | 'Swim' | 'Fly', number>>;
  /** tốc độ đi tối đa (đơn vị/giây) */
  speed: number;
  /** góc bù (radian) nếu model gốc không nhìn về +z */
  yawOffset?: number;
  /** model tĩnh: dáng giả bằng code */
  fake?: FakeGait;
  /** bán kính thân để đẩy nhau (theo chiều dài thân); bỏ trống thì tính theo chiều cao */
  radius?: number;
  /** cúi ăn khi nghỉ (có clip Eat hoặc gật đầu giả) */
  canEat?: boolean;
  /** số tam giác của file */
  tris: number;
};

const W = 'world/';

export const WORLD_ANIMALS: Record<string, WorldAnimal> = {
  // Biển
  whale: { id: 'whale', model: W + 'whale.glb', habitat: 'sea', height: 1.1, motion: 'swim', clips: ['Swim'], anchor: { Swim: 0.35 }, speed: 0.45, tris: 447 },
  dolphin: { id: 'dolphin', model: W + 'dolphin.glb', habitat: 'sea', height: 0.7, motion: 'swim', clips: ['Swim'], anchor: { Swim: 1 }, speed: 0.7, tris: 436 },
  manta: { id: 'manta', model: W + 'manta.glb', habitat: 'sea', height: 0.45, motion: 'swim', clips: ['Swim'], anchor: { Swim: 1 }, speed: 0.4, tris: 696 },
  clownfish: { id: 'clownfish', model: W + 'clownfish.glb', habitat: 'sea', height: 0.32, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.55, tris: 1528 },
  puffer: { id: 'puffer', model: W + 'puffer.glb', habitat: 'sea', height: 0.38, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.4, Run: 2.8 }, speed: 0.45, tris: 2138 },
  'blue-tang': { id: 'blue-tang', model: W + 'blue-tang.glb', habitat: 'sea', height: 0.36, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.55, tris: 1334 },
  'yellow-tang': { id: 'yellow-tang', model: W + 'yellow-tang.glb', habitat: 'sea', height: 0.36, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.55, tris: 1336 },
  crab: { id: 'crab', model: W + 'crab.glb', habitat: 'sea', height: 0.5, motion: 'walk', clips: ['Idle', 'Walk', 'Jump', 'Happy'], anchor: { Walk: 1.14 }, speed: 0.35, radius: 0.45, tris: 3592 },
  // Ao hồ
  frog: { id: 'frog', model: W + 'frog.glb', habitat: 'pond', height: 0.4, motion: 'hop', clips: ['Idle', 'Jump'], speed: 0.45, radius: 0.6, tris: 4920 },
  koi: { id: 'koi', model: W + 'koi.glb', habitat: 'pond', height: 0.45, motion: 'swim', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.4, tris: 1490 },
  goldfish: { id: 'goldfish', model: W + 'goldfish.glb', habitat: 'pond', height: 0.45, motion: 'swim', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.4, tris: 1586 },
  duck: { id: 'duck', model: 'duck.glb', habitat: 'pond', height: 0.7, motion: 'swim', clips: [], fake: 'swim', speed: 0.3, radius: 0.45, tris: 652 },
  // Rừng
  deer: { id: 'deer', model: W + 'deer.glb', habitat: 'forest', height: 1.3, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 0.79, Run: 2.5 }, speed: 0.6, canEat: true, radius: 0.65, tris: 2098 },
  stag: { id: 'stag', model: W + 'stag.glb', habitat: 'forest', height: 1.7, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 0.62, Run: 2 }, speed: 0.6, canEat: true, radius: 0.8, tris: 3670 },
  fox: { id: 'fox', model: W + 'fox.glb', habitat: 'forest', height: 0.75, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.06, Run: 3.4 }, speed: 0.5, canEat: true, radius: 0.5, tris: 1848 },
  wolf: { id: 'wolf', model: W + 'wolf.glb', habitat: 'forest', height: 0.95, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.06, Run: 3.4 }, speed: 0.55, canEat: true, radius: 0.6, tris: 1962 },
  raccoon: { id: 'raccoon', model: W + 'raccoon.glb', habitat: 'forest', height: 0.6, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.42, Run: 2.3 }, speed: 0.45, canEat: true, radius: 0.45, tris: 2698 },
  bear: { id: 'bear', model: 'bear.glb', habitat: 'forest', height: 1.4, motion: 'walk', clips: [], fake: 'walk', speed: 0.4, canEat: true, radius: 0.8, tris: 568 },
  // Trời
  bee: { id: 'bee', model: W + 'bee.glb', habitat: 'sky', height: 0.6, motion: 'fly', clips: ['Fly'], anchor: { Fly: 1.6 }, speed: 0.7, tris: 2996 },
  bat: { id: 'bat', model: W + 'bat.glb', habitat: 'sky', height: 0.8, motion: 'fly', clips: ['Fly'], anchor: { Fly: 1.4 }, speed: 0.8, tris: 1046 },
  pigeon: { id: 'pigeon', model: W + 'pigeon.glb', habitat: 'sky', height: 0.6, motion: 'walk', clips: ['Idle', 'Walk', 'Jump', 'Happy'], anchor: { Walk: 1.26 }, speed: 0.4, tris: 2164 },
  parrot: { id: 'parrot', model: 'parrot.glb', habitat: 'sky', height: 0.8, motion: 'fly', clips: [], fake: 'flap', speed: 0.7, tris: 649 },
  // Đồng cỏ
  zebra: { id: 'zebra', model: W + 'zebra.glb', habitat: 'meadow', height: 1.4, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Jump'], anchor: { Walk: 0.5, Run: 1.77 }, speed: 0.55, radius: 0.8, tris: 1354 },
  horse: { id: 'horse', model: W + 'horse.glb', habitat: 'meadow', height: 1.5, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.14, Run: 1.8 }, speed: 0.6, canEat: true, radius: 0.8, tris: 2244 },
  elephant: { id: 'elephant', model: 'elephant.glb', habitat: 'meadow', height: 1.9, motion: 'walk', clips: [], fake: 'walk', speed: 0.4, radius: 1, tris: 1116 },
  giraffe: { id: 'giraffe', model: 'giraffe.glb', habitat: 'meadow', height: 2.5, motion: 'walk', clips: [], fake: 'walk', speed: 0.4, radius: 0.8, tris: 810 },
  lion: { id: 'lion', model: 'lion.glb', habitat: 'meadow', height: 1.1, motion: 'walk', clips: [], fake: 'walk', speed: 0.45, radius: 0.7, tris: 1350 },
};

export type RosterEntry = { id: string; count?: number };

/** Vùng hoạt động theo kiểu di chuyển: đi/nhảy trên mặt đất, bơi trong nước, bay trên trời */
export type HabitatAreas = { ground: Area; water?: Area; air?: Area };

export type HabitatDef = {
  roster: readonly RosterEntry[];
  areas: HabitatAreas;
  /** camera gợi ý (giống prop `view` của Scene3D) */
  view: { position: [number, number, number]; target: [number, number, number]; fov: number };
};

const VIEW_GROUND = { position: [0, 4.2, 10] as [number, number, number], target: [0, 0.5, -0.2] as [number, number, number], fov: 45 };

export const HABITATS: Record<Habitat, HabitatDef> = {
  meadow: {
    roster: [{ id: 'zebra' }, { id: 'horse' }, { id: 'elephant' }, { id: 'giraffe' }, { id: 'lion' }],
    areas: { ground: { xMin: -4.4, xMax: 4.4, zMin: -2.6, zMax: 2.2 } },
    view: VIEW_GROUND,
  },
  pond: {
    roster: [{ id: 'frog', count: 2 }, { id: 'koi' }, { id: 'goldfish' }, { id: 'duck' }],
    // Ếch trên bờ phía trước; cá và vịt trong ao phía sau
    areas: {
      ground: { xMin: -4.4, xMax: 4.4, zMin: 1.4, zMax: 2.6 },
      water: { xMin: -3.6, xMax: 3.6, zMin: -2.6, zMax: 0.6, yMin: 0, yMax: 0 },
    },
    view: VIEW_GROUND,
  },
  forest: {
    roster: [{ id: 'deer' }, { id: 'stag' }, { id: 'fox' }, { id: 'wolf' }, { id: 'raccoon' }, { id: 'bear' }],
    areas: { ground: { xMin: -4.4, xMax: 4.4, zMin: -2.6, zMax: 2.2 } },
    view: VIEW_GROUND,
  },
  sea: {
    roster: [
      { id: 'whale' },
      { id: 'dolphin' },
      { id: 'manta' },
      { id: 'clownfish', count: 4 },
      { id: 'blue-tang', count: 3 },
      { id: 'yellow-tang', count: 3 },
      { id: 'puffer', count: 2 },
      { id: 'crab' },
    ],
    areas: {
      ground: { xMin: -4, xMax: 4, zMin: 1, zMax: 2.6 },
      water: { xMin: -4.2, xMax: 4.2, zMin: -2.5, zMax: 1.2, yMin: 0.8, yMax: 3.4 },
    },
    view: { position: [0, 2.4, 10], target: [0, 1.6, -0.2], fov: 45 },
  },
  sky: {
    roster: [{ id: 'bee' }, { id: 'bat' }, { id: 'parrot' }, { id: 'pigeon', count: 2 }],
    areas: {
      ground: { xMin: -4.4, xMax: 4.4, zMin: 1, zMax: 2.6 },
      air: { xMin: -3.8, xMax: 3.8, zMin: -2, zMax: 1, yMin: 1.8, yMax: 3.2 },
    },
    view: { position: [0, 2.6, 10], target: [0, 1.6, -0.2], fov: 45 },
  },
};

/** Model có clip (khung xương) hay tĩnh */
export function isAnimated(a: WorldAnimal): boolean {
  return a.clips.length > 0;
}

/** Tổng tam giác của một khu (mọi con, kể cả đàn cá) */
export function habitatTris(h: Habitat): number {
  return HABITATS[h].roster.reduce((sum, e) => sum + WORLD_ANIMALS[e.id].tris * (e.count ?? 1), 0);
}

/** Vùng hoạt động phù hợp với kiểu di chuyển */
export function areaFor(areas: HabitatAreas, motion: Motion): Area {
  if (motion === 'fly') return areas.air ?? areas.ground;
  if (motion === 'swim' || motion === 'school') return areas.water ?? areas.ground;
  return areas.ground;
}

/** Tốc độ neo (đơn vị/giây) của clip cho con cao `height` */
export function anchorSpeed(a: WorldAnimal, clip: 'Walk' | 'Run' | 'Swim' | 'Fly', height = a.height): number {
  return (a.anchor?.[clip] ?? 1) * height;
}

/**
 * Câu nói khi chạm một con: tiếng kêu thật (nếu có) rồi tên con vật. Chỉ trả về key có trong nội dung
 * (`hasKey`, ví dụ `contentByKey().has`); con mới chưa có tên thì trả về mảng rỗng (chỉ phản ứng bằng động tác).
 * check:audio bắt buộc mọi con có tên `animal.<id>` trong nội dung đều có tiếng kêu sfx/animal-<id>.mp3.
 */
export function animalVoiceKeys(id: string, hasKey: (key: string) => boolean): string[] {
  return hasKey(`animal.${id}`) ? [`animal.${id}-sound`, `animal.${id}`] : [];
}
