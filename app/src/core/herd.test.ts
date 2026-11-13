import { describe, it, expect } from 'vitest';
import { createHabitatHerd, spawnSlot } from './herd';
import { stepAgents } from './steer';
import { HABITAT_IDS, HABITATS } from './worldAnimals';

describe('createHabitatHerd', () => {
  it('đủ số con theo đội hình, khoá không trùng, đàn cá dùng chung một đích', () => {
    for (const h of HABITAT_IDS) {
      const herd = createHabitatHerd(h, 3);
      const n = HABITATS[h].roster.reduce((s, e) => s + (e.count ?? 1), 0);
      expect(herd.members).toHaveLength(n);
      expect(new Set(herd.members.map((m) => m.key)).size).toBe(n);
    }
    const sea = createHabitatHerd('sea', 3);
    const clown = sea.members.filter((m) => m.def.id === 'clownfish');
    expect(clown).toHaveLength(HABITATS.sea.roster.find((e) => e.id === 'clownfish')!.count!);
    expect(clown.length).toBeGreaterThan(1);
    expect(new Set(clown.map((m) => m.agent.flock)).size).toBe(1);
    const tang = sea.members.find((m) => m.def.id === 'yellow-tang')!;
    expect(tang.agent.flock).not.toBe(clown[0].agent.flock);
  });

  it('thú trên mặt đất bắt đầu không chồng nhau và sau 30s vẫn không chồng nhau', () => {
    for (const h of HABITAT_IDS) {
      const herd = createHabitatHerd(h, 5);
      const ground = herd.agents.filter((a) => a.motion === 'walk' || a.motion === 'hop');
      const check = () => {
        for (let i = 0; i < ground.length; i++)
          for (let j = i + 1; j < ground.length; j++) {
            const a = ground[i];
            const b = ground[j];
            expect(Math.hypot(a.x - b.x, a.z - b.z), `${h}: ${a.id}/${b.id}`).toBeGreaterThan((a.radius + b.radius) * 0.8);
          }
      };
      check();
      for (let t = 0; t < 30 * 30; t++) stepAgents(herd.agents, 1 / 30);
      check();
    }
  });

  it('chim/ong bay trên các quỹ đạo khác nhau', () => {
    const sky = createHabitatHerd('sky', 1);
    const flyers = sky.agents.filter((a) => a.motion === 'fly');
    expect(flyers.length).toBeGreaterThanOrEqual(3);
    expect(new Set(flyers.map((a) => a.path!.cx)).size).toBe(flyers.length);
  });

  it('lúc xuất hiện rải đều khắp khu: mỗi con bơi/đi và mỗi đàn cá một chỗ riêng theo chiều ngang', () => {
    for (const h of HABITAT_IDS) {
      const herd = createHabitatHerd(h, 2);
      // điểm đại diện theo từng vùng (bờ, nước): con đi/nhảy/bơi lẻ, và đích chung của mỗi đàn cá
      const byArea = new Map<unknown, number[]>();
      const flocks = new Set<unknown>();
      for (const a of herd.agents) {
        if (a.motion === 'fly' || flocks.has(a.flock)) continue;
        if (a.flock) flocks.add(a.flock);
        const xs = byArea.get(a.area) ?? [];
        xs.push(a.flock ? a.flock.tx : a.x);
        byArea.set(a.area, xs);
      }
      for (const xs of byArea.values()) {
        const sorted = [...xs].sort((p, q) => p - q);
        for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1], h).toBeGreaterThan(0.4);
      }
    }
    const sea = createHabitatHerd('sea', 2);
    const water = sea.agents.filter((a) => a.motion !== 'walk');
    const span = Math.max(...water.map((a) => a.x)) - Math.min(...water.map((a) => a.x));
    expect(span, 'biển: trải gần hết bề ngang vùng nước').toBeGreaterThan(4);
  });

  it('spawnSlot: chia đều bề ngang, xen kẽ hàng sau (cao) và hàng trước (thấp)', () => {
    const area = { xMin: -3, xMax: 3, zMin: -1, zMax: 1, yMin: 1, yMax: 3 };
    const a = spawnSlot(area, 0, 3);
    const b = spawnSlot(area, 1, 3);
    const c = spawnSlot(area, 2, 3);
    expect([a[0], b[0], c[0]]).toEqual([-2, 0, 2]);
    expect(a[2]).toBeLessThan(b[2]);
    expect(a[1]).toBeGreaterThan(b[1]);
  });
});
