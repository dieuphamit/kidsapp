import { describe, it, expect, vi, afterEach } from 'vitest';
import { clear } from 'idb-keyval';
import {
  addPlay, dayKey, lastDays, weeklyByGame, weeklyBySkill, weeklyTotal, toMinutes,
  loadPlayLog, recordPlay, trackPlay, KEEP_DAYS, MAX_SEGMENT_MS, FLUSH_MS, type PlayLog,
} from './playTime';

const NOW = new Date(2026, 10, 19, 15, 0).getTime(); // 19/11/2026 15:00 giờ máy
const ago = (n: number) => new Date(2026, 10, 19 - n, 10, 0).getTime();
const MIN = 60_000;

afterEach(() => vi.useRealTimers());

describe('playTime: tính toán', () => {
  it('dayKey theo giờ máy; lastDays 7 ngày tính cả hôm nay, cũ trước', () => {
    expect(dayKey(NOW)).toBe('2026-11-19');
    expect(lastDays(NOW)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
    // qua đầu tháng
    expect(lastDays(new Date(2026, 11, 2, 9).getTime(), 3)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
  });

  it('addPlay cộng dồn theo ngày + trò, không sửa log cũ, bỏ ms ≤ 0', () => {
    const a = addPlay({}, 'counting', 2 * MIN, NOW);
    const b = addPlay(a, 'counting', 3 * MIN, NOW);
    expect(a).toEqual({ '2026-11-19': { counting: 2 * MIN } });
    expect(b).toEqual({ '2026-11-19': { counting: 5 * MIN } });
    expect(addPlay(b, 'zoo', 0, NOW)).toBe(b);
    expect(addPlay(b, 'zoo', -5, NOW)).toBe(b);
  });

  it('addPlay bỏ ngày cũ hơn KEEP_DAYS', () => {
    const old: PlayLog = { [dayKey(ago(KEEP_DAYS + 3))]: { zoo: MIN }, [dayKey(ago(KEEP_DAYS - 1))]: { zoo: MIN } };
    const next = addPlay(old, 'zoo', MIN, NOW);
    expect(Object.keys(next).sort()).toEqual([dayKey(ago(KEEP_DAYS - 1)), '2026-11-19']);
  });

  it('weeklyByGame / weeklyBySkill / weeklyTotal chỉ tính 7 ngày gần nhất', () => {
    let log: PlayLog = {};
    log = addPlay(log, 'sort', 10 * MIN, NOW); // logic + math
    log = addPlay(log, 'counting', 4 * MIN, ago(6)); // math, vẫn trong tuần
    log = addPlay(log, 'music', 20 * MIN, ago(7)); // ngoài tuần
    log = addPlay(log, 'mama', 5 * MIN, ago(2)); // science + social
    log = addPlay(log, 'unknown-game', 3 * MIN, NOW); // trò lạ: có trong tổng, không có kỹ năng
    expect(weeklyByGame(log, NOW)).toEqual({ sort: 10 * MIN, counting: 4 * MIN, mama: 5 * MIN, 'unknown-game': 3 * MIN });
    expect(weeklyBySkill(log, NOW)).toEqual({
      math: 14 * MIN, logic: 10 * MIN, language: 0, science: 5 * MIN, creativity: 0, social: 5 * MIN,
    });
    expect(weeklyTotal(log, NOW)).toBe(22 * MIN);
  });

  it('toMinutes: 0 là 0, có chơi thì ít nhất 1, làm tròn', () => {
    expect(toMinutes(0)).toBe(0);
    expect(toMinutes(5_000)).toBe(1);
    expect(toMinutes(150_000)).toBe(3);
  });
});

describe('playTime: lưu trên máy (IndexedDB)', () => {
  it('recordPlay ghi, loadPlayLog đọc lại; dữ liệu lạ bị lọc', async () => {
    await clear();
    expect(await loadPlayLog()).toEqual({});
    await recordPlay('zoo', 90_000, NOW);
    await recordPlay('zoo', 30_000, NOW);
    await Promise.all([recordPlay('path', 1000, NOW), recordPlay('path', 2000, NOW)]);
    expect(await loadPlayLog()).toEqual({ '2026-11-19': { zoo: 120_000, path: 3000 } });
  });
});

describe('trackPlay', () => {
  function fakeDoc() {
    const listeners = new Set<() => void>();
    const doc = {
      visibilityState: 'visible' as DocumentVisibilityState,
      addEventListener: (_: string, f: () => void) => listeners.add(f),
      removeEventListener: (_: string, f: () => void) => listeners.delete(f),
      fire(state: DocumentVisibilityState) { this.visibilityState = state; listeners.forEach((f) => f()); },
      listeners,
    };
    return doc;
  }

  it('ghi định kỳ, dừng thì ghi phần còn lại; ẩn tab thì ngưng đếm', () => {
    vi.useFakeTimers();
    let t = 0;
    const clock = () => t;
    const rec = vi.fn();
    const doc = fakeDoc();
    const stop = trackPlay('zoo', rec, clock, doc as unknown as Document);
    t = FLUSH_MS;
    vi.advanceTimersByTime(FLUSH_MS);
    expect(rec).toHaveBeenLastCalledWith('zoo', FLUSH_MS);
    t += 10_000;
    doc.fire('hidden'); // ghi 10 giây, rồi ngưng
    expect(rec).toHaveBeenLastCalledWith('zoo', 10_000);
    t += 600_000; // 10 phút khóa màn hình: không tính
    doc.fire('visible');
    t += 5_000;
    stop();
    expect(rec).toHaveBeenLastCalledWith('zoo', 5_000);
    expect(rec.mock.calls.reduce((a, c) => a + (c[1] as number), 0)).toBe(FLUSH_MS + 15_000);
    expect(doc.listeners.size).toBe(0);
    // dừng rồi thì không ghi nữa
    rec.mockClear();
    t += FLUSH_MS;
    vi.advanceTimersByTime(FLUSH_MS * 2);
    expect(rec).not.toHaveBeenCalled();
  });

  it('đoạn đo bất thường dài (máy ngủ không báo) bị kẹp MAX_SEGMENT_MS', () => {
    let t = 0;
    const rec = vi.fn();
    const stop = trackPlay('zoo', rec, () => t, fakeDoc() as unknown as Document);
    t = 60 * MIN;
    stop();
    expect(rec).toHaveBeenCalledWith('zoo', MAX_SEGMENT_MS);
  });
});
