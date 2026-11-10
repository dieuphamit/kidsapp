/** Dữ liệu 8 con vật trong game Con vật */

export type AnimalData = {
  id: string;
  model: string;
  pos: [number, number, number];
  /** chiều cao hiển thị riêng (mặc định 1.2); ngựa tả thực cần cao hơn để không bé tí */
  height?: number;
  /** quay quanh trục y (radian) để mặt nhìn về camera */
  rotY?: number;
};

/**
 * Bố cục: 2 hàng so le (vòng cung nhẹ), cách nhau xa về z để con sau không che con trước.
 * Hàng sau (z = -0.6).
 * Hàng trước (z = 3.0): 4 con, bò gần giữa để e2e dễ chạm.
 * Ngựa đặt ở cạnh phải hàng sau để không che các con khác.
 * X cách nhau ~2.8 đơn vị để vùng chạm không chồng.
 */
export const ANIMALS: AnimalData[] = [
  // Hàng sau (z = -0.6): cừu, heo, chó, ngựa (ngựa góc phải)
  { id: 'sheep', model: 'sheep.glb', pos: [-4.2, 0, -0.6], rotY: 0.4 },
  { id: 'pig', model: 'pig.glb', pos: [-1.4, 0, -0.6] },
  { id: 'dog', model: 'dog.glb', pos: [1.4, 0, -0.6] },
  { id: 'horse', model: 'horse.glb', pos: [4.2, 0, -0.6], height: 2.0, rotY: -0.5 },
  // Hàng trước (z = 3.0): thỏ, bò (gần giữa), gà, vịt
  { id: 'rabbit', model: 'rabbit.glb', pos: [-3.2, 0, 3.0] },
  { id: 'cow', model: 'cow.glb', pos: [-1.0, 0, 3.0] },
  { id: 'chicken', model: 'chicken.glb', pos: [1.3, 0, 3.0] },
  { id: 'duck', model: 'duck.glb', pos: [3.5, 0, 3.0] },
];
