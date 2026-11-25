import { Howl, Howler } from 'howler';
import type { Lang } from './i18n';
import { DEFAULT_NAME_ID } from './buddy';
import { NAMED_KEYS } from './content';

const BASE = import.meta.env.BASE_URL;

export function audioUrl(key: string, lang: Lang, base = BASE): string {
  return `${base}audio/${lang}/${key}.mp3`;
}

export function sfxUrl(name: string, base = BASE): string {
  return `${base}audio/sfx/${name}.mp3`;
}

/**
 * Giọng đọc của câu có tên bạn đồng hành ({name}) với tên khác tên mặc định:
 * `audio/<lang>/<key>~<nameId>.mp3`. Tên mặc định (Đậu Đậu) dùng đường dẫn thường.
 */
export function namedAudioUrl(key: string, lang: Lang, nameId: string, base = BASE): string {
  return nameId === DEFAULT_NAME_ID ? audioUrl(key, lang, base) : `${base}audio/${lang}/${key}~${nameId}.mp3`;
}

const ANIMAL_SOUND_KEY = /^animal\.([a-z]+)-sound$/;

/**
 * File phát cho một key của say(). Key `animal.<id>-sound` là tiếng kêu THẬT của con vật
 * (ghi âm, không phụ thuộc ngôn ngữ) ở `audio/sfx/animal-<id>.mp3`, không phải giọng đọc TTS.
 * Game vẫn gọi say('animal.<id>-sound') nên data-last-say/test giữ nguyên key đó.
 * Nguồn và giấy phép: public/audio/sfx/CREDITS.md; sinh lại bằng scripts/animal-sounds.mjs.
 */
export function speechUrl(
  key: string,
  lang: Lang,
  base = BASE,
  nameId = DEFAULT_NAME_ID,
  namedKeys: ReadonlySet<string> = NAMED_KEYS,
): string {
  const m = ANIMAL_SOUND_KEY.exec(key);
  if (m) return sfxUrl(`animal-${m[1]}`, base);
  return namedKeys.has(key) ? namedAudioUrl(key, lang, nameId, base) : audioUrl(key, lang, base);
}

/** Tuỳ chọn cho nói nối tiếp (sayThen). */
export interface SayThenOptions {
  /** Nghỉ giữa hai tiếng (ms), tính từ lúc tiếng trước THẬT SỰ hết. */
  gapMs?: number;
  /**
   * Loa không báo được lúc hết tiếng (loa giả trong test unit): coi mỗi tiếng dài chừng này.
   * Loa thật bỏ qua số này, chờ sự kiện kết thúc của file (có hẹn giờ an toàn khi file hỏng).
   */
  fallbackMs?: number;
  /** Gọi ngay lúc bắt đầu phát từng key (để trò cập nhật data-last-say). */
  onSay?(key: string, index: number): void;
  /**
   * Gọi đúng một lần khi chuỗi nói xong, hoặc khi bị một say()/sayThen() khác chen vào
   * (phần còn lại của chuỗi bị bỏ). KHÔNG gọi nếu trò tự huỷ bằng hàm trả về.
   */
  onDone?(): void;
}

export interface Speaker {
  say(key: string): void;
  /**
   * Nói lần lượt các key, key sau chỉ bắt đầu khi tiếng trước phát hết (tiếng kêu thật dài
   * 1–2,6s không còn bị câu kế cắt ngang). Trả về hàm huỷ (gọi khi unmount). Trò nên gọi qua
   * hàm `sayThen(speaker, ...)` bên dưới để loa giả trong test vẫn chạy được bằng hẹn giờ.
   */
  sayThen?(keys: readonly string[], opts?: SayThenOptions): () => void;
  sfx(name: string): void;
  /**
   * Phát một nốt nhạc (file sfx) theo nhịp: không cắt lời đang nói của say(); nốt trước
   * tắt dần nhanh (NOTE_FADE_MS) để các nốt nối nhau mượt mà không dồn thành tiếng ồn.
   */
  note?(name: string): void;
}

