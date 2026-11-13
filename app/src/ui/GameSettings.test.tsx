import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameSettings } from './GameSettings';
import { ParentArea } from './ParentArea';
import { DEFAULT_SETTINGS } from '../core/settings';
import type { GameManifest } from '../core/games';

const g = (id: string, options?: GameManifest['options']) =>
  ({
    id,
    minAge: 24,
    maxAge: 72,
    title: { vi: `Trò ${id}`, ja: id, en: `Game ${id}` },
    place: 'place.zoo',
    icon: '⭐',
    color: 'peach',
    options,
    Component: null as never,
  }) as GameManifest;

const GAMES = [g('a', { difficulty: true, topics: ['animals', 'fruits'] }), g('b'), g('c', { difficulty: true })];

function setup(value?: Parameters<typeof GameSettings>[0]['value']) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  render(<GameSettings games={GAMES} value={value} onChange={onChange} onClose={onClose} />);
  return { onChange, onClose };
}

describe('GameSettings', () => {
  it('mỗi trò một hàng; nhóm độ khó/chủ đề chỉ hiện khi manifest khai báo', () => {
    setup();
    for (const id of ['a', 'b', 'c']) expect(screen.getByTestId(`opt-${id}`)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Trò a: độ khó' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Trò a: chủ đề' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Trò b: độ khó' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Trò c: chủ đề' })).toBeNull();
    // Mặc định bật, theo tuổi, trộn
    expect(screen.getByRole('button', { name: 'Trò a: Đang bật' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Trò a: Theo tuổi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Trò a: Trộn' })).toHaveAttribute('aria-pressed', 'true');
    // Chủ đề a: trộn + 2 chủ đề khai báo
    expect(screen.getByRole('group', { name: 'Trò a: chủ đề' }).querySelectorAll('button')).toHaveLength(3);
  });

  it('tắt trò, đổi độ khó và chủ đề gọi onChange ngay (lúc chạm xuống)', () => {
    const { onChange } = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò b: Đang bật' }));
    expect(onChange).toHaveBeenLastCalledWith({ b: { enabled: false, difficulty: 'auto', topic: 'mix' } });
    expect(screen.getByRole('button', { name: 'Trò b: Đang tắt' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò a: Khó' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò a: Trái cây' }));
    expect(onChange).toHaveBeenLastCalledWith({
      b: { enabled: false, difficulty: 'auto', topic: 'mix' },
      a: { enabled: true, difficulty: 'hard', topic: 'fruits' },
    });
    expect(screen.getByRole('button', { name: 'Trò a: Khó' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Trò a: Theo tuổi' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('không cho tắt trò cuối cùng còn bật', () => {
    const off = { enabled: false, difficulty: 'auto', topic: 'mix' } as const;
    const { onChange } = setup({ a: off, b: off });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò c: Đang bật' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Trò c: Đang bật' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('ít nhất một trò');
  });

  it('nút chạm ≥120px và nút Xong gọi onClose', () => {
    const { onClose } = setup();
    for (const b of screen.getAllByRole('button')) expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(120);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Xong' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ParentArea → Trò chơi', () => {
  it('mở mục Trò chơi, đổi độ khó thì lưu cả settings', () => {
    const onSave = vi.fn();
    render(<ParentArea settings={DEFAULT_SETTINGS} onSave={onSave} onUnlock={vi.fn()} onClose={vi.fn()} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò chơi' }));
    expect(screen.getByTestId('game-settings')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Lật hình: Khó' }));
    expect(onSave).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      games: { memory: { enabled: true, difficulty: 'hard', topic: 'mix' } },
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Xong' }));
    expect(screen.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toBeInTheDocument();
  });
});
