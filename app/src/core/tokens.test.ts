import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOUCH_MIN_PX, TOUCH_GAP_PX, CLAY_COLORS, LEARN_COLORS, LEARN_HEX } from './tokens';
import { contentByKey } from './content';

const tokensCss = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf-8');

describe('tokens', () => {
  it('vùng chạm theo luật UX', () => {
    expect(TOUCH_MIN_PX).toBeGreaterThanOrEqual(120);
    expect(TOUCH_GAP_PX).toBeGreaterThanOrEqual(24);
  });
  it('có đủ 5 màu đất sét', () => {
    expect(CLAY_COLORS).toEqual(['peach', 'mint', 'butter', 'leaf', 'lilac']);
  });

  describe('LEARN_COLORS', () => {
    it('có đúng 6 phần tử', () => {
      expect(LEARN_COLORS).toEqual(['red', 'yellow', 'green', 'blue', 'orange', 'purple']);
    });

    it('mỗi phần tử có trong LEARN_HEX và là mã #rrggbb', () => {
      const hexPattern = /^#[0-9a-f]{6}$/i;
      for (const color of LEARN_COLORS) {
        expect(LEARN_HEX).toHaveProperty(color);
        expect(LEARN_HEX[color]).toMatch(hexPattern);
      }
    });

    it('mỗi LEARN_COLOR có key color.<id> trong content', () => {
      const content = contentByKey();
      for (const color of LEARN_COLORS) {
        const key = `color.${color}`;
        expect(content.has(key), `missing content key: ${key}`).toBe(true);
      }
    });

    it('tokens.css có dòng --learn-<id>: <hex> khớp LEARN_HEX', () => {
      for (const color of LEARN_COLORS) {
        const expectedHex = LEARN_HEX[color];
        const pattern = new RegExp(`--learn-${color}:\\s*${expectedHex}`, 'i');
        expect(tokensCss).toMatch(pattern);
      }
    });
  });
});
