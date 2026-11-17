import { Suspense, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Scene3D } from '../Scene3D';
import { AgentProbe, AnimatedAnimal } from '../AnimatedAnimal';
import { Scenery } from '../../games/world/WorldScene';
import { stepAgents, type Agent } from '../../core/steer';
import { HABITATS } from '../../core/worldAnimals';
import type { Herd } from '../../core/herd';
import { PhotoAnimal } from './PhotoAnimal';
import { RealAnimal } from './RealAnimal';
import type { DemoScene } from './demoHerd';

export type Option = 'a' | 'b' | 'c';

function Step({ herd }: { herd: Herd }) {
  useFrame((_, dt) => stepAgents(herd.agents, dt));
  return null;
}

/** Báo "đã vẽ xong" khi mọi thú của phương án đã tải (Suspense xong thì component này mới chạy) */
function Ready({ option, onReady }: { option: Option; onReady(o: Option): void }) {
  useEffect(() => {
    onReady(option);
  }, [option, onReady]);
  return null;
}

type Props = {
  scene: DemoScene;
  option: Option;
  herd: Herd;
  onTap(id: string, agent: Agent): void;
  onReady(o: Option): void;
};

export default function RealismScene({ scene, option, herd, onTap, onReady }: Props) {
  const view = HABITATS[scene].view;
  const animals = useMemo(
    () =>
      herd.members.map((m, i) => {
        const k = `${option}-${m.key}`;
        const p = { def: m.def, agent: m.agent, phase: i * 0.8, onTap };
        if (option === 'b') return <PhotoAnimal key={k} {...p} />;
        if (option === 'c') return <RealAnimal key={k} {...p} />;
        return <AnimatedAnimal key={k} {...p} />;
      }),
    [herd, option, onTap],
  );
  return (
    <Scene3D key={scene} label={`${scene}-${option}`} shadowScale={14} view={view}>
      <Scenery habitat={scene} active />
      <Step herd={herd} />
      <Suspense key={option} fallback={null}>
        {animals}
        <Ready option={option} onReady={onReady} />
      </Suspense>
      <AgentProbe agents={herd.agents} />
    </Scene3D>
  );
}
