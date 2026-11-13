// Liệt kê clip, số tam giác, metalness của các model nguồn (dùng khi chọn model cho thế giới thú)
// Chạy: node scripts/inspect-models.mjs <file.glb|gltf> ...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
await MeshoptDecoder.ready;
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const root = doc.getRoot();
  let tris = 0;
  for (const m of root.listMeshes())
    for (const p of m.listPrimitives()) {
      const idx = p.getIndices();
      const n = idx ? idx.getCount() : p.getAttribute('POSITION').getCount();
      if (p.getMode() === 4) tris += n / 3;
    }
  // Đếm số lần dùng mesh (mesh dùng chung nhiều node)
  const clips = root.listAnimations().map((a) => `${a.getName()}(${a.listChannels()[0]?.getSampler()?.getInput()?.getMax([])[0]?.toFixed(2)})`);
  const metal = root.listMaterials().map((m) => m.getMetallicFactor().toFixed(1)).join(',');
  console.log(`${f.split(/[\\/]/).pop()}\ttris=${tris}\tskins=${root.listSkins().length}\tmetal=${metal}\tclips=${clips.join(' ')}`);
}
