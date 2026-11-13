import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { lazy } from 'react';
import { BuddySettings } from './BuddySettings';
import { ParentArea } from './ParentArea';
import { GamePicker } from './GamePicker';
import { BuddyContext } from './buddyContext';
import { DEFAULT_SETTINGS } from '../core/settings';
import { DEFAULT_BUDDY } from '../core/buddy';
import type { GameManifest } from '../core/games';

// R3F không chạy trong jsdom: thay phần xem trước 3D bằng một div ghi lại props
vi.mock('./BuddyPreview', () => ({
  BuddyPreview: ({ character, wave, label }: { character: string; wave: number; label: string }) => (
    <div data-testid="preview3d" role="img" aria-label={label} data-character={character} data-wave={wave} />
  ),
}));

/** Bấm thật: chạm xuống rồi nhả (nút trong màn bố mẹ kích hoạt khi nhả tay). */
const tap = (el: HTMLElement) => { fireEvent.pointerDown(el); fireEvent.pointerUp(el); };

function setup() {
  const speaker = { say: vi.fn(), sfx: vi.fn() };
  const onChange = vi.fn();
  const onClose = vi.fn();
  render(<BuddySettings value={DEFAULT_BUDDY} lang="vi" speaker={speaker} onChange={onChange} onClose={onClose} />);
  return { speaker, onChange, onClose };
}

describe('BuddySettings', () => {
  it('4 con vật và 8 tên, mặc định mèo + Đậu Đậu đang chọn; mọi nút ≥120px', () => {
    setup();
    const animals = screen.getByRole('group', { name: 'Con vật' }).querySelectorAll('button');
    const names = screen.getByRole('group', { name: 'Tên' }).querySelectorAll('button');
    expect(animals).toHaveLength(4);
    expect(names).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Con vật: Mèo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tên: Đậu Đậu' })).toHaveAttribute('aria-pressed', 'true');
    for (const b of screen.getAllByRole('button')) expect(parseInt(b.style.width, 10)).toBeGreaterThanOrEqual(120);
    expect(screen.getByTestId('preview3d')).toHaveAttribute('aria-label', 'Đậu Đậu');
  });

  it('chọn thỏ: lưu ngay, vẫy tay và nói thử buddy.hello', () => {
    const { speaker, onChange } = setup();
    tap(screen.getByRole('button', { name: 'Con vật: Thỏ' }));
    expect(onChange).toHaveBeenLastCalledWith({ character: 'bunny', name: 'dau' });
    expect(speaker.say).toHaveBeenLastCalledWith('buddy.hello');
    expect(screen.getByTestId('preview3d')).toHaveAttribute('data-character', 'bunny');
    expect(screen.getByTestId('preview3d')).toHaveAttribute('data-wave', '1');
    expect(screen.getByRole('button', { name: 'Con vật: Thỏ' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('chọn tên độc lập với con vật; nói thử sau khi đã lưu tên mới', () => {
    const { speaker, onChange } = setup();
    const order: string[] = [];
    onChange.mockImplementation(() => order.push('save'));
    speaker.say.mockImplementation(() => order.push('say'));
    tap(screen.getByRole('button', { name: 'Con vật: Gấu' }));
    tap(screen.getByRole('button', { name: 'Tên: Mi Mi' }));
    expect(onChange).toHaveBeenLastCalledWith({ character: 'bear', name: 'mimi' });
    expect(order).toEqual(['save', 'say', 'save', 'say']);
    expect(screen.getByTestId('preview3d')).toHaveAttribute('aria-label', 'Mi Mi');
    expect(screen.getByTestId('buddy-settings')).toHaveAttribute('data-name', 'mimi');
  });

  it('chỉ chạm xuống (đang cuộn) thì chưa chọn; Xong gọi onClose khi nhả', () => {
    const { onChange, onClose } = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Tên: Tôm' }));
    expect(onChange).not.toHaveBeenCalled();
    tap(screen.getByRole('button', { name: 'Xong' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ParentArea → Bạn đồng hành', () => {
  it('mở màn Bạn đồng hành, chọn cún lưu cả settings, Xong quay lại', () => {
    const onSave = vi.fn();
    const speaker = { say: vi.fn(), sfx: vi.fn() };
    render(<ParentArea settings={DEFAULT_SETTINGS} speaker={speaker} onSave={onSave} onUnlock={vi.fn()} onClose={vi.fn()} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Bạn đồng hành' }));
    expect(screen.getByTestId('buddy-settings')).toBeInTheDocument();
    tap(screen.getByRole('button', { name: 'Con vật: Cún' }));
    expect(onSave).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, buddy: { character: 'dog', name: 'dau' } });
    expect(speaker.say).toHaveBeenCalledWith('buddy.hello');
    tap(screen.getByRole('button', { name: 'Xong' }));
    expect(screen.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toBeInTheDocument();
  });
});

describe('chữ hiển thị theo tên đang chọn', () => {
  it('màn chọn trò: tên trò, tên khu và nút về nhà thay {name}; ảnh theo con vật', () => {
    const hide = {
      id: 'hide', title: { vi: '{name} trốn ở đâu?', ja: '{name} どこかな?', en: 'Where is {name}?' },
      place: 'place.house', icon: '📦', color: 'butter', minAge: 0, maxAge: 99, titleKey: 'game.hide',
      Component: lazy(() => Promise.resolve({ default: () => null })),
    } as GameManifest;
    const speaker = { say: vi.fn(), sfx: vi.fn() };
    const { container } = render(
      <BuddyContext value={{ character: 'bunny', name: 'mimi' }}>
        <GamePicker placeKey="place.house" games={[hide]} lang="vi" speaker={speaker} onPick={vi.fn()} onBack={vi.fn()} />
      </BuddyContext>,
    );
    expect(screen.getByRole('button', { name: 'Mi Mi trốn ở đâu?' })).toBeInTheDocument();
    expect(screen.getByText('Nhà Mi Mi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mi Mi' })).toBeInTheDocument();
    expect(container.textContent).not.toContain('{name}');
    expect(container.querySelector('img[src$="cards/buddy-bunny.png"]')).not.toBeNull();
  });
});
