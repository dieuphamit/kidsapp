import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Home } from './Home';
import type { GameManifest } from '../core/games';

// Mẫu test component có 3D: R3F (<Canvas>, useFrame) không chạy được trong jsdom,
// nên mock module chứa phần 3D bằng một div. Phần 3D chỉ kiểm tra bằng Playwright.
vi.mock('./WorldMapScene', () => ({
  WorldMapScene: ({ onTapDauDau }: { target: number; onTapDauDau(): void }) => (
    <div data-testid="scene" role="img" aria-label="Đậu Đậu" onClick={onTapDauDau}>
      <div data-testid="daudau" />
    </div>
  ),
}));

const game = {
  id: 'demo', title: { vi: 'Thế giới thú', ja: 'どうぶつ' }, place: 'place.zoo',
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
    const { getByLabelText } = render(<Home games={[game]} lang="ja" speaker={speaker} onPick={onPick} />);
    fireEvent.pointerDown(getByLabelText('どうぶつの くに'));
    expect(speaker.say).toHaveBeenCalledWith('place.zoo');
    expect(onPick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(900);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(game);
  });
});
