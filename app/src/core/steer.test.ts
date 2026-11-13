import { describe, it, expect } from 'vitest';
import {
  createAgent,
  createFlock,
  defaultPath,
  faceYaw,
  FACE_BIAS,
  MAX_DT,
  reactJump,
  REACT_TIME,
  startReact,
  stepAgents,
  wrapAngle,
  type Agent,
  type Area,
} from './steer';

const AREA: Area = { xMin: -4, xMax: 4, zMin: -2, zMax: 2 };
const WATER: Area = { xMin: -4, xMax: 4, zMin: -2, zMax: 1, yMin: 0.8, yMax: 3 };

function run(agents: Agent[], seconds: number, dt = 1 / 30, each?: () => void) {
  for (let t = 0; t < seconds; t += dt) {
    stepAgents(agents, dt);
    each?.();
  }
}

function inside(a: Agent, ar: Area, eps = 1e-9) {
  return (
    a.x >= ar.xMin - eps &&
    a.x <= ar.xMax + eps &&
    a.z >= ar.zMin - eps &&
    a.z <= ar.zMax + eps &&
    a.y >= (ar.yMin ?? 0) - eps &&
    a.y <= (ar.yMax ?? ar.yMin ?? 0) + eps
  );
}

describe('steer: đi bộ', () => {
  it('cùng seed cho cùng đường đi (deterministic)', () => {
    const a = [createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 3 })];
    const b = [createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 3 })];
    run(a, 20);
    run(b, 20);
    expect(a[0].x).toBe(b[0].x);
    expect(a[0].z).toBe(b[0].z);
  });

  it('đi tới đích, ở trong vùng, không vượt tốc độ tối đa, có lúc dừng nghỉ', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 5, maxSpeed: 0.5 });
    const modes = new Set<string>();
    let maxSpeed = 0;
    let dist = 0;
    let px = a.x;
    let pz = a.z;
    run([a], 120, 1 / 30, () => {
      expect(inside(a, AREA)).toBe(true);
      modes.add(a.mode);
      maxSpeed = Math.max(maxSpeed, a.speed);
      dist += Math.hypot(a.x - px, a.z - pz);
      px = a.x;
      pz = a.z;
    });
    expect(maxSpeed).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(dist).toBeGreaterThan(10);
    expect(modes.has('walk')).toBe(true);
    expect(modes.has('rest')).toBe(true);
  });

  it('con ăn được thì có lúc dừng ăn', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 9, canEat: true });
    const modes = new Set<string>();
    run([a], 200, 1 / 30, () => modes.add(a.mode));
    expect(modes.has('eat')).toBe(true);
  });

  it('giới hạn tốc độ góc: heading không đổi quá turnRate·dt mỗi bước', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 11, turnRate: 1.5 });
    const dt = 1 / 30;
    for (let i = 0; i < 3000; i++) {
      const before = a.heading;
      stepAgents([a], dt);
      expect(Math.abs(wrapAngle(a.heading - before))).toBeLessThanOrEqual(1.5 * dt + 1e-9);
    }
  });

  it('đích mới ưu tiên đi ngang (|dz| ≤ 0.6·|dx|) để bé thấy mặt/thân', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 2 });
    for (let i = 0; i < 2000; i++) {
      const tx = a.tx;
      const tz = a.tz;
      const x = a.x;
      const z = a.z;
      stepAgents([a], 1 / 30);
      if (a.tx !== tx || a.tz !== tz) {
        expect(Math.abs(a.tz - a.z)).toBeLessThanOrEqual(Math.abs(a.tx - x) * 0.6 + Math.abs(a.z - z) + 1e-6);
      }
    }
  });

  it('nhiều con đẩy nhau, không chồng lên nhau', () => {
    const agents = Array.from({ length: 6 }, (_, i) =>
      createAgent({ id: `a${i}`, motion: 'walk', area: AREA, seed: i + 1, radius: 0.45, pos: [-3 + i * 1.2, 0, 0] }),
    );
    run(agents, 90, 1 / 30, () => {
      for (let i = 0; i < agents.length; i++)
        for (let j = i + 1; j < agents.length; j++) {
          const d = Math.hypot(agents[i].x - agents[j].x, agents[i].z - agents[j].z);
          // cho phép chồng chút ít do kẹp mép vùng
          expect(d).toBeGreaterThan(0.9 * 0.8);
        }
    });
  });

  it('mặt hơi chếch về camera khi đi ngang', () => {
    expect(faceYaw(Math.PI / 2)).toBeCloseTo(Math.PI / 2 - FACE_BIAS);
    expect(faceYaw(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2 + FACE_BIAS);
    expect(faceYaw(0)).toBe(0);
  });

  it('quay đầu ngược lại thì quay qua phía camera (yaw qua 0), không quay lưng', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 1, pos: [0, 0, 0] });
    a.heading = Math.PI / 2;
    a.tx = -3.5;
    a.tz = 0;
    let minAbs = Infinity;
    let maxAbs = 0;
    for (let i = 0; i < 90; i++) {
      stepAgents([a], 1 / 30);
      minAbs = Math.min(minAbs, Math.abs(a.heading));
      maxAbs = Math.max(maxAbs, Math.abs(a.heading));
    }
    expect(minAbs).toBeLessThan(0.3);
    expect(maxAbs).toBeLessThan(Math.PI / 2 + 0.1);
  });

  it('được chạm: đứng yên, ngoảnh về bé, nhảy, rồi đi tiếp', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 4, pos: [-3, 0, 0] });
    run([a], 1.5);
    startReact(a);
    const x = a.x;
    const z = a.z;
    run([a], 0.5);
    expect(a.mode).toBe('react');
    expect(reactJump(a)).toBeGreaterThanOrEqual(0);
    run([a], REACT_TIME - 0.7);
    expect(a.mode).toBe('react');
    expect(a.x).toBe(x);
    expect(a.z).toBe(z);
    expect(Math.abs(a.yaw)).toBeLessThan(0.5);
    run([a], 3);
    expect(a.mode).not.toBe('react');
    expect(Math.hypot(a.x - x, a.z - z)).toBeGreaterThan(0.1);
  });

  it('con đứng một chỗ (fixed) không rời chỗ, chạm chỉ nhún 0.6s', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 4, pos: [3, 0, -1], fixed: true, restYaw: 0.7 });
    run([a], 5);
    expect([a.x, a.z, a.yaw, a.mode]).toEqual([3, -1, 0.7, 'idle']);
    startReact(a);
    run([a], 0.7);
    expect(a.mode).toBe('idle');
  });

  it('kẹp dt lớn (tab ẩn): một bước 10s chỉ đi tối đa MAX_DT', () => {
    const a = createAgent({ id: 'a', motion: 'walk', area: AREA, seed: 7, pos: [-3, 0, 0] });
    a.speed = a.maxSpeed;
    const x = a.x;
    const z = a.z;
    stepAgents([a], 10);
    expect(Math.hypot(a.x - x, a.z - z)).toBeLessThanOrEqual(a.maxSpeed * MAX_DT + 1e-9);
  });
});

