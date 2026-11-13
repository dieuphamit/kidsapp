import { LANGS } from './i18n';
import { DEFAULT_NAME_ID } from './buddy';
import { NAMED_KEYS } from './content';
import { namedAudioUrl } from './audio';

/**
 * Giọng đọc theo tên bạn đồng hành không nằm hết trong precache: 8 tên × ~57 câu × 3 ngôn ngữ
 * thêm ~22MB. Precache chỉ có bộ của tên mặc định (đường dẫn thường); bộ của tên khác
 * (`<key>~<nameId>.mp3`) được service worker phục vụ CacheFirst từ cache này (vite.config.ts),
 * và app nạp sẵn cả bộ của tên đang chọn vào đây để chạy offline. Tên cũ bị xoá khỏi cache.
 */
export const BUDDY_AUDIO_CACHE = 'buddy-audio';

/** Mọi file giọng đọc có tên cho một tên (cả ba ngôn ngữ). Tên mặc định: rỗng (đã precache). */
export function buddyAudioUrls(nameId: string, base = import.meta.env.BASE_URL, keys: Iterable<string> = NAMED_KEYS): string[] {
  if (nameId === DEFAULT_NAME_ID) return [];
  const urls: string[] = [];
  for (const key of keys) for (const lang of LANGS) urls.push(namedAudioUrl(key, lang, nameId, base));
  return urls;
}

let runId = 0;

/**
 * Nạp sẵn bộ giọng đọc của tên đang chọn vào cache, bỏ file của tên khác.
 * Tải từ chính app (cùng origin, như precache), không gọi dịch vụ ngoài. Lỗi (offline, không có
 * Cache API) thì bỏ qua: lần sau mở app có mạng sẽ nạp tiếp.
 */
export async function cacheBuddyAudio(
  nameId: string,
  base = import.meta.env.BASE_URL,
  cacheStorage: CacheStorage | undefined = globalThis.caches,
  keys: Iterable<string> = NAMED_KEYS,
): Promise<void> {
  if (!cacheStorage) return;
  const run = ++runId; // bố mẹ đổi tên liên tục: lượt cũ dừng, không nạp lại tên đã bỏ
  try {
    const want = buddyAudioUrls(nameId, base, keys);
    if (want.length === 0) {
      await cacheStorage.delete(BUDDY_AUDIO_CACHE);
      return;
    }
    const cache = await cacheStorage.open(BUDDY_AUDIO_CACHE);
    const wantPaths = new Set(want.map((u) => new URL(u, location.href).pathname));
    const have = new Set<string>();
    for (const req of await cache.keys()) {
      const path = new URL(req.url).pathname;
      if (wantPaths.has(path)) have.add(path);
      else await cache.delete(req);
    }
    for (const url of want) {
      if (run !== runId) return;
      if (!have.has(new URL(url, location.href).pathname)) await cache.add(url);
    }
  } catch {
    /* offline hoặc trình duyệt chặn Cache API: thử lại lần sau */
  }
}
