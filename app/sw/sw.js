/* Service worker của Bé Học (vite-plugin-pwa, strategies: 'injectManifest').
 *
 * Vì sao không dùng generateSW (Workbox) như trước: Workbox tải precache TUẦN TỰ từng file
 * (PrecacheController.install, "Cache entries one at a time"). App có ~2700 file (giọng đọc vi/ja/en,
 * ảnh, model 3D) nên lần cài đầu mất vài phút; bố mẹ mở app rồi tắt sớm thì app chưa chạy được offline,
 * và e2e "chạy offline sau lần tải đầu" hết giờ khi máy bận. Ở đây tải song song có giới hạn
 * (PARALLEL yêu cầu cùng lúc), vẫn đủ mọi file: cài xong là cả app chạy offline.
 *
 * Giữ nguyên hành vi cũ của bản Workbox:
 * - skipWaiting + clients.claim (registerType 'autoUpdate');
 * - file đã có trong cache với đúng revision thì không tải lại (cập nhật chỉ tải file đổi);
 * - dọn file cũ không còn trong danh sách khi kích hoạt;
 * - điều hướng (mở trang, tải lại, ?menu=...) luôn trả index.html đã cache;
 * - giọng đọc theo tên bạn đồng hành (audio/<lang>/<key>~<tên>.mp3) không precache, phục vụ
 *   CacheFirst từ cache 'buddy-audio' (src/core/buddyAudio.ts nạp sẵn vào đó).
 */

const PRECACHE = 'behoc-precache-v1';
const BUDDY_AUDIO = 'buddy-audio';
/** Số yêu cầu tải cùng lúc lúc cài: đủ nhanh mà không làm nghẽn mạng/máy chủ tĩnh. */
const PARALLEL = 12;
/** Một file lỗi mạng thì thử lại chừng này lần trước khi coi như cài hỏng. */
const RETRIES = 3;

/** Danh sách precache do vite-plugin-pwa chèn vào: [{ url, revision }]. */
const MANIFEST = self.__WB_MANIFEST;

/** Khoá cache của một file: URL tuyệt đối kèm revision (đổi revision là khoá mới, file mới). */
function cacheKey(entry) {
  const u = new URL(entry.url, self.registration.scope);
  if (entry.revision) u.searchParams.set('__rev', entry.revision);
  return u.href;
}

/** URL (không query, không hash) → khoá cache tương ứng. */
const KEYS = new Map(MANIFEST.map((e) => [new URL(e.url, self.registration.scope).href, cacheKey(e)]));
const INDEX_KEY = KEYS.get(new URL('index.html', self.registration.scope).href);

async function fetchAndPut(cache, entry) {
  const key = cacheKey(entry);
  let last;
  for (let i = 0; i < RETRIES; i++) {
    try {
      // 'reload': bỏ qua cache HTTP để chắc chắn lấy đúng bản của revision này
      const res = await fetch(new URL(entry.url, self.registration.scope).href, { cache: 'reload', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`${res.status} ${entry.url}`);
      await cache.put(key, res);
      return;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      const have = new Set((await cache.keys()).map((r) => r.url));
      const todo = MANIFEST.filter((e) => !have.has(cacheKey(e)));
      let next = 0;
      const worker = async () => {
        while (next < todo.length) await fetchAndPut(cache, todo[next++]);
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(KEYS.values());
      const cache = await caches.open(PRECACHE);
      await Promise.all((await cache.keys()).filter((r) => !keep.has(r.url)).map((r) => cache.delete(r)));
      // cache của bản Workbox cũ (máy đã cài app trước bản này): bỏ đi, mọi file đã có trong PRECACHE
      for (const name of await caches.keys()) if (name.startsWith('workbox-precache')) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

/** Giọng đọc theo tên bạn đồng hành khác tên mặc định. */
const BUDDY_AUDIO_RE = /\/audio\/[a-z]+\/[^/]+~[a-z0-9]+\.mp3$/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' && INDEX_KEY) {
    event.respondWith(caches.match(INDEX_KEY).then((hit) => hit ?? fetch(req)));
    return;
  }

  const key = KEYS.get(url.origin + url.pathname);
  if (key) {
    event.respondWith(caches.match(key).then((hit) => hit ?? fetch(req)));
    return;
  }

  if (BUDDY_AUDIO_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(BUDDY_AUDIO);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      })(),
    );
  }
});
