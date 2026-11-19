import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { Howler } = vi.hoisted(() => ({ Howler: { volume: vi.fn() } }));
vi.mock('howler', () => ({ Howl: vi.fn(), Howler }));

import { CalmContext, useApplyCalm, useCalm } from './calmContext';
import { CALM_VOLUME } from '../core/audio';

function Probe() {
  return <span data-testid="probe">{useCalm() ? 'calm' : 'normal'}</span>;
}

function Root({ calm }: { calm: boolean }) {
  useApplyCalm(calm);
  return <CalmContext value={calm}><Probe /></CalmContext>;
}

describe('calmContext', () => {
  it('useCalm mặc định tắt khi không có Provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('normal');
  });

  it('bật: data-calm trên <html>, âm lượng tổng nhỏ lại, useCalm = true; tắt thì gỡ', () => {
    const { rerender } = render(<Root calm />);
    expect(document.documentElement.dataset.calm).toBe('true');
    expect(Howler.volume).toHaveBeenLastCalledWith(CALM_VOLUME);
    expect(screen.getByTestId('probe')).toHaveTextContent('calm');
    rerender(<Root calm={false} />);
    expect(document.documentElement.dataset.calm).toBeUndefined();
    expect(Howler.volume).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('probe')).toHaveTextContent('normal');
  });
});
