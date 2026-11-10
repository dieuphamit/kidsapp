/** Dữ liệu 8 con vật trong game Con vật */

export type AnimalData = {
  id: string;
  model: string;
  pos: [number, number, number];
};

/**
 * Bố cục: hàng sau (z ≈ -1.2) cho con lớn, hàng trước (z ≈ 1.4) cho con nhỏ hơn.
 * Con bò đứng hàng trước, gần giữa nhất (để e2e dễ chạm).
 * Xen kẽ: hàng sau x = -2.4, -0.8, 0.8, 2.4; hàng trước x = -1.6, -0.5, 0.5, 1.6
 */
export const ANIMALS: AnimalData[] = [
  // Hàng sau (z = -1.2): con lớn - ngựa, cừu, heo, chó
  { id: 'horse', model: 'horse.glb', pos: [-2.4, 0, -1.2] },
  { id: 'sheep', model: 'sheep.glb', pos: [-0.8, 0, -1.2] },
  { id: 'pig', model: 'pig.glb', pos: [0.8, 0, -1.2] },
  { id: 'dog', model: 'dog.glb', pos: [2.4, 0, -1.2] },
  // Hàng trước (z = 1.4): con nhỏ hơn - thỏ, bò (gần giữa), gà, vịt
  { id: 'rabbit', model: 'rabbit.glb', pos: [-1.6, 0, 1.4] },
  { id: 'cow', model: 'cow.glb', pos: [-0.5, 0, 1.4] },
  { id: 'chicken', model: 'chicken.glb', pos: [0.5, 0, 1.4] },
  { id: 'duck', model: 'duck.glb', pos: [1.6, 0, 1.4] },
];
