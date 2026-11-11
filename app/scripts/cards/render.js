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
    scene.add(model);

    // Normalize: fit model to ~80% of frame, centered
    const box = new THREE.Box3().setFromObject(model, true);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Move model so center is at origin
    model.position.sub(center);

    // Rotate model ~25° to show face and volume
    model.rotation.y = THREE.MathUtils.degToRad(25);

    // Calculate camera distance for 80% fill
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = 30 * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fov / 2) / 0.8;

    // Position camera slightly from above (~15° elevation)
    const elevationAngle = THREE.MathUtils.degToRad(15);
    camera.position.set(
      0,
      Math.sin(elevationAngle) * distance,
      Math.cos(elevationAngle) * distance
    );
    camera.lookAt(0, 0, 0);

    // Render
    renderer.render(scene, camera);

    document.body.dataset.done = '1';
  } catch (err) {
    console.error('Failed to load model:', err);
    document.body.dataset.done = '1';
  }
}
