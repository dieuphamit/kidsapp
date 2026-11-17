// DEMO (?demo=realism, phương án C "3D chân thực có texture"): chuyển model nguồn trong ../assets-src/models-demo/
// thành public/demo-realism/models/<id>.glb (meshopt + texture WebP, giảm tam giác), mỗi file ≤ ~1MB.
//   node scripts/demo-realism-models.mjs [id...]
// Nguồn GLB đi thẳng qua `gltf-transform optimize`; OBJ (ngựa, bò) và FBX (hươu) đọc bằng loader của three
// rồi ghi GLB tạm bằng @gltf-transform/core (chỉ hình + texture màu, không xương).
import { readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Document, NodeIO } from '@gltf-transform/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, '..');
const SRC = join(APP, '..', 'assets-src', 'models-demo');
const OUT = join(APP, 'public', 'demo-realism', 'models');

// ratio: tỉ lệ đỉnh giữ lại khi simplify; tex: cạnh texture tối đa
const MODELS = {
  whale: { glb: 'whale.glb', ratio: 1, tex: 1024 },
  dolphin: { glb: 'dolphin.glb', ratio: 1, tex: 1024 },
  clownfish: { glb: 'clownfish.glb', ratio: 1, tex: 512 },
  // bản scan ~700k tam giác, nhiều mảnh UV: `simplify` của CLI dừng ở ~40k vì giữ đường nối, nên tự giảm (decimate)
  puffer: { glb: 'puffer.glb', ratio: 1, decimate: 15000, tex: 512 },
  ray: { glb: 'ray.glb', ratio: 1, decimate: 15000, tex: 512 },
  zebra: { glb: 'zebra.glb', ratio: 0.5, tex: 1024 },
  fox: { glb: 'fox.glb', ratio: 1, tex: 512 },
  horse: { obj: 'horse/LD_HorseRtime02.obj', maps: { default: 'horse/HorseMain2k00.png', hair: 'horse/Hair12Main2k.png', eye: 'horse/eye_texture.png' }, ratio: 0.5, tex: 1024 },
  cow: { obj: 'cow/cowTM08New00RTime02.obj', maps: { default: 'cow/colorOpacityCow.png', eye: 'cow/cowEye.png' }, ratio: 1, tex: 1024 },
  deer: { fbx: 'deer/deer-female-mesh.fbx', maps: { default: 'deer/doe-body.png', head: 'deer/doe-head.png' }, ratio: 1, tex: 1024 },
};

/** Tên vật liệu → ảnh texture: khớp theo từ khoá trong tên (hair, eye, head), còn lại dùng `default` */
function mapFor(maps, name) {
  const n = (name || '').toLowerCase();
  for (const k of Object.keys(maps)) if (k !== 'default' && n.includes(k)) return maps[k];
  return maps.default;
}

// FBXLoader/OBJLoader chạy trong Node: chặn chỗ tải ảnh (texture tự gắn sau bằng gltf-transform)
globalThis.self ??= globalThis;
globalThis.window ??= globalThis;
globalThis.document ??= { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {} }) };

async function threeToGlb(id, cfg) {
  const THREE = await import('three');
  let root;
  if (cfg.obj) {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    root = new OBJLoader().parse(readFileSync(join(SRC, cfg.obj), 'utf8'));
  } else {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const buf = readFileSync(join(SRC, cfg.fbx));
    root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  }
  root.updateMatrixWorld(true);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(id);
  const mats = new Map();
  const matFor = (name) => {
    const file = mapFor(cfg.maps, name);
    if (!mats.has(file)) {
      const tex = doc.createTexture(file).setImage(readFileSync(join(SRC, file))).setMimeType('image/png');
      mats.set(file, doc.createMaterial(file).setBaseColorTexture(tex).setRoughnessFactor(0.85).setMetallicFactor(0).setDoubleSided(true));
    }
    return mats.get(file);
  };
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    let g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
    const omats = Array.isArray(o.material) ? o.material : [o.material];
    for (const gr of groups) {
      const slice = (attr, size) => attr && new Float32Array(attr.array.slice(gr.start * size, (gr.start + gr.count) * size));
      const prim = doc.createPrimitive().setMaterial(matFor(omats[gr.materialIndex ?? 0]?.name ?? o.name));
      prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(slice(g.attributes.position, 3)).setBuffer(buffer));
      if (g.attributes.normal) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(slice(g.attributes.normal, 3)).setBuffer(buffer));
      if (g.attributes.uv) {
        // loader của three cho UV gốc dưới-trái (texture flipY); glTF dùng gốc trên-trái: lật v
        const uv = slice(g.attributes.uv, 2);
        for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];
        prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(uv).setBuffer(buffer));
      }
      scene.addChild(doc.createNode(o.name).setMesh(doc.createMesh(o.name).addPrimitive(prim)));
    }
  }
  const tmp = join(SRC, `${id}.tmp.glb`);
  await new NodeIO().write(tmp, doc);
  void THREE;
  return tmp;
}

