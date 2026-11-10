import { useState } from 'react';
import { BackHome } from './BackHome';

type Props = {
  name: string;
};

export function Demo({ name }: Props) {
  const [exited, setExited] = useState(false);

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
