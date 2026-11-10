import { Howl, Howler } from 'howler';
import type { Lang } from './i18n';

const BASE = import.meta.env.BASE_URL;

export function audioUrl(key: string, lang: Lang, base = BASE): string {
  return `${base}audio/${lang}/${key}.mp3`;
}

export function sfxUrl(name: string, base = BASE): string {
  return `${base}audio/sfx/${name}.mp3`;
}

export interface Speaker {
  say(key: string): void;
  sfx(name: string): void;
}

export function createSpeaker(getLang: () => Lang, base = BASE): Speaker {
  const cache = new Map<string, Howl>();
  let current: Howl | null = null;
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
      current = get(audioUrl(key, getLang(), base));
      current.play();
    },
    sfx(name) {
      get(sfxUrl(name, base)).play();
    },
  };
}

/** iOS Safari chỉ mở khóa Web Audio ở touchend/click: resume AudioContext một lần rồi gỡ listener. */
export function unlockAudioOnFirstGesture(): () => void {
  const events = ['touchend', 'click'] as const;
  const remove = () => events.forEach((e) => window.removeEventListener(e, unlock));
  function unlock() {
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    remove();
  }
  events.forEach((e) => window.addEventListener(e, unlock));
  return remove;
}
