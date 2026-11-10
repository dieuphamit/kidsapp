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

  it('mỗi id có animal.<id> và animal.<id>-sound trong content', () => {
    for (const animal of ANIMALS) {
      const nameKey = `animal.${animal.id}`;
      const soundKey = `animal.${animal.id}-sound`;
      expect(content.has(nameKey), `Thiếu ${nameKey}`).toBe(true);
      expect(content.has(soundKey), `Thiếu ${soundKey}`).toBe(true);
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
  it('place là place.farm', () => {
    expect(manifest.place).toBe('place.farm');
  });

  it('minAge là 24', () => {
    expect(manifest.minAge).toBe(24);
  });

  it('maxAge là 72', () => {
    expect(manifest.maxAge).toBe(72);
  });
});
