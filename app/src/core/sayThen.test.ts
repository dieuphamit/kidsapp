import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** Howl giả có sự kiện: test tự bắn 'end' / 'loaderror' để giả lập tiếng phát hết hay file hỏng. */
const { howls, Howl, Howler, cfg } = vi.hoisted(() => {
  type Listener = { event: string; fn: () => void; id?: number };
  interface FakeHowl {
    src: string;
    listeners: Listener[];
    plays: number[];
    stops: number;
    emit(event: string, id?: number): void;
  }
  const howls: FakeHowl[] = [];
  const cfg = { state: 'loaded', duration: 0 };
  let n = 0;
  const Howl = vi.fn(function (this: FakeHowl, o: { src: string[] }) {
    const h: FakeHowl & Record<string, unknown> = {
      src: o.src[0],
      listeners: [],
      plays: [],
      stops: 0,
      emit(event: string, id?: number) {
        for (const l of [...h.listeners]) {
          if (l.event !== event || (l.id !== undefined && l.id !== id)) continue;
          h.listeners.splice(h.listeners.indexOf(l), 1); // once
          l.fn();
        }
      },
      play: () => {
        h.plays.push(++n);
        return n;
      },
      stop: () => {
        h.stops++;
      },
      rate: () => {},
      state: () => cfg.state,
      duration: () => cfg.duration,
      once: (event: string, fn: () => void, id?: number) => {
        h.listeners.push({ event, fn, id });
      },
      off: (event: string, fn: () => void) => {
        h.listeners = h.listeners.filter((l) => !(l.event === event && l.fn === fn));
      },
    };
    howls.push(h);
    return h;
  });
  const Howler = { ctx: null, volume: vi.fn() };
  return { howls, Howl, Howler, cfg };
});
vi.mock('howler', () => ({ Howl, Howler }));

import { createSpeaker, sayThen, SAY_STEP_MAX_MS, SAY_END_SLACK_MS, SAY_FALLBACK_MS, type Speaker } from './audio';

const bySrc = (part: string) => howls.find((h) => h.src.includes(part))!;
const lastPlay = (part: string) => bySrc(part).plays.at(-1)!;

