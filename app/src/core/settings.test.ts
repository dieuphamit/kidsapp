import { describe, it, expect } from 'vitest';
import { set } from 'idb-keyval';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('settings', () => {
  it('mặc định khi chưa lưu', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map' });
  });
  it('lưu rồi đọc lại', async () => {
    await saveSettings({ lang: 'ja', ageMonths: 30, sessionMinutes: 10, menuStyle: 'shelf' });
    expect(await loadSettings()).toEqual({ lang: 'ja', ageMonths: 30, sessionMinutes: 10, menuStyle: 'shelf' });
  });
  it('bản lưu cũ không có menuStyle thì ra kiểu bản đồ', async () => {
    await set('behoc.settings', { lang: 'ja', ageMonths: 40, sessionMinutes: 20 });
    expect(await loadSettings()).toEqual({ lang: 'ja', ageMonths: 40, sessionMinutes: 20, menuStyle: 'map' });
  });
  it('giá trị menuStyle lạ thì về kiểu bản đồ', async () => {
    await set('behoc.settings', { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'grid' });
    expect((await loadSettings()).menuStyle).toBe('map');
  });
});
