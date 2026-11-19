import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_SKILLS, SKILLS, SKILL_INFO, skillsOf } from './skills';
import { ALL_GAMES } from './games';
import { LANGS } from './i18n';

const gamesDir = join(import.meta.dirname, '..', 'games');
const gameFolders = readdirSync(gamesDir).filter((d) => statSync(join(gamesDir, d)).isDirectory());

describe('skills', () => {
  it('mọi thư mục trò trong src/games đều có kỹ năng (theo id trong manifest.ts)', () => {
    expect(gameFolders.length).toBeGreaterThan(10);
    for (const dir of gameFolders) {
      const src = readFileSync(join(gamesDir, dir, 'manifest.ts'), 'utf8');
      const id = /\bid:\s*'([^']+)'/.exec(src)?.[1];
      expect(id, `không đọc được id trong games/${dir}/manifest.ts`).toBeDefined();
      expect(GAME_SKILLS[id!], `thiếu kỹ năng cho trò "${id}" (games/${dir})`).toBeDefined();
      expect(GAME_SKILLS[id!].length).toBeGreaterThan(0);
    }
  });

  it('mọi trò đã đăng ký (manifest) đều có kỹ năng', () => {
    for (const g of ALL_GAMES) expect(skillsOf(g.id).length, g.id).toBeGreaterThan(0);
  });

  it('có sẵn trò sắp có: dots, feed, words', () => {
    expect(skillsOf('dots')).toEqual(['math', 'logic']);
    expect(skillsOf('feed')).toEqual(['science', 'social']);
    expect(skillsOf('words')).toEqual(['language']);
  });

  it('chỉ dùng kỹ năng trong bộ cố định, không lặp, tối đa 2', () => {
    for (const [id, list] of Object.entries(GAME_SKILLS)) {
      expect(list.length, id).toBeLessThanOrEqual(2);
      expect(new Set(list).size, id).toBe(list.length);
      for (const s of list) expect(SKILLS, id).toContain(s);
    }
  });

  it('đủ 6 kỹ năng, mỗi kỹ năng có nhãn vi/ja/en và màu từ tokens.css', () => {
    expect(SKILLS).toHaveLength(6);
    for (const s of SKILLS) {
      for (const l of LANGS) expect(SKILL_INFO[s][l].length, `${s}.${l}`).toBeGreaterThan(0);
      expect(SKILL_INFO[s].color).toMatch(/^var\(--[a-z-]+\)$/);
    }
    // kỹ năng nào cũng có ít nhất một trò rèn
    for (const s of SKILLS) expect(Object.values(GAME_SKILLS).some((l) => l.includes(s)), s).toBe(true);
  });

  it('trò lạ thì không có kỹ năng', () => expect(skillsOf('nope')).toEqual([]));
});
