export const HOLD_MS = 3000;
/** Số nút đáp án trong câu hỏi xác nhận phụ huynh. */
export const CHOICE_COUNT = 4;

export type GateOp = '+' | '×';

export interface GateQuestion {
  a: number;
  b: number;
  op: GateOp;
  answer: number;
  /** CHOICE_COUNT số khác nhau, có đúng một đáp án đúng, thứ tự đã trộn. */
  choices: number[];
}

const pick = (rand: () => number, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

/** Chữ câu hỏi hiện cho bố mẹ, ví dụ "7 × 8 = ?". */
export function questionText(q: Pick<GateQuestion, 'a' | 'b' | 'op'>): string {
  return `${q.a} ${q.op} ${q.b} = ?`;
}

/**
 * Câu hỏi người lớn: phép nhân bảng cửu chương (3–9 × 3–9) hoặc phép cộng hai số có 2 chữ số
 * (có nhớ), kèm 4 đáp án gần đúng để bé 2–5 tuổi không đoán theo độ lớn của số.
 */
export function makeQuestion(rand: () => number = Math.random): GateQuestion {
  const op: GateOp = rand() < 0.5 ? '×' : '+';
  let a: number, b: number, answer: number;
  let near: number[];
  if (op === '×') {
    a = pick(rand, 3, 9);
    b = pick(rand, 3, 9);
    answer = a * b;
    // nhầm một hàng của bảng cửu chương, hoặc lệch vài đơn vị
    near = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, answer + 2, answer - 2, answer + 10, answer - 10];
  } else {
    a = pick(rand, 15, 49);
    b = pick(rand, 15, 49);
    answer = a + b;
    // quên nhớ / nhớ thừa (±10), lệch hàng đơn vị
    near = [answer + 10, answer - 10, answer + 1, answer - 1, answer + 2, answer - 2, answer + 11, answer - 9];
  }
  const pool = [...new Set(near.filter((n) => n > 0 && n !== answer))];
  const choices = [answer];
  while (choices.length < CHOICE_COUNT && pool.length > 0) {
    choices.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  // trộn Fisher–Yates để vị trí đáp án đúng không cố định
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { a, b, op, answer, choices };
}

export function checkAnswer(q: GateQuestion, choice: number): boolean {
  return choice === q.answer;
}
