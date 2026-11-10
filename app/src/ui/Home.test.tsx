import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Home } from './Home';
import type { GameManifest } from '../core/games';

// Mẫu test component có 3D: R3F (<Canvas>, useFrame) không chạy được trong jsdom,
// nên mock module chứa phần 3D bằng một div. Phần 3D chỉ kiểm tra bằng Playwright.
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));
vi.mock('./Scene3D', () => ({
  Scene3D: ({ children }: { children?: ReactNode }) => <div data-testid="scene">{children}</div>,
}));
vi.mock('./DauDau', () => ({ DauDau: () => <div data-testid="daudau" /> }));

const game = {
  id: 'demo', title: { vi: 'Nông trại', ja: 'のうじょう' }, place: 'place.farm',
  icon: '🐮', color: 'mint', minAge: 24, maxAge: 60,
} as unknown as GameManifest;

describe('Home', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiện bong bóng lời nói theo ngôn ngữ và scene đã mock', () => {
    const speaker = { say: vi.fn(), sfx: vi.fn() };
    const { getByText, getByTestId } = render(<Home games={[game]} lang="vi" speaker={speaker} onPick={vi.fn()} />);
    expect(getByText('Đi đâu chơi nào?')).toBeInTheDocument();
    expect(getByTestId('scene')).toContainElement(getByTestId('daudau'));
  });
  it('chạm nút game thì nói tên chỗ chơi và chọn game', () => {
    const speaker = { say: vi.fn(), sfx: vi.fn() };
    const onPick = vi.fn();
    const { getByRole } = render(<Home games={[game]} lang="ja" speaker={speaker} onPick={onPick} />);
    fireEvent.pointerDown(getByRole('button', { name: 'のうじょう' }));
    expect(speaker.say).toHaveBeenCalledWith('place.farm');
    // onPick được gọi sau 800ms
    vi.advanceTimersByTime(900);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(game);
  });
});
