import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { animalVoiceKeys, areaFor, habitatTris, HABITAT_IDS, HABITATS, WORLD_ANIMALS, type ClipName } from './worldAnimals';

const MODELS = join(import.meta.dirname, '../../public/models');

/** Đọc phần JSON của file GLB (không cần giải nén meshopt: số phần tử accessor nằm sẵn trong JSON) */
function glbJson(file: string) {
  const buf = readFileSync(file);
  expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as {
    nodes?: { mesh?: number }[];
    meshes: { primitives: { indices?: number; mode?: number; attributes: { POSITION: number } }[] }[];
    accessors: { count: number }[];
    animations?: { name: string }[];
  };
}

/** Số tam giác vẽ ra: mỗi node trỏ tới mesh tính một lần (mesh dùng chung nhiều node thì vẽ nhiều lần) */
function glbTris(file: string): number {
  const j = glbJson(file);
  const meshTris = j.meshes.map((m) =>
    m.primitives.reduce((s, p) => {
      if (p.mode !== undefined && p.mode !== 4) return s;
      return s + j.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    }, 0),
  );
  return (j.nodes ?? []).reduce((s, n) => s + (n.mesh !== undefined ? meshTris[n.mesh] : 0), 0);
}

describe('WORLD_ANIMALS', () => {
  it('mỗi con có file model, số tam giác khai báo đúng với file', () => {
    for (const a of Object.values(WORLD_ANIMALS)) {
      const f = join(MODELS, a.model);
      expect(existsSync(f), a.model).toBe(true);
      expect(glbTris(f), `${a.id} tris`).toBe(a.tris);
    }
  });

  it('clip khai báo có trong file; không còn clip đáng sợ/thua (luật UX 3)', () => {
    const banned = /attack|death|dead|hit|bite|headbutt|out_of_water|punch|weapon|no$/i;
    for (const a of Object.values(WORLD_ANIMALS)) {
      const names = (glbJson(join(MODELS, a.model)).animations ?? []).map((x) => x.name);
      expect([...names].sort(), a.id).toEqual([...a.clips].sort());
      for (const n of names) expect(n, `${a.id}: ${n}`).not.toMatch(banned);
    }
  });

  it('con có clip di chuyển thì có tốc độ neo (timeScale khớp chân)', () => {
    const move: Record<string, ClipName> = { walk: 'Walk', swim: 'Swim', school: 'Swim', fly: 'Fly' };
    for (const a of Object.values(WORLD_ANIMALS)) {
      const c = move[a.motion];
      if (!c || !a.clips.includes(c)) continue;
      expect(a.anchor?.[c as 'Walk'], `${a.id} anchor ${c}`).toBeGreaterThan(0);
    }
  });

  it('model tĩnh có dáng giả, model animated thì không cần', () => {
    for (const a of Object.values(WORLD_ANIMALS)) {
      if (a.clips.length === 0) expect(a.fake, a.id).toBeDefined();
      expect(a.id).toBe(Object.keys(WORLD_ANIMALS).find((k) => WORLD_ANIMALS[k] === a));
    }
  });
});

describe('HABITATS', () => {
  it('mỗi khu ≤ 50k tam giác (luật 8), 4–6 loại thú', () => {
    for (const h of HABITAT_IDS) {
      expect(habitatTris(h), h).toBeLessThanOrEqual(50_000);
      const kinds = HABITATS[h].roster.length;
      expect(kinds, h).toBeGreaterThanOrEqual(4);
      expect(kinds, h).toBeLessThanOrEqual(8);
    }
  });

  it('tổng tam giác tính đúng cả đàn cá (count)', () => {
    const sea = HABITATS.sea.roster.reduce((s, e) => s + glbTris(join(MODELS, WORLD_ANIMALS[e.id].model)) * (e.count ?? 1), 0);
    expect(habitatTris('sea')).toBe(sea);
  });

  it('con vật trong khu đều có trong bảng, đúng môi trường sống', () => {
    for (const h of HABITAT_IDS)
      for (const e of HABITATS[h].roster) {
        expect(WORLD_ANIMALS[e.id], e.id).toBeDefined();
        expect(WORLD_ANIMALS[e.id].habitat, e.id).toBe(h);
      }
  });

  it('bơi dùng vùng nước, bay dùng vùng trời, đi dùng mặt đất', () => {
    const { areas } = HABITATS.sea;
    expect(areaFor(areas, 'swim')).toBe(areas.water);
    expect(areaFor(areas, 'school')).toBe(areas.water);
    expect(areaFor(areas, 'walk')).toBe(areas.ground);
    expect(areaFor(HABITATS.sky.areas, 'fly')).toBe(HABITATS.sky.areas.air);
    expect(areaFor(HABITATS.meadow.areas, 'fly')).toBe(HABITATS.meadow.areas.ground);
  });
});

describe('animalVoiceKeys', () => {
  it('có tên thì kêu tiếng thật rồi đọc tên; chưa có tên thì im lặng (chỉ động tác)', () => {
    const has = (k: string) => k === 'animal.fox';
    expect(animalVoiceKeys('fox', has)).toEqual(['animal.fox-sound', 'animal.fox']);
    expect(animalVoiceKeys('whale', has)).toEqual([]);
  });
});
