import { describe, it, expect } from 'vitest';
import { arrived, createSwipe, DRAG_SLOP, dragEnd, dragMove, dragStart, go, mountedRange, PAGE_PX, settled, stepSwipe, visibleRange, type Swipe } from './swipe';

/** Kéo từ x0 tới x1 trong `ms` mili giây, chia đều các bước như ngón tay thật */
function drag(s: Swipe, x0: number, x1: number, ms = 300, steps = 10, holdMs = 0) {
  let t = 0;
  dragStart(s, x0, t);
  for (let i = 1; i <= steps; i++) {
    t += ms / steps / 1000;
    dragMove(s, x0 + ((x1 - x0) * i) / steps, t);
  }
  t += holdMs / 1000;
  return dragEnd(s, t);
}

function settle(s: Swipe, seconds = 3) {
  for (let i = 0; i < seconds * 60; i++) stepSwipe(s, 1 / 60);
}

describe('dải khu kéo ngang', () => {
  it('chạm (di chuyển ít hơn ngưỡng) không phải kéo, không đổi khu', () => {
    const s = createSwipe(5);
    dragStart(s, 500, 0);
    expect(dragMove(s, 500 + DRAG_SLOP - 1, 0.05)).toBe(false);
    expect(s.pos).toBe(0);
    expect(dragEnd(s, 0.1)).toBe(0);
    expect(s.moved).toBe(false);
  });

  it('kéo sang trái quá nửa khu thì sang khu kế, thả ra bám đúng khu', () => {
    const s = createSwipe(5);
    expect(drag(s, 900, 900 - PAGE_PX * 0.6, 600, 10, 200)).toBe(1);
    settle(s);
    expect(settled(s)).toBe(true);
    expect(s.pos).toBe(1);
  });

  it('kéo ngắn mà nhanh (quán tính) vẫn sang khu kế; kéo ngắn chậm thì quay về', () => {
    const fast = createSwipe(5, 2);
    expect(drag(fast, 700, 560, 90)).toBe(3);
    const slow = createSwipe(5, 2);
    expect(drag(slow, 700, 600, 900, 10, 300)).toBe(2);
    settle(slow);
    expect(slow.pos).toBe(2);
  });

  it('mỗi lần thả chỉ đi một khu, kể cả khi kéo rất xa', () => {
    const s = createSwipe(5, 1);
    expect(drag(s, 1100, -1500, 300)).toBe(2);
  });

  it('hai đầu dải: kéo quá thì bị ghì lại, thả ra nảy về, không vòng', () => {
    const s = createSwipe(5, 0);
    dragStart(s, 300, 0);
    dragMove(s, 300 + PAGE_PX, 0.3);
    expect(s.pos).toBeLessThan(0);
    expect(s.pos).toBeGreaterThan(-0.35); // ghì lại, chỉ đi ~1/4 quãng kéo
    expect(dragEnd(s, 0.6)).toBe(0);
    settle(s);
    expect(s.pos).toBe(0);
    const end = createSwipe(5, 4);
    expect(drag(end, 900, 100, 200)).toBe(4);
  });

  it('lò xo có nảy nhẹ (vượt đích một chút) rồi đứng yên', () => {
    const s = createSwipe(5, 0);
    go(s, 1);
    let max = 0;
    for (let i = 0; i < 180; i++) {
      stepSwipe(s, 1 / 60);
      max = Math.max(max, s.pos);
    }
    expect(max).toBeGreaterThan(1.001);
    expect(max).toBeLessThan(1.15);
    expect(settled(s)).toBe(true);
  });

  it('máy chậm (khung hình 0.5s) vẫn tới khu đích sau ~1s, coi là đã tới trước khi nảy xong hẳn', () => {
    const s = createSwipe(5, 0);
    go(s, 1);
    expect(arrived(s)).toBe(false);
    for (let i = 0; i < 3; i++) stepSwipe(s, 0.5);
    expect(arrived(s)).toBe(true);
  });

  it('mũi tên: sang khu bên cạnh; ở đầu dải thì nảy tại chỗ', () => {
    const s = createSwipe(5, 0);
    expect(go(s, -1)).toBe(0);
    expect(s.vel).toBeLessThan(0);
    settle(s);
    expect(s.pos).toBe(0);
    expect(go(s, 1)).toBe(1);
    expect(go(s, 1)).toBe(2);
    settle(s);
    expect(s.pos).toBe(2);
  });

  it('chỉ dựng khu đang xem ±1; khi đứng yên chỉ bật một khu, đang lướt bật hai khu kề', () => {
    const s = createSwipe(5, 0);
    expect(mountedRange(s)).toEqual([0, 1]);
    expect(visibleRange(s)).toEqual([0]);
    s.pos = 2;
    s.target = 2;
    expect(mountedRange(s)).toEqual([1, 2, 3]);
    s.pos = 2.4;
    expect(visibleRange(s)).toEqual([2, 3]);
    expect(mountedRange(s)).toEqual([1, 2, 3, 4]);
    s.pos = 4;
    s.target = 4;
    expect(mountedRange(s)).toEqual([3, 4]);
  });
});
