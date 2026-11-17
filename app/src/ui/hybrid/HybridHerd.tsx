import { useFrame } from '@react-three/fiber';
import { stepAgents, type Agent } from '../../core/steer';
import type { WorldAnimal } from '../../core/worldAnimals';
import type { Herd } from '../../core/herd';
import { WORLD_LOOK } from './look';
import { PhotoAnimal } from './PhotoAnimal';
import { RealAnimal } from './RealAnimal';

/**
 * Thú của trò Thế giới theo phương án "lai" (look.ts): model 3D có texture hoặc ảnh thật 2.5D.
 * Cùng giao diện với AnimatedAnimal/AnimalHerd (Sở thú vẫn dùng model đồ chơi cũ).
 */

type AnimalProps = {
  def: WorldAnimal;
  agent: Agent;
  active?: boolean;
  phase?: number;
  onTap?: (id: string, agent: Agent) => void;
  onLoaded?: () => void;
};

export function HybridAnimal({ def, agent, active = true, phase = 0, onTap, onLoaded }: AnimalProps) {
  const look = WORLD_LOOK[def.id];
  if (!look) throw new Error(`Chưa có cách vẽ cho ${def.id} trong WORLD_LOOK`);
  const p = { def, agent, active, phase, onTap, onLoaded };
  return look.kind === 'model' ? <RealAnimal look={look} {...p} /> : <PhotoAnimal look={look} {...p} />;
}

type HerdProps = {
  herd: Herd;
  active?: boolean;
  onTap?: (id: string, agent: Agent) => void;
  onLoaded?: () => void;
};

/** Cả đàn thú của một khu: bước chuyển động một lần mỗi frame cho cả nhóm rồi vẽ từng con. */
export function HybridHerd({ herd, active = true, onTap, onLoaded }: HerdProps) {
  useFrame((_, dt) => {
    if (active) stepAgents(herd.agents, dt);
  });
  return (
    <>
      {herd.members.map((m, i) => (
        <HybridAnimal key={m.key} def={m.def} agent={m.agent} active={active} phase={i * 0.8} onTap={onTap} onLoaded={onLoaded} />
      ))}
    </>
  );
}
