/** Dữ liệu 8 con vật trong game Con vật */

export type AnimalData = {
  id: string;
  model: string;
  pos: [number, number, number];
};

/**
 * Bố cục: 2 hàng so le (vòng cung nhẹ), cách nhau xa về z để con sau không che con trước.
 * Hàng sau (z = -2.5): 4 con nhỏ hơn.
 * Hàng trước (z = 1.8): 4 con, bò gần giữa để e2e dễ chạm.
 * Ngựa đặt ở cạnh phải hàng sau để không che các con khác.
 * X cách nhau ~2.8 đơn vị để vùng chạm không chồng.
 */
export const ANIMALS: AnimalData[] = [
  // Hàng sau (z = -2.5): cừu, heo, chó, ngựa (ngựa góc phải)
  { id: 'sheep', model: 'sheep.glb', pos: [-4.2, 0, -2.5] },
  { id: 'pig', model: 'pig.glb', pos: [-1.4, 0, -2.5] },
  { id: 'dog', model: 'dog.glb', pos: [1.4, 0, -2.5] },
  { id: 'horse', model: 'horse.glb', pos: [4.2, 0, -2.5] },
  // Hàng trước (z = 1.8): thỏ, bò (gần giữa), gà, vịt
  { id: 'rabbit', model: 'rabbit.glb', pos: [-3.5, 0, 1.8] },
  { id: 'cow', model: 'cow.glb', pos: [-1.0, 0, 1.8] },
  { id: 'chicken', model: 'chicken.glb', pos: [1.5, 0, 1.8] },
  { id: 'duck', model: 'duck.glb', pos: [4.0, 0, 1.8] },
];
