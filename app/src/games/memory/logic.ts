import { get, set } from 'idb-keyval';
import type { Topic } from '../../core/gameOptions';

// Card kinds allowed at each level
type CardKind = 'farm' | 'fruit' | 'wild';

const KINDS_BY_LEVEL: Record<number, CardKind[]> = {
  1: ['farm', 'fruit'],
  2: ['farm', 'fruit'],
  3: ['farm', 'fruit', 'wild'],
  4: ['farm', 'fruit', 'wild'],
};

const PAIRS_BY_LEVEL: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 6,
};

// Loại thẻ theo chủ đề bố mẹ chọn; 'mix' (và chủ đề không có thẻ) giữ như cũ
const KINDS_BY_TOPIC: Partial<Record<Topic, CardKind[]>> = {
  animals: ['farm', 'wild'],
  fruits: ['fruit'],
};

export interface Card {
  id: string; // e.g. "cow", "apple"
  kind: CardKind;
}

export interface CardState {
  id: string;
  kind: CardKind;
  flipped: boolean; // face up
  matched: boolean; // already paired
}

export interface GameState {
  level: number;
  cards: CardState[];
  flippedIndices: number[]; // indices of currently flipped (but not yet matched) cards (max 2)
  wins: number; // consecutive wins at current level
}

export type FlipResult = 'first' | 'match' | 'nomatch' | 'invalid';

/**
 * Simple seeded random number generator (Mulberry32)
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array in place using Fisher-Yates with seeded random
 */
function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick n random items from array using seeded random
 */
function pickRandom<T>(arr: T[], n: number, rand: () => number): T[] {
  const shuffled = shuffle([...arr], rand);
  return shuffled.slice(0, n);
}

/**
 * Create a new round with specified level and seed
 * @param level 1-4
 * @param seed random seed for deterministic shuffling
 * @param allCards all available cards from index.json
 * @param topic chủ đề bố mẹ chọn (mặc định trộn)
 */
export function newRound(level: number, seed: number, allCards: Card[], topic: Topic = 'mix'): GameState {
  const clampedLevel = Math.max(1, Math.min(4, level));
  const pairs = PAIRS_BY_LEVEL[clampedLevel];
  const allowedKinds = KINDS_BY_LEVEL[clampedLevel];

  const rand = mulberry32(seed);

  // Filter cards by allowed kinds
  let available = allCards.filter((c) => allowedKinds.includes(c.kind));
  const topicKinds = KINDS_BY_TOPIC[topic];
  if (topicKinds) {
    const inTopic = available.filter((c) => topicKinds.includes(c.kind));
    // Ít thẻ quá ở cấp này thì lấy mọi thẻ của chủ đề
    available = inTopic.length >= pairs ? inTopic : allCards.filter((c) => topicKinds.includes(c.kind));
  }

  // Pick random cards for pairs
  const selected = pickRandom(available, pairs, rand);

  // Create pairs (each card appears twice)
  const cardStates: CardState[] = [];
  for (const card of selected) {
    cardStates.push({ id: card.id, kind: card.kind, flipped: false, matched: false });
    cardStates.push({ id: card.id, kind: card.kind, flipped: false, matched: false });
  }

  // Shuffle the pairs
  shuffle(cardStates, rand);

  return {
    level: clampedLevel,
    cards: cardStates,
    flippedIndices: [],
    wins: 0,
  };
}

/**
 * Flip a card at index i
 * Returns the result of the flip action
 */
export function flip(state: GameState, i: number): FlipResult {
  const card = state.cards[i];
  if (!card) return 'invalid';

  // Can't flip a card that's already face up or matched
  if (card.flipped || card.matched) return 'invalid';

  // Can't flip if already 2 cards are face up and not matched
  if (state.flippedIndices.length >= 2) return 'invalid';

  // Flip the card
  card.flipped = true;
  state.flippedIndices.push(i);

  if (state.flippedIndices.length === 1) {
    return 'first';
  }

  // Two cards are now face up - check for match
  const [idx1, idx2] = state.flippedIndices;
  const card1 = state.cards[idx1];
  const card2 = state.cards[idx2];

  if (card1.id === card2.id) {
    // Match! Mark both as matched
    card1.matched = true;
    card2.matched = true;
    state.flippedIndices = [];
    return 'match';
  }

  // No match - cards stay face up for caller to handle flip-back
  return 'nomatch';
}

/**
 * Hide the currently flipped (but unmatched) cards
 * Call this after a delay when flip returns 'nomatch'
 */
export function hideFlipped(state: GameState): void {
  for (const idx of state.flippedIndices) {
    state.cards[idx].flipped = false;
  }
  state.flippedIndices = [];
}

/**
 * Check if all cards are matched
 */
export function isDone(state: GameState): boolean {
  return state.cards.every((c) => c.matched);
}

/**
 * Get IDs in position order (for e2e testing)
 */
export function reveal(state: GameState): string[] {
  return state.cards.map((c) => c.id);
}

/**
 * Calculate starting level based on age in months
 * < 36 months (3 years): level 1
 * >= 36 months: level 2
 */
export function startLevel(ageMonths: number): number {
  return ageMonths < 36 ? 1 : 2;
}

const STORAGE_KEY = 'memory.level';

/**
 * Load saved level from storage
 */
export async function loadLevel(): Promise<number | null> {
  const val = await get<number>(STORAGE_KEY);
  return val ?? null;
}

/**
 * Save level to storage
 */
export async function saveLevel(level: number): Promise<void> {
  await set(STORAGE_KEY, level);
}

/**
 * Handle level progression after winning a round
 * Returns the new level (may increase if 2 consecutive wins)
 */
export function progressLevel(state: GameState): { newLevel: number; wins: number } {
  const newWins = state.wins + 1;
  if (newWins >= 2 && state.level < 4) {
    // Level up after 2 consecutive wins
    return { newLevel: state.level + 1, wins: 0 };
  }
  return { newLevel: state.level, wins: newWins };
}
