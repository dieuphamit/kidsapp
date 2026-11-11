import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const SIZE = 384;

// Get model id from URL
const params = new URLSearchParams(window.location.search);
const modelId = params.get('model');

if (!modelId) {
  console.error('No model specified');
  document.body.dataset.done = '1';
} else {
  render(modelId);
}

async function render(id) {
  // Setup scene
  const scene = new THREE.Scene();

  // Camera: perspective fov 30, looking slightly from above (~15°)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Renderer with transparent background
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  // No tone mapping for flat colors
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement);

  // Warm lighting like Scene3D.tsx
  // hemisphereLight args={['#fff4e6', '#ffd6b8', 1.6]}
  const hemiLight = new THREE.HemisphereLight(0xfff4e6, 0xffd6b8, 1.6);
  scene.add(hemiLight);

  // directionalLight position={[3, 5, 6]} intensity={1.3} color="#fff0dc"
  const dirLight1 = new THREE.DirectionalLight(0xfff0dc, 1.3);
  dirLight1.position.set(3, 5, 6);
  scene.add(dirLight1);

  // directionalLight position={[-4, 2, 3]} intensity={0.5} color="#efe4ff"
  const dirLight2 = new THREE.DirectionalLight(0xefe4ff, 0.5);
  dirLight2.position.set(-4, 2, 3);
  scene.add(dirLight2);

  // Load model
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  try {
    const gltf = await loader.loadAsync(`/models/${id}.glb`);
    const model = gltf.scene;
    // pivot: căn tâm model trong pivot, xoay pivot quanh gốc
    const pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);

    const box = new THREE.Box3().setFromObject(model, true);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    model.position.sub(center);

    // Xoay ~25° để thấy mặt và khối; vật dài theo chiều sâu (vd quả chuối) xoay thêm 90° để chiều dài nằm ngang
    const elongatedZ = size.z > size.x * 1.3;
    // Một số model nhìn đẹp hơn từ phía sau (vd kiwi: mặt cắt xanh quay ra sau)
    const EXTRA_YAW = { kiwi: 180 };
    pivot.rotation.y = THREE.MathUtils.degToRad((elongatedZ ? 25 + 90 : 25) + (EXTRA_YAW[id] ?? 0));
    pivot.updateMatrixWorld(true);

    // Đo lại sau khi xoay; chiều sâu ít ảnh hưởng khung hình nên tính nhẹ hơn
    const box2 = new THREE.Box3().setFromObject(pivot, true);
    const size2 = new THREE.Vector3();
    box2.getSize(size2);
    const maxDim = Math.max(size2.x, size2.y, size2.z * 0.6);
    const fov = 30 * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fov / 2) / 0.8;

    // Position camera slightly from above (~15° elevation)
    const elevationAngle = THREE.MathUtils.degToRad(15);
    camera.position.set(
      0,
      Math.sin(elevationAngle) * distance,
      Math.cos(elevationAngle) * distance
    );
    // near/far theo khoảng cách: model Google Poly có kích thước hàng trăm đơn vị
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    // Render
    renderer.render(scene, camera);

    document.body.dataset.done = '1';
  } catch (err) {
    console.error('Failed to load model:', err);
    document.body.dataset.done = '1';
  }
}
