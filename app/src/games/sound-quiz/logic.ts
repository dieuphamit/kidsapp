// Ai kêu đấy? - logic thuần cho quiz game
import { ANIMAL_IDS, type AnimalId } from '../../content/pictures';
import { pickFresh } from '../../core/gameOptions';

/** Mọi con vật có tiếng kêu thật (public/audio/sfx/animal-<id>.mp3). */
export const SOUND_ANIMALS = ANIMAL_IDS;
export type SoundAnimal = AnimalId;

/**
 * Con có file "tiếng kêu" nhưng không phải tiếng đặc trưng của nó nên bé không thể đoán:
 * cá (tiếng nước sủi bọt), thỏ (gần như không kêu), hươu cao cổ (khịt mũi).
 * Chúng vẫn có thể hiện làm thẻ gây nhiễu, chỉ không bao giờ là đáp án.
 */
export const UNCLEAR_SOUNDS: readonly SoundAnimal[] = ['fish', 'rabbit', 'giraffe'];

/** Kho đáp án của câu "Ai kêu đấy?": chỉ con có tiếng kêu nhận ra được. */
export const QUIZ_ANSWERS: readonly SoundAnimal[] = SOUND_ANIMALS.filter((a) => !UNCLEAR_SOUNDS.includes(a));

/** Cứ đúng chừng này câu thì ăn mừng một lần rồi chơi tiếp (không điểm số, không đếm sai). */
export const ROUND_SIZE = 5;

/** Vừa trả lời đúng câu thứ `correct` (đếm từ 1): đã tới lúc ăn mừng chưa? */
export function isRoundEnd(correct: number): boolean {
  return correct > 0 && correct % ROUND_SIZE === 0;
}

/** Số lượt gần nhất không được ra lại làm đáp án. */
export const ANSWER_MEMORY = 4;

export interface QuizQuestion {
  answer: SoundAnimal;
  choices: SoundAnimal[];
}

function makeRandom(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 1000) / 1000;
  };
}

/**
 * Tạo một câu hỏi mới cho quiz.
 * @param choiceCount Số lựa chọn (2/3/4 theo tuổi, xem choiceCountForAge)
 * @param seed Seed để random (không truyền thì dùng Math.random)
 * @param avoid Đáp án các ván vừa rồi (một con hoặc danh sách) để không lặp lại ngay
 */
export function newQuestion(
  choiceCount: 2 | 3 | 4,
  seed?: number,
  avoid?: SoundAnimal | readonly SoundAnimal[],
): QuizQuestion {
  const random = makeRandom(seed);
  const recent: readonly SoundAnimal[] = avoid === undefined ? [] : typeof avoid === 'string' ? [avoid] : avoid;

  const [answer] = pickFresh(QUIZ_ANSWERS, 1, recent, random);
  const distractors = pickFresh(
    SOUND_ANIMALS.filter((a) => a !== answer),
    choiceCount - 1,
    [],
    random,
  );
  const choices = pickFresh([answer, ...distractors], choiceCount, [], random);
  return { answer, choices };
}

/**
 * Số lựa chọn theo tuổi (đã quy theo độ khó bố mẹ chọn):
 * dưới 36 tháng 2 thẻ, 36–47 tháng 3 thẻ, từ 48 tháng 4 thẻ.
 */
export function choiceCountForAge(ageMonths: number): 2 | 3 | 4 {
  if (ageMonths < 36) return 2;
  if (ageMonths < 48) return 3;
  return 4;
}
