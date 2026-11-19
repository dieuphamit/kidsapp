/**
 * Trò "Đồ vật quanh bé" (words): thẻ học từ vựng đồ vật hằng ngày bằng ảnh chụp thật.
 * - Màn đầu: chọn chủ đề (quần áo, đồ ăn uống, xe cộ, đồ trong nhà) bằng nút ảnh to.
 * - Xem thẻ (mọi tuổi): một thẻ lớn, chạm thẻ thì thẻ nhún và đọc tên; xe cộ phát thêm tiếng thật.
 * - Tìm thẻ (≥ 36 tháng): sau vài thẻ tự xen một câu đố "Đâu là cái mũ?" với 2–4 thẻ.
 *   Chạm sai không có âm báo sai: thẻ đó tự nói tên mình rồi thẻ đúng nhún nhẹ gợi ý.
 * Không điểm, không thua.
 */

export type TopicId = 'clothes' | 'kitchen' | 'vehicles' | 'home';

export interface Thing {
  id: string;
  topic: TopicId;
  /** Tiếng thật (xe cộ): say('animal.<sound>-sound') → public/audio/sfx/animal-<sound>.mp3. */
  sound?: string;
}

export const TOPIC_IDS: readonly TopicId[] = ['clothes', 'kitchen', 'vehicles', 'home'];

export const THINGS: readonly Thing[] = [
  { id: 'shirt', topic: 'clothes' },
  { id: 'pants', topic: 'clothes' },
  { id: 'socks', topic: 'clothes' },
  { id: 'hat', topic: 'clothes' },
  { id: 'shoes', topic: 'clothes' },
  { id: 'boots', topic: 'clothes' },

  { id: 'cup', topic: 'kitchen' },
  { id: 'spoon', topic: 'kitchen' },
  { id: 'bowl', topic: 'kitchen' },
  { id: 'plate', topic: 'kitchen' },
  { id: 'pot', topic: 'kitchen' },
  { id: 'fork', topic: 'kitchen' },

  { id: 'car', topic: 'vehicles', sound: 'carhorn' },
  { id: 'bus', topic: 'vehicles' },
  { id: 'firetruck', topic: 'vehicles', sound: 'firetruck' },
  { id: 'ambulance', topic: 'vehicles' },
  { id: 'airplane', topic: 'vehicles' },
  { id: 'train', topic: 'vehicles', sound: 'train' },
  { id: 'bicycle', topic: 'vehicles', sound: 'bicyclebell' },
  { id: 'boat', topic: 'vehicles' },

  { id: 'ball', topic: 'home' },
  { id: 'teddy', topic: 'home' },
  { id: 'book', topic: 'home' },
  { id: 'bed', topic: 'home' },
  { id: 'chair', topic: 'home' },
  { id: 'clock', topic: 'home' },
  { id: 'toothbrush', topic: 'home' },
];

/** Ảnh đại diện của chủ đề trên màn chọn chủ đề. */
export const TOPIC_COVER: Record<TopicId, string> = {
  clothes: 'shirt',
  kitchen: 'cup',
  vehicles: 'bus',
  home: 'teddy',
};

export function thingById(id: string): Thing {
  const t = THINGS.find((x) => x.id === id);
  if (!t) throw new Error('không có đồ vật ' + id);
  return t;
}

export function thingsOf(topic: TopicId): Thing[] {
  return THINGS.filter((t) => t.topic === topic);
}

/** Từ tuổi này (tháng, đã quy độ khó) mới xen câu đố tìm thẻ. */
export const FIND_MIN_AGE = 36;
/** Xem đủ chừng này thẻ mới (kể từ câu đố trước) thì xen một câu đố. */
export const FIND_EVERY = 3;

export function findEnabled(ageMonths: number): boolean {
  return ageMonths >= FIND_MIN_AGE;
}

