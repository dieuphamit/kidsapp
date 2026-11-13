import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { newQuestion, choiceCountForAge, SOUND_ANIMALS, ANSWER_MEMORY, type SoundAnimal } from './logic';

describe('choiceCountForAge', () => {
  it('trả về 2 cho bé dưới 36 tháng', () => {
    expect(choiceCountForAge(24)).toBe(2);
    expect(choiceCountForAge(30)).toBe(2);
    expect(choiceCountForAge(35)).toBe(2);
  });

  it('trả về 3 cho bé 36–47 tháng', () => {
    expect(choiceCountForAge(36)).toBe(3);
    expect(choiceCountForAge(47)).toBe(3);
  });

  it('trả về 4 cho bé từ 48 tháng (độ khó Khó = 54 tháng)', () => {
    expect(choiceCountForAge(48)).toBe(4);
    expect(choiceCountForAge(54)).toBe(4);
    expect(choiceCountForAge(72)).toBe(4);
  });
});

describe('newQuestion', () => {
  it('trả về đúng số lựa chọn theo choiceCount', () => {
    const q2 = newQuestion(2, 12345);
    expect(q2.choices).toHaveLength(2);

    const q3 = newQuestion(3, 12345);
    expect(q3.choices).toHaveLength(3);
  });

  it('đáp án luôn nằm trong danh sách lựa chọn', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q2 = newQuestion(2, seed);
      expect(q2.choices).toContain(q2.answer);

      const q3 = newQuestion(3, seed);
      expect(q3.choices).toContain(q3.answer);
    }
  });

  it('các lựa chọn không trùng nhau', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q2 = newQuestion(2, seed);
      expect(new Set(q2.choices).size).toBe(q2.choices.length);

      const q3 = newQuestion(3, seed);
      expect(new Set(q3.choices).size).toBe(q3.choices.length);
    }
  });

  it('tất cả lựa chọn đều là thú có tiếng kêu', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q = newQuestion(3, seed);
      for (const choice of q.choices) {
        expect(SOUND_ANIMALS).toContain(choice);
      }
      expect(SOUND_ANIMALS).toContain(q.answer);
    }
  });

  it('không lặp đáp án ván trước khi truyền prevId', () => {
    // Chạy nhiều lần với các prevId khác nhau
    for (const prevId of SOUND_ANIMALS) {
      for (let seed = 0; seed < 10; seed++) {
        const q = newQuestion(3, seed, prevId);
        expect(q.answer).not.toBe(prevId);
      }
    }
  });

  it('seed cố định cho kết quả giống nhau', () => {
    const q1 = newQuestion(3, 99999);
    const q2 = newQuestion(3, 99999);
    expect(q1.answer).toBe(q2.answer);
    expect(q1.choices).toEqual(q2.choices);
  });

  it('seed khác nhau có thể cho kết quả khác nhau', () => {
    const answers = new Set<SoundAnimal>();
    for (let seed = 0; seed < 50; seed++) {
      const q = newQuestion(3, seed);
      answers.add(q.answer);
    }
    // Với 50 seeds, nên có nhiều hơn 1 đáp án khác nhau
    expect(answers.size).toBeGreaterThan(1);
  });
});

describe('kho con vật và trí nhớ ngắn', () => {
  it('mọi con vật có cả tiếng kêu animal-*.mp3 lẫn thẻ ảnh đều có trong quiz và ngược lại', () => {
    // Thú 3D của thế giới 5 khu có tiếng kêu nhưng chưa có thẻ ảnh; quiz cần ảnh để bé chọn.
    const cards = new Set(readdirSync(join(import.meta.dirname, '../../../public/cards')).map((f) => f.replace(/\.png$/, '')));
    const playable = readdirSync(join(import.meta.dirname, '../../../public/audio/sfx'))
      .map((f) => /^animal-([a-z]+)\.mp3$/.exec(f)?.[1])
      .filter((x): x is string => !!x && cards.has(x))
      .sort();
    expect([...SOUND_ANIMALS].sort()).toEqual(playable);
    for (const id of SOUND_ANIMALS) expect(cards.has(id)).toBe(true);
    expect(SOUND_ANIMALS.length).toBeGreaterThanOrEqual(20);
  });

  it('4 lựa chọn khác nhau, có đáp án', () => {
    for (let seed = 0; seed < 30; seed++) {
      const q = newQuestion(4, seed);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.answer);
    }
  });

  it('không lặp đáp án của vài ván gần nhất', () => {
    const recent: SoundAnimal[] = [];
    for (let i = 0; i < 60; i++) {
      const q = newQuestion(3, 1000 + i, recent);
      expect(recent).not.toContain(q.answer);
      recent.push(q.answer);
      if (recent.length > ANSWER_MEMORY) recent.shift();
    }
  });

  it('chơi lâu thì gặp được hầu hết con vật', () => {
    const seen = new Set<SoundAnimal>();
    const recent: SoundAnimal[] = [];
    for (let i = 0; i < 200; i++) {
      const q = newQuestion(2, 7 + i * 13, recent);
      seen.add(q.answer);
      recent.push(q.answer);
      if (recent.length > ANSWER_MEMORY) recent.shift();
    }
    expect(seen.size).toBeGreaterThanOrEqual(SOUND_ANIMALS.length - 2);
  });
});
