/**
 * DEMO "thú giống thật" (?demo=realism, chỉ để bố mẹ so sánh phương án, không nằm trong app thật).
 * Đội hình thú của hai cảnh, dùng chung một bộ Agent (core/steer.ts) cho mọi phương án: đổi phương án chỉ đổi
 * cách vẽ, thú vẫn đi tiếp đúng chỗ cũ để so sánh công bằng.
 */
import { agentArea, bodyRadius, HERD_Z_WEIGHT, packSlots, spawnSlot, type Herd, type HerdMember } from '../../core/herd';
import { createAgent, createFlock, type Area } from '../../core/steer';
import { areaFor, HABITATS, WORLD_ANIMALS, type WorldAnimal } from '../../core/worldAnimals';

export type DemoScene = 'sea' | 'meadow';
export const DEMO_SCENES: readonly DemoScene[] = ['sea', 'meadow'];

/** Bò không có trong thế giới thú: model tĩnh của Sở thú (Poly), dáng đi giả bằng code như voi, sư tử */
const COW: WorldAnimal = { id: 'cow', model: 'cow.glb', habitat: 'meadow', height: 0.85, len: 1.6, motion: 'walk', clips: [], fake: 'walk', speed: 0.45, canEat: true, tris: 0 };

const def = (id: string): WorldAnimal => (id === 'cow' ? COW : WORLD_ANIMALS[id]);

export const DEMO_ROSTER: Record<DemoScene, readonly { id: string; count?: number }[]> = {
  sea: [{ id: 'whale' }, { id: 'clownfish', count: 2 }, { id: 'dolphin' }, { id: 'manta' }, { id: 'puffer' }],
  // hươu, cáo ở khu rừng của app thật; ở đây đứng chung đồng cỏ để đủ 5 con quen thuộc
  meadow: [{ id: 'zebra' }, { id: 'cow' }, { id: 'horse' }, { id: 'deer' }, { id: 'fox' }],
};

/** Vùng của cảnh (giống HABITATS, nước biển thấp hơn một chút để cá voi không chui dưới thanh nút của demo) */
export function demoAreas(scene: DemoScene) {
  const { areas, view } = HABITATS[scene];
  const cam = { y: view.position[1], z: view.position[2] };
  const water = areas.water && { ...areas.water, yMax: Math.min(areas.water.yMax ?? 0, 2.7), cam };
  return { ground: { ...areas.ground, cam }, water };
}

/** Dựng đàn thú của một cảnh (giống createHerd nhưng nhận cả con không có trong WORLD_ANIMALS, không có con bay) */
export function createDemoHerd(scene: DemoScene, seed = 3): Herd {
  const areas = demoAreas(scene);
  const roster = DEMO_ROSTER[scene];
  const widths = new Map<Area, number[]>();
  for (const e of roster) {
    const d = def(e.id);
    const area = areaFor(areas, d.motion);
    const ws = widths.get(area) ?? [];
    const r = bodyRadius(d);
    ws.push(d.motion === 'school' ? r * 2 * Math.min(e.count ?? 1, 2) : r * 2);
    widths.set(area, ws);
  }
  const xs = new Map<Area, number[]>();
  for (const [area, ws] of widths) xs.set(area, packSlots(area, ws));
  const used = new Map<Area, number>();
  const members: HerdMember[] = [];
  let s = seed;
  for (const e of roster) {
    const d = def(e.id);
    const area = areaFor(areas, d.motion);
    const own = agentArea(area, d);
    const r = bodyRadius(d);
    const k = used.get(area) ?? 0;
    used.set(area, k + 1);
    const [, y, z] = spawnSlot(own, k, xs.get(area)!.length);
    const x = Math.min(own.xMax, Math.max(own.xMin, xs.get(area)![k]));
    const count = e.count ?? 1;
    const flock = d.motion === 'school' ? createFlock(own, ++s) : undefined;
    if (flock) [flock.tx, flock.ty, flock.tz] = [x, y, z];
    for (let i = 0; i < count; i++) {
      s++;
      const key = count > 1 ? `${e.id}-${i}` : e.id;
      const pos: [number, number, number] = flock
        ? [Math.min(own.xMax, Math.max(own.xMin, x + ((i % 2) - 0.5) * r * 2.2)), Math.min(own.yMax ?? 0, Math.max(own.yMin ?? 0, y + (i % 2 ? -1 : 1) * d.height * 0.6)), z + (i % 3) * 0.3]
        : [x, y, z];
      const agent = createAgent({ id: key, motion: d.motion, area: own, seed: s, pos, flock, maxSpeed: d.speed, radius: r, halfH: d.height / 2, zWeight: HERD_Z_WEIGHT, canEat: !!d.canEat });
      members.push({ key, def: d, agent });
    }
  }
  return { members, agents: members.map((m) => m.agent) };
}
