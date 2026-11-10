import { describe, it, expect } from 'vitest';
import { TOUCH_MIN_PX, TOUCH_GAP_PX, CLAY_COLORS } from './tokens';

describe('tokens', () => {
  it('vùng chạm theo luật UX', () => {
    expect(TOUCH_MIN_PX).toBeGreaterThanOrEqual(120);
    expect(TOUCH_GAP_PX).toBeGreaterThanOrEqual(24);
  });
  it('có đủ 5 màu đất sét', () => {
    expect(CLAY_COLORS).toEqual(['peach', 'mint', 'butter', 'leaf', 'lilac']);
  });
});
