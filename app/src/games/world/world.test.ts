import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { animalVoiceKeys, habitatTris, HABITAT_IDS, HABITATS } from '../../core/worldAnimals';
import { contentByKey } from '../../core/content';
import { BACKDROP, HABITAT_ICON, propTris, sceneryFor, sceneryTris, WORLD_COLORS, type Prop } from './scenery';
import { speciesCount, voiceId } from './voice';
import { manifest } from './manifest';

const APP = join(import.meta.dirname, '../../..');
const world = JSON.parse(readFileSync(join(APP, 'src/content/world.json'), 'utf8')) as { key: string; vi: string; ja: string; en: string }[];
const tokensCss = readFileSync(join(APP, 'src/core/tokens.css'), 'utf8');

describe('world.json', () => {
  it('mỗi câu có đủ vi, ja, en', () => {
    for (const item of world) {
      for (const lang of ['vi', 'ja', 'en'] as const) expect(item[lang]?.trim(), `${item.key} ${lang}`).toBeTruthy();
    }
  });

  it('không trùng key với các file nội dung khác', () => {
    const others = new Set<string>();
    for (const f of ['animals.json', 'wild.json', 'places.json', 'games2.json', 'games3.json', 'ui.json']) {
      const p = join(APP, 'src/content', f);
      if (!existsSync(p)) continue;
      for (const i of JSON.parse(readFileSync(p, 'utf8')) as { key: string }[]) others.add(i.key);
    }
    for (const item of world) expect(others.has(item.key), item.key).toBe(false);
    expect(new Set(world.map((i) => i.key)).size).toBe(world.length);
  });

  it('có tên trò, lời chào, tên 5 khu và câu chào đủ bạn', () => {
    const keys = new Set(world.map((i) => i.key));
    for (const k of ['game.world', 'world.hello', 'world.all-friends', ...HABITAT_IDS.map((h) => `world.${h}`)]) expect(keys.has(k), k).toBe(true);
  });

  it('mọi con trong 5 khu đều có tên và tiếng kêu (key hợp lệ cho speechUrl)', () => {
    const content = contentByKey();
    for (const h of HABITAT_IDS)
      for (const e of HABITATS[h].roster) {
        const keys = animalVoiceKeys(voiceId(e.id), (k) => content.has(k));
        expect(keys, `${h}/${e.id}`).toEqual([`animal.${voiceId(e.id)}-sound`, `animal.${voiceId(e.id)}`]);
        expect(keys[0], e.id).toMatch(/^animal\.[a-z]+-sound$/);
        expect(existsSync(join(APP, 'public/audio/sfx', `animal-${voiceId(e.id)}.mp3`)), e.id).toBe(true);
      }
  });

  it('voiceId bỏ gạch nối, speciesCount đếm loại thú của khu', () => {
    expect(voiceId('blue-tang')).toBe('bluetang');
    expect(voiceId('frog')).toBe('frog');
    expect(speciesCount(HABITAT_IDS.indexOf('sea'))).toBe(HABITATS.sea.roster.length);
  });
});

describe('cảnh 5 khu', () => {
  it('mỗi khu ≤ 50k tam giác cả cảnh lẫn thú (luật 8)', () => {
    for (const h of HABITAT_IDS) {
      const total = sceneryTris(h) + habitatTris(h);
      expect(total, `${h}: cảnh ${sceneryTris(h)} + thú ${habitatTris(h)}`).toBeLessThanOrEqual(50_000);
      expect(sceneryTris(h), h).toBeGreaterThan(500); // có cảnh thật, không chỉ mặt phẳng
    }
  });

  it('propTris cộng cả nút con', () => {
    const box: Prop = { g: 'box', a: [1, 1, 1] };
    expect(propTris(box)).toBe(12);
    expect(propTris({ kids: [box, { kids: [box] }] })).toBe(24);
  });

  it('màu cảnh lấy đúng từ tokens.css (luật 7)', () => {
    for (const [name, hex] of Object.entries(WORLD_COLORS)) {
      expect(tokensCss, name).toMatch(new RegExp(`--${name}:\\s*${hex}\\b`, 'i'));
    }
    const used = new Set<string>();
    const walk = (p: Prop) => {
      if (p.c) used.add(p.c);
      p.kids?.forEach(walk);
    };
    for (const h of HABITAT_IDS) sceneryFor(h).forEach(walk);
    for (const c of used) expect(WORLD_COLORS, c).toHaveProperty(c);
  });

  it('nền mỗi khu chỉ dùng biến CSS có trong tokens.css', () => {
    for (const h of HABITAT_IDS) {
      expect(HABITAT_ICON[h]).toBeTruthy();
      const vars = [...BACKDROP[h].matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
      expect(vars.length, h).toBeGreaterThan(0);
      for (const v of vars) expect(tokensCss, `${h}: ${v}`).toContain(`${v}:`);
    }
  });

  it('cảnh có chuyển động nhẹ ở mọi khu', () => {
    for (const h of HABITAT_IDS) {
      let n = 0;
      const walk = (p: Prop) => {
        if (p.anim) n++;
        p.kids?.forEach(walk);
      };
      sceneryFor(h).forEach(walk);
      expect(n, h).toBeGreaterThan(3);
    }
  });
});

describe('manifest', () => {
  it('trò đầu tiên của Thế giới thú, có tên 3 thứ tiếng', () => {
    expect(manifest.place).toBe('place.zoo');
    expect(manifest.order).toBeLessThan(0);
    expect(manifest.title).toEqual({ vi: 'Khám phá thế giới', ja: 'せかいを たんけん', en: 'Explore the world' });
    expect(contentByKey().has(manifest.titleKey!)).toBe(true);
  });
});
