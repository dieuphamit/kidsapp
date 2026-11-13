/**
 * Dựng một "đàn" thú cho một khu (logic thuần): mỗi con một Agent ở vị trí ban đầu không chồng nhau,
 * cá cùng loại có count > 1 bơi thành đàn (boids), chim/ong bay trên các quỹ đạo khác nhau.
 */
import { areaFor, HABITATS, WORLD_ANIMALS, type Habitat, type HabitatAreas, type RosterEntry, type WorldAnimal } from './worldAnimals';
import { createAgent, createFlock, type Agent, type FlyPath } from './steer';

export type HerdMember = {
  /** khoá duy nhất: id, hoặc id-số khi có nhiều con cùng loại */
  key: string;
  def: WorldAnimal;
  agent: Agent;
};

export type Herd = { members: HerdMember[]; agents: Agent[] };

/** Bán kính thân để đẩy nhau, theo chiều cao */
export function bodyRadius(def: WorldAnimal): number {
  return def.radius ?? 0.2 + def.height * 0.3;
}

export function createHerd(roster: readonly RosterEntry[], areas: HabitatAreas, seed = 1): Herd {
  const members: HerdMember[] = [];
  const groundCount = roster.reduce((n, e) => {
    const m = WORLD_ANIMALS[e.id].motion;
    return n + (m === 'walk' || m === 'hop' ? (e.count ?? 1) : 0);
  }, 0);
  const flyCount = roster.reduce((n, e) => n + (WORLD_ANIMALS[e.id].motion === 'fly' ? (e.count ?? 1) : 0), 0);
  let g = 0;
  let f = 0;
  let s = seed;
  for (const e of roster) {
    const def = WORLD_ANIMALS[e.id];
    if (!def) throw new Error(`Không có con vật ${e.id} trong WORLD_ANIMALS`);
    const count = e.count ?? 1;
    const area = areaFor(areas, def.motion);
    const flock = def.motion === 'school' ? createFlock(area, ++s) : undefined;
    for (let i = 0; i < count; i++) {
      s++;
      const key = count > 1 ? `${e.id}-${i}` : e.id;
      let pos: [number, number, number] | undefined;
      let path: FlyPath | undefined;
      if (def.motion === 'walk' || def.motion === 'hop') {
        // rải đều theo chiều ngang để lúc đầu không chồng nhau
        const t = (g + 0.5) / groundCount;
        const z = area.zMin + ((g * 0.618) % 1) * (area.zMax - area.zMin);
        pos = [area.xMin + t * (area.xMax - area.xMin), 0, z];
        g++;
      } else if (def.motion === 'fly') {
        const w = (area.xMax - area.xMin) / flyCount;
        const yMin = area.yMin ?? 0;
        const yMax = area.yMax ?? yMin;
        path = {
          cx: area.xMin + (f + 0.5) * w,
          cy: yMin + ((f + 0.5) / flyCount) * (yMax - yMin),
          cz: (area.zMin + area.zMax) / 2,
          rx: Math.max(1, w * 0.75),
          rz: (area.zMax - area.zMin) / 2,
          eight: f % 2 === 1,
          dir: f % 2 === 0 ? 1 : -1,
          bob: 0.25,
        };
        f++;
      } else if (flock) {
        // cá trong đàn bắt đầu quanh đích của đàn
        pos = [flock.tx + ((i % 3) - 1) * 0.5, flock.ty + (Math.floor(i / 3) % 2) * 0.35, flock.tz + (i % 2) * 0.4];
      }
      const agent = createAgent({
        id: key,
        motion: def.motion,
        area,
        seed: s,
        pos,
        path,
        flock,
        maxSpeed: def.speed,
        radius: bodyRadius(def),
        canEat: !!def.canEat,
      });
      members.push({ key, def, agent });
    }
  }
  return { members, agents: members.map((m) => m.agent) };
}

/** Đàn thú mặc định của một khu */
export function createHabitatHerd(h: Habitat, seed = 1): Herd {
  return createHerd(HABITATS[h].roster, HABITATS[h].areas, seed);
}
