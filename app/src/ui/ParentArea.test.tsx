import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParentArea } from './ParentArea';
import { DEFAULT_SETTINGS } from '../core/settings';

function renderArea(settings = DEFAULT_SETTINGS) {
  const props = { settings, speaker: { say: vi.fn(), sfx: vi.fn() }, onSave: vi.fn(), onUnlock: vi.fn(), onClose: vi.fn() };
  render(<ParentArea {...props} />);
  return props;
}

describe('ParentArea', () => {
  it('mục Kiểu menu có 2 nút, mặc định Bản đồ đang chọn', () => {
    renderArea();
    expect(screen.getByText('Kiểu menu / メニュー')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Kiểu menu' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bản đồ/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Kệ đồ chơi/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '🗺️ Bản đồ / ちず' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🧸 Kệ đồ chơi / たな' })).toBeInTheDocument();
  });

  it('chạm Kệ đồ chơi gọi onSave ngay với menuStyle shelf, không đóng', () => {
    const { onSave, onClose } = renderArea();
    fireEvent.click(screen.getByRole('button', { name: /Kệ đồ chơi/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, menuStyle: 'shelf' });
    expect(screen.getByRole('button', { name: /Kệ đồ chơi/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Bản đồ/ })).toHaveAttribute('aria-pressed', 'false');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('đang là kệ, chạm Bản đồ gọi onSave với menuStyle map', () => {
    const { onSave } = renderArea({ ...DEFAULT_SETTINGS, menuStyle: 'shelf' });
    expect(screen.getByRole('button', { name: /Kệ đồ chơi/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Bản đồ/ }));
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, menuStyle: 'map' });
  });

  it('đổi ngôn ngữ vẫn gọi onSave ngay', () => {
    const { onSave } = renderArea();
    fireEvent.click(screen.getByRole('button', { name: /日本語/ }));
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, lang: 'ja' });
  });

  it('có 3 ngôn ngữ; chạm English thì lưu ngay lang en và đánh dấu đang chọn', () => {
    const { onSave, onClose } = renderArea();
    const group = screen.getByRole('group', { name: 'Ngôn ngữ' });
    expect(group.querySelectorAll('button')).toHaveLength(3);
    const en = screen.getByRole('button', { name: /English/ });
    expect(en).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(en);
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, lang: 'en' });
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Tiếng Việt/ })).toHaveAttribute('aria-pressed', 'false');
    expect(onClose).not.toHaveBeenCalled();
  });
});
