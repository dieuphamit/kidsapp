/**
 * Cách vẽ từng con thú trong trò Thế giới (bố mẹ chọn phương án "lai"):
 * - `model`: model 3D có texture (public/models/world/real/<file>.glb, CC0/CC BY/CC BY-SA, nguồn ở
 *   public/models/CREDITS.md) cho thú lớn có chân và cá voi, cá heo — chỉ khi model nhìn đẹp, không lỗ chỗ;
 * - `photo`: ảnh chụp thật tách nền dán lên tấm lưới 2.5D (public/world-photos/<id>.png, nguồn ở
 *   public/world-photos/CREDITS.md) cho cá nhỏ, chim, côn trùng, ếch… và con chưa có model đạt.
 *
 * Hành vi (đi/bơi/bay, chạm, tiếng kêu) vẫn theo WORLD_ANIMALS + core/steer.ts; bảng này chỉ đổi phần vẽ.
 * Kích thước: vừa trong khung thân của WORLD_ANIMALS (cao `height`, dài `len × height`) để đội hình, vùng đi
 * lại và test chiếu khung hình (herdLayout.test.ts) vẫn đúng.
 */

import { WORLD_ANIMALS, type WorldAnimal } from '../../core/worldAnimals';

/** Kiểu chuyển động của ảnh 2.5D (uốn lưới trên CPU) */
export type PhotoStyle =
  | 'cetacean' // thân uốn sóng lên xuống
  | 'fish' // đuôi vẫy sang ngang
  | 'puffer' // vây đuôi vẫy nhẹ, thân phồng xẹp
  | 'manta' // hai cánh vỗ, tấm ảnh ngả ra sau như đang lướt
  | 'wings' // chim/dơi bay dang cánh: hai cánh vỗ nhanh
  | 'buzz' // ong: cánh (nửa trên ảnh) rung nhanh
  | 'float' // vịt bơi: dập dềnh, lắc nhẹ
  | 'hop' // ếch: nén lại trước cú nhảy, duỗi ra khi bay lên
  | 'walk'; // bốn chân / chim đi: chân trước/sau đung đưa ngược pha, thân nhún

export type PhotoLook = {
  kind: 'photo';
  style: PhotoStyle;
  /** đặt cỡ cố định thay cho vừa khung thân (con dẹt dang cánh: cá đuối) */
  w?: number;
  /** nhân thêm vào cỡ vừa khung (mặc định 1) */
  scale?: number;
  /** id ảnh trong public/world-photos/ nếu khác id con vật (cá ở Sở thú dùng ảnh cá vàng) */
  photo?: string;
};

/** Uốn đỉnh cho model tĩnh (không có xương) */
export type ModelDeform = 'swim' | 'fluke' | 'walk' | 'none';

export type ModelLook = {
  kind: 'model';
  /** public/models/world/real/<file>.glb */
  file: string;
  /** xoay về chuẩn: đầu nhìn +z, lưng lên +y (radian) */
  rot: [number, number, number];
  /** quay thêm quanh trục đứng sau `rot` (radian): sửa hướng đầu mà không đổi phần dựng thẳng */
  turn?: number;
  /** ngóc đầu (âm) / chúc đầu (dương) sau khi đã quay đầu về +z (radian) */
  pitch?: number;
  deform: ModelDeform;
  /** clip khi đi/bơi và khi đứng (model có xương) */
  move?: string;
  idle?: string;
  clipSpeed?: number;
  /** model có xương nhưng clip không dùng được (đứng im, chỉ có idle): vẽ tĩnh ở dáng gốc và uốn đỉnh */
  bake?: boolean;
  /** biên độ bước chân (phần chiều dài thân, mặc định 0.07) */
  stepAmp?: number;
  /** voi: vòi đung đưa, tai vẫy (uốn đỉnh) */
  trunk?: boolean;
  ears?: boolean;
  /** luôn nhìn nghiêng (không quay thẳng mặt về camera khi đứng nghỉ/được chạm) */
  side?: boolean;
  /** bỏ mesh có tên (hoặc tên vật liệu) bắt đầu bằng chuỗi này: đĩa nền kèm theo model */
  skip?: string;
  /** nhân độ sáng màu nền của vật liệu (texture quá tối: gấu nâu gần như đen dưới ánh sáng của cảnh) */
  bright?: number;
  scale?: number;
};

export type Look = PhotoLook | ModelLook;

const photo = (style: PhotoStyle, extra: Partial<PhotoLook> = {}): PhotoLook => ({ kind: 'photo', style, ...extra });

