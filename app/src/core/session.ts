export interface Session {
  startedAt: number;
  limitMs: number;
}

export function startSession(now: number, minutes: number): Session {
  return { startedAt: now, limitMs: minutes * 60_000 };
}

export function remainingMs(s: Session, now: number): number {
  return Math.max(0, s.startedAt + s.limitMs - now);
}

export function isOver(s: Session, now: number): boolean {
  return remainingMs(s, now) === 0;
}

const LOCK_KEY = 'behoc.locked';

export function readLocked(): boolean {
  try { return localStorage.getItem(LOCK_KEY) === '1'; } catch { return false; }
}

export function writeLocked(locked: boolean): void {
  try {
    if (locked) localStorage.setItem(LOCK_KEY, '1');
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* Safari chế độ riêng tư: bỏ qua, khóa chỉ còn trong phiên hiện tại */
  }
}
