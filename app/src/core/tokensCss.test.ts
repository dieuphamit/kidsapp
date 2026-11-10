import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLAY_COLORS } from './tokens';

// Mẫu đọc file thật trong test unit: node:fs + import.meta.dirname. Không dùng `?raw` (dưới Vitest trả về '')
// và không dùng new URL(..., import.meta.url) (môi trường jsdom: URL không phải file://).
const css = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');

describe('tokens.css', () => {
  it('có biến màu cho mọi màu đất sét trong tokens.ts', () => {
    for (const c of CLAY_COLORS) expect(css).toMatch(new RegExp(`--clay-${c}:\\s*#[0-9a-f]{6}`, 'i'));
  });
  it('có sàn vùng chạm 120px', () => {
    expect(css).toContain('--touch-min: 120px');
  });
});
