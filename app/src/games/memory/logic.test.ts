import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  newRound,
  flip,
  hideFlipped,
  isDone,
  reveal,
  startLevel,
  loadLevel,
  saveLevel,
  progressLevel,
  type Card,
  type GameState,
} from './logic';

// Store for mock
const mockStore = new Map<string, unknown>();

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, val: unknown) => {
    mockStore.set(key, val);
    return Promise.resolve();
  }),
}));

const mockCards: Card[] = [
  { id: 'cow', kind: 'farm' },
  { id: 'chicken', kind: 'farm' },
  { id: 'duck', kind: 'farm' },
  { id: 'pig', kind: 'farm' },
  { id: 'dog', kind: 'farm' },
  { id: 'sheep', kind: 'farm' },
  { id: 'apple', kind: 'fruit' },
  { id: 'banana', kind: 'fruit' },
  { id: 'orange', kind: 'fruit' },
  { id: 'grapes', kind: 'fruit' },
  { id: 'elephant', kind: 'wild' },
  { id: 'lion', kind: 'wild' },
  { id: 'tiger', kind: 'wild' },
  { id: 'monkey', kind: 'wild' },
];

describe('newRound', () => {
  it('level 1 creates 4 cards (2 pairs)', () => {
    const state = newRound(1, 12345, mockCards);
    expect(state.cards).toHaveLength(4);
    expect(state.level).toBe(1);
  });

  it('level 2 creates 6 cards (3 pairs)', () => {
    const state = newRound(2, 12345, mockCards);
    expect(state.cards).toHaveLength(6);
    expect(state.level).toBe(2);
  });

  it('level 3 creates 8 cards (4 pairs)', () => {
    const state = newRound(3, 12345, mockCards);
    expect(state.cards).toHaveLength(8);
    expect(state.level).toBe(3);
  });

  it('level 4 creates 12 cards (6 pairs)', () => {
    const state = newRound(4, 12345, mockCards);
    expect(state.cards).toHaveLength(12);
    expect(state.level).toBe(4);
  });

  it('each card id appears exactly twice', () => {
    const state = newRound(3, 54321, mockCards);
    const counts = new Map<string, number>();
    for (const card of state.cards) {
      counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });

  it('level 1-2 only has farm and fruit cards', () => {
    const state1 = newRound(1, 111, mockCards);
    const state2 = newRound(2, 222, mockCards);
    for (const card of [...state1.cards, ...state2.cards]) {
      expect(['farm', 'fruit']).toContain(card.kind);
    }
  });

  it('level 3-4 can have wild cards', () => {
    // Run multiple seeds to ensure wild cards can appear
    let hasWild = false;
    for (let seed = 1; seed <= 100; seed++) {
      const state = newRound(4, seed, mockCards);
      if (state.cards.some((c) => c.kind === 'wild')) {
        hasWild = true;
        break;
      }
    }
    expect(hasWild).toBe(true);
  });

  it('same seed produces same card order', () => {
    const state1 = newRound(2, 99999, mockCards);
    const state2 = newRound(2, 99999, mockCards);
    expect(state1.cards.map((c) => c.id)).toEqual(state2.cards.map((c) => c.id));
  });

  it('clamps level to valid range', () => {
    const state0 = newRound(0, 1, mockCards);
    expect(state0.level).toBe(1);
    expect(state0.cards).toHaveLength(4);

    const state5 = newRound(5, 1, mockCards);
    expect(state5.level).toBe(4);
    expect(state5.cards).toHaveLength(12);
  });
});

describe('flip', () => {
  it('first flip returns "first"', () => {
    const state = newRound(1, 123, mockCards);
    const result = flip(state, 0);
    expect(result).toBe('first');
    expect(state.cards[0].flipped).toBe(true);
    expect(state.flippedIndices).toEqual([0]);
  });

  it('second flip with match returns "match"', () => {
    const state = newRound(1, 123, mockCards);
    // Find two cards with same id
    const id0 = state.cards[0].id;
    const idx1 = state.cards.findIndex((c, i) => i > 0 && c.id === id0);

    flip(state, 0);
    const result = flip(state, idx1);
    expect(result).toBe('match');
    expect(state.cards[0].matched).toBe(true);
    expect(state.cards[idx1].matched).toBe(true);
    expect(state.flippedIndices).toEqual([]);
  });

  it('second flip without match returns "nomatch"', () => {
    const state = newRound(1, 123, mockCards);
    // Find two cards with different ids
    const id0 = state.cards[0].id;
    const idx1 = state.cards.findIndex((c, i) => i > 0 && c.id !== id0);

    flip(state, 0);
    const result = flip(state, idx1);
    expect(result).toBe('nomatch');
    expect(state.cards[0].matched).toBe(false);
    expect(state.cards[idx1].matched).toBe(false);
    // Cards stay flipped until hideFlipped is called
    expect(state.cards[0].flipped).toBe(true);
    expect(state.cards[idx1].flipped).toBe(true);
  });

  it('cannot flip card already face up', () => {
    const state = newRound(1, 123, mockCards);
    flip(state, 0);
    const result = flip(state, 0);
    expect(result).toBe('invalid');
  });

  it('cannot flip card already matched', () => {
    const state = newRound(1, 123, mockCards);
    const id0 = state.cards[0].id;
    const idx1 = state.cards.findIndex((c, i) => i > 0 && c.id === id0);

    flip(state, 0);
    flip(state, idx1); // match

    const result = flip(state, 0);
    expect(result).toBe('invalid');
  });

  it('cannot flip more than 2 cards', () => {
    const state = newRound(2, 456, mockCards);
    // Find two cards with different ids
    const id0 = state.cards[0].id;
    const idx1 = state.cards.findIndex((c, i) => i > 0 && c.id !== id0);

    flip(state, 0);
    flip(state, idx1); // nomatch, 2 cards flipped

    // Try to flip a third
    const result = flip(state, 2);
    expect(result).toBe('invalid');
  });

  it('returns invalid for out of bounds index', () => {
    const state = newRound(1, 123, mockCards);
    expect(flip(state, -1)).toBe('invalid');
    expect(flip(state, 100)).toBe('invalid');
  });
});

describe('hideFlipped', () => {
  it('hides flipped cards and clears flippedIndices', () => {
    const state = newRound(1, 789, mockCards);
    const id0 = state.cards[0].id;
    const idx1 = state.cards.findIndex((c, i) => i > 0 && c.id !== id0);

    flip(state, 0);
    flip(state, idx1); // nomatch

    hideFlipped(state);

    expect(state.cards[0].flipped).toBe(false);
    expect(state.cards[idx1].flipped).toBe(false);
    expect(state.flippedIndices).toEqual([]);
  });
});

describe('isDone', () => {
  it('returns false when not all cards matched', () => {
    const state = newRound(1, 111, mockCards);
    expect(isDone(state)).toBe(false);
  });

  it('returns true when all cards matched', () => {
    const state = newRound(1, 111, mockCards);
    // Match all pairs manually
    for (const card of state.cards) {
      card.matched = true;
    }
    expect(isDone(state)).toBe(true);
  });
});

describe('reveal', () => {
  it('returns card ids in position order', () => {
    const state = newRound(1, 222, mockCards);
    const ids = reveal(state);
    expect(ids).toHaveLength(4);
    expect(ids).toEqual(state.cards.map((c) => c.id));
  });
});

describe('startLevel', () => {
  it('returns 1 for children under 36 months', () => {
    expect(startLevel(24)).toBe(1);
    expect(startLevel(30)).toBe(1);
    expect(startLevel(35)).toBe(1);
  });

  it('returns 2 for children 36 months or older', () => {
    expect(startLevel(36)).toBe(2);
    expect(startLevel(48)).toBe(2);
    expect(startLevel(60)).toBe(2);
  });
});

describe('progressLevel', () => {
  it('increments wins counter on first win', () => {
    const state: GameState = {
      level: 1,
      cards: [],
      flippedIndices: [],
      wins: 0,
    };
    const result = progressLevel(state);
    expect(result.newLevel).toBe(1);
    expect(result.wins).toBe(1);
  });

  it('levels up after 2 consecutive wins', () => {
    const state: GameState = {
      level: 1,
      cards: [],
      flippedIndices: [],
      wins: 1,
    };
    const result = progressLevel(state);
    expect(result.newLevel).toBe(2);
    expect(result.wins).toBe(0);
  });

  it('does not level up beyond 4', () => {
    const state: GameState = {
      level: 4,
      cards: [],
      flippedIndices: [],
      wins: 1,
    };
    const result = progressLevel(state);
    expect(result.newLevel).toBe(4);
    expect(result.wins).toBe(2);
  });
});

describe('storage', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('loadLevel returns null when not set', async () => {
    const level = await loadLevel();
    expect(level).toBeNull();
  });

  it('saveLevel and loadLevel round-trip', async () => {
    await saveLevel(3);
    const level = await loadLevel();
    expect(level).toBe(3);
  });
});

describe('newRound theo chủ đề', () => {
  it('chủ đề con vật chỉ có thẻ con vật, mọi cấp', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of [1, 2, 3]) {
        const state = newRound(level, seed, mockCards, 'animals');
        expect(state.cards.every((c) => c.kind === 'farm' || c.kind === 'wild')).toBe(true);
      }
    }
  });
  it('chủ đề trái cây chỉ có thẻ trái cây, đủ số cặp nếu kho đủ', () => {
    const state = newRound(3, 7, mockCards, 'fruits');
    expect(state.cards.every((c) => c.kind === 'fruit')).toBe(true);
    expect(state.cards).toHaveLength(8);
  });
  it('mix giữ như cũ', () => {
    expect(newRound(2, 99, mockCards, 'mix')).toEqual(newRound(2, 99, mockCards));
  });
});
