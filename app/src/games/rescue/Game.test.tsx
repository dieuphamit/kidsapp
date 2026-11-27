import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { GARAGE_COUNT, DRIVE_NEED, MISSION_IDS, animalById, doKey, type Act, type AnimalId, type VehicleId } from './logic';
import { clearRecentPicks } from '../../core/gameOptions';
import type { Speaker } from '../../core/audio';

const sounds = {
  bell: vi.fn(),
  horn: vi.fn(),
  vroom: vi.fn(),
  siren: vi.fn(),
  pop: vi.fn(),
  ding: vi.fn(),
  spray: vi.fn(),
  fizz: vi.fn(),
  wipe: vi.fn(),
  happy: vi.fn(),
};
vi.mock('./sounds', () => ({ createRescueSounds: () => sounds }));

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

const root = () => screen.getByTestId('game-rescue');
const hook = () => window.__behocRescue!;
const said = (sp: Speaker) => vi.mocked(sp.say).mock.calls.map((c) => c[0]);

/** Làm hết các bước cứu hộ của nhiệm vụ đang làm qua móc logic (kéo thật kiểm tra ở e2e). */
function finishSteps() {
  for (let guard = 0; guard < 12 && hook().snapshot()?.phase === 'rescue'; guard++) {
    const s = hook().snapshot()!;
    act(() => {
      if (s.hp.length) s.hp.forEach((_, i) => void hook().rub(i, 99_999));
      else hook().dragDone();
    });
  }
}

