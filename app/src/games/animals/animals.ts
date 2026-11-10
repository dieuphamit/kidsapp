/** Dữ liệu 8 con vật trong game Con vật */

export type AnimalData = {
  id: string;
  model: string;
  pos: [number, number, number];
};

/**
 * Bố cục: 2 hàng so le xen kẽ, khoảng cách xa hơn để không che nhau.
 * Hàng sau (z = -1.8): 4 con, x xen kẽ với hàng trước.
 * Hàng trước (z = 1.2): 4 con, con bò gần giữa để e2e dễ chạm.
 * Mỗi hàng cách nhau khoảng 3 đơn vị z, x cách nhau ~2.5 đơn vị.
 */
export const ANIMALS: AnimalData[] = [
  // Hàng sau (z = -1.8): ngựa, cừu, heo, chó
  { id: 'horse', model: 'horse.glb', pos: [-3.5, 0, -1.8] },
  { id: 'sheep', model: 'sheep.glb', pos: [-1.2, 0, -1.8] },
  { id: 'pig', model: 'pig.glb', pos: [1.2, 0, -1.8] },
  { id: 'dog', model: 'dog.glb', pos: [3.5, 0, -1.8] },
  // Hàng trước (z = 1.2): thỏ, bò (gần giữa), gà, vịt
  { id: 'rabbit', model: 'rabbit.glb', pos: [-2.4, 0, 1.2] },
  { id: 'cow', model: 'cow.glb', pos: [-0.6, 0, 1.2] },
  { id: 'chicken', model: 'chicken.glb', pos: [1.4, 0, 1.2] },
  { id: 'duck', model: 'duck.glb', pos: [3.0, 0, 1.2] },
];