export const NOTE_FADE_MS = 150;

/** Hẹn giờ an toàn cho một bước của sayThen khi file chưa tải xong / không tải được / âm thanh bị khoá. */
export const SAY_STEP_MAX_MS = 6000;
/** Dư ra sau độ dài file (đã biết) trước khi coi như sự kiện kết thúc bị lỡ. */
export const SAY_END_SLACK_MS = 600;
/** Độ dài một bước khi loa không báo được lúc hết tiếng và trò không truyền fallbackMs. */
export const SAY_FALLBACK_MS = 2000;

/**
 * Nói nối tiếp: dùng speaker.sayThen nếu loa có (loa thật), không thì hẹn giờ fallbackMs giữa
 * các key (loa giả trong test). Trả về hàm huỷ; nhớ gọi khi trò unmount.
 */
export function sayThen(speaker: Speaker, keys: readonly string[], opts: SayThenOptions = {}): () => void {
  if (speaker.sayThen) return speaker.sayThen(keys, opts);
  const step = opts.fallbackMs ?? SAY_FALLBACK_MS;
  const timers: ReturnType<typeof setTimeout>[] = [];
  keys.forEach((key, i) => {
    const run = () => {
      speaker.say(key);
      opts.onSay?.(key, i);
    };
    if (i === 0) run();
    else timers.push(setTimeout(run, i * step));
  });
  timers.push(setTimeout(() => opts.onDone?.(), keys.length * step));
  return () => timers.forEach(clearTimeout);
}

/** Chế độ nhẹ nhàng: âm lượng tổng (Howler) và tốc độ giọng đọc. */
export const CALM_VOLUME = 0.6;
export const CALM_SPEECH_RATE = 0.9;

/** Đặt âm lượng tổng cho mọi tiếng của app (giọng đọc, sfx, nốt nhạc) theo chế độ nhẹ nhàng. */
export function applyCalmVolume(calm: boolean): void {
  Howler.volume(calm ? CALM_VOLUME : 1);
}

/**
 * getName: id tên bạn đồng hành đang dùng; câu có {name} phát file của tên đó.
 * getRate: tốc độ giọng đọc (1 = bình thường; chế độ nhẹ nhàng dùng CALM_SPEECH_RATE).
 */
