// Trang render ảnh Đậu Đậu 2D (public/cards/daudau.png) cho scripts/render-daudau.mjs.
// Ánh sáng giống Scene3D, không ContactShadows để nền trong suốt sạch.
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { DauDau } from '../../src/ui/DauDau';

function Aim() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 1.55, 0);
    camera.updateProjectionMatrix();
    // Đợi vài khung hình cho model ổn định rồi báo xong
    setTimeout(() => {
      document.body.dataset.done = '1';
    }, 1200);
  }, [camera]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <Canvas
    flat
    dpr={1}
    camera={{ position: [0, 1.75, 9], fov: 22 }}
    gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
    onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
  >
    <hemisphereLight args={['#fff4e6', '#ffd6b8', 1.6]} />
    <directionalLight position={[3, 5, 6]} intensity={1.3} color="#fff0dc" />
    <directionalLight position={[-4, 2, 3]} intensity={0.5} color="#efe4ff" />
    <group rotation={[0, -0.25, 0]}>
      <DauDau onTap={() => {}} />
    </group>
    <Aim />
  </Canvas>,
);
