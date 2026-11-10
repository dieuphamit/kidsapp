import { describe, it, expect } from 'vitest';
import { initial, pick, reset } from './logic';
import { contentByKey } from '../../core/content';

describe('counting/logic', () => {
  it('picks 3 different fruits returning count 1, 2, 3', () => {
    let state = initial();
    let result = pick(state, 1);
    expect(result.count).toBe(1);
    state = result.state;

    result = pick(state, 3);
    expect(result.count).toBe(2);
    state = result.state;

    result = pick(state, 5);
    expect(result.count).toBe(3);
    expect(state.done).toBe(false);
  });

  it('returns null when picking already picked fruit', () => {
    let state = initial();
    let result = pick(state, 2);
    expect(result.count).toBe(1);
    state = result.state;

    result = pick(state, 2);
    expect(result.count).toBeNull();
    expect(result.state.picked.length).toBe(1);
  });

  it('sets done when 10 fruits picked', () => {
    let state = initial();
    for (let i = 1; i <= 10; i++) {
      const result = pick(state, i);
      expect(result.count).toBe(i);
      state = result.state;
    }
    expect(state.done).toBe(true);
    expect(state.picked.length).toBe(10);
  });

  it('reset returns initial state', () => {
    let state = initial();
    state = pick(state, 1).state;
    state = pick(state, 2).state;
    const resetState = reset();
    expect(resetState.picked).toEqual([]);
    expect(resetState.done).toBe(false);
  });
});

describe('counting content keys exist', () => {
  it('number.1 to number.10, count.hello, count.done exist in content', () => {
    const content = contentByKey();
    for (let i = 1; i <= 10; i++) {
      expect(content.has(`number.${i}`)).toBe(true);
    }
    expect(content.has('count.hello')).toBe(true);
    expect(content.has('count.done')).toBe(true);
  });
});
