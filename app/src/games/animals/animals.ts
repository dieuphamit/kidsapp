/** Dữ liệu 8 con vật trong game Con vật */
import type { Gait, Lane } from '../../ui/wander';

export type AnimalData = {
  id: string;
  model: string;
  /** vị trí ban đầu; con đi dạo thì z là làn của nó */
  pos: [number, number, number];
  /** chiều cao hiển thị riêng (mặc định 1.2); ngựa tả thực cần cao hơn để không bé tí */
  height?: number;
  /** quay quanh trục y (radian) để mặt nhìn về camera khi đứng yên */
  rotY?: number;
  /** có làn thì con vật đi qua lại trong [xMin, xMax]; không có thì đứng yên gặm cỏ */
  lane?: Lane;
  gait?: Gait;
};

/**
 * Bố cục: 4 con đứng yên (cừu, thỏ, bò, vịt) và 4 con đi dạo, mỗi con một làn độ sâu riêng
 * (z = -2.1, -0.5, 0.8, 1.8) nên đi lướt qua nhau, trước/sau con khác mà không đâm vào nhau.
 * Hàng trước (z = 3.0) đứng yên: bò ở gần giữa (e2e chạm thật vào đó).
 * Làn tránh chỗ con đứng yên cùng độ sâu (cừu ở z = -0.6 bên trái → heo chỉ đi từ x = -2.4),
 * gà dừng ở x = 2.4 để không chui ra sau vịt. Điểm xuất phát so le để mỗi lúc chỉ hai con lướt qua nhau.
 * Tốc độ 0.4–0.55 đơn vị/giây: đủ chậm cho bé 2 tuổi đuổi theo bằng ngón tay.
 */
export const ANIMALS: AnimalData[] = [
  // Đứng yên
  { id: 'sheep', model: 'sheep.glb', pos: [-4.4, 0, -0.6], rotY: 0.7 },
  { id: 'rabbit', model: 'rabbit.glb', pos: [-3.4, 0, 3.0], rotY: 0.7 },
  { id: 'cow', model: 'cow.glb', pos: [-1.0, 0, 3.0], height: 1.4, rotY: 0.6 },
  { id: 'duck', model: 'duck.glb', pos: [3.4, 0, 3.0], rotY: -0.7 },
  // Đi dạo (làn sau → trước)
  { id: 'horse', model: 'horse.glb', pos: [3.6, 0, -2.1], height: 1.7, lane: { xMin: -4.6, xMax: 4.6, speed: 0.45, dir: -1 } },
  { id: 'pig', model: 'pig.glb', pos: [3.8, 0, -0.5], lane: { xMin: -2.4, xMax: 4.4, speed: 0.4, dir: 1 } },
  { id: 'dog', model: 'dog.glb', pos: [-3.4, 0, 0.8], lane: { xMin: -4.0, xMax: 4.0, speed: 0.55, dir: 1 } },
  { id: 'chicken', model: 'chicken.glb', pos: [2.2, 0, 1.8], lane: { xMin: -3.4, xMax: 2.4, speed: 0.4, dir: -1 }, gait: 'hop' },
];
