/**
 * Trò "Cho thú ăn": một con thú thật đứng giữa màn, đói bụng; dưới là khay 2–4 món ăn ảnh thật.
 * Kéo đúng món thú thích vào miệng: thú nhai, thanh no bụng đầy thêm (không bao giờ giảm).
 * Đủ số miếng thì thú no, vui, kêu tiếng thật rồi sang con kế. Kéo món khác: thú lắc đầu nhẹ,
 * món trôi về khay. Không điểm, không thua.
 */

export interface Animal {
  /** Id thú, cũng là hậu tố key câu nói feed.hungry.<id>, feed.likes.<id>... */
  id: string;
  /** Ảnh thú thật (public/cards/<card>.png). */
  card: string;
  /** Món thú thích (id trong FOODS). */
  food: FoodId;
  /**
   * Tiếng kêu: key câu nói. Thú có ghi âm thật thì 'animal.<x>-sound'
   * (public/audio/sfx/animal-<x>.mp3), chưa có thì câu TTS trong feed.json.
   */
  sound: string;
  /** Vị trí miệng trong ảnh (tỉ lệ 0..1 theo khung vuông của thẻ), món bay vào đây. */
  mouth: readonly [number, number];
}

export const FOODS = {
  carrot: { card: 'feed/carrot' },
  banana: { card: 'banana' },
  bamboo: { card: 'feed/bamboo' },
  bone: { card: 'feed/bone' },
  fish: { card: 'feed/fish' },
  corn: { card: 'feed/corn' },
  apple: { card: 'apple' },
} as const satisfies Record<string, { card: string }>;

export type FoodId = keyof typeof FOODS;
export const FOOD_IDS = Object.keys(FOODS) as FoodId[];

export const ANIMALS = [
  { id: 'rabbit', card: 'bath/rabbit', food: 'carrot', sound: 'animal.rabbit-sound', mouth: [0.09, 0.615] },
  { id: 'monkey', card: 'feed/monkey', food: 'banana', sound: 'animal.monkey-sound', mouth: [0.58, 0.52] },
  { id: 'panda', card: 'bath/panda', food: 'bamboo', sound: 'animal.panda-sound', mouth: [0.31, 0.59] },
  { id: 'dog', card: 'bath/dog', food: 'bone', sound: 'animal.dog-sound', mouth: [0.24, 0.755] },
  { id: 'cat', card: 'feed/cat', food: 'fish', sound: 'feed.sound.cat', mouth: [0.16, 0.565] },
  { id: 'chicken', card: 'feed/hen', food: 'corn', sound: 'animal.chicken-sound', mouth: [0.9, 0.395] },
  { id: 'horse', card: 'feed/horse', food: 'apple', sound: 'animal.horse-sound', mouth: [0.09, 0.58] },
] as const satisfies readonly Animal[];

export type AnimalId = (typeof ANIMALS)[number]['id'];
export const ANIMAL_IDS: readonly AnimalId[] = ANIMALS.map((a) => a.id);

/** Số con thú mỗi lượt chơi. */
export const TURNS_PER_ROUND = 4;

export function animalById(id: AnimalId): Animal {
  const a = ANIMALS.find((x) => x.id === id);
  if (!a) throw new Error('không có thú ' + id);
  return a;
}

/** Số món trên khay theo tuổi (đã quy độ khó): <30 tháng 2, <48 tháng 3, còn lại 4. */
export function foodCountForAge(ageMonths: number): number {
  if (ageMonths < 30) return 2;
  if (ageMonths < 48) return 3;
  return 4;
}

/** Số miếng để no: bé nhỏ 2 miếng cho nhanh thấy kết quả, lớn hơn 3. */
export function bitesForAge(ageMonths: number): number {
  return ageMonths < 36 ? 2 : 3;
}

export interface Turn {
  animal: AnimalId;
  /** Món trên khay, đã xáo; luôn có món thú thích, các món còn lại là món của thú khác. */
  foods: FoodId[];
}

export interface State {
  turns: Turn[];
  /** Con đang cho ăn (0..turns.length); bằng turns.length là xong lượt. */
  index: number;
  /** Số miếng con hiện tại đã ăn (chỉ tăng). */
  bites: number;
  /** Số miếng để no. */
  need: number;
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
 * Lượt mới: TURNS_PER_ROUND con khác nhau (tránh `avoid` nếu còn đủ), mỗi con một khay
 * gồm món nó thích và (foodCount - 1) món của thú khác.
 */
export function newRound(ageMonths: number, rand: () => number = Math.random, avoid: readonly AnimalId[] = []): State {
  const count = Math.min(foodCountForAge(ageMonths), FOOD_IDS.length);
  const fresh = shuffle(ANIMAL_IDS.filter((id) => !avoid.includes(id)), rand);
  const used = shuffle(ANIMAL_IDS.filter((id) => avoid.includes(id)), rand);
  const animals = [...fresh, ...used].slice(0, Math.min(TURNS_PER_ROUND, ANIMAL_IDS.length));
  const turns = animals.map((animal) => {
    const food = animalById(animal).food;
    const others = shuffle(FOOD_IDS.filter((f) => f !== food), rand).slice(0, count - 1);
    return { animal, foods: shuffle([food, ...others], rand) };
  });
  return { turns, index: 0, bites: 0, need: bitesForAge(ageMonths) };
}

export function currentTurn(state: State): Turn | undefined {
  return state.turns[state.index];
}

export type FeedResult = 'yum' | 'full' | 'nope';

/**
 * Đưa món `food` cho thú hiện tại.
 * 'yum' = thú ăn, chưa no; 'full' = miếng cuối, thú no; 'nope' = thú không ăn món này (không đổi gì).
 */
export function feed(state: State, food: FoodId): { state: State; result: FeedResult } {
  const turn = currentTurn(state);
  if (!turn || state.bites >= state.need || animalById(turn.animal).food !== food) return { state, result: 'nope' };
  const bites = state.bites + 1;
  return { state: { ...state, bites }, result: bites >= state.need ? 'full' : 'yum' };
}

/** Sang con kế (sau khi con hiện tại đã no). */
export function advance(state: State): State {
  return { ...state, index: Math.min(state.index + 1, state.turns.length), bites: 0 };
}

export function isDone(state: State): boolean {
  return state.index >= state.turns.length;
}

/** Key câu nói. */
export const hungryKey = (a: AnimalId) => `feed.hungry.${a}`;
export const likesKey = (a: AnimalId) => `feed.likes.${a}`;
export const hintKey = (a: AnimalId) => `feed.hint.${a}`;
export const fullKey = (a: AnimalId) => `feed.full.${a}`;
export const foodKey = (f: FoodId) => `feed.food.${f}`;
export const soundKey = (a: AnimalId) => animalById(a).sound;
export const HELLO_KEY = 'feed.hello';
export const DONE_KEY = 'feed.done';
