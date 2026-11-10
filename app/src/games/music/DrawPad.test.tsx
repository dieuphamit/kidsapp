import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { DrawPad } from './DrawPad';
import { LEARN_HEX } from '../../core/tokens';

// Stub canvas context
type CanvasCall = { method: string; args: unknown[] };
let canvasCalls: CanvasCall[] = [];
let currentStrokeStyle = '#ff6b6b'; // default red

const mockContext = {
  scale: vi.fn((...args) => canvasCalls.push({ method: 'scale', args })),
  beginPath: vi.fn(() => canvasCalls.push({ method: 'beginPath', args: [] })),
  moveTo: vi.fn((...args) => canvasCalls.push({ method: 'moveTo', args })),
  lineTo: vi.fn((...args) => canvasCalls.push({ method: 'lineTo', args })),
  quadraticCurveTo: vi.fn((...args) => canvasCalls.push({ method: 'quadraticCurveTo', args })),
  stroke: vi.fn(() => canvasCalls.push({ method: 'stroke', args: [] })),
  arc: vi.fn((...args) => canvasCalls.push({ method: 'arc', args })),
  fill: vi.fn(() => canvasCalls.push({ method: 'fill', args: [] })),
  clearRect: vi.fn((...args) => canvasCalls.push({ method: 'clearRect', args })),
  drawImage: vi.fn((...args) => canvasCalls.push({ method: 'drawImage', args })),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn(),
  set strokeStyle(v: string) {
    currentStrokeStyle = v;
    canvasCalls.push({ method: 'set strokeStyle', args: [v] });
  },
  get strokeStyle() {
    return currentStrokeStyle;
  },
  set fillStyle(v: string) {
    canvasCalls.push({ method: 'set fillStyle', args: [v] });
  },
  lineWidth: 22,
  lineCap: 'round',
  lineJoin: 'round',
};

beforeEach(() => {
  canvasCalls = [];
  currentStrokeStyle = '#ff6b6b';
  vi.clearAllMocks();
  vi.stubGlobal('devicePixelRatio', 2);
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('DrawPad', () => {
  it('vẽ chấm và nét khi pointerDown/Move/Up với pointerId 1', () => {
    const say = vi.fn();
    const { getByTestId } = render(<DrawPad say={say} lang="vi" />);
    const paper = getByTestId('paper');

    // pointerDown - vẽ chấm
    fireEvent.pointerDown(paper, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(canvasCalls.some((c) => c.method === 'arc' || c.method === 'fill')).toBe(true);

    // pointerMove - vẽ nét
    fireEvent.pointerMove(paper, { pointerId: 1, clientX: 120, clientY: 110 });
    expect(canvasCalls.some((c) => c.method === 'stroke' || c.method === 'quadraticCurveTo' || c.method === 'lineTo')).toBe(true);

    // pointerUp - kết thúc
    fireEvent.pointerUp(paper, { pointerId: 1 });
  });

  it('bỏ qua pointer khác khi đang vẽ với pointer 1', () => {
    const say = vi.fn();
    const { getByTestId } = render(<DrawPad say={say} lang="vi" />);
    const paper = getByTestId('paper');

    fireEvent.pointerDown(paper, { pointerId: 1, clientX: 100, clientY: 100 });
    const callsAfterDown = canvasCalls.length;

    // Pointer 2 cố vẽ - phải bị bỏ qua
    fireEvent.pointerDown(paper, { pointerId: 2, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(paper, { pointerId: 2, clientX: 220, clientY: 210 });

    // Không có lệnh vẽ mới từ pointer 2
    const drawCallsFromPointer2 = canvasCalls.slice(callsAfterDown).filter(
      (c) => c.method === 'arc' || c.method === 'stroke' || c.method === 'lineTo'
    );
    expect(drawCallsFromPointer2.length).toBe(0);

    fireEvent.pointerUp(paper, { pointerId: 1 });
  });

  it('chạm nút màu "Màu xanh dương" thì say color.blue và đổi strokeStyle', () => {
    const say = vi.fn();
    const { getByLabelText, getByTestId } = render(<DrawPad say={say} lang="vi" />);

    const blueBtn = getByLabelText('Màu xanh dương');
    fireEvent.pointerDown(blueBtn);

    expect(say).toHaveBeenCalledWith('color.blue');

    // Vẽ một nét để kiểm tra strokeStyle
    const paper = getByTestId('paper');
    fireEvent.pointerDown(paper, { pointerId: 1, clientX: 50, clientY: 50 });

    expect(currentStrokeStyle).toBe(LEARN_HEX.blue);
  });

  it('chạm "Xóa" thì clearRect được gọi sau khi timer hết', async () => {
    vi.useFakeTimers();
    const say = vi.fn();
    const { getByLabelText } = render(<DrawPad say={say} lang="vi" />);

    const eraseBtn = getByLabelText('Xóa');
    fireEvent.pointerDown(eraseBtn);

    // Trước khi timer: chưa clear
    const clearBefore = canvasCalls.filter((c) => c.method === 'clearRect').length;

    // Sau 600ms: clearRect được gọi
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    const clearAfter = canvasCalls.filter((c) => c.method === 'clearRect').length;
    expect(clearAfter).toBeGreaterThan(clearBefore);

    vi.useRealTimers();
  });
});
