import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => {
    store.set(k, v);
  }),
}));

import { get, set } from 'idb-keyval';
import { ART_KEY, cleanArt, loadArt, saveArt, withFills } from './store';

describe('lưu tranh đã tô', () => {
  beforeEach(() => {
    store.clear();
    vi.mocked(get).mockClear();
    vi.mocked(set).mockClear();
  });

  it('chưa tô gì thì rỗng', async () => {
    expect(await loadArt()).toEqual({});
  });

  it('lưu rồi đọc lại bằng key behoc.coloring', async () => {
    await saveArt({ pig: { head: 'pink', snout: 'rainbow' } });
    expect(set).toHaveBeenCalledWith(ART_KEY, { pig: { head: 'pink', snout: 'rainbow' } });
    expect(ART_KEY).toBe('behoc.coloring');
    expect(await loadArt()).toEqual({ pig: { head: 'pink', snout: 'rainbow' } });
  });

  it('bỏ phần hỏng: màu lạ, kiểu sai, tranh rỗng', () => {
    expect(cleanArt(null)).toEqual({});
    expect(cleanArt([1, 2])).toEqual({});
    expect(cleanArt({ pig: { head: 'pink', ear: 'magenta', x: 3 }, car: 'red', bus: { body: 'nope' } })).toEqual({
      pig: { head: 'pink' },
    });
  });

  it('idb lỗi thì không ném lỗi', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('blocked'));
    vi.mocked(set).mockRejectedValueOnce(new Error('blocked'));
    expect(await loadArt()).toEqual({});
    await expect(saveArt({})).resolves.toBeUndefined();
  });

  it('withFills ghi đè một tranh, tranh trống thì bỏ', () => {
    const a = withFills({ pig: { head: 'red' } }, 'car', { body: 'blue' });
    expect(a).toEqual({ pig: { head: 'red' }, car: { body: 'blue' } });
    expect(withFills(a, 'pig', {})).toEqual({ car: { body: 'blue' } });
  });
});
