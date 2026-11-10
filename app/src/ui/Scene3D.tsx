import { useLayoutEffect, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';

type V3 = [number, number, number];

/** Khung hình mặc định: nhân vật cao ~3 đơn vị đứng ở gốc, nằm giữa bong bóng chữ (trên) và hàng nút (dưới). */
const DEFAULT_VIEW = { position: [0, 2.3, 10] as V3, target: [0, 1.2, 0] as V3, fov: 34 };

function LookAt({ target }: { target: V3 }) {
  const camera = useThree((s) => s.camera);
  const [x, y, z] = target;
  useLayoutEffect(() => {
    camera.lookAt(x, y, z);
  }, [camera, x, y, z]);
  return null;
}

type Props = {
  children: ReactNode;
  label: string;
  /** Vị trí camera, điểm nhìn và góc nhìn dọc (độ); bỏ trống thì dùng DEFAULT_VIEW. */
  view?: Partial<typeof DEFAULT_VIEW>;
};

export function Scene3D({ children, label, view }: Props) {
  const { position, target, fov } = { ...DEFAULT_VIEW, ...view };
  return (
    <div role="img" aria-label={label} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position, fov }}
        style={{ touchAction: 'manipulation' }}
        gl={{ antialias: true, alpha: true }}
      >
        <LookAt target={target} />
        {/* Ánh sáng ấm, mềm kiểu đồ chơi đất sét: trời kem, đất đào; không đổ bóng thật để tránh sọc bóng */}
        <hemisphereLight args={['#fff4e6', '#ffd6b8', 1.6]} />
        <directionalLight position={[3, 5, 6]} intensity={1.3} color="#fff0dc" />
        <directionalLight position={[-4, 2, 3]} intensity={0.5} color="#efe4ff" />
        {children}
        <ContactShadows position={[0, 0, 0]} opacity={0.3} blur={2.8} scale={7} far={3} color="#5b3f6b" />
      </Canvas>
    </div>
  );
}
