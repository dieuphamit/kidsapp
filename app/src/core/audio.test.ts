import { describe, it, expect, vi, beforeEach } from 'vitest';

const { play, stop, fade, volume, Howl, Howler } = vi.hoisted(() => {
  let n = 0;
  const play = vi.fn(() => ++n);
  const stop = vi.fn();
  const fade = vi.fn();
  const volume = vi.fn();
  const Howl = vi.fn(function () { return { play, stop, fade, volume }; });
  const Howler = { ctx: { state: 'suspended', resume: vi.fn() } };
  return { play, stop, fade, volume, Howl, Howler };
});
vi.mock('howler', () => ({ Howl, Howler }));

import { audioUrl, sfxUrl, speechUrl, createSpeaker, unlockAudioOnFirstGesture, preferPlaybackAudioSession, NOTE_FADE_MS } from './audio';

describe('audio', () => {
  beforeEach(() => { Howl.mockClear(); play.mockClear(); stop.mockClear(); fade.mockClear(); volume.mockClear(); });
  it('note() không cắt lời đang nói; nốt trước tắt dần rồi mới dừng', () => {
    vi.useFakeTimers();
    try {
      const sp = createSpeaker(() => 'vi', '/b/');
      sp.say('band.fast');
      sp.note!('animal-dog');
      expect(Howl).toHaveBeenLastCalledWith({ src: ['/b/audio/sfx/animal-dog.mp3'] });
      expect(stop).not.toHaveBeenCalled();
      expect(fade).not.toHaveBeenCalled();
      const dogId = play.mock.results.at(-1)!.value as number;
      sp.note!('animal-cow');
      expect(fade).toHaveBeenCalledWith(1, 0, NOTE_FADE_MS, dogId);
      expect(stop).not.toHaveBeenCalled(); // nốt cũ còn kêu trong lúc tắt dần
      vi.advanceTimersByTime(NOTE_FADE_MS);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(stop).toHaveBeenCalledWith(dogId);
    } finally {
      vi.useRealTimers();
    }
  });
  it('URL theo ngôn ngữ', () => {
    expect(audioUrl('animal.cow', 'ja', '/be-hoc/')).toBe('/be-hoc/audio/ja/animal.cow.mp3');
    expect(audioUrl('animal.cow', 'en', '/be-hoc/')).toBe('/be-hoc/audio/en/animal.cow.mp3');
    expect(speechUrl('animal.cow-sound', 'en', '/be-hoc/')).toBe('/be-hoc/audio/sfx/animal-cow.mp3');
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
  it('animal.<id>-sound là tiếng kêu thật trong sfx, không theo ngôn ngữ', () => {
    expect(speechUrl('animal.cow-sound', 'vi', '/b/')).toBe('/b/audio/sfx/animal-cow.mp3');
    expect(speechUrl('animal.cow-sound', 'ja', '/b/')).toBe('/b/audio/sfx/animal-cow.mp3');
    expect(speechUrl('animal.cow', 'ja', '/b/')).toBe('/b/audio/ja/animal.cow.mp3');
    expect(speechUrl('game.sound-quiz', 'vi', '/b/')).toBe('/b/audio/vi/game.sound-quiz.mp3');
    let lang: 'vi' | 'ja' = 'vi';
    const sp = createSpeaker(() => lang, '/b/');
    sp.say('animal.lion-sound');
    lang = 'ja';
    sp.say('animal.lion-sound');
    expect(Howl).toHaveBeenCalledTimes(1);
    expect(Howl).toHaveBeenCalledWith({ src: ['/b/audio/sfx/animal-lion.mp3'] });
    expect(play).toHaveBeenCalledTimes(2);
  });
  it('say() dừng câu đang nói trước khi nói câu mới', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    sp.say('ui.hello');
    sp.say('ui.great');
    expect(stop).toHaveBeenCalled();
  });
  it('unlockAudioOnFirstGesture resume ở lần chạm đầu, gỡ listener khi AudioContext đã chạy', async () => {
    Howler.ctx.state = 'suspended';
    Howler.ctx.resume.mockReset();
    Howler.ctx.resume.mockImplementation(() => { Howler.ctx.state = 'running'; return Promise.resolve(); });
    const cleanup = unlockAudioOnFirstGesture();
    window.dispatchEvent(new Event('touchend'));
    await Promise.resolve(); await Promise.resolve();
    window.dispatchEvent(new Event('click'));
    expect(Howler.ctx.resume).toHaveBeenCalledTimes(1);
    cleanup();
  });
  it('unlockAudioOnFirstGesture thử lại ở lần chạm sau nếu iOS chưa mở khóa', async () => {
    Howler.ctx.state = 'suspended';
    Howler.ctx.resume.mockReset();
    Howler.ctx.resume.mockImplementation(() => Promise.resolve()); // vẫn suspended
    const cleanup = unlockAudioOnFirstGesture();
    window.dispatchEvent(new Event('touchend'));
    await Promise.resolve();
    window.dispatchEvent(new Event('touchend'));
    expect(Howler.ctx.resume).toHaveBeenCalledTimes(2);
    cleanup();
  });
  it('preferPlaybackAudioSession đặt audioSession.type = playback khi trình duyệt hỗ trợ', () => {
    const nav = { audioSession: { type: 'auto' } } as unknown as Navigator;
    preferPlaybackAudioSession(nav);
    expect((nav as unknown as { audioSession: { type: string } }).audioSession.type).toBe('playback');
    expect(() => preferPlaybackAudioSession({} as Navigator)).not.toThrow();
  });
  it('cleanup gỡ listener trước khi có chạm', () => {
    Howler.ctx.resume.mockClear();
    unlockAudioOnFirstGesture()();
    window.dispatchEvent(new Event('click'));
    expect(Howler.ctx.resume).not.toHaveBeenCalled();
  });
});
