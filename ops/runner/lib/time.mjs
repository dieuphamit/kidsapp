const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function deadlineFrom(now, hhmm) {
  const m = typeof hhmm === 'string' ? hhmm.match(HHMM) : null;
  if (!m) throw new Error(`giờ dừng không hợp lệ: ${JSON.stringify(hhmm)} (cần dạng HH:MM, 00:00–23:59)`);
  const d = new Date(now);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

export function localDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT_WAIT_MS = 30 * 60_000;
// giờ reset đã qua (hoặc đoán sai) thì vẫn ngủ ít nhất 1 phút, tránh vòng lặp bận
const MIN_WAIT_MS = 60_000;

export async function sleepUntil(resetAtMs, deadline, now = Date.now, sleep = realSleep) {
  const t = now();
  const wanted = Math.max(resetAtMs ?? t + DEFAULT_WAIT_MS, t + MIN_WAIT_MS);
  const target = Math.min(wanted, deadline.getTime());
  await sleep(Math.max(0, target - t));
}
