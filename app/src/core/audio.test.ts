import { describe, it, expect, vi, beforeEach } from 'vitest';

const { play, stop, Howl } = vi.hoisted(() => {
  const play = vi.fn();
  const stop = vi.fn();
  const Howl = vi.fn(function () { return { play, stop }; });
  return { play, stop, Howl };
});
vi.mock('howler', () => ({ Howl }));

import { audioUrl, sfxUrl, createSpeaker } from './audio';

describe('audio', () => {
  beforeEach(() => { Howl.mockClear(); play.mockClear(); stop.mockClear(); });
  it('URL theo ngôn ngữ', () => {
    expect(audioUrl('animal.cow', 'ja', '/be-hoc/')).toBe('/be-hoc/audio/ja/animal.cow.mp3');
    expect(sfxUrl('cow', '/be-hoc/')).toBe('/be-hoc/audio/sfx/cow.mp3');
  });
  it('say() phát đúng file của ngôn ngữ hiện tại, cache Howl', () => {
    let lang: 'vi' | 'ja' = 'vi';
    const sp = createSpeaker(() => lang, '/b/');
    sp.say('ui.great');
    sp.say('ui.great');
    expect(Howl).toHaveBeenCalledTimes(1);
    expect(Howl).toHaveBeenCalledWith({ src: ['/b/audio/vi/ui.great.mp3'] });
    expect(play).toHaveBeenCalledTimes(2);
    lang = 'ja';
    sp.say('ui.great');
    expect(Howl).toHaveBeenLastCalledWith({ src: ['/b/audio/ja/ui.great.mp3'] });
  });
  it('say() dừng câu đang nói trước khi nói câu mới', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    sp.say('ui.hello');
    sp.say('ui.great');
    expect(stop).toHaveBeenCalled();
  });
});
