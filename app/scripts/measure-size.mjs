// Đo tỉ lệ khung bao của model: x/y và z/y (chiều ngang / chiều cao). Dùng cho `len` trong src/core/worldAnimals.ts
// (len = cạnh ngang lớn nhất / chiều cao) để thú đẩy nhau theo kích thước thân thật.
// Chạy trong app/: node scripts/measure-size.mjs public/models/world/<id>.glb ...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder as MeshoptNode, MeshoptEncoder } from 'meshoptimizer';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
await MeshoptNode.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptNode, 'meshopt.encoder': MeshoptEncoder });
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  const buf = await io.writeBinary(doc);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej));
  gltf.scene.updateMatrixWorld(true);
  const s = new Box3().setFromObject(gltf.scene, true).getSize(new Vector3());
  console.log(f.split('/').pop(), 'x/y', (s.x / s.y).toFixed(2), 'z/y', (s.z / s.y).toFixed(2));
}
