import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';
import { ROOMS, roomZones, pairKey } from './logic';

vi.mock('../../core/synth', () => ({ synth: { playNote: vi.fn(), playDrum: vi.fn() } }));

beforeAll(() => {
  // jsdom không có pointer capture
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.hasPointerCapture ??= () => false;
});

function setup(ageMonths = 48) {
  const speaker: Speaker = { say: vi.fn(), sfx: vi.fn() } as unknown as Speaker;
  render(<Game lang="vi" speaker={speaker} ageMonths={ageMonths} onExit={() => {}} />);
  return speaker;
}

/** Kéo Đậu Đậu (trong jsdom stageRect = 0,0 nên điểm bắt đầu là tâm) tới điểm trong khung. */
function dragTo(x: number, y: number) {
  const cat = screen.getByTestId('hide-daudau');
  fireEvent.pointerDown(cat, { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(cat, { pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(cat, { pointerId: 1, clientX: x, clientY: y });
}

describe('hide Game', () => {
  it('vào game nói hide.hello, phòng khách, chơi tự do, có đủ vùng thả', () => {
    const speaker = setup();
    expect(speaker.say).toHaveBeenCalledWith('hide.hello');
    const root = screen.getByTestId('game-hide');
    expect(root.dataset.room).toBe('living');
    expect(root.dataset.mode).toBe('free');
    for (const z of roomZones(ROOMS[0])) {
      expect(screen.getByTestId(`zone-${pairKey(z)}`)).toBeTruthy();
    }
  });

  it('kéo xuống gầm bàn → nói hide.under-table; sau 3 lần thả chuyển sang chế độ nhờ', () => {
    const speaker = setup();
    const under = roomZones(ROOMS[0]).find((z) => z.prep === 'under' && z.obj === 'table')!;
    dragTo((under.left + under.right) / 2, (under.top + under.bottom) / 2);
    expect(speaker.say).toHaveBeenLastCalledWith('hide.under-table');
    expect(screen.getByTestId('game-hide').dataset.lastSay).toBe('hide.under-table');

    // thả ngoài mọi vùng: không nói câu mới
    dragTo(600, 260);
    expect(speaker.say).toHaveBeenLastCalledWith('hide.under-table');

    const inBox = roomZones(ROOMS[0]).find((z) => z.prep === 'in' && z.obj === 'box')!;
    dragTo((inBox.left + inBox.right) / 2, inBox.bottom - 20);
    expect(speaker.say).toHaveBeenLastCalledWith('hide.in-box');
    expect(screen.getByTestId('game-hide').dataset.mode).toBe('ask');
    expect(screen.getByTestId('game-hide').dataset.ask).toMatch(/^hide\.ask-(on|in|under|beside)-(table|box|bed)$/);
  });
});
