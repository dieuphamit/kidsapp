import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ANIMALS } from './animals';
import { manifest } from './manifest';
import { contentByKey } from '../../core/content';

describe('animals data', () => {
  const content = contentByKey();

  it('có đủ 8 con vật', () => {
    expect(ANIMALS).toHaveLength(8);
  });

  it('không có id trùng', () => {
    const ids = ANIMALS.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('mỗi id có tên animal.<id> trong content và tiếng kêu thật sfx/animal-<id>.mp3', () => {
    const sfxDir = join(import.meta.dirname, '../../../public/audio/sfx');
    for (const animal of ANIMALS) {
      const nameKey = `animal.${animal.id}`;
      expect(content.has(nameKey), `Thiếu ${nameKey}`).toBe(true);
      // say('animal.<id>-sound') phát file ghi âm này (xem speechUrl trong core/audio.ts)
      expect(existsSync(join(sfxDir, `animal-${animal.id}.mp3`)), `Thiếu sfx/animal-${animal.id}.mp3`).toBe(true);
    }
  });

  it('mỗi model tồn tại trong public/models/', () => {
    const modelsDir = join(import.meta.dirname, '../../../public/models');
    for (const animal of ANIMALS) {
      const modelPath = join(modelsDir, animal.model);
      expect(existsSync(modelPath), `Thiếu model ${animal.model}`).toBe(true);
    }
  });
});

describe('animals manifest', () => {
  it('place là place.zoo', () => {
    expect(manifest.place).toBe('place.zoo');
  });

  it('minAge là 24', () => {
    expect(manifest.minAge).toBe(24);
  });

  it('maxAge là 72', () => {
    expect(manifest.maxAge).toBe(72);
  });
});
