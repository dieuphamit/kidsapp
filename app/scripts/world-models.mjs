// Xử lý model thú có animation (Quaternius, CC0) cho "thế giới thú": bỏ clip không dùng và mọi clip đáng sợ/thua
// (Attack, Death, HitReact, Out_Of_Water...; luật UX 3), đổi tên clip gọn, tắt metalness (không có env map nên
// kim loại làm model tối), rồi nén bằng `gltf-transform optimize --compress meshopt` (giống `npm run model:opt`).
//
// Chạy trong app/: node scripts/world-models.mjs [thư-mục-assets-src] [id ...]
// Mặc định assets-src là ../assets-src (repo chính) hoặc ../../../assets-src (khi chạy trong worktree wt/<tên>).
// In ra bảng id / tam giác / clip để chép vào public/models/CREDITS.md và src/core/worldAnimals.ts.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const srcArg = args[0] && existsSync(args[0]) ? args.shift() : undefined;
const SRC =
  srcArg ?? [path.join(root, '..', 'assets-src'), path.join(root, '..', '..', '..', 'assets-src')].find((p) => existsSync(p));
if (!SRC) {
  console.error('Không tìm thấy assets-src; truyền đường dẫn làm đối số đầu tiên.');
  process.exit(1);
}
const OUT = path.join(root, 'public', 'models', 'world');

const PP = 'polypizza-quaternius-animated';
const UA = 'quaternius-ultimate-animated-animals/glTF';
const FISH = { Swimming_Normal: 'Swim', Swimming_Fast: 'Run', Swimming_Impulse: 'Jump' };
const FARM = { Idle: 'Idle', Idle_Eating: 'Eat', Walk: 'Walk', Run: 'Run', Jump_Loop: 'Jump' };
const DEER = { Idle: 'Idle', Walk: 'Walk', Gallop: 'Run', Eating: 'Eat', Jump_toIdle: 'Jump', Jump_ToIdle: 'Jump' };

/** id → file nguồn và bảng đổi tên clip (tên gốc sau dấu '|' cuối → tên gọn). Clip không có trong bảng bị bỏ. */
export const WORLD_MODELS = [
  { id: 'whale', src: `${PP}/whale.glb`, clips: { Swim: 'Swim' } },
  { id: 'dolphin', src: `${PP}/dolphin.glb`, clips: { Swim: 'Swim' } },
  { id: 'manta', src: `${PP}/manta.glb`, clips: { Swim: 'Swim' } },
  { id: 'clownfish', src: `${PP}/clownfish.glb`, clips: FISH },
  { id: 'puffer', src: `${PP}/puffer.glb`, clips: FISH },
  { id: 'blue-tang', src: `${PP}/blue-tang.glb`, clips: FISH },
  { id: 'yellow-tang', src: `${PP}/yellow-tang.glb`, clips: FISH },
  { id: 'crab', src: `${PP}/crab-enemy.glb`, clips: { Idle: 'Idle', Walk: 'Walk', Jump: 'Jump', Dance: 'Happy' } },
  { id: 'koi', src: `${PP}/koi.glb`, clips: FISH },
  { id: 'goldfish', src: `${PP}/goldfish.glb`, clips: FISH },
  { id: 'frog', src: `${PP}/frog-b.glb`, clips: { Frog_Idle: 'Idle', Frog_Jump: 'Jump' } },
  { id: 'raccoon', src: `${PP}/raccoon.glb`, clips: FARM },
  { id: 'horse', src: `${PP}/horse.glb`, clips: FARM },
  { id: 'zebra', src: `${PP}/zebra.glb`, clips: { Idle: 'Idle', Walk: 'Walk', Run: 'Run', Jump: 'Jump' } },
  { id: 'bee', src: `${PP}/bee-enemy.glb`, clips: { Flying: 'Fly' } },
  { id: 'bat', src: `${PP}/bat.glb`, clips: { Bat_Flying: 'Fly' } },
  { id: 'pigeon', src: `${PP}/pigeon.glb`, clips: { Idle: 'Idle', Walk: 'Walk', Jump: 'Jump', Dance: 'Happy' } },
  { id: 'deer', src: `${UA}/Deer.gltf`, clips: DEER },
  { id: 'stag', src: `${UA}/Stag.gltf`, clips: DEER },
  { id: 'fox', src: `${UA}/Fox.gltf`, clips: DEER },
  { id: 'wolf', src: `${UA}/Wolf.gltf`, clips: DEER },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
await MeshoptDecoder.ready;

function countTris(doc) {
  let tris = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      if (p.getMode() !== 4) continue;
      const idx = p.getIndices();
      tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    }
  return tris;
}

const only = new Set(args);
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), 'world-models-'));
const cli = path.join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const rows = [];
try {
  for (const m of WORLD_MODELS) {
    if (only.size && !only.has(m.id)) continue;
    const doc = await io.read(path.join(SRC, m.src));
    for (const anim of doc.getRoot().listAnimations()) {
      const short = anim.getName().split('|').pop();
      const name = m.clips[short];
      if (!name) anim.dispose();
      else anim.setName(name);
    }
    for (const mat of doc.getRoot().listMaterials()) {
      mat.setMetallicFactor(0);
      mat.setRoughnessFactor(Math.max(mat.getRoughnessFactor(), 0.8));
    }
    await doc.transform(prune());
    const mid = path.join(tmp, `${m.id}.glb`);
    await io.write(mid, doc);
    const out = path.join(OUT, `${m.id}.glb`);
    execFileSync(process.execPath, [cli, 'optimize', mid, out, '--compress', 'meshopt'], { stdio: 'ignore' });
    const res = await io.read(out);
    const clips = res.getRoot().listAnimations().map((a) => a.getName());
    rows.push({ id: m.id, src: m.src, tris: countTris(res), clips, kb: Math.round(statSync(out).size / 1024) });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('| id | nguồn | tam giác | clip | KB |');
for (const r of rows) console.log(`| ${r.id} | ${r.src} | ${r.tris} | ${r.clips.join(', ')} | ${r.kb} |`);