/** Số thẻ trong câu đố: < 44 tháng 2 thẻ, < 54 tháng 3 thẻ, còn lại 4. */
export function findCountForAge(ageMonths: number): number {
  if (ageMonths < 44) return 2;
  if (ageMonths < 54) return 3;
  return 4;
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Deck {
  topic: TopicId;
  /** Thứ tự thẻ (id), đã xáo. */
  order: string[];
  /** Thẻ đang xem. */
  index: number;
  /** Thẻ đã xem kể từ câu đố trước (id, theo thứ tự xem). */
  seen: string[];
}

/** Bộ thẻ mới của chủ đề; thẻ đầu tránh `avoidFirst` (thẻ vừa xem lần trước) nếu được. */
export function newDeck(topic: TopicId, rand: () => number = Math.random, avoidFirst?: string): Deck {
  let order = shuffle(thingsOf(topic).map((t) => t.id), rand);
  if (avoidFirst && order[0] === avoidFirst && order.length > 1) order = [...order.slice(1), order[0]];
  return { topic, order, index: 0, seen: [order[0]] };
}

export function currentCard(deck: Deck): string {
  return deck.order[deck.index];
}

function moveTo(deck: Deck, index: number): Deck {
  const n = deck.order.length;
  const i = ((index % n) + n) % n;
  const id = deck.order[i];
  const seen = deck.seen.includes(id) ? deck.seen : [...deck.seen, id];
  return { ...deck, index: i, seen };
}

/** Thẻ sau (hết bộ thì quay lại thẻ đầu). */
export function nextCard(deck: Deck): Deck {
  return moveTo(deck, deck.index + 1);
}

/** Thẻ trước (đang ở thẻ đầu thì sang thẻ cuối). */
export function prevCard(deck: Deck): Deck {
  return moveTo(deck, deck.index - 1);
}

/** Bấm "sau" thì có xen câu đố không: đủ tuổi và đã xem đủ FIND_EVERY thẻ mới. */
export function shouldQuiz(deck: Deck, ageMonths: number): boolean {
  return findEnabled(ageMonths) && deck.seen.length >= FIND_EVERY;
}

export interface Quiz {
  /** Thẻ cần tìm. */
  target: string;
  /** Các thẻ để chọn (đã xáo, luôn có target). */
  choices: string[];
}

/**
 * Câu đố: thẻ cần tìm lấy trong những thẻ bé vừa xem (tránh `avoidTarget` nếu được),
 * các thẻ còn lại lấy cùng chủ đề.
 */
export function makeQuiz(deck: Deck, count: number, rand: () => number = Math.random, avoidTarget?: string): Quiz {
  const pool = thingsOf(deck.topic).map((t) => t.id);
  const seen = deck.seen.filter((id) => id !== avoidTarget);
  const from = seen.length ? seen : deck.seen.length ? deck.seen : pool;
  const target = from[Math.floor(rand() * from.length)];
  const n = Math.max(2, Math.min(count, pool.length));
  const others = shuffle(pool.filter((id) => id !== target), rand).slice(0, n - 1);
  return { target, choices: shuffle([target, ...others], rand) };
}

/** Chạm một thẻ trong câu đố. */
export function answer(quiz: Quiz, id: string): 'ok' | 'wrong' {
  return id === quiz.target ? 'ok' : 'wrong';
}

/** Sau câu đố: bắt đầu đếm lại thẻ đã xem, chuyển sang thẻ kế. */
export function afterQuiz(deck: Deck): Deck {
  const next = nextCard({ ...deck, seen: [] });
  return { ...next, seen: [currentCard(next)] };
}

/** Key câu nói (src/content/words.json). */
export const HELLO_KEY = 'words.hello';
export const FIND_KEY = 'words.find';
export const topicKey = (t: TopicId) => `words.topic.${t}`;
export const nameKey = (id: string) => `words.${id}`;
export const askKey = (id: string) => `words.ask.${id}`;
export const thisKey = (id: string) => `words.this.${id}`;
export const yesKey = (id: string) => `words.yes.${id}`;
export function soundKey(id: string): string | null {
  const s = thingById(id).sound;
  return s ? `animal.${s}-sound` : null;
}

/** Ảnh thẻ: public/cards/words/<id>.png. */
export const cardPath = (id: string) => `cards/words/${id}.png`;

/** Khung Stage và vùng an toàn (góc trên-phải là cổng bố mẹ: chừa ≥ 144px bên phải). */
export const STAGE_W = 1194;
export const STAGE_H = 834;
export const SAFE_RIGHT = STAGE_W - 144;
/** Tâm ngang của vùng chơi (giữa lề trái 24 và SAFE_RIGHT). */
export const PLAY_CX = Math.round((24 + SAFE_RIGHT) / 2);

export interface Box {
  x: number;
  y: number;
  size: number;
}

/** Thẻ lớn ở chế độ xem thẻ và hai nút trước/sau hai bên. */
export const VIEW_CARD: Box = { x: PLAY_CX - 230, y: 196, size: 460 };
export const NAV_SIZE = 160;
export const NAV_GAP = 40;
export const PREV_BOX: Box = { x: VIEW_CARD.x - NAV_GAP - NAV_SIZE, y: VIEW_CARD.y + (VIEW_CARD.size - NAV_SIZE) / 2, size: NAV_SIZE };
export const NEXT_BOX: Box = { x: VIEW_CARD.x + VIEW_CARD.size + NAV_GAP, y: PREV_BOX.y, size: NAV_SIZE };

/** Vị trí các thẻ trong câu đố: 2–3 thẻ một hàng, 4 thẻ xếp 2×2. */
export function quizLayout(count: number): Box[] {
  if (count >= 4) {
    const size = 270;
    const gap = 40;
    const x0 = PLAY_CX - size - gap / 2;
    const y0 = 196;
    return [0, 1, 2, 3].map((i) => ({ x: x0 + (i % 2) * (size + gap), y: y0 + Math.floor(i / 2) * (size + gap), size }));
  }
  const size = count === 3 ? 290 : 340;
  const gap = count === 3 ? 40 : 64;
  const total = count * size + (count - 1) * gap;
  const x0 = PLAY_CX - total / 2;
  const y = 290;
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (size + gap), y, size }));
}

/** Nút chủ đề trên màn chọn chủ đề: lưới 2×2. */
export const TOPIC_SIZE = 270;
export function topicLayout(): Box[] {
  const gap = 48;
  const x0 = PLAY_CX - TOPIC_SIZE - gap / 2;
  const y0 = 180;
  return TOPIC_IDS.map((_, i) => ({ x: x0 + (i % 2) * (TOPIC_SIZE + gap), y: y0 + Math.floor(i / 2) * (TOPIC_SIZE + gap), size: TOPIC_SIZE }));
}
