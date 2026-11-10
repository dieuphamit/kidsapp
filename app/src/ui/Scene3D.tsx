import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';

export function Scene3D({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.6, 6], fov: 40 }}
        style={{ touchAction: 'manipulation' }}
        gl={{ antialias: true, alpha: true }}
      >
        <hemisphereLight args={['#ffffff', '#88cc77', 1.1]} />
        <directionalLight position={[3, 6, 4]} intensity={1.4} castShadow />
        {children}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} blur={2.5} scale={8} />
      </Canvas>
    </div>
  );
}