describe('sayThen (loa thật: chờ sự kiện kết thúc)', () => {
  beforeEach(() => {
    howls.length = 0;
    cfg.state = 'loaded';
    cfg.duration = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('key sau chỉ phát khi tiếng trước hết, không theo đồng hồ', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    const onDone = vi.fn();
    sayThen(sp, ['animal.cow-sound', 'mama.found.cow'], { onSay: (k) => said.push(k), onDone });
    expect(said).toEqual(['animal.cow-sound']);
    vi.advanceTimersByTime(3000); // tiếng bò dài 2,6s: chưa hết thì chưa nói câu sau
    expect(said).toEqual(['animal.cow-sound']);
    expect(bySrc('animal-cow').stops).toBe(0);
    bySrc('animal-cow').emit('end', lastPlay('animal-cow'));
    vi.advanceTimersByTime(0);
    expect(said).toEqual(['animal.cow-sound', 'mama.found.cow']);
    expect(onDone).not.toHaveBeenCalled();
    bySrc('mama.found.cow').emit('end', lastPlay('mama.found.cow'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('gapMs: nghỉ một nhịp sau khi tiếng trước hết', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    sayThen(sp, ['a', 'b'], { gapMs: 300, onSay: (k) => said.push(k) });
    bySrc('/a.mp3').emit('end', lastPlay('/a.mp3'));
    vi.advanceTimersByTime(299);
    expect(said).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(said).toEqual(['a', 'b']);
  });

  it('say() chen vào: bỏ phần còn lại của chuỗi, báo onDone đúng một lần', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    const onDone = vi.fn();
    sayThen(sp, ['a', 'b'], { onSay: (k) => said.push(k), onDone });
    sp.say('c');
    expect(onDone).toHaveBeenCalledTimes(1);
    bySrc('/a.mp3').emit('end', lastPlay('/a.mp3'));
    vi.advanceTimersByTime(SAY_STEP_MAX_MS * 3);
    expect(said).toEqual(['a']);
    expect(howls.some((h) => h.src.includes('/b.mp3'))).toBe(false);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('sayThen mới thay chuỗi cũ', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    const first = vi.fn();
    sayThen(sp, ['a', 'b'], { onSay: (k) => said.push(k), onDone: first });
    sayThen(sp, ['c', 'd'], { onSay: (k) => said.push(k) });
    expect(first).toHaveBeenCalledTimes(1);
    bySrc('/c.mp3').emit('end', lastPlay('/c.mp3'));
    vi.advanceTimersByTime(0);
    expect(said).toEqual(['a', 'c', 'd']);
  });

  it('hàm huỷ (unmount): không nói tiếp, không gọi onDone', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    const onDone = vi.fn();
    const cancel = sayThen(sp, ['a', 'b'], { onSay: (k) => said.push(k), onDone });
    cancel();
    bySrc('/a.mp3').emit('end', lastPlay('/a.mp3'));
    vi.advanceTimersByTime(SAY_STEP_MAX_MS * 3);
    expect(said).toEqual(['a']);
    expect(onDone).not.toHaveBeenCalled();
    expect(bySrc('/a.mp3').listeners).toHaveLength(0);
  });

  it('đường lui: file không tải được thì đi tiếp ngay; âm thanh bị khoá thì đi tiếp sau SAY_STEP_MAX_MS', () => {
    cfg.state = 'loading';
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    const onDone = vi.fn();
    sayThen(sp, ['a', 'b', 'c'], { onSay: (k) => said.push(k), onDone });
    bySrc('/a.mp3').emit('loaderror');
    vi.advanceTimersByTime(0);
    expect(said).toEqual(['a', 'b']);
    vi.advanceTimersByTime(SAY_STEP_MAX_MS - 1);
    expect(said).toEqual(['a', 'b']);
    vi.advanceTimersByTime(1);
    expect(said).toEqual(['a', 'b', 'c']);
    vi.advanceTimersByTime(SAY_STEP_MAX_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('đường lui theo độ dài file khi sự kiện kết thúc bị lỡ', () => {
    cfg.duration = 1.5;
    const sp = createSpeaker(() => 'vi', '/b/');
    const said: string[] = [];
    sayThen(sp, ['a', 'b'], { onSay: (k) => said.push(k) });
    vi.advanceTimersByTime(1500 + SAY_END_SLACK_MS - 1);
    expect(said).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(said).toEqual(['a', 'b']);
  });

  it('say() thường vẫn dừng tiếng đang phát', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    sp.say('a');
    sp.say('b');
    expect(bySrc('/a.mp3').stops).toBe(1);
  });
});

describe('sayThen (loa không báo được lúc hết tiếng: hẹn giờ)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('các key cách nhau fallbackMs, onDone sau key cuối', () => {
    const say = vi.fn();
    const sp: Speaker = { say, sfx: vi.fn() };
    const onDone = vi.fn();
    const onSay = vi.fn();
    sayThen(sp, ['a', 'b'], { fallbackMs: 1300, onSay, onDone });
    expect(say.mock.calls).toEqual([['a']]);
    vi.advanceTimersByTime(1299);
    expect(say).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(say.mock.calls).toEqual([['a'], ['b']]);
    expect(onSay).toHaveBeenLastCalledWith('b', 1);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1300);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('huỷ: không còn say nào, không onDone; mặc định SAY_FALLBACK_MS', () => {
    const say = vi.fn();
    const onDone = vi.fn();
    const cancel = sayThen({ say, sfx: vi.fn() }, ['a', 'b'], { onDone });
    vi.advanceTimersByTime(SAY_FALLBACK_MS - 1);
    cancel();
    vi.advanceTimersByTime(SAY_FALLBACK_MS * 5);
    expect(say).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });
});
