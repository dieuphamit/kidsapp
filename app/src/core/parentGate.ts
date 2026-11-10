export const HOLD_MS = 3000;

export interface GateQuestion {
  a: number;
  b: number;
  answer: number;
}

export function makeQuestion(rand: () => number = Math.random): GateQuestion {
  const a = 10 + Math.floor(rand() * 40);
  const b = 10 + Math.floor(rand() * 40);
  return { a, b, answer: a + b };
}

export function checkAnswer(q: GateQuestion, input: string): boolean {
  const t = input.trim();
  return t !== '' && Number(t) === q.answer;
}
