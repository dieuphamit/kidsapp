import { get, update } from 'idb-keyval';
import { SKILLS, skillsOf, type Skill } from './skills';

/**
 * Thời gian chơi từng trò theo ngày, chỉ lưu trên máy (IndexedDB), không gửi đi đâu.
 * Dạng: { '2026-11-19': { counting: 125000, zoo: 60000 } } (mili giây).
 */
export type PlayLog = Record<string, Record<string, number>>;

const KEY = 'behoc.playtime';
/** Giữ log bao nhiêu ngày (đủ cho thống kê 7 ngày, không phình mãi). */
export const KEEP_DAYS = 35;
/** Ghi xuống IndexedDB định kỳ để đóng app giữa chừng không mất nhiều. */
export const FLUSH_MS = 30_000;
/** Một đoạn đo dài hơn chừng này thì coi như máy ngủ / treo tab: chỉ tính tối đa từng này. */
export const MAX_SEGMENT_MS = 2 * 60_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Ngày theo giờ máy, dạng YYYY-MM-DD. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** n ngày gần nhất tính cả hôm nay, cũ nhất trước. */
export function lastDays(now: number, n = 7): string[] {
  const d = new Date(now);
  return Array.from({ length: n }, (_, i) => dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (n - 1 - i), 12).getTime()));
}

/** Cộng thêm ms chơi trò gameId vào ngày của `now`; bỏ ngày quá KEEP_DAYS. Không sửa log cũ. */
export function addPlay(log: PlayLog, gameId: string, ms: number, now: number): PlayLog {
  if (!(ms > 0)) return log;
  const day = dayKey(now);
  const oldest = lastDays(now, KEEP_DAYS)[0];
  const next: PlayLog = {};
  // YYYY-MM-DD so sánh chuỗi đúng thứ tự ngày; ngày "tương lai" (đổi giờ máy) vẫn giữ
  for (const [k, v] of Object.entries(log)) if (k >= oldest) next[k] = v;
  const today = { ...(next[day] ?? {}) };
  today[gameId] = (today[gameId] ?? 0) + Math.round(ms);
  next[day] = today;
  return next;
}

/** Tổng ms từng trò trong 7 ngày gần nhất. */
export function weeklyByGame(log: PlayLog, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of lastDays(now, 7)) {
    for (const [id, ms] of Object.entries(log[day] ?? {})) {
      if (typeof ms === 'number' && ms > 0) out[id] = (out[id] ?? 0) + ms;
    }
  }
  return out;
}

/**
 * Tổng ms từng kỹ năng trong 7 ngày: trò rèn nhiều kỹ năng thì thời gian tính cho mỗi kỹ năng đó
 * (bé chơi Xếp vào giỏ 10 phút là 10 phút Logic và 10 phút Toán).
 */
export function weeklyBySkill(log: PlayLog, now: number): Record<Skill, number> {
  const out = Object.fromEntries(SKILLS.map((s) => [s, 0])) as Record<Skill, number>;
  for (const [id, ms] of Object.entries(weeklyByGame(log, now))) {
    for (const s of skillsOf(id)) out[s] += ms;
  }
  return out;
}

/** Tổng ms chơi (mọi trò) trong 7 ngày. */
export function weeklyTotal(log: PlayLog, now: number): number {
  return Object.values(weeklyByGame(log, now)).reduce((a, b) => a + b, 0);
}

/** Phút làm tròn để hiện cho bố mẹ (có chơi mà chưa tới 1 phút thì vẫn là 1). */
export function toMinutes(ms: number): number {
  return ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60_000));
}

function sanitize(raw: unknown): PlayLog {
  if (!raw || typeof raw !== 'object') return {};
  const out: PlayLog = {};
  for (const [day, games] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !games || typeof games !== 'object') continue;
    const g: Record<string, number> = {};
    for (const [id, ms] of Object.entries(games as Record<string, unknown>)) {
      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) g[id] = ms;
    }
    out[day] = g;
  }
  return out;
}

export async function loadPlayLog(): Promise<PlayLog> {
  try {
    return sanitize(await get<unknown>(KEY));
  } catch {
    return {};
  }
}

/** Ghi thêm thời gian chơi (đọc–sửa–ghi trong một giao dịch của idb-keyval). */
export async function recordPlay(gameId: string, ms: number, now = Date.now()): Promise<void> {
  if (!(ms > 0)) return;
  try {
    await update<unknown>(KEY, (old) => addPlay(sanitize(old), gameId, ms, now));
  } catch {
    // không ghi được (Safari riêng tư...) thì thống kê chỉ thiếu, app vẫn chạy
  }
}

/**
 * Bắt đầu đo thời gian bé chơi trò gameId; trả về hàm dừng (ghi phần còn lại).
 * Tab bị ẩn (khóa màn hình, chuyển app) thì ngưng đếm; đoạn đo bất thường dài thì kẹp MAX_SEGMENT_MS.
 */
export function trackPlay(
  gameId: string,
  record: (gameId: string, ms: number) => void = (id, ms) => void recordPlay(id, ms),
  clock: () => number = Date.now,
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): () => void {
  let since: number | null = doc?.visibilityState === 'hidden' ? null : clock();
  const flush = () => {
    if (since === null) return;
    const now = clock();
    const ms = Math.min(now - since, MAX_SEGMENT_MS);
    since = now;
    if (ms > 0) record(gameId, ms);
  };
  const onVisibility = () => {
    if (doc?.visibilityState === 'hidden') {
      flush();
      since = null;
    } else if (since === null) {
      since = clock();
    }
  };
  doc?.addEventListener('visibilitychange', onVisibility);
  const timer = setInterval(flush, FLUSH_MS);
  return () => {
    clearInterval(timer);
    doc?.removeEventListener('visibilitychange', onVisibility);
    flush();
    since = null;
  };
}