describe('steer: ếch nhảy', () => {
  it('chỉ tiến lên khi đang nhảy, ngồi giữa các cú nhảy', () => {
    const a = createAgent({ id: 'f', motion: 'hop', area: AREA, seed: 3, maxSpeed: 0.45 });
    let hops = 0;
    let wasHop = false;
    let px = a.x;
    let pz = a.z;
    run([a], 30, 1 / 30, () => {
      const moved = Math.hypot(a.x - px, a.z - pz) > 1e-9;
      if (a.hop < 0 && !wasHop) expect(moved).toBe(false);
      if (a.hop >= 0 && !wasHop) hops++;
      wasHop = a.hop >= 0;
      px = a.x;
      pz = a.z;
      expect(a.y).toBe(0);
    });
    expect(hops).toBeGreaterThan(5);
  });
});

describe('steer: bơi', () => {
  it('cá bơi lượn 3D trong vùng nước, không bao giờ đứng hẳn', () => {
    const a = createAgent({ id: 'w', motion: 'swim', area: WATER, seed: 5, maxSpeed: 0.5 });
    let minY = Infinity;
    let maxY = -Infinity;
    run([a], 60, 1 / 30, () => {
      expect(inside(a, WATER)).toBe(true);
      minY = Math.min(minY, a.y);
      maxY = Math.max(maxY, a.y);
      expect(Math.abs(a.pitch)).toBeLessThanOrEqual(0.46);
    });
    expect(maxY - minY).toBeGreaterThan(0.5);
    expect(a.speed).toBeGreaterThan(0.1);
  });
});