describe('Đội cứu hộ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRecentPicks();
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/?e2e=1');
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.useRealTimers();
  });

  it('vào trò: chuông reo, chào, bong bóng tình huống, ga-ra đúng số xe theo tuổi; bé nhỏ thấy xe đúng nhấp nháy ngay', () => {
    for (const [age, level] of [[26, 'easy'], [40, 'medium'], [60, 'hard']] as const) {
      const sp = speaker();
      const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={age} onExit={() => {}} />);
      expect(sp.say).toHaveBeenCalledWith('rescue.hello');
      expect(sounds.bell).toHaveBeenCalled();
      const s = hook().snapshot()!;
      expect(MISSION_IDS).toContain(s.mission);
      expect(screen.getByTestId('bubble')).toHaveAttribute('data-mission', s.mission);
      expect(document.querySelectorAll('[data-testid^="car-"]')).toHaveLength(GARAGE_COUNT[level]);
      expect(root()).toHaveAttribute('data-phase', 'pick');
      expect(root()).toHaveAttribute('data-level', level);
      const right = screen.getByTestId(`car-${s.vehicle}`);
      if (level === 'easy') expect(right).toHaveAttribute('data-hint', '');
      else expect(right).not.toHaveAttribute('data-hint');
      // sau câu chào mới nói tình huống
      act(() => {
        vi.advanceTimersByTime(3700);
      });
      expect(sp.say).toHaveBeenLastCalledWith(`rescue.call.${s.mission}`);
      unmount();
    }
  }, 20_000);

  it('chạm xe khác: bấm còi chào, khích lệ, xe đúng nhấp nháy (không âm báo sai); chạm xe đúng: nổ máy lên đường', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const s = hook().snapshot()!;
    const other = s.garage.find((v) => v !== s.vehicle)!;
    fireEvent.pointerDown(screen.getByTestId(`car-${other}`));
    expect(sounds.horn).toHaveBeenCalledTimes(1);
    expect(sp.say).toHaveBeenLastCalledWith('rescue.other');
    expect(sp.sfx).not.toHaveBeenCalled();
    expect(root()).toHaveAttribute('data-phase', 'pick');
    expect(screen.getByTestId(`car-${s.vehicle}`)).toHaveAttribute('data-hint', '');

    fireEvent.pointerDown(screen.getByTestId(`car-${s.vehicle}`));
    expect(sounds.vroom).toHaveBeenCalledTimes(1);
    expect(sp.say).toHaveBeenLastCalledWith(`rescue.go.${s.vehicle}`);
    expect(root()).toHaveAttribute('data-phase', 'depart');
    expect(screen.getByTestId(`car-${s.vehicle}`)).toHaveAttribute('data-leaving', '');
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(root()).toHaveAttribute('data-phase', 'drive');
    expect(screen.getByTestId('driver')).toHaveAttribute('data-vehicle', s.vehicle);
  });

  it('lái: xe chỉ chạy khi bé giữ tay, nhả tay thì dừng; tới nơi thì nói việc cần làm', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
    const s = hook().snapshot()!;
    fireEvent.pointerDown(screen.getByTestId(`car-${s.vehicle}`));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    // chưa giữ tay: xe đứng yên
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(hook().snapshot()!.driven).toBe(0);

    fireEvent.pointerDown(root(), { clientX: 600, clientY: 400 });
    expect(screen.getByTestId('driver')).toHaveAttribute('data-holding', '');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const mid = hook().snapshot()!.driven;
    expect(mid).toBeGreaterThan(800);
    expect(mid).toBeLessThan(DRIVE_NEED.easy);
    expect(sounds.siren).toHaveBeenCalled();

    fireEvent.pointerUp(root());
    expect(screen.getByTestId('driver')).not.toHaveAttribute('data-holding');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(hook().snapshot()!.driven).toBe(mid);

    fireEvent.pointerDown(root(), { clientX: 600, clientY: 400 });
    act(() => {
      vi.advanceTimersByTime(DRIVE_NEED.easy);
    });
    expect(root()).toHaveAttribute('data-phase', 'rescue');
    expect(screen.getByTestId('animal')).toHaveAttribute('data-mood', 'hope');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(sp.say).toHaveBeenLastCalledWith(doKey(hook().snapshot()!.acts[0] as Act));
  });

  it('cứu xong: bạn thú nhảy mừng và kêu tiếng thật, lời khen chờ tiếng kêu xong, rồi sang nhiệm vụ kế', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const s = hook().snapshot()!;
    act(() => void hook().pick(s.vehicle));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    act(() => void hook().drive(99_999));
    expect(root()).toHaveAttribute('data-phase', 'rescue');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    finishSteps();
    expect(root()).toHaveAttribute('data-phase', 'saved');
    expect(sounds.happy).toHaveBeenCalled();

    const sound = animalById(s.animal as AnimalId).sound;
    act(() => {
      vi.advanceTimersByTime(1050);
    });
    expect(sp.say).toHaveBeenLastCalledWith(sound);
    expect(screen.getByTestId('animal')).toHaveAttribute('data-mood', 'happy');
    expect(screen.getByTestId('happy')).toBeInTheDocument();
    // tiếng kêu dài tới 2,6 giây: trong lúc đó chưa có câu nào chen vào
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(sp.say).toHaveBeenLastCalledWith(sound);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(sp.say).toHaveBeenLastCalledWith(`rescue.done.${s.mission}`);

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    const next = hook().snapshot()!;
    expect(next.index).toBe(1);
    expect(next.phase).toBe('pick');
    expect(next.mission).not.toBe(s.mission);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(sp.say).toHaveBeenLastCalledWith(`rescue.call.${next.mission}`);
  });

  it('chạm bạn thú, xe, đội trưởng: luôn có phản ứng ngay; câu nói không cắt ngang tiếng kêu vừa chạm', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const s = hook().snapshot()!;
    fireEvent.pointerDown(screen.getByTestId('captain'));
    expect(sp.say).toHaveBeenLastCalledWith(`rescue.call.${s.mission}`);

    act(() => void hook().pick(s.vehicle));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    fireEvent.pointerDown(screen.getByTestId('driver'));
    expect(sounds.horn).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(root());
    act(() => void hook().drive(99_999));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    fireEvent.pointerDown(screen.getByTestId('vehicle'));
    expect(sounds.horn).toHaveBeenCalledTimes(2);
    expect(sp.say).toHaveBeenLastCalledWith(`rescue.car.${s.vehicle as VehicleId}`);

    const sound = animalById(s.animal as AnimalId).sound;
    fireEvent.pointerDown(screen.getByTestId('animal'));
    expect(sp.say).toHaveBeenLastCalledWith(sound);
    // chạm đội trưởng ngay sau đó: lời nhắc chờ tiếng kêu xong
    fireEvent.pointerDown(screen.getByTestId('captain'));
    expect(sp.say).toHaveBeenLastCalledWith(sound);
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(sp.say).toHaveBeenLastCalledWith(doKey(hook().snapshot()!.acts[hook().snapshot()!.step] as Act));
  });

  it('bé ngừng tay ~6 giây: thứ cần chạm nhấp nháy; chạm lại thì hết nhấp nháy', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const s = hook().snapshot()!;
    expect(screen.getByTestId(`car-${s.vehicle}`)).not.toHaveAttribute('data-hint');
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(screen.getByTestId(`car-${s.vehicle}`)).toHaveAttribute('data-hint', '');
    fireEvent.pointerDown(root(), { clientX: 30, clientY: 800 });
    expect(screen.getByTestId(`car-${s.vehicle}`)).not.toHaveAttribute('data-hint');
  });

  it('hết lượt: ăn mừng cả đội, có nút chơi lại ra lượt mới; thoát trò thì không còn tiếng nào phát theo', () => {
    const sp = speaker();
    const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const s = hook().snapshot()!;
      expect(s.index).toBe(i);
      seen.push(s.mission);
      act(() => void hook().pick(s.vehicle));
      act(() => {
        vi.advanceTimersByTime(1200);
      });
      act(() => void hook().drive(99_999));
      finishSteps();
      act(() => {
        vi.advanceTimersByTime(7300);
      });
    }
    expect(root()).toHaveAttribute('data-phase', 'party');
    expect(screen.getByTestId('party')).toBeInTheDocument();
    expect(said(sp)).toContain('rescue.party');
    expect(document.querySelectorAll('[data-testid^="party-animal-"]')).toHaveLength(3);
    // không điểm số, không sao/xu
    expect(root().textContent ?? '').not.toMatch(/\d|⭐|🪙/);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chơi lại' }));
    expect(root()).toHaveAttribute('data-phase', 'pick');
    const next = hook().snapshot()!;
    expect(next.index).toBe(0);
    expect(seen).not.toContain(next.mission);

    // Thoát trò: mọi hẹn giờ bị xoá
    vi.mocked(sp.say).mockClear();
    Object.values(sounds).forEach((f) => f.mockClear());
    unmount();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(sp.say).not.toHaveBeenCalled();
    for (const f of Object.values(sounds)) expect(f).not.toHaveBeenCalled();
  });
});

