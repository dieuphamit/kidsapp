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

export interface Speaker {
  say(key: string): void;
  sfx(name: string): void;
  /**
   * Phát một nốt nhạc (file sfx) theo nhịp: không cắt lời đang nói của say(); nốt trước
   * tắt dần nhanh (NOTE_FADE_MS) để các nốt nối nhau mượt mà không dồn thành tiếng ồn.
   */
  note?(name: string): void;
}

export const NOTE_FADE_MS = 150;

/** getName: id tên bạn đồng hành đang dùng; câu có {name} phát file của tên đó. */
export function createSpeaker(
  getLang: () => Lang,
  base = BASE,
  getName: () => string = () => DEFAULT_NAME_ID,
  namedKeys: ReadonlySet<string> = NAMED_KEYS,
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
  return {
    say(key) {
      current?.stop();
      current = get(speechUrl(key, getLang(), base, getName(), namedKeys));
      current.play();
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
