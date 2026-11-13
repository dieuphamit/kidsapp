import { describe, it, expect } from 'vitest';
import { blendWeight, clipScale, createMix, CROSSFADE, mixFor } from './animalClips';
import { createAgent, startReact } from './steer';
import { anchorSpeed, WORLD_ANIMALS } from './worldAnimals';

const AREA = { xMin: -4, xMax: 4, zMin: -2, zMax: 2, yMin: 1, yMax: 3 };

function agentFor(id: string) {
  const def = WORLD_ANIMALS[id];
  return { def, a: createAgent({ id, motion: def.motion, area: AREA, seed: 1, pos: [0, 0, 0] }) };
}

describe('mixFor', () => {
  it('đi bộ: trọng số Walk theo mức đang đi, Idle phần còn lại; timeScale = tốc độ / tốc độ neo', () => {
    const { def, a } = agentFor('deer');
    const mix = createMix();
    a.speed = 0.4;
    a.moving = 0.7;
    mixFor(a, def, mix);
    expect(mix.weight.Walk).toBeCloseTo(0.7);
    expect(mix.weight.Idle).toBeCloseTo(0.3);
    expect(mix.scale.Walk).toBeCloseTo(0.4 / anchorSpeed(def, 'Walk'));
  });

  it('đứng yên: chỉ Idle', () => {
    const { def, a } = agentFor('fox');
    const mix = createMix();
    a.speed = 0;
    a.moving = 0;
    mixFor(a, def, mix);
    expect(mix.weight.Idle).toBe(1);
    expect(mix.weight.Walk).toBe(0);
  });

  it('nhanh hơn hẳn tốc độ neo của Walk thì chuyển sang Run', () => {
    const { def, a } = agentFor('deer');
    const mix = createMix();
    a.speed = anchorSpeed(def, 'Walk') * 2;
    a.moving = 1;
    mixFor(a, def, mix);
    expect(mix.weight.Run).toBe(1);
    expect(mix.weight.Walk).toBe(0);
    expect(mix.scale.Run).toBeCloseTo(a.speed / anchorSpeed(def, 'Run'));
  });

  it('ăn: clip Eat; được chạm: Happy nếu có, không thì Jump', () => {
    const mix = createMix();
    const deer = agentFor('deer');
    deer.a.mode = 'eat';
    mixFor(deer.a, deer.def, mix);
    expect(mix.weight.Eat).toBe(1);
    startReact(deer.a);
    mixFor(deer.a, deer.def, mix);
    expect(mix.weight.Jump).toBe(1);
    const crab = agentFor('crab');
    startReact(crab.a);
    mixFor(crab.a, crab.def, mix);
    expect(mix.weight.Happy).toBe(1);
    expect(mix.weight.Jump).toBe(0);
  });

  it('cá/chim không có động tác vui: chạm thì vẫy/vỗ nhanh hơn', () => {
    const mix = createMix();
    const whale = agentFor('whale');
    whale.a.speed = 0.3;
    mixFor(whale.a, whale.def, mix);
    expect(mix.weight.Swim).toBe(1);
    startReact(whale.a);
    mixFor(whale.a, whale.def, mix);
    expect(mix.weight.Swim).toBe(1);
    expect(mix.scale.Swim).toBeGreaterThan(1);
    const bat = agentFor('bat');
    mixFor(bat.a, bat.def, mix);
    expect(mix.weight.Fly).toBe(1);
  });

  it('ếch: tua clip Jump theo tiến độ cú nhảy, ngồi thì Idle', () => {
    const { def, a } = agentFor('frog');
    const mix = createMix();
    a.hop = 0.4;
    mixFor(a, def, mix);
    expect(mix.scrub).toBe('Jump');
    expect(mix.scrubP).toBe(0.4);
    a.hop = -1;
    mixFor(a, def, mix);
    expect(mix.weight.Idle).toBe(1);
    expect(mix.scrub).toBeNull();
  });

  it('model tĩnh: không có trọng số nào', () => {
    const { def, a } = agentFor('bear');
    const mix = createMix();
    mixFor(a, def, mix);
    expect(Object.values(mix.weight).every((w) => w === 0)).toBe(true);
  });
});

describe('crossfade', () => {
  it('đi hết 0→1 trong CROSSFADE giây, không vượt đích', () => {
    let w = 0;
    const dt = 1 / 60;
    let t = 0;
    while (w < 1) {
      w = blendWeight(w, 1, dt);
      t += dt;
    }
    expect(t).toBeCloseTo(CROSSFADE, 1);
    expect(blendWeight(0.9, 1, 1)).toBe(1);
    expect(blendWeight(0.1, 0, 1)).toBe(0);
    expect(CROSSFADE).toBeGreaterThanOrEqual(0.25);
    expect(CROSSFADE).toBeLessThanOrEqual(0.3);
  });

  it('timeScale bị kẹp để đi rất chậm/rất nhanh không quá kỳ', () => {
    expect(clipScale(0, 1)).toBeCloseTo(0.3);
    expect(clipScale(10, 1)).toBeCloseTo(2.2);
    expect(clipScale(0.5, 1)).toBeCloseTo(0.5);
  });
});
