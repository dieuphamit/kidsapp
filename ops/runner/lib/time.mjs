export function deadlineFrom(now, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

export function localDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sleepUntil(resetAtMs, deadline, now = Date.now, sleep = realSleep) {
  const target = Math.min(resetAtMs ?? now() + 30 * 60_000, deadline.getTime());
  await sleep(Math.max(0, target - now()));
}
