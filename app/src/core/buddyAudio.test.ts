import { describe, it, expect, vi } from 'vitest';
import { buddyAudioUrls, cacheBuddyAudio, BUDDY_AUDIO_CACHE } from './buddyAudio';

/** CacheStorage giả: một cache, lưu theo URL tuyệt đối. */
function fakeCaches(initial: string[] = []) {
  const store = new Set(initial.map((u) => new URL(u, location.href).href));
  const cache = {
    keys: vi.fn(async () => [...store].map((url) => ({ url }) as Request)),
    delete: vi.fn(async (req: Request) => store.delete(req.url)),
    add: vi.fn(async (url: string) => { store.add(new URL(url, location.href).href); }),
  };
  const storage = {
    open: vi.fn(async () => cache),
    delete: vi.fn(async () => true),
  };
  return { storage: storage as unknown as CacheStorage, cache, store, raw: storage };
}

const KEYS = ['hide.hello', 'ui.hello'];

describe('buddyAudio', () => {
  it('tên mặc định không cần tải thêm (đã precache)', () => {
    expect(buddyAudioUrls('dau', '/k/', KEYS)).toEqual([]);
  });
  it('mỗi câu có tên × 3 ngôn ngữ, file <key>~<nameId>.mp3', () => {
    const urls = buddyAudioUrls('mimi', '/k/', KEYS);
    expect(urls).toHaveLength(6);
    expect(urls).toContain('/k/audio/vi/hide.hello~mimi.mp3');
    expect(urls).toContain('/k/audio/ja/ui.hello~mimi.mp3');
    expect(urls).toContain('/k/audio/en/hide.hello~mimi.mp3');
  });
  it('nạp bộ của tên đang chọn, xoá file của tên cũ, không tải lại file đã có', async () => {
    const f = fakeCaches(['/k/audio/vi/hide.hello~tom.mp3', '/k/audio/vi/hide.hello~mimi.mp3']);
    await cacheBuddyAudio('mimi', '/k/', f.storage, KEYS);
    expect(f.raw.open).toHaveBeenCalledWith(BUDDY_AUDIO_CACHE);
    expect(f.cache.add).toHaveBeenCalledTimes(5);
    expect([...f.store].every((u) => u.includes('~mimi.mp3'))).toBe(true);
    expect(f.store.size).toBe(6);
  });
  it('về tên mặc định thì xoá hẳn cache tên', async () => {
    const f = fakeCaches();
    await cacheBuddyAudio('dau', '/k/', f.storage, KEYS);
    expect(f.raw.delete).toHaveBeenCalledWith(BUDDY_AUDIO_CACHE);
    expect(f.raw.open).not.toHaveBeenCalled();
  });
  it('offline/lỗi mạng: bỏ qua, không ném lỗi', async () => {
    const f = fakeCaches();
    f.cache.add.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(cacheBuddyAudio('kiki', '/k/', f.storage, KEYS)).resolves.toBeUndefined();
    await expect(cacheBuddyAudio('kiki', '/k/', undefined, KEYS)).resolves.toBeUndefined();
  });
});
