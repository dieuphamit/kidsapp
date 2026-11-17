import { lazy, Suspense, useState } from 'react';
import { BackHome } from './BackHome';

// Trang kiểm tra thú 3D cử động (?demo=world&habitat=...), tải riêng để không làm nặng app chính
const WorldDemo = lazy(() => import('./WorldDemo'));
// DEMO so sánh thú "giống thật" cho bố mẹ (?demo=realism), chỉ xem ở local, không có trong menu
const RealismDemo = lazy(() => import('./realism/RealismDemo'));

type Props = {
  name: string;
};

export function Demo({ name }: Props) {
  const [exited, setExited] = useState(false);

  if (name === 'realism') {
    return (
      <Suspense fallback={null}>
        <RealismDemo />
      </Suspense>
    );
  }

  if (name === 'world') {
    return (
      <Suspense fallback={null}>
        <WorldDemo />
      </Suspense>
    );
  }

  if (name !== 'backhome') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {exited ? (
        <span data-testid="demo-exited" style={{ fontSize: 120 }}>
          🏡
        </span>
      ) : (
        <BackHome onExit={() => setExited(true)} />
      )}
    </div>
  );
}
