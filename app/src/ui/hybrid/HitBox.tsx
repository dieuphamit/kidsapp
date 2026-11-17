import { startReact, type Agent } from '../../core/steer';
import type { WorldAnimal } from '../../core/worldAnimals';

/** Vùng chạm tối thiểu (đơn vị 3D): ~100–128px/đơn vị trên khung iPad, nên 1.3 ≈ 130px (luật 1) */
export const MIN_HIT = 1.3;

/**
 * Vùng chạm trong suốt đi theo con vật (không xoay theo hướng), ≥ MIN_HIT cho ngón tay bé. Chạm: con vật dừng,
 * ngoảnh về bé và nhảy lên ngay khung hình kế tiếp (startReact), rồi game phát tiếng kêu + tên (onTap).
 */
export function HitBox({ def, agent, w, h, centerY, onTap }: { def: WorldAnimal; agent: Agent; w: number; h: number; centerY: number; onTap?: (id: string, agent: Agent) => void }) {
  return (
    <mesh
      position={[0, centerY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        startReact(agent);
        onTap?.(def.id, agent);
      }}
    >
      <boxGeometry args={[Math.max(MIN_HIT, w + 0.3), Math.max(MIN_HIT, h + 0.3), Math.max(MIN_HIT, Math.min(w, 1) + 0.3)]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
