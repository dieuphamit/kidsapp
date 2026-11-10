import { describe, it, expect, beforeEach } from 'vitest';
import { startSession, isOver, remainingMs, readLocked, writeLocked } from './session';

describe('session', () => {
  beforeEach(() => localStorage.clear());
  it('hết giờ đúng sau N phút', () => {
    const s = startSession(1_000, 15);
    expect(isOver(s, 1_000 + 15 * 60_000 - 1)).toBe(false);
    expect(isOver(s, 1_000 + 15 * 60_000)).toBe(true);
    expect(remainingMs(s, 1_000 + 60_000)).toBe(14 * 60_000);
    expect(remainingMs(s, 99_999_999)).toBe(0);
  });
  it('trạng thái khóa còn sau khi tải lại', () => {
    expect(readLocked()).toBe(false);
    writeLocked(true);
    expect(readLocked()).toBe(true);
    writeLocked(false);
    expect(readLocked()).toBe(false);
  });
});
