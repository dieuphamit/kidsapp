import { describe, it, expect } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('settings', () => {
  it('mặc định khi chưa lưu', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ lang: 'vi', ageMonths: 28, sessionMinutes: 15 });
  });
  it('lưu rồi đọc lại', async () => {
    await saveSettings({ lang: 'ja', ageMonths: 30, sessionMinutes: 10 });
    expect(await loadSettings()).toEqual({ lang: 'ja', ageMonths: 30, sessionMinutes: 10 });
  });
});
