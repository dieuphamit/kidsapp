import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParentExtras } from './ParentExtras';
import { PrintablesPicker } from './PrintablesPicker';
import { getSeasonPref, loadSeasonPref } from '../../core/seasonPref';
import { SHEETS } from '../../core/printables';

describe('ParentExtras', () => {
  it('Trang trí theo mùa: mặc định Tự động, chạm Tắt thì lưu ngay', async () => {
    render(<ParentExtras />);
    const group = screen.getByRole('group', { name: 'Trang trí theo mùa' });
    const auto = screen.getByRole('button', { name: /Tự động/ });
    const off = screen.getByRole('button', { name: /Tắt/ });
    expect(group).toContainElement(auto);
    await waitFor(() => expect(auto).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(off);
    expect(off).toHaveAttribute('aria-pressed', 'true');
    expect(getSeasonPref()).toBe('off');
    // đọc lại từ bộ nhớ vẫn là Tắt
    expect(await loadSeasonPref()).toBe('off');
    fireEvent.click(auto);
    await waitFor(() => expect(auto).toHaveAttribute('aria-pressed', 'true'));
  });

  it('nút Bản in mở màn chọn tờ, Đóng thì về', () => {
    render(<ParentExtras />);
    fireEvent.click(screen.getByRole('button', { name: '🖨️ Bản in' }));
    expect(screen.getByRole('dialog', { name: 'Bản in' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog', { name: 'Bản in' })).toBeNull();
  });
});

describe('PrintablesPicker', () => {
  it('chọn tờ, nút In gọi in với đúng các trang A4', () => {
    const print = vi.fn();
    render(<PrintablesPicker onClose={vi.fn()} print={print} />);
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(SHEETS.length);
    const printBtn = screen.getByRole('button', { name: 'Chọn tờ để in' });
    expect(printBtn).toBeDisabled();
    expect(screen.queryAllByTestId('print-page')).toHaveLength(0);

    fireEvent.click(screen.getByTestId('sheet-color-cat'));
    fireEvent.click(screen.getByTestId('sheet-dots-star'));
    expect(screen.getByTestId('sheet-color-cat')).toHaveAttribute('aria-pressed', 'true');
    const pages = screen.getAllByTestId('print-page');
    expect(pages.map((p) => p.dataset.sheet)).toEqual(['color-cat', 'dots-star']);
    // trang in nằm ngoài khung app (gắn vào body)
    expect(screen.getByTestId('print-pages').parentElement).toBe(document.body);
    // nối số có đủ số thứ tự
    expect(pages[1].querySelectorAll('text').length).toBe(SHEETS.find((s) => s.id === 'dots-star')!.dots!.length);

    fireEvent.click(screen.getByRole('button', { name: /In 2 tờ/ }));
    expect(print).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('sheet-color-cat'));
    expect(screen.getAllByTestId('print-page')).toHaveLength(1);
  });

  it('Chọn hết / Bỏ chọn', () => {
    render(<PrintablesPicker onClose={vi.fn()} print={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Chọn hết/ }));
    expect(screen.getAllByTestId('print-page')).toHaveLength(SHEETS.length);
    fireEvent.click(screen.getByRole('button', { name: /Bỏ chọn/ }));
    expect(screen.queryAllByTestId('print-page')).toHaveLength(0);
  });
});
