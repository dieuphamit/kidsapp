/**
 * Dựng một "đàn" thú cho một khu (logic thuần): mỗi con một Agent ở vị trí ban đầu không chồng nhau,
 * cá cùng loại có count > 1 bơi thành đàn (boids), chim/ong bay trên các quỹ đạo khác nhau.
 *
 * Kích thước thân lấy từ model thật (`len` = chiều dài/chiều cao, `height`): bán kính đẩy nhau = nửa chiều dài,
 * nên con lớn (cá voi, voi) chiếm chỗ lớn. Vùng của khu (`areas`) là chỗ THÂN được phép tới (đã khớp khung nhìn
 * camera, test `herd.test.ts` chiếu thử); mỗi con đi trong vùng đó thu vào theo kích thước thân và theo dải độ
 * sâu/độ cao riêng (`band`) để cá lớn, đàn cá, chim mỗi loại một tầng.
 */
import { areaFor, HABITATS, WORLD_ANIMALS, type Habitat, type HabitatAreas, type RosterEntry, type WorldAnimal } from './worldAnimals';
import { createAgent, createFlock, type Agent, type Area, type Flock, type FlyPath } from './steer';

export type HerdMember = {
  /** khoá duy nhất: id, hoặc id-số khi có nhiều con cùng loại */
  key: string;
  def: WorldAnimal;
  agent: Agent;
};

export type Herd = { members: HerdMember[]; agents: Agent[] };

/**
 * Thú trong khu đẩy nhau theo màn hình (steer.ts, zWeight < 1): hai con đứng trước/sau nhau vẫn che nhau, nên
 * chiều sâu chỉ góp một phần nhỏ; còn lại tính theo hình chiếu từ camera của khu (Area.cam).
 */
export const HERD_Z_WEIGHT = 0.1;

/** Bán kính thân để đẩy nhau: nửa chiều dài thân */
export function bodyRadius(def: WorldAnimal): number {
  return def.radius ?? def.len * def.height * 0.5;
}

/** Bề ngang một "chỗ": một con, hoặc cả đàn cá (các con xếp so le) */
function slotWidth(def: WorldAnimal, count: number): number {
  const r = bodyRadius(def);
  return def.motion === 'school' ? r * 2 * Math.min(count, 2) : r * 2;
}

/**
 * Vùng đi lại của một con: vùng của khu thu vào theo kích thước thân (thân không ra khỏi vùng nhìn thấy), theo
 * chiều cao chỉ lấy dải `band` (phần của khoảng y còn lại, 0 = đáy, 1 = đỉnh).
 */
export function agentArea(area: Area, def: WorldAnimal): Area {
  const r = bodyRadius(def);
  let xMin = area.xMin + r;
  let xMax = area.xMax - r;
  if (xMin > xMax) xMin = xMax = (area.xMin + area.xMax) / 2;
  const cam = area.cam;
  if (def.motion === 'walk' || def.motion === 'hop') return { xMin, xMax, zMin: area.zMin, zMax: area.zMax, cam };
  const lo = area.yMin ?? 0;
  const hi = Math.max(lo, (area.yMax ?? lo) - def.height);
  const [b0, b1] = def.band ?? [0, 1];
  return { xMin, xMax, zMin: area.zMin, zMax: area.zMax, yMin: lo + b0 * (hi - lo), yMax: lo + b1 * (hi - lo), cam };
}

/**
 * Chỗ xuất hiện thứ k trong n chỗ của một vùng: rải đều theo chiều ngang, xen kẽ hàng sau (cao hơn nếu bơi)
 * và hàng trước, để lúc mới vào khu không con nào đứng chồng/che con khác.
 */
export function spawnSlot(area: Area, k: number, n: number): [number, number, number] {
  const x = area.xMin + ((k + 0.5) / n) * (area.xMax - area.xMin);
  const back = k % 2 === 0;
  const z = area.zMin + (back ? 0.2 : 0.8) * (area.zMax - area.zMin);
  const yMin = area.yMin ?? 0;
  const yMax = area.yMax ?? yMin;
  const y = yMin + (back ? 0.75 : 0.25) * (yMax - yMin);
  return [x, y, z];
}

/**
 * Tâm theo x của các chỗ trong một vùng, chia theo bề ngang thật của từng chỗ: phần trống còn lại chia đều làm
 * khe giữa các chỗ (con lớn chiếm nhiều chỗ hơn).
 */
export function packSlots(area: Area, widths: readonly number[]): number[] {
  const total = widths.reduce((a, b) => a + b, 0);
  const gap = Math.max(0, area.xMax - area.xMin - total) / widths.length;
  const out: number[] = [];
  let x = area.xMin + gap / 2;
  for (const w of widths) {
    out.push(x + w / 2);
    x += w + gap;
  }
  return out;
}