/**
 * Bỏ mảnh rời nhỏ (viền, sợi lơ lửng của bản scan sau khi giảm tam giác): gom tam giác theo đỉnh chung (cùng toạ độ),
 * giữ các mảnh có ≥ 3% số tam giác
 */
function keepBig(idx, pos) {
  const key = (v) => `${pos[v * 3].toFixed(4)},${pos[v * 3 + 1].toFixed(4)},${pos[v * 3 + 2].toFixed(4)}`;
  const ids = new Map();
  const vid = (v) => { const k = key(v); if (!ids.has(k)) ids.set(k, ids.size); return ids.get(k); };
  const parent = [];
  const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
  const tri = [];
  for (let i = 0; i < idx.length; i += 3) {
    const t = [vid(idx[i]), vid(idx[i + 1]), vid(idx[i + 2])];
    for (const v of t) if (parent[v] === undefined) parent[v] = v;
    parent[find(t[1])] = find(t[0]);
    parent[find(t[2])] = find(t[0]);
    tri.push(t[0]);
  }
  const count = new Map();
  for (const v of tri) { const r = find(v); count.set(r, (count.get(r) ?? 0) + 1); }
  const min = tri.length * 0.03;
  const out = [];
  tri.forEach((v, k) => { if (count.get(find(v)) >= min) out.push(idx[k * 3], idx[k * 3 + 1], idx[k * 3 + 2]); });
  return new Uint32Array(out);
}

/** Bản scan rất nặng: giảm còn ~`target` tam giác, cho phép gộp cả qua đường nối UV */
async function decimate(id, file, target) {
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { weld } = await import('@gltf-transform/functions');
  const { MeshoptSimplifier } = await import('meshoptimizer');
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  await doc.transform(weld());
  const prims = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
  const total = prims.reduce((n, p) => n + p.getIndices().getCount() / 3, 0);
  for (const p of prims) {
    const idx = new Uint32Array(p.getIndices().getArray());
    const pos = new Float32Array(p.getAttribute('POSITION').getArray());
    const want = Math.max(3, Math.round(((idx.length / 3) * target) / total) * 3);
    let [out] = MeshoptSimplifier.simplify(idx, pos, 3, want, 0.05, ['Permissive']);
    if (out.length > want * 1.3) [out] = MeshoptSimplifier.simplifySloppy(idx, pos, 3, null, want, 0.05);
    console.log(`  ${id}: ${idx.length / 3} → ${out.length / 3} tam giác`);
    p.getIndices().setArray(keepBig(out, pos));
  }
  const tmp = join(SRC, `${id}.tmp.glb`);
  await io.write(tmp, doc);
  return tmp;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS);
  for (const id of ids) {
    const cfg = MODELS[id];
    if (!cfg) throw new Error('không có model ' + id);
    const src = cfg.decimate ? await decimate(id, join(SRC, cfg.glb), cfg.decimate) : cfg.glb ? join(SRC, cfg.glb) : await threeToGlb(id, cfg);
    if (!existsSync(src)) throw new Error('thiếu nguồn ' + src);
    const out = join(OUT, `${id}.glb`);
    const args = ['gltf-transform', 'optimize', src, out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', String(cfg.tex)];
    if (cfg.ratio < 1) args.push('--simplify-ratio', String(cfg.ratio), '--simplify-error', String(cfg.error ?? 0.001), '--simplify-lock-border', 'false');
    const r = spawnSync('npx', args, { cwd: APP, stdio: 'inherit', shell: true });
    if (r.status !== 0) throw new Error(`${id}: optimize lỗi`);
    console.log(`${id}.glb ${(statSync(out).size / 1024).toFixed(0)} KB`);
  }
  void writeFileSync;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
