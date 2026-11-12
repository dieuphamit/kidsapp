import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => {
    store.set(k, v);
  }),
}));

import { get, set } from 'idb-keyval';
import { loadLastGame, saveLastGame } from './lastGame';

describe('lastGame', () => {
  beforeEach(() => {
    store.clear();
    vi.mocked(get).mockClear();
    vi.mocked(set).mockClear();
  });

  it('chưa chơi trò nào thì trả null', async () => {
    expect(await loadLastGame()).toBeNull();
  });

  it('lưu rồi đọc lại bằng key behoc.last-game', async () => {
    await saveLastGame('memory');
    expect(set).toHaveBeenCalledWith('behoc.last-game', 'memory');
    expect(await loadLastGame()).toBe('memory');
    expect(get).toHaveBeenCalledWith('behoc.last-game');
  });

  it('giá trị hỏng thì trả null', async () => {
    store.set('behoc.last-game', 42);
    expect(await loadLastGame()).toBeNull();
  });

  it('idb lỗi thì không ném lỗi', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('blocked'));
    vi.mocked(set).mockRejectedValueOnce(new Error('blocked'));
    expect(await loadLastGame()).toBeNull();
    await expect(saveLastGame('music')).resolves.toBeUndefined();
  });
});
