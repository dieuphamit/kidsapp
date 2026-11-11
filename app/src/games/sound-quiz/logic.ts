// Ai kêu đấy? - logic thuần cho quiz game

/** 8 con vật trang trại */
export const FARM_ANIMALS = ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit'] as const;
export type FarmAnimal = (typeof FARM_ANIMALS)[number];

export interface QuizQuestion {
  answer: FarmAnimal;
  choices: FarmAnimal[];
}

/**
 * Tạo một câu hỏi mới cho quiz.
 * @param choiceCount Số lựa chọn (2 cho bé < 36 tháng, 3 cho bé >= 36 tháng)
 * @param seed Seed để random (hoặc không truyền thì dùng Math.random)
 * @param prevId ID đáp án ván trước để tránh trùng (hoặc undefined)
 */
export function newQuestion(
  choiceCount: 2 | 3,
  seed?: number,
  prevId?: FarmAnimal,
): QuizQuestion {
  // Simple seeded random using local variable
  let s = seed ?? 0;
  const random = seed !== undefined
    ? () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return (s % 1000) / 1000;
      }
    : Math.random;

  // Chọn đáp án không trùng ván trước
  const availableAnswers = FARM_ANIMALS.filter((a) => a !== prevId);
  const answerIdx = Math.floor(random() * availableAnswers.length);
  const answer = availableAnswers[answerIdx];

  // Chọn các lựa chọn nhiễu khác đáp án
  const others = FARM_ANIMALS.filter((a) => a !== answer);
  const distractors: FarmAnimal[] = [];
  const shuffled = [...others].sort(() => random() - 0.5);
  for (let i = 0; i < choiceCount - 1; i++) {
    distractors.push(shuffled[i]);
  }

  // Gộp và xáo trộn vị trí
  const choices = [answer, ...distractors].sort(() => random() - 0.5);

  return { answer, choices };
}

/**
 * Trả về choiceCount phù hợp theo tuổi.
 * @param ageMonths Tuổi bé tính theo tháng
 */
export function choiceCountForAge(ageMonths: number): 2 | 3 {
  return ageMonths < 36 ? 2 : 3;
}