export const WORLD_LOOK: Record<string, Look> = {
  // Đồng cỏ
  horse: { kind: 'model', file: 'horse', rot: [0, 0, 0], deform: 'walk' },
  // ngựa vằn, cáo: model tìm được là low-poly (chân có khối đen vuông), lạc phong cách cạnh thú ảnh thật → ảnh thật 2.5D
  zebra: photo('walk'),
  giraffe: { kind: 'model', file: 'giraffe', rot: [0, Math.PI, 0], deform: 'walk', bake: true, skip: 'Circle' },
  elephant: { kind: 'model', file: 'elephant', rot: [0, -Math.PI / 2, 0], deform: 'walk', bake: true, stepAmp: 0.07, trunk: true, ears: true },
  lion: photo('walk'),
  // Ao hồ
  frog: photo('hop'),
  koi: photo('fish'),
  goldfish: photo('fish'),
  duck: photo('float'),
  // Rừng
  deer: { kind: 'model', file: 'deer', rot: [0, 0, 0], deform: 'walk' },
  stag: { kind: 'model', file: 'stag', rot: [0, 0, 0], deform: 'walk' },
  fox: photo('walk'),
  raccoon: photo('walk'),
  bear: { kind: 'model', file: 'bear', rot: [0, -Math.PI / 2, 0], deform: 'walk', bright: 2.4 },
  // Biển
  // clip bơi gốc lặn ngóc gần thẳng đứng: dùng dáng gốc + uốn đuôi lên xuống cho thân luôn nằm ngang
  whale: { kind: 'model', file: 'whale', rot: [0, 0, 0], turn: Math.PI / 2, pitch: 0.3, deform: 'fluke', bake: true, side: true },
  dolphin: { kind: 'model', file: 'dolphin', rot: [0, 0, 0], deform: 'none', move: 'Take 001', side: true },
  clownfish: photo('fish'),
  puffer: photo('puffer'),
  'yellow-tang': photo('fish'),
  manta: photo('manta', { w: 1.45 }),
  // Trời
  bee: photo('buzz'),
  bat: photo('wings'),
  parrot: photo('wings'),
  pigeon: photo('walk'),
};

/**
 * Thú của Sở thú và Trang trại, vẽ cùng kiểu với trò Thế giới: con đã có model có texture thì dùng lại, còn lại là
 * ảnh thật 2.5D. Thú ở đây đều đi trên cỏ nên ảnh dùng dáng đứng (vẹt đứng, vịt đứng), trừ cá (bơi trong vũng nước).
 */
export const PARK_LOOK: Record<string, Look> = {
  // Sở thú
  elephant: WORLD_LOOK.elephant,
  giraffe: WORLD_LOOK.giraffe,
  fox: WORLD_LOOK.fox,
  bear: WORLD_LOOK.bear,
  lion: photo('walk'),
  tiger: photo('walk'),
  monkey: photo('walk'),
  panda: photo('walk'),
  penguin: photo('walk'),
  koala: photo('walk'),
  parrot: photo('walk', { photo: 'parrot-stand' }),
  // cá quẫy tại chỗ, nổi trên vũng nước (Sở thú vẽ vũng dưới chỗ đứng của cá)
  fish: photo('fish', { photo: 'goldfish' }),
  // Trang trại
  horse: WORLD_LOOK.horse,
  sheep: photo('walk'),
  rabbit: photo('hop'),
  cow: photo('walk'),
  pig: photo('walk'),
  dog: photo('walk'),
  chicken: photo('walk'),
  duck: photo('walk', { photo: 'farm-duck' }),
};

/**
 * Khung thân (WorldAnimal) cho thú Sở thú / Trang trại cao `height`: con dùng lại model của trò Thế giới lấy
 * tỉ lệ dài/cao của model đó; con vẽ bằng ảnh để chiều cao quyết định cỡ (khung dài rộng rãi).
 * Bán kính đẩy nhau giữ như trước (0.25 + 0.25 × cao) để đội hình cũ của hai trò vẫn đúng.
 */
export function parkDef(id: string, height: number, speed = 0.45): WorldAnimal {
  const look = PARK_LOOK[id];
  const world = look?.kind === 'model' ? WORLD_ANIMALS[look.file] : undefined;
  return {
    id,
    model: world?.model ?? `${id}.glb`,
    habitat: 'meadow',
    height,
    motion: 'walk',
    clips: [],
    speed,
    len: world?.len ?? 3,
    radius: 0.25 + height * 0.25,
    tris: 0,
  };
}

/** id ảnh của một con vẽ bằng ảnh */
export const photoId = (id: string, look: PhotoLook) => look.photo ?? id;

export const modelUrl =(file: string) => `${import.meta.env.BASE_URL}models/world/real/${file}.glb`;
export const photoUrl = (id: string) => `${import.meta.env.BASE_URL}world-photos/${id}.png`;
