/**
 * Kho hình dùng chung cho các trò chọn/ghép/xếp hình: con vật, trái cây, hình khối.
 * Con vật: thẻ public/cards/<id>.png, tên animal.<id>, tiếng kêu sfx/animal-<id>.mp3.
 * Trái cây: thẻ public/cards/<id>.png, tên fruit.<id>.
 * Hình khối: thẻ vẽ bằng SVG public/cards/shapes/<id>.svg (màu lấy từ tokens.css), tên shape.<id>.
 * (Mèo có thẻ nhưng chưa có tên đọc/tiếng kêu nên không có trong kho.)
 */
import { FRUIT_IDS } from './fruitIds';

export type FruitId = (typeof FRUIT_IDS)[number];

export const FARM_ANIMAL_IDS = ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit'] as const;
export const WILD_ANIMAL_IDS = [
  'elephant', 'giraffe', 'lion', 'tiger', 'monkey', 'panda', 'penguin', 'koala', 'fox', 'bear', 'parrot', 'fish',
  // thẻ ảnh thêm ở E4 (Ú òa) cho thú của thế giới 5 khu
  'zebra', 'deer', 'raccoon', 'frog', 'bee', 'pigeon', 'dolphin', 'whale',
] as const;
/** Mọi con vật có thẻ hình, tên đọc và tiếng kêu thật. */
export const ANIMAL_IDS = [...FARM_ANIMAL_IDS, ...WILD_ANIMAL_IDS] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export const SHAPE_IDS = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval', 'moon'] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

export type PictureKind = 'animal' | 'fruit' | 'shape';

export { FRUIT_IDS };

export function pictureKind(id: string): PictureKind {
  if ((SHAPE_IDS as readonly string[]).includes(id)) return 'shape';
  if ((FRUIT_IDS as readonly string[]).includes(id)) return 'fruit';
  return 'animal';
}

/** Đường dẫn ảnh thẻ (đã gồm BASE_URL). */
export function pictureUrl(id: string): string {
  const base = import.meta.env.BASE_URL;
  return pictureKind(id) === 'shape' ? `${base}cards/shapes/${id}.svg` : `${base}cards/${id}.png`;
}

/** Key câu đọc tên hình: animal.<id>, fruit.<id> hoặc shape.<id>. */
export function pictureSayKey(id: string): string {
  return `${pictureKind(id)}.${id}`;
}

/** Màu chính của quả (để xếp giỏ theo màu); quả không rõ một màu thì không có. */
export const FRUIT_COLOR: Partial<Record<FruitId, 'red' | 'yellow' | 'green' | 'orange'>> = {
  apple: 'red',
  cherries: 'red',
  strawberry: 'red',
  banana: 'yellow',
  lemon: 'yellow',
  pineapple: 'yellow',
  pear: 'green',
  watermelon: 'green',
  avocado: 'green',
  kiwi: 'green',
  orange: 'orange',
  papaya: 'orange',
};

/** Con vật to rõ ràng và nhỏ rõ ràng (con cỡ vừa như chó, lợn không dùng để tránh tranh cãi). */
export const BIG_ANIMALS: readonly AnimalId[] = ['elephant', 'giraffe', 'horse', 'cow', 'bear', 'lion', 'tiger', 'panda'];
export const SMALL_ANIMALS: readonly AnimalId[] = ['chicken', 'duck', 'rabbit', 'fish', 'parrot'];