describe('Đội cứu hộ: câu app tự nói chờ câu đang đọc xong', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRecentPicks();
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/?e2e=1');
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.useRealTimers();
  });

  /** Loa giả như loa thật: chỉ báo hết tiếng khi gọi done(). */
  function chainSpeaker() {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    return { sp: { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker, chains };
  }

  it('câu chào dài: tình huống chờ câu chào đọc xong mới nói (không cắt ngang)', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const s = hook().snapshot()!;
    expect(chains.map((c) => c.keys)).toEqual([['rescue.hello']]);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(chains).toHaveLength(1); // câu chào chưa xong: chưa chen vào
    act(() => chains[0].done());
    expect(chains[1].keys).toEqual([`rescue.call.${s.mission}`]);
  });

  it('"lên đường" dài: tới nơi thì việc cần làm chờ câu đó đọc xong', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const s = hook().snapshot()!;
    act(() => void hook().pick(s.vehicle));
    const go = chains.at(-1)!;
    expect(go.keys).toEqual([`rescue.go.${s.vehicle}`]);
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    act(() => void hook().drive(99_999));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(chains.at(-1)).toBe(go);
    act(() => go.done());
    expect(chains.at(-1)!.keys).toEqual([doKey(hook().snapshot()!.acts[0] as Act)]);
  });
});

