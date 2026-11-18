/**
 * Trò "Mẹ ơi, con đâu?": kéo thú con về đúng thú mẹ.
 * Mỗi lượt có ~5 thú con lần lượt hiện ra; trên cỏ có 2–4 thú mẹ (theo tuổi).
 * Thả đúng: mẹ kêu (tiếng thật), con rúc vào mẹ. Thả sai: con nhẹ nhàng quay về, mẹ đúng lắc lư gọi.
 * Không điểm, không thua.
 */

export interface Pair {
  /** Id cặp, cũng là id thú con (key câu nói mama.ask.<id>, mama.found.<id>). */
  id: BabyId;
  /** Ảnh thú mẹ (public/cards/<mama>.png). */
  mama: string;
  /** Ảnh thú con (public/cards/<baby>.png). */
  baby: string;
  /** Tiếng kêu thật của mẹ: say('animal.<sound>-sound') → public/audio/sfx/animal-<sound>.mp3. */
  sound: string;
  /** Hướng nhìn trong ảnh (1 = sang phải, -1 = sang trái), để con rúc đúng phía mặt mẹ. */
  mamaFaces: 1 | -1;
  babyFaces: 1 | -1;
}

export const PAIRS = [
  { id: 'calf', mama: 'cow', baby: 'baby/calf', sound: 'cow', mamaFaces: -1, babyFaces: 1 },
  { id: 'chick', mama: 'mama/hen', baby: 'baby/chick', sound: 'chicken', mamaFaces: 1, babyFaces: 1 },
  { id: 'duckling', mama: 'duck', baby: 'baby/duckling', sound: 'duck', mamaFaces: -1, babyFaces: -1 },
  { id: 'lamb', mama: 'mama/sheep', baby: 'baby/lamb', sound: 'sheep', mamaFaces: 1, babyFaces: 1 },
  { id: 'piglet', mama: 'mama/pig', baby: 'baby/piglet', sound: 'pig', mamaFaces: -1, babyFaces: 1 },
  { id: 'foal', mama: 'horse', baby: 'baby/foal', sound: 'horse', mamaFaces: -1, babyFaces: -1 },
  { id: 'puppy', mama: 'dog', baby: 'baby/puppy', sound: 'dog', mamaFaces: 1, babyFaces: 1 },
] as const satisfies readonly (Omit<Pair, 'id'> & { id: string })[];

export type BabyId = (typeof PAIRS)[number]['id'];

export const BABY_IDS: readonly BabyId[] = PAIRS.map((p) => p.id);

/** Số thú con mỗi lượt. */
export const TURNS_PER_ROUND = 5;

export function pairById(id: BabyId): Pair {
  const p = PAIRS.find((x) => x.id === id);
  if (!p) throw new Error('không có cặp ' + id);
  return p;
}

/** Số thú mẹ trên màn theo tuổi (đã quy độ khó): <30 tháng 2, <48 tháng 3, còn lại 4. */
export function mamaCountForAge(ageMonths: number): number {
  if (ageMonths < 30) return 2;
  if (ageMonths < 48) return 3;
  return 4;
}

export interface Turn {
  /** Thú con cần tìm mẹ. */
  baby: BabyId;
  /** Các thú mẹ trên cỏ (id cặp), đã xáo; luôn có mẹ của baby. */
  mamas: BabyId[];
}

export interface State {
  turns: Turn[];
  /** Lượt đang chơi (0..turns.length); bằng turns.length là xong. */
  index: number;
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Lượt chơi mới: TURNS_PER_ROUND thú con khác nhau (tránh `avoid` nếu còn đủ),
 * mỗi con kèm (mamaCount - 1) thú mẹ khác để chọn.
 */
export function newRound(ageMonths: number, rand: () => number = Math.random, avoid: readonly BabyId[] = []): State {
  const count = Math.min(mamaCountForAge(ageMonths), PAIRS.length);
  const fresh = shuffle(BABY_IDS.filter((id) => !avoid.includes(id)), rand);
  const used = shuffle(BABY_IDS.filter((id) => avoid.includes(id)), rand);
  const babies = [...fresh, ...used].slice(0, Math.min(TURNS_PER_ROUND, BABY_IDS.length));
  const turns = babies.map((baby) => {
    const others = shuffle(BABY_IDS.filter((id) => id !== baby), rand).slice(0, count - 1);
    return { baby, mamas: shuffle([baby, ...others], rand) };
  });
  return { turns, index: 0 };
}

export function currentTurn(state: State): Turn | undefined {
  return state.turns[state.index];
}

/** Thả thú con hiện tại vào thú mẹ `mama`: 'ok' nếu đúng mẹ, 'wrong' nếu không. */
export function drop(state: State, mama: BabyId): 'ok' | 'wrong' {
  const turn = currentTurn(state);
  return turn && turn.baby === mama ? 'ok' : 'wrong';
}

/** Sang lượt kế (sau khi con đã về với mẹ). */
export function advance(state: State): State {
  return { ...state, index: Math.min(state.index + 1, state.turns.length) };
}

export function isDone(state: State): boolean {
  return state.index >= state.turns.length;
}

/** Key câu nói. */
export const askKey = (baby: BabyId) => `mama.ask.${baby}`;
export const foundKey = (baby: BabyId) => `mama.found.${baby}`;
export const soundKey = (baby: BabyId) => `animal.${pairById(baby).sound}-sound`;
export const HELLO_KEY = 'mama.hello';
export const DONE_KEY = 'mama.done';
