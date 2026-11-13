// Đo "tốc độ neo" của clip đi/chạy: tốc độ mặt đất (theo chiều cao model / giây) mà ở timeScale = 1 chân không trượt.
// Clip Quaternius là tại chỗ (in-place): lúc chân chạm đất, bàn chân lùi về sau đúng bằng tốc độ thân đi tới.
// Cách đo: lấy xương thấp nhất (bàn chân), lấy mẫu vị trí theo chu kỳ, chỉ giữ các khung chân đang sát đất,
// tốc độ trung bình theo phương ngang ở các khung đó / chiều cao model.
// Chạy trong app/: node scripts/measure-gait.mjs public/models/world/<id>.glb ...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder as MeshoptNode, MeshoptEncoder } from 'meshoptimizer';
import { AnimationMixer, Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

await MeshoptNode.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptNode, 'meshopt.encoder': MeshoptEncoder });
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

for (const f of process.argv.slice(2)) {
  // Bỏ texture (GLTFLoader trong Node không đọc được ảnh); chỉ cần xương và clip
  const doc = await io.read(f);
  for (const t of doc.getRoot().listTextures()) t.dispose();
  const buf = await io.writeBinary(doc);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise((res, rej) => loader.parse(ab, '', res, rej));
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const h = new Box3().setFromObject(scene, true).getSize(new Vector3()).y;
  const out = [];
  for (const clip of gltf.animations) {
    if (!['Walk', 'Run', 'Swim', 'Fly'].includes(clip.name)) continue;
    const mixer = new AnimationMixer(scene);
    mixer.clipAction(clip).play();
    const bones = [];
    scene.traverse((o) => o.isBone && bones.push(o));
    const N = 120;
    const pos = bones.map(() => []);
    const v = new Vector3();
    for (let i = 0; i <= N; i++) {
      mixer.setTime((clip.duration * i) / N);
      scene.updateMatrixWorld(true);
      bones.forEach((b, j) => pos[j].push(b.getWorldPosition(v).clone()));
    }
    // Xương có y thấp nhất ở bất kỳ khung nào = bàn chân (bỏ qua xương đứng yên như đích IK, gốc)
    let best = -1;
    let bestY = Infinity;
    pos.forEach((p, j) => {
      const xs = p.map((q) => q.x);
      const zs = p.map((q) => q.z);
      if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) < h * 0.05) return;
      const m = Math.min(...p.map((q) => q.y));
      if (m < bestY) {
        bestY = m;
        best = j;
      }
    });
    let speed = 0;
    if (best >= 0 && clip.name !== 'Swim' && clip.name !== 'Fly') {
      const p = pos[best];
      const ys = p.map((q) => q.y);
      const lo = Math.min(...ys);
      const hi = Math.max(...ys);
      const dt = clip.duration / N;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < N; i++) {
        if (p[i].y - lo > (hi - lo) * 0.12) continue;
        sum += Math.hypot(p[i + 1].x - p[i].x, p[i + 1].z - p[i].z) / dt;
        n++;
      }
      speed = n ? sum / n : 0;
    }
    out.push(`${clip.name} ${clip.duration.toFixed(2)}s anchor=${(speed / h).toFixed(3)}h/s`);
  }
  console.log(`${f.split(/[\\/]/).pop()}\th=${h.toFixed(3)}\t${out.join('  ')}`);
}
