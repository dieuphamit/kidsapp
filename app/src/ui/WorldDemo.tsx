import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scene3D } from './Scene3D';
import { AgentProbe, AnimalHerd } from './AnimatedAnimal';
import { createHabitatHerd } from '../core/herd';
import { animalVoiceKeys, HABITAT_IDS, HABITATS, type Habitat } from '../core/worldAnimals';
import { createSpeaker } from '../core/audio';
import { contentByKey } from '../core/content';

/**
 * Trang kiểm tra (không phải trò chơi): `?demo=world&habitat=<meadow|pond|forest|sea|sky>` dựng đội hình thú
 * của một khu trên nền phẳng để bố mẹ/e2e xem thú cử động. Màn "thế giới 5 khu" thật do task sau dựng.
 */

/** Màu nền phẳng lấy từ tokens.css (three không đọc được biến CSS) */
const GROUND: Record<Habitat, string> = {
  meadow: '#9be38a', // --grass
  pond: '#9be38a', // --grass
  forest: '#5fc163', // --scene-leaf
  sea: '#ffe29a', // --clay-butter (cát đáy biển)
  sky: '#9be38a', // --grass
};
const WATER = '#a0e7e5'; // --clay-mint
const BG: Record<Habitat, string> = {
  meadow: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
  pond: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
  forest: 'linear-gradient(to bottom, var(--clay-leaf), var(--sky-bottom))',
  sea: 'linear-gradient(to bottom, var(--learn-blue), var(--clay-mint))',
  sky: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
};

function Ground({ habitat }: { habitat: Habitat }) {
  return (
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color={GROUND[habitat]} roughness={0.9} metalness={0} />
      </mesh>
  );
}

function PondWater({ habitat }: { habitat: Habitat }) {
  const water = HABITATS[habitat].areas.water;
  if (habitat !== 'pond' || !water) return null;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[(water.xMin + water.xMax) / 2, 0.01, (water.zMin + water.zMax) / 2]}
      scale={[(water.xMax - water.xMin) / 2 + 0.8, (water.zMax - water.zMin) / 2 + 0.6, 1]}
    >
      <circleGeometry args={[1, 40]} />
      <meshStandardMaterial color={WATER} roughness={0.6} metalness={0} />
    </mesh>
  );
}

export default function WorldDemo() {
  const habitat = useMemo<Habitat>(() => {
    const h = new URLSearchParams(window.location.search).get('habitat') as Habitat | null;
    return h && HABITAT_IDS.includes(h) ? h : 'meadow';
  }, []);
  const herd = useMemo(() => createHabitatHerd(habitat, 7), [habitat]);
  const [loaded, setLoaded] = useState(0);
  const [lastTap, setLastTap] = useState('');
  const speaker = useMemo(() => createSpeaker(() => 'vi'), []);
  const content = useMemo(() => contentByKey(), []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLoaded = useCallback(() => setLoaded((n) => n + 1), []);
  const onTap = useCallback(
    (id: string) => {
      setLastTap(id);
      if (timer.current) clearTimeout(timer.current);
      const [first, ...rest] = animalVoiceKeys(id, (k) => content.has(k));
      if (first) speaker.say(first);
      if (rest[0]) timer.current = setTimeout(() => speaker.say(rest[0]), 1300);
    },
    [content, speaker],
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const view = HABITATS[habitat].view;

  return (
    <div
      data-testid="world-demo"
      data-habitat={habitat}
      data-ready={loaded >= herd.members.length ? 'true' : undefined}
      data-last-tap={lastTap || undefined}
      style={{ position: 'fixed', inset: 0, background: BG[habitat] }}
    >
      <Scene3D label={habitat} shadowScale={18} view={view}>
        <Suspense fallback={null}>
          <Ground habitat={habitat} />
          <PondWater habitat={habitat} />
          <AnimalHerd herd={herd} onTap={onTap} onLoaded={onLoaded} />
        </Suspense>
        <AgentProbe agents={herd.agents} />
      </Scene3D>
    </div>
  );
}