export function createSpeaker(
  getLang: () => Lang,
  base = BASE,
  getName: () => string = () => DEFAULT_NAME_ID,
  namedKeys: ReadonlySet<string> = NAMED_KEYS,
  getRate: () => number = () => 1,
): Speaker {
  const cache = new Map<string, Howl>();
  let current: Howl | null = null;
  let lastNote: { h: Howl; id: number } | null = null;
  const get = (src: string) => {
    let h = cache.get(src);
    if (!h) {
      h = new Howl({ src: [src] });
      cache.set(src, h);
    }
    return h;
  };
  /** Chuỗi sayThen đang chạy: `cut` dừng chuỗi; có báo onDone hay không tuỳ ai dừng. */
  let chain: { cut(notify: boolean): void } | null = null;
  const speak = (key: string): { h: Howl; id: number } => {
    current?.stop();
    const h = get(speechUrl(key, getLang(), base, getName(), namedKeys));
    current = h;
    h.rate(getRate());
    return { h, id: h.play() };
  };
  return {
    say(key) {
      const interrupted = chain;
      chain = null;
      speak(key);
      // báo sau khi tiếng mới đã phát: trò biết chuỗi cũ kết thúc (không kẹt chờ onDone)
      interrupted?.cut(true);
    },
    sayThen(keys, opts = {}) {
      const interrupted = chain;
      chain = null;
      let dead = false;
      let i = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let unlisten: (() => void) | null = null;
      const release = () => {
        clearTimeout(timer);
        unlisten?.();
        unlisten = null;
      };
      const me = {
        cut(notify: boolean) {
          if (dead) return;
          dead = true;
          release();
          if (chain === me) chain = null;
          if (notify) opts.onDone?.();
        },
      };
      const step = () => {
        if (dead) return;
        if (i >= keys.length) {
          me.cut(true);
          return;
        }
        const index = i++;
        const key = keys[index];
        const { h, id } = speak(key);
        let moved = false;
        const next = () => {
          if (dead || moved) return;
          moved = true;
          release();
          const gap = opts.gapMs ?? 0;
          if (i >= keys.length || gap <= 0) step();
          else timer = setTimeout(step, gap);
        };
        // đường lui: file chưa tải / hỏng / âm thanh bị khoá thì vẫn đi tiếp sau SAY_STEP_MAX_MS;
        // khi tiếng thật sự bắt đầu thì hẹn lại theo đúng độ dài file
        const arm = (ms: number) => {
          clearTimeout(timer);
          timer = setTimeout(next, ms);
        };
        const byLength = () => {
          const d = h.duration();
          if (d > 0) arm((d * 1000) / (getRate() || 1) + SAY_END_SLACK_MS);
        };
        h.once('end', next, id);
        h.once('play', byLength, id);
        h.once('loaderror', next);
        h.once('playerror', next);
        unlisten = () => {
          h.off('end', next, id);
          h.off('play', byLength, id);
          h.off('loaderror', next);
          h.off('playerror', next);
        };
        arm(SAY_STEP_MAX_MS);
        if (h.state() === 'loaded') byLength();
        opts.onSay?.(key, index);
      };
      chain = me;
      step();
      interrupted?.cut(true);
      return () => me.cut(false);
    },
    sfx(name) {
      get(sfxUrl(name, base)).play();
    },
    note(name) {
      if (lastNote) {
        const { h, id } = lastNote;
        h.fade(1, 0, NOTE_FADE_MS, id);
        setTimeout(() => h.stop(id), NOTE_FADE_MS);
      }
      const h = get(sfxUrl(name, base));
      const id = h.play();
      h.volume(1, id);
      lastNote = { h, id };
    },
  };
}

/**
 * iPhone/iPad: Web Audio mặc định theo nút gạt im lặng (gạt im lặng là mất hết tiếng).
 * Khai báo phiên "playback" (Safari 16.4+) để app kêu như trình phát nhạc. Trình duyệt khác bỏ qua.
 */
export function preferPlaybackAudioSession(nav: Navigator = navigator): void {
  const session = (nav as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) {
    try { session.type = 'playback'; } catch { /* trình duyệt không cho đổi: bỏ qua */ }
  }
}

/**
 * iOS Safari chỉ mở khóa Web Audio trong một cử chỉ người dùng (touchend/click).
 * Thử ở mọi cử chỉ cho tới khi AudioContext thật sự chạy (lần chạm đầu có thể đến trước khi Howler
 * tạo AudioContext, hoặc iOS để ở trạng thái "interrupted" sau cuộc gọi/khóa màn hình).
 */
export function unlockAudioOnFirstGesture(): () => void {
  preferPlaybackAudioSession();
  const events = ['touchend', 'click', 'pointerup', 'keydown'] as const;
  const remove = () => events.forEach((e) => window.removeEventListener(e, unlock));
  function unlock() {
    if (!Howler.ctx) Howler.volume(); // buộc Howler tạo AudioContext ngay trong cử chỉ
    const ctx = Howler.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') {
      const resumed = ctx.resume();
      try {
        // phát 1 mẫu im lặng: cách chắc chắn nhất để iOS mở khóa
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* môi trường không đủ Web Audio: resume() là đủ */ }
      void Promise.resolve(resumed).then(() => { if (ctx.state === 'running') remove(); });
    } else {
      remove();
    }
  }
  events.forEach((e) => window.addEventListener(e, unlock));
  // quay lại app sau khi khóa màn hình: iOS treo AudioContext, cần mở lại ở lần chạm sau
  const onVisible = () => {
    if (document.visibilityState === 'visible' && Howler.ctx && Howler.ctx.state !== 'running') {
      events.forEach((e) => window.addEventListener(e, unlock));
    }
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => { remove(); document.removeEventListener('visibilitychange', onVisible); };
}