export function createHerd(roster: readonly RosterEntry[], areas: HabitatAreas, seed = 1): Herd {
  const members: HerdMember[] = [];
  // Mỗi vùng (mặt đất, nước) có những "chỗ" nào: mỗi con đi/nhảy/bơi một chỗ, cả đàn cá chung một chỗ
  const widths = new Map<Area, number[]>();
  for (const e of roster) {
    const def = WORLD_ANIMALS[e.id];
    if (!def) throw new Error(`Không có con vật ${e.id} trong WORLD_ANIMALS`);
    if (def.motion === 'fly') continue;
    const area = areaFor(areas, def.motion);
    const ws = widths.get(area) ?? [];
    const n = def.motion === 'school' ? 1 : (e.count ?? 1);
    for (let i = 0; i < n; i++) ws.push(slotWidth(def, e.count ?? 1));
    widths.set(area, ws);
  }
  const xs = new Map<Area, number[]>();
  for (const [area, ws] of widths) xs.set(area, packSlots(area, ws));
  const used = new Map<Area, number>();
  /** chỗ kế tiếp trong vùng của khu, đặt vào trong vùng riêng của con này */
  const nextSlot = (area: Area, own: Area): [number, number, number] => {
    const k = used.get(area) ?? 0;
    used.set(area, k + 1);
    const [, y, z] = spawnSlot(own, k, xs.get(area)!.length);
    const x = Math.min(own.xMax, Math.max(own.xMin, xs.get(area)![k]));
    return [x, y, z];
  };
  const flyers = roster.filter((e) => WORLD_ANIMALS[e.id].motion === 'fly');
  const flyCount = flyers.reduce((n, e) => n + (e.count ?? 1), 0);
  let f = 0;
  let s = seed;
  for (const e of roster) {
    const def = WORLD_ANIMALS[e.id];
    const count = e.count ?? 1;
    const area = areaFor(areas, def.motion);
    const own = agentArea(area, def);
    const r = bodyRadius(def);
    let flock: Flock | undefined;
    if (def.motion === 'school') {
      flock = createFlock(own, ++s);
      [flock.tx, flock.ty, flock.tz] = nextSlot(area, own);
    }
    for (let i = 0; i < count; i++) {
      s++;
      const key = count > 1 ? `${e.id}-${i}` : e.id;
      let pos: [number, number, number] | undefined;
      let path: FlyPath | undefined;
      if (def.motion === 'fly') {
        // Mỗi con bay một đoạn ngang riêng (vòng bay không lấn sang đoạn bên cạnh) ở tầng cao riêng (band)
        const w = (area.xMax - area.xMin) / flyCount;
        const yMin = own.yMin ?? 0;
        const yMax = own.yMax ?? yMin;
        const bob = Math.min(0.2, (yMax - yMin) / 2);
        path = {
          cx: area.xMin + (f + 0.5) * w,
          cy: (yMin + yMax) / 2,
          cz: (area.zMin + area.zMax) / 2,
          rx: Math.max(0.2, w / 2 - r),
          rz: (area.zMax - area.zMin) / 2,
          eight: f % 2 === 1,
          dir: f % 2 === 0 ? 1 : -1,
          bob,
        };
        f++;
      } else if (flock) {
        // cá trong đàn bắt đầu so le quanh đích của đàn, cách nhau đủ một thân
        pos = [
          Math.min(own.xMax, Math.max(own.xMin, flock.tx + ((i % 2) - 0.5) * r * 2.2)),
          Math.min(own.yMax ?? 0, Math.max(own.yMin ?? 0, flock.ty + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * def.height * 0.6)),
          flock.tz + (i % 3) * 0.3,
        ];
      } else {
        pos = nextSlot(area, own);
      }
      const agent = createAgent({
        id: key,
        motion: def.motion,
        area: own,
        seed: s,
        pos,
        path,
        flock,
        maxSpeed: def.speed,
        radius: r,
        halfH: def.height / 2,
        zWeight: HERD_Z_WEIGHT,
        canEat: !!def.canEat,
      });
      members.push({ key, def, agent });
    }
  }
  return { members, agents: members.map((m) => m.agent) };
}

/** Đàn thú mặc định của một khu */
export function createHabitatHerd(h: Habitat, seed = 1): Herd {
  const { roster, areas, view } = HABITATS[h];
  // camera của khu, để thú đẩy nhau theo hình chiếu trên màn hình
  const cam = { y: view.position[1], z: view.position[2] };
  const withCam = (a: Area | undefined): Area | undefined => a && { ...a, cam };
  return createHerd(roster, { ground: withCam(areas.ground)!, water: withCam(areas.water), air: withCam(areas.air) }, seed);
}
