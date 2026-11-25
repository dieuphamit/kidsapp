/** Dữ liệu 8 con vật trong game Con vật */
import type { Gait, Lane } from '../../ui/wander';
import type { WorldAnimal } from '../../core/worldAnimals';
import { parkDef } from '../../ui/hybrid/look';

export type AnimalData = {
  id: string;
  model: string;
  /** vị trí ban đầu; con đi dạo thì z là làn của nó */
  pos: [number, number, number];
  /**
   * chiều cao hiển thị (mặc định 1.2): ảnh thật lấp kín khung nên đặt theo tỉ lệ thật (gà, vịt, thỏ nhỏ; bò, ngựa
   * to), để các con không che nhau
   */
  height?: number;
  /** quay quanh trục y (radian) để mặt nhìn về camera khi đứng yên */
  rotY?: number;
  /** có làn thì con vật đi qua lại trong [xMin, xMax]; không có thì đứng yên gặm cỏ */
  lane?: Lane;
  gait?: Gait;
};

/**
 * Bố cục: 4 con đứng yên (cừu, thỏ, bò, vịt) và 4 con đi dạo, mỗi con một làn độ sâu riêng
 * (z = -3.0, -0.5, 1.3, 4.6). Các làn cách nhau đủ xa để trên màn hình (camera cao, nhìn chếch xuống) con làn
 * trước không che con làn sau: chân con làn sau cao hơn đầu con làn trước, hoặc hai làn lệch nhau theo chiều ngang.
 * Hàng z = 3.0 đứng yên: bò ở gần giữa (e2e chạm thật vào đó), thỏ và vịt ở hai góc.
 * - ngựa (cao nhất) đi sát hàng rào, không tới chỗ cừu (x ≥ -3.2);
 * - heo đi sau lưng bò/vịt một quãng xa, tránh cừu đứng cùng độ sâu (x ≥ -2.4);
 * - gà chỉ đi ở nửa phải, giữa bò và vịt (trước đây chui ra sau lưng bò);
 * - cún chạy ở làn sát bé nhất, phía trước bò (trước đây chạy ngang sau lưng bò, trông như đứng trên lưng bò).
 * Tốc độ 0.4–0.55 đơn vị/giây: đủ chậm cho bé 2 tuổi đuổi theo bằng ngón tay.
 */
export const ANIMALS: AnimalData[] = [
  // Đứng yên
  { id: 'sheep', model: 'sheep.glb', pos: [-4.4, 0, -0.6], height: 0.95, rotY: 0.7 },
  { id: 'rabbit', model: 'rabbit.glb', pos: [-3.4, 0, 3.0], height: 0.7, rotY: 0.7 },
  { id: 'cow', model: 'cow.glb', pos: [-1.0, 0, 3.0], height: 1.15, rotY: 0.6 },
  { id: 'duck', model: 'duck.glb', pos: [3.4, 0, 3.0], height: 0.65, rotY: -0.7 },
  // Đi dạo (làn sau → trước)
  { id: 'horse', model: 'horse.glb', pos: [3.6, 0, -3.0], height: 1.7, lane: { xMin: -3.2, xMax: 4.4, speed: 0.45, dir: -1 } },
  { id: 'pig', model: 'pig.glb', pos: [-1.6, 0, -0.5], height: 0.85, lane: { xMin: -2.4, xMax: 4.2, speed: 0.4, dir: 1 } },
  { id: 'chicken', model: 'chicken.glb', pos: [3.4, 0, 1.3], height: 0.75, lane: { xMin: 0.9, xMax: 3.6, speed: 0.4, dir: -1 }, gait: 'hop' },
  { id: 'dog', model: 'dog.glb', pos: [-2.4, 0, 4.6], height: 0.8, lane: { xMin: -2.7, xMax: 2.7, speed: 0.55, dir: 1 } },
];

/** Khung thân cho từng con, vẽ cùng kiểu với trò Thế giới (ui/hybrid PARK_LOOK); tốc độ lấy theo làn */
export function farmDef(a: AnimalData): WorldAnimal {
  return parkDef(a.id, a.height ?? 1.2, a.lane?.speed ?? 0.45);
}
