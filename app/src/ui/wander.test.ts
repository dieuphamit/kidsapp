import { describe, it, expect } from 'vitest';
import { createWander, jumpProgress, REACT_TIME, startReact, stepWander, walkYaw, type Lane } from './wander';

const LANE: Lane = { xMin: -2, xMax: 2, speed: 0.5, dir: 1 };
const RATE = 10;

function run(s: ReturnType<typeof createWander>, lane: Lane | undefined, seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) stepWander(s, lane, dt, RATE);
}

describe('wander', () => {
  it('con đi dạo luôn ở trong làn, giữ z, và đi qua lại cả hai đầu', () => {
    const s = createWander([0, 0, 1.5], 0, LANE, 3);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < 60 * 60; i++) {
      stepWander(s, LANE, 1 / 60, RATE);
      minX = Math.min(minX, s.x);
      maxX = Math.max(maxX, s.x);
      expect(s.z).toBe(1.5);
    }
    expect(minX).toBeGreaterThanOrEqual(LANE.xMin);
    expect(maxX).toBeLessThanOrEqual(LANE.xMax);
    expect(minX).toBeLessThan(-1.9);
    expect(maxX).toBeGreaterThan(1.9);
  });

  it('quay mặt theo hướng đi và đổi hướng ở cuối làn', () => {
    const s = createWander([1.9, 0, 0], 0, LANE, 1);
    expect(s.yaw).toBeCloseTo(walkYaw(1));
    run(s, LANE, 1.0); // gần cuối làn đi chậm lại (~0.15 đơn vị/giây)
    expect(s.mode).toBe('turn');
    run(s, LANE, 3);
    expect(s.dir).toBe(-1);
    expect(s.yaw).toBeLessThan(0);
  });

  it('được chạm thì đứng yên, nhảy, rồi đi tiếp', () => {
    const s = createWander([0, 0, 0], 0, { ...LANE, speed: 0.3 }, 5);
    s.untilPause = 100; // không nghỉ giữa chừng trong test
    run(s, LANE, 0.5);
    startReact(s);
    const x = s.x;
    run(s, LANE, 0.5);
    expect(jumpProgress(s)).toBeGreaterThanOrEqual(0);
    run(s, LANE, REACT_TIME - 0.6);
    expect(s.mode).toBe('react');
    expect(s.x).toBe(x);
    run(s, LANE, 2);
    expect(s.mode).toBe('walk');
    expect(s.x).not.toBe(x);
  });

  it('con đứng yên không rời chỗ, chạm chỉ nhảy 0.6s', () => {
    const s = createWander([3, 0, -1], 0.7, undefined, 2);
    run(s, undefined, 5);
    expect(s.x).toBe(3);
    expect(s.yaw).toBe(0.7);
    startReact(s);
    run(s, undefined, 0.7);
    expect(s.mode).toBe('idle');
  });

  it('dt quá lớn (tab ẩn) bị kẹp, không nhảy cóc qua cả làn', () => {
    const s = createWander([0, 0, 0], 0, LANE, 4);
    stepWander(s, LANE, 30, RATE);
    expect(Math.abs(s.x)).toBeLessThan(0.2);
  });
});
