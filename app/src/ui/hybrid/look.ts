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
};

/** Uốn đỉnh cho model tĩnh (không có xương) */
export type ModelDeform = 'swim' | 'walk' | 'none';

export type ModelLook = {
  kind: 'model';
  /** public/models/world/real/<file>.glb */
  file: string;
  /** xoay về chuẩn: đầu nhìn +z, lưng lên +y (radian) */
  rot: [number, number, number];
  deform: ModelDeform;
  /** clip khi đi/bơi và khi đứng (model có xương) */
  move?: string;
  idle?: string;
  clipSpeed?: number;
  /** model có xương nhưng clip không dùng được (đứng im, chỉ có idle): vẽ tĩnh ở dáng gốc và uốn đỉnh */
  bake?: boolean;
  scale?: number;
};

export type Look = PhotoLook | ModelLook;

const photo = (style: PhotoStyle, extra: Partial<PhotoLook> = {}): PhotoLook => ({ kind: 'photo', style, ...extra });

export const WORLD_LOOK: Record<string, Look> = {
  // Đồng cỏ
  horse: { kind: 'model', file: 'horse', rot: [0, 0, 0], deform: 'walk' },
  zebra: { kind: 'model', file: 'zebra', rot: [0, 0, 0], deform: 'walk' },
  giraffe: { kind: 'model', file: 'giraffe', rot: [0, 0, 0], deform: 'walk', bake: true },
  elephant: { kind: 'model', file: 'elephant', rot: [0, 0, 0], deform: 'walk', bake: true },
  lion: photo('walk'),
  // Ao hồ
  frog: photo('hop'),
  koi: photo('fish'),
  goldfish: photo('fish'),
  duck: photo('float'),
  // Rừng
  deer: { kind: 'model', file: 'deer', rot: [0, 0, 0], deform: 'walk' },
  stag: { kind: 'model', file: 'stag', rot: [0, 0, 0], deform: 'walk' },
  fox: { kind: 'model', file: 'fox', rot: [0, 0, 0], deform: 'none', move: 'Walk', idle: 'Survey' },
  raccoon: photo('walk'),
  bear: { kind: 'model', file: 'bear', rot: [0, 0, 0], deform: 'walk' },
  // Biển
  whale: { kind: 'model', file: 'whale', rot: [-0.6, 0, 0], deform: 'none', move: 'Take 001', clipSpeed: 0.8 },
  dolphin: { kind: 'model', file: 'dolphin', rot: [0, 0, 0], deform: 'none', move: 'Take 001' },
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

export const modelUrl = (file: string) => `${import.meta.env.BASE_URL}models/world/real/${file}.glb`;
export const photoUrl = (id: string) => `${import.meta.env.BASE_URL}world-photos/${id}.png`;
