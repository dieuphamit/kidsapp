import { describe, it, expect } from 'vitest';
import { set } from 'idb-keyval';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';
import { DEFAULT_BUDDY } from './buddy';

const buddy = DEFAULT_BUDDY;

describe('settings', () => {
  it('mặc định khi chưa lưu', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map', buddy: { character: 'cat', name: 'dau' } });
  });
  it('lưu rồi đọc lại', async () => {
    await saveSettings({ lang: 'ja', ageMonths: 30, sessionMinutes: 10, menuStyle: 'shelf', buddy });
    expect(await loadSettings()).toEqual({ lang: 'ja', ageMonths: 30, sessionMinutes: 10, menuStyle: 'shelf', buddy });
  });
  it('lưu tiếng Anh rồi đọc lại', async () => {
    await saveSettings({ lang: 'en', ageMonths: 36, sessionMinutes: 15, menuStyle: 'map', buddy });
    expect((await loadSettings()).lang).toBe('en');
  });
  it('bản lưu cũ không có menuStyle thì ra kiểu bản đồ', async () => {
    await set('behoc.settings', { lang: 'ja', ageMonths: 40, sessionMinutes: 20 });
    expect(await loadSettings()).toEqual({ lang: 'ja', ageMonths: 40, sessionMinutes: 20, menuStyle: 'map', buddy });
  });
  it('giá trị menuStyle lạ thì về kiểu bản đồ', async () => {
    await set('behoc.settings', { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'grid' });
    expect((await loadSettings()).menuStyle).toBe('map');
  });
  it('bản lưu cũ không có games thì mọi trò mặc định (không thêm games)', async () => {
    await set('behoc.settings', { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map' });
    expect((await loadSettings()).games).toBeUndefined();
  });
  it('games sai kiểu hoặc mục sai thì được vá', async () => {
    await set('behoc.settings', { ...DEFAULT_SETTINGS, games: { memory: { enabled: 'x', difficulty: 'hard' }, hide: null } });
    expect((await loadSettings()).games).toEqual({
      memory: { enabled: true, difficulty: 'hard', topic: 'mix' },
      hide: { enabled: true, difficulty: 'auto', topic: 'mix' },
    });
    await set('behoc.settings', { ...DEFAULT_SETTINGS, games: 'oops' });
    expect((await loadSettings()).games).toEqual({});
  });
  it('lưu rồi đọc lại tùy chọn trò', async () => {
    const games = { memory: { enabled: false, difficulty: 'easy', topic: 'fruits' } } as const;
    await saveSettings({ ...DEFAULT_SETTINGS, games: { ...games } });
    expect((await loadSettings()).games).toEqual(games);
  });
  it('bản lưu cũ không có buddy thì về mèo + Đậu Đậu', async () => {
    await set('behoc.settings', { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map' });
    expect((await loadSettings()).buddy).toEqual({ character: 'cat', name: 'dau' });
  });
  it('buddy sai thì vá từng phần, đúng thì giữ', async () => {
    await set('behoc.settings', { ...DEFAULT_SETTINGS, buddy: { character: 'dragon', name: 'mimi' } });
    expect((await loadSettings()).buddy).toEqual({ character: 'cat', name: 'mimi' });
    await set('behoc.settings', { ...DEFAULT_SETTINGS, buddy: { character: 'bunny', name: 42 } });
    expect((await loadSettings()).buddy).toEqual({ character: 'bunny', name: 'dau' });
    await set('behoc.settings', { ...DEFAULT_SETTINGS, buddy: 'oops' });
    expect((await loadSettings()).buddy).toEqual(DEFAULT_BUDDY);
  });
  it('lưu rồi đọc lại bạn đồng hành', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, buddy: { character: 'bear', name: 'tom' } });
    expect((await loadSettings()).buddy).toEqual({ character: 'bear', name: 'tom' });
  });
});