describe('steer: đàn cá (boids)', () => {
  function school(n: number) {
    const flock = createFlock(WATER, 3);
    return Array.from({ length: n }, (_, i) =>
      createAgent({ id: `c${i}`, motion: 'school', area: WATER, seed: i + 1, flock, maxSpeed: 0.55, pos: [flock.tx + (i % 3) * 0.4, flock.ty, flock.tz + (i % 2) * 0.4] }),
    );
  }

  it('đàn cá ở gần nhau, cùng hướng, không đâm vào nhau, trong vùng nước', () => {
    const fish = school(8);
    run(fish, 40);
    let align = 0;
    let minD = Infinity;
    for (const f of fish) {
      expect(inside(f, WATER)).toBe(true);
      for (const o of fish) {
        if (o === f) continue;
        align += (f.vx * o.vx + f.vy * o.vy + f.vz * o.vz) / (f.speed * o.speed);
        minD = Math.min(minD, Math.hypot(f.x - o.x, f.y - o.y, f.z - o.z));
      }
    }
    align /= fish.length * (fish.length - 1);
    const cx = fish.reduce((s, f) => s + f.x, 0) / fish.length;
    const cz = fish.reduce((s, f) => s + f.z, 0) / fish.length;
    const spread = Math.max(...fish.map((f) => Math.hypot(f.x - cx, f.z - cz)));
    expect(align, 'cùng hướng').toBeGreaterThan(0.6);
    expect(spread, 'gom lại thành đàn').toBeLessThan(2.2);
    expect(minD, 'không chồng lên nhau').toBeGreaterThan(0.15);
  });

  it('đàn bơi tới chỗ khác (đích của đàn đổi theo thời gian)', () => {
    const fish = school(5);
    const x0 = fish.map((f) => f.x);
    let travelled = 0;
    run(fish, 30, 1 / 30, () => {
      travelled = Math.max(travelled, ...fish.map((f, i) => Math.abs(f.x - x0[i])));
    });
    expect(travelled).toBeGreaterThan(1.5);
  });
});

describe('steer: bay', () => {
  it('bay vòng/số 8 trong vùng trời, nhấp nhô, nghiêng thân khi lượn', () => {
    const air: Area = { xMin: -3, xMax: 3, zMin: -2, zMax: 1, yMin: 2, yMax: 3 };
    for (const eight of [false, true]) {
      const a = createAgent({ id: 'b', motion: 'fly', area: air, seed: 2, maxSpeed: 0.8, path: defaultPath(air, eight) });
      let maxRoll = 0;
      let minY = Infinity;
      let maxY = -Infinity;
      run([a], 30, 1 / 30, () => {
        expect(inside(a, { ...air, yMin: 1.5, yMax: 3.5 })).toBe(true);
        maxRoll = Math.max(maxRoll, Math.abs(a.roll));
        minY = Math.min(minY, a.y);
        maxY = Math.max(maxY, a.y);
      });
      expect(maxRoll).toBeGreaterThan(0.05);
      expect(maxRoll).toBeLessThanOrEqual(0.6 + 1e-9);
      expect(maxY - minY).toBeGreaterThan(0.2);
    }
  });

  it('được chạm thì lơ lửng tại chỗ, quay mặt về bé, rồi bay tiếp', () => {
    const air: Area = { xMin: -3, xMax: 3, zMin: -2, zMax: 1, yMin: 2, yMax: 3 };
    const a = createAgent({ id: 'b', motion: 'fly', area: air, seed: 2, maxSpeed: 0.8 });
    run([a], 3);
    startReact(a);
    run([a], 0.3);
    const x = a.x;
    const z = a.z;
    run([a], 1.8);
    expect(a.x).toBe(x);
    expect(a.z).toBe(z);
    expect(Math.abs(a.yaw)).toBeLessThan(0.4);
    run([a], 3);
    expect(a.mode).toBe('walk');
    expect(Math.hypot(a.x - x, a.z - z)).toBeGreaterThan(0.3);
  });
});
