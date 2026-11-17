import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { HABITAT_IDS, HABITATS, WORLD_ANIMALS } from '../../core/worldAnimals';
import { WORLD_LOOK } from './look';
import { PHOTO_META, photoSize } from './PhotoAnimal';

const PUBLIC = join(import.meta.dirname, '../../../public');
const modelFile = (f: string) => join(PUBLIC, 'models/world/real', `${f}.glb`);
const photoFile = (id: string) => join(PUBLIC, 'world-photos', `${id}.png`);

/** Số tam giác vẽ ra của file GLB (đọc phần JSON, giống worldAnimals.test.ts) */
function glbTris(file: string): number {
  const buf = readFileSync(file);
  const len = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as {
    nodes?: { mesh?: number }[];
    meshes: { primitives: { indices?: number; mode?: number; attributes: { POSITION: number } }[] }[];
    accessors: { count: number }[];
  };
  const meshTris = j.meshes.map((m) => m.primitives.reduce((s, p) => (p.mode !== undefined && p.mode !== 4 ? s : s + j.accessors[p.indices ?? p.attributes.POSITION].count / 3), 0));
  return (j.nodes ?? []).reduce((s, n) => s + (n.mesh !== undefined ? meshTris[n.mesh] : 0), 0);
}

/** tấm ảnh 24×10 ô */
const PHOTO_TRIS = 24 * 10 * 2;

const rosterIds = HABITAT_IDS.flatMap((h) => HABITATS[h].roster.map((e) => e.id));

describe('WORLD_LOOK (thú Thế giới: model 3D có texture hoặc ảnh thật 2.5D)', () => {
  it('mọi con trong 5 khu có đúng một cách vẽ, có file thật', () => {
    for (const id of rosterIds) {
      const look = WORLD_LOOK[id];
      expect(look, id).toBeDefined();
      if (look.kind === 'model') {
        expect(existsSync(modelFile(look.file)), id).toBe(true);
      } else {
        expect(existsSync(photoFile(id)), id).toBe(true);
        expect(PHOTO_META[id], `${id} trong photoMeta.json`).toBeDefined();
      }
    }
    // không thừa cách vẽ cho con không có trong khu nào
    for (const id of Object.keys(WORLD_LOOK)) expect(rosterIds, id).toContain(id);
  });

  it('model ≤ 1MB, ảnh ≤ 150KB', () => {
    for (const id of rosterIds) {
      const look = WORLD_LOOK[id];
      if (look.kind === 'model') expect(statSync(modelFile(look.file)).size, id).toBeLessThanOrEqual(1024 * 1024);
      else expect(statSync(photoFile(id)).size, id).toBeLessThanOrEqual(150 * 1024);
    }
  });

  it('mỗi khu ≤ 50k tam giác (luật 8)', () => {
    for (const h of HABITAT_IDS) {
      const tris = HABITATS[h].roster.reduce((s, e) => {
        const look = WORLD_LOOK[e.id];
        return s + (look.kind === 'model' ? glbTris(modelFile(look.file)) : PHOTO_TRIS) * (e.count ?? 1);
      }, 0);
      expect(tris, h).toBeLessThanOrEqual(50_000);
    }
  });

  it('ảnh vừa trong khung thân của con vật (đội hình, vùng đi lại vẫn đúng)', () => {
    for (const id of rosterIds) {
      const look = WORLD_LOOK[id];
      if (look.kind !== 'photo' || look.w) continue;
      const def = WORLD_ANIMALS[id];
      const [w, h] = photoSize(def, look, PHOTO_META[id]);
      expect(w, id).toBeLessThanOrEqual(def.len * def.height * 1.1 + 1e-6);
      expect(h, id).toBeLessThanOrEqual(def.height * 1.1 + 1e-6);
      expect(Math.max(w, h), `${id} không quá nhỏ`).toBeGreaterThan(def.height * 0.6);
    }
  });
});
