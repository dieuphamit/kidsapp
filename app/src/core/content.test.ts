import { describe, it, expect } from 'vitest';
import { allContent } from './content';

describe('content', () => {
  it('mọi file content hợp lệ và key không trùng', () => {
    const items = allContent();
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('ui.mascot-name');
  });
});
