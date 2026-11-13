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
  /**
   * chiều dài thân / chiều cao của model (cạnh ngang lớn nhất của khung bao), đo bằng
   * `node scripts/measure-size.mjs`; manta lấy 4.2 thay vì 5.36 vì đuôi mảnh dài
   */
  len: number;
  /** bán kính thân để đẩy nhau; bỏ trống thì là nửa chiều dài thân (herd.ts `bodyRadius`) */
  radius?: number;
  /**
   * con bơi/bay: dải độ sâu/độ cao riêng (phần của khoảng y trong vùng, 0 = thấp nhất, 1 = cao nhất), để cá lớn và
   * chim mỗi loại một tầng, không đè lên nhau; bỏ trống = cả khoảng
   */
  band?: readonly [number, number];
  /** cúi ăn khi nghỉ (có clip Eat hoặc gật đầu giả) */
  canEat?: boolean;
  /** số tam giác của file */
  tris: number;
};

const W = 'world/';

export const WORLD_ANIMALS: Record<string, WorldAnimal> = {
  // Biển
  whale: { id: 'whale', model: W + 'whale.glb', habitat: 'sea', height: 0.62, len: 3.01, band: [0.55, 1], motion: 'swim', clips: ['Swim'], anchor: { Swim: 0.35 }, speed: 0.45, tris: 447 },
  dolphin: { id: 'dolphin', model: W + 'dolphin.glb', habitat: 'sea', height: 0.5, len: 3.04, band: [0.3, 0.75], motion: 'swim', clips: ['Swim'], anchor: { Swim: 1 }, speed: 0.7, tris: 436 },
  manta: { id: 'manta', model: W + 'manta.glb', habitat: 'sea', height: 0.4, len: 4.2, band: [0, 0.35], motion: 'swim', clips: ['Swim'], anchor: { Swim: 1 }, speed: 0.4, tris: 696 },
  clownfish: { id: 'clownfish', model: W + 'clownfish.glb', habitat: 'sea', height: 0.42, len: 1.64, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.55, tris: 1528 },
  puffer: { id: 'puffer', model: W + 'puffer.glb', habitat: 'sea', height: 0.45, len: 1.46, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.4, Run: 2.8 }, speed: 0.45, tris: 2138 },
  'blue-tang': { id: 'blue-tang', model: W + 'blue-tang.glb', habitat: 'sea', height: 0.45, len: 1.63, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.55, tris: 1334 },
  'yellow-tang': { id: 'yellow-tang', model: W + 'yellow-tang.glb', habitat: 'sea', height: 0.45, len: 1.56, motion: 'school', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.55, tris: 1336 },
  crab: { id: 'crab', model: W + 'crab.glb', habitat: 'sea', height: 0.5, len: 1.66, motion: 'walk', clips: ['Idle', 'Walk', 'Jump', 'Happy'], anchor: { Walk: 1.14 }, speed: 0.35, tris: 3592 },
  // Ao hồ
  frog: { id: 'frog', model: W + 'frog.glb', habitat: 'pond', height: 0.42, len: 2.45, motion: 'hop', clips: ['Idle', 'Jump'], speed: 0.45, tris: 4920 },
  koi: { id: 'koi', model: W + 'koi.glb', habitat: 'pond', height: 0.5, len: 1.25, motion: 'swim', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.4, tris: 1490 },
  goldfish: { id: 'goldfish', model: W + 'goldfish.glb', habitat: 'pond', height: 0.5, len: 1.13, motion: 'swim', clips: ['Swim', 'Run', 'Jump'], anchor: { Swim: 1.6, Run: 3.2 }, speed: 0.4, tris: 1586 },
  duck: { id: 'duck', model: 'duck.glb', habitat: 'pond', height: 0.65, len: 1.36, motion: 'swim', clips: [], fake: 'swim', speed: 0.3, tris: 652 },
  // Rừng
  deer: { id: 'deer', model: W + 'deer.glb', habitat: 'forest', height: 1.0, len: 1.03, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 0.79, Run: 2.5 }, speed: 0.6, canEat: true, tris: 2098 },
  stag: { id: 'stag', model: W + 'stag.glb', habitat: 'forest', height: 1.2, len: 0.9, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 0.62, Run: 2 }, speed: 0.6, canEat: true, tris: 3670 },
  fox: { id: 'fox', model: W + 'fox.glb', habitat: 'forest', height: 0.65, len: 2.1, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.06, Run: 3.4 }, speed: 0.5, canEat: true, tris: 1848 },
  wolf: { id: 'wolf', model: W + 'wolf.glb', habitat: 'forest', height: 0.7, len: 1.97, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.06, Run: 3.4 }, speed: 0.55, canEat: true, tris: 1962 },
  raccoon: { id: 'raccoon', model: W + 'raccoon.glb', habitat: 'forest', height: 0.6, len: 2.31, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.42, Run: 2.3 }, speed: 0.45, canEat: true, tris: 2698 },
  bear: { id: 'bear', model: 'bear.glb', habitat: 'forest', height: 0.95, len: 1.54, motion: 'walk', clips: [], fake: 'walk', speed: 0.4, canEat: true, tris: 568 },
  // Trời
  bee: { id: 'bee', model: W + 'bee.glb', habitat: 'sky', height: 0.7, len: 1.43, band: [0, 0.3], motion: 'fly', clips: ['Fly'], anchor: { Fly: 1.6 }, speed: 0.7, tris: 2996 },
  bat: { id: 'bat', model: W + 'bat.glb', habitat: 'sky', height: 0.75, len: 1.0, band: [0.7, 1], motion: 'fly', clips: ['Fly'], anchor: { Fly: 1.4 }, speed: 0.8, tris: 1046 },
  pigeon: { id: 'pigeon', model: W + 'pigeon.glb', habitat: 'sky', height: 0.6, len: 1.29, motion: 'walk', clips: ['Idle', 'Walk', 'Jump', 'Happy'], anchor: { Walk: 1.26 }, speed: 0.4, tris: 2164 },
  parrot: { id: 'parrot', model: 'parrot.glb', habitat: 'sky', height: 0.75, len: 1.31, band: [0.35, 0.65], motion: 'fly', clips: [], fake: 'flap', speed: 0.7, tris: 649 },
  // Đồng cỏ
  zebra: { id: 'zebra', model: W + 'zebra.glb', habitat: 'meadow', height: 0.95, len: 1.31, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Jump'], anchor: { Walk: 0.5, Run: 1.77 }, speed: 0.55, tris: 1354 },
  horse: { id: 'horse', model: W + 'horse.glb', habitat: 'meadow', height: 1.0, len: 1.14, motion: 'walk', clips: ['Idle', 'Walk', 'Run', 'Eat', 'Jump'], anchor: { Walk: 1.14, Run: 1.8 }, speed: 0.6, canEat: true, tris: 2244 },
  elephant: { id: 'elephant', model: 'elephant.glb', habitat: 'meadow', height: 1.3, len: 1.41, motion: 'walk', clips: [], fake: 'walk', speed: 0.4, tris: 1116 },
  giraffe: { id: 'giraffe', model: 'giraffe.glb', habitat: 'meadow', height: 1.7, len: 0.71, motion: 'walk', clips: [], fake: 'walk', speed: 0.4, tris: 810 },
  lion: { id: 'lion', model: 'lion.glb', habitat: 'meadow', height: 0.75, len: 2.14, motion: 'walk', clips: [], fake: 'walk', speed: 0.45, tris: 1350 },
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

/**
 * Camera cho khung iPad 1194×834 (~128px/đơn vị ở độ sâu z = 0). Vùng của mỗi khu là chỗ THÂN thú được tới
 * (không chỉ tâm): đã chọn để cả thân luôn nằm trong khung nhìn, tránh hai nút mũi tên, nút nhà, cổng phụ huynh và
 * hàng chấm (test `herd.test.ts` chiếu từng con lên khung hình khi mô phỏng). Thú đi ngang là chính và đẩy nhau
 * theo kích thước thân thật, nên tổng chiều dài thân của một khu phải nhỏ hơn bề ngang vùng.
 */
const VIEW_GROUND = { position: [0, 3, 8.2] as [number, number, number], target: [0, 0.8, 0] as [number, number, number], fov: 42 };
const GROUND_WIDE: Area = { xMin: -3.9, xMax: 3.9, zMin: -1.4, zMax: 1.0 };

/** Thứ tự trong roster quyết định chỗ đứng lúc xuất hiện (rải từ trái sang phải, xen kẽ hàng sau/trước) */
export const HABITATS: Record<Habitat, HabitatDef> = {
  meadow: {
    roster: [{ id: 'giraffe' }, { id: 'zebra' }, { id: 'elephant' }, { id: 'lion' }, { id: 'horse' }],
    areas: { ground: GROUND_WIDE },
    view: VIEW_GROUND,
  },
  pond: {
    roster: [{ id: 'frog', count: 2 }, { id: 'koi' }, { id: 'duck' }, { id: 'goldfish' }],
    // Ếch trên bờ phía trước; cá và vịt trong ao phía sau
    areas: {
      ground: { xMin: -3.9, xMax: 3.9, zMin: 1.5, zMax: 2.3 },
      water: { xMin: -3.4, xMax: 3.4, zMin: -2.0, zMax: 0.4, yMin: 0, yMax: 0 },
    },
    view: VIEW_GROUND,
  },
  forest: {
    // Sói đã bỏ khỏi đội hình: 6 con không đủ chỗ đứng cạnh nhau mà không che nhau (và bớt một con dễ làm bé sợ)
    roster: [{ id: 'stag' }, { id: 'raccoon' }, { id: 'bear' }, { id: 'fox' }, { id: 'deer' }],
    areas: { ground: GROUND_WIDE },
    view: VIEW_GROUND,
  },
  sea: {
    // Cá voi ở tầng trên, cá heo tầng giữa, cá đuối tầng dưới (band); đàn cá len giữa. Cua (crab) trông như một
    // cục đỏ khó nhận ra, cá đuôi gai xanh (blue-tang) bỏ cho đỡ chật: vẫn 6 loài
    roster: [{ id: 'whale' }, { id: 'clownfish', count: 3 }, { id: 'dolphin' }, { id: 'yellow-tang', count: 2 }, { id: 'manta' }, { id: 'puffer', count: 2 }],
    areas: {
      ground: { xMin: -3.9, xMax: 3.9, zMin: 1, zMax: 2.2 },
      water: { xMin: -3.6, xMax: 3.6, zMin: -1.2, zMax: 0.6, yMin: 0.5, yMax: 3.3 },
    },
    view: { position: [0, 1.9, 8.2], target: [0, 1.6, 0], fov: 42 },
  },
  sky: {
    // Ong bay thấp, vẹt tầng giữa, dơi bay cao (band); bồ câu đi dưới cỏ
    roster: [{ id: 'bee' }, { id: 'parrot' }, { id: 'bat' }, { id: 'pigeon', count: 2 }],
    areas: {
      ground: { xMin: -3.9, xMax: 3.9, zMin: 0, zMax: 1.2 },
      air: { xMin: -3.9, xMax: 3.9, zMin: -1.2, zMax: 0.6, yMin: 1.5, yMax: 4.1 },
    },
    view: { position: [0, 1.6, 8.2], target: [0, 2, 0], fov: 42 },
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
