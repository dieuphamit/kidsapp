import { describe, it, expect } from 'vitest';
import { createHabitatHerd } from './herd';
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
    expect(clown).toHaveLength(4);
    expect(new Set(clown.map((m) => m.agent.flock)).size).toBe(1);
    const tang = sea.members.find((m) => m.def.id === 'blue-tang')!;
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
});
