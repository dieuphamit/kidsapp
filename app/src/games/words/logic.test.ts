import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  THINGS,
  TOPIC_IDS,
  TOPIC_COVER,
  thingsOf,
  thingById,
  newDeck,
  currentCard,
  nextCard,
  prevCard,
  shouldQuiz,
  makeQuiz,
  answer,
  afterQuiz,
  findCountForAge,
  findEnabled,
  quizLayout,
  topicLayout,
  VIEW_CARD,
  PREV_BOX,
  NEXT_BOX,
  SAFE_RIGHT,
  STAGE_H,
  HELLO_KEY,
  FIND_KEY,
  topicKey,
  nameKey,
  askKey,
  thisKey,
  yesKey,
  soundKey,
  cardPath,
  type Box,
} from './logic';
import { manifest } from './manifest';
import { contentByKey } from '../../core/content';

/** Bộ sinh số giả cố định để test lặp lại được. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const PUBLIC = join(import.meta.dirname, '../../../public');

describe('dữ liệu đồ vật', () => {
  it('ít nhất 3 chủ đề, mỗi chủ đề 6–8 đồ, id không trùng', () => {
    const ids = THINGS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const used = TOPIC_IDS.filter((t) => thingsOf(t).length > 0);
    expect(used.length).toBeGreaterThanOrEqual(3);
    for (const t of used) {
      expect(thingsOf(t).length, t).toBeGreaterThanOrEqual(6);
      expect(thingsOf(t).length, t).toBeLessThanOrEqual(8);
    }
  });

  it('ảnh đại diện chủ đề là một đồ của chủ đề đó', () => {
    for (const t of TOPIC_IDS) expect(thingById(TOPIC_COVER[t]).topic).toBe(t);
  });

  it('mỗi đồ có ảnh thẻ thật (PNG nhỏ gọn) ở public/cards/words/', () => {
    for (const t of THINGS) {
      const file = join(PUBLIC, cardPath(t.id));
      expect(existsSync(file), `Thiếu ${cardPath(t.id)}`).toBe(true);
      expect(statSync(file).size, `${t.id}.png quá nặng`).toBeLessThan(220 * 1024);
    }
  });

  it('mọi câu nói có trong content (vi/ja/en)', () => {
    const content = contentByKey();
    const keys = [HELLO_KEY, FIND_KEY, 'game.words', ...TOPIC_IDS.map(topicKey)];
    for (const t of THINGS) keys.push(nameKey(t.id), askKey(t.id), thisKey(t.id), yesKey(t.id));
    for (const k of keys) {
      const item = content.get(k);
      expect(item, `Thiếu ${k}`).toBeDefined();
      expect(item!.vi && item!.ja && item!.en, k).toBeTruthy();
    }
  });

  it('xe có tiếng thật thì file sfx tồn tại; đồ khác không có tiếng', () => {
    for (const t of THINGS) {
      const key = soundKey(t.id);
      if (t.topic !== 'vehicles') expect(key).toBeNull();
      if (!t.sound) continue;
      expect(key).toBe(`animal.${t.sound}-sound`);
      expect(existsSync(join(PUBLIC, 'audio/sfx', `animal-${t.sound}.mp3`)), `Thiếu sfx animal-${t.sound}.mp3`).toBe(true);
    }
  });
});

describe('xem thẻ', () => {
  it('bộ thẻ chứa đủ đồ của chủ đề, thẻ đầu đã tính là đã xem', () => {
    const d = newDeck('kitchen', seeded(1));
    expect([...d.order].sort()).toEqual(thingsOf('kitchen').map((t) => t.id).sort());
    expect(d.index).toBe(0);
    expect(d.seen).toEqual([currentCard(d)]);
  });

  it('tránh thẻ đầu vừa xem lần trước', () => {
    for (let s = 1; s < 20; s++) {
      const first = currentCard(newDeck('vehicles', seeded(s)));
      expect(currentCard(newDeck('vehicles', seeded(s), first))).not.toBe(first);
    }
  });

  it('sau/trước quay vòng hết bộ', () => {
    const d = newDeck('home', seeded(3));
    const n = d.order.length;
    let x = d;
    for (let i = 0; i < n; i++) x = nextCard(x);
    expect(x.index).toBe(0);
    expect(prevCard(d).index).toBe(n - 1);
    expect(x.seen.length).toBe(n);
  });
});

describe('tìm thẻ', () => {
  it('chỉ từ 36 tháng; số thẻ 2/3/4 theo tuổi', () => {
    expect(findEnabled(24)).toBe(false);
    expect(findEnabled(35)).toBe(false);
    expect(findEnabled(36)).toBe(true);
    expect(findCountForAge(36)).toBe(2);
    expect(findCountForAge(48)).toBe(3);
    expect(findCountForAge(54)).toBe(4);
    expect(findCountForAge(72)).toBe(4);
  });

  it('xen câu đố sau khi xem đủ 3 thẻ (chỉ khi đủ tuổi)', () => {
    let d = newDeck('clothes', seeded(5));
    expect(shouldQuiz(d, 48)).toBe(false);
    d = nextCard(d);
    expect(shouldQuiz(d, 48)).toBe(false);
    d = nextCard(d);
    expect(shouldQuiz(d, 48)).toBe(true);
    expect(shouldQuiz(d, 30)).toBe(false);
  });

  it('câu đố: thẻ cần tìm là thẻ vừa xem, đủ số thẻ, không trùng, cùng chủ đề', () => {
    for (let s = 1; s < 30; s++) {
      const r = seeded(s);
      let d = newDeck('vehicles', r);
      d = nextCard(nextCard(d));
      for (const count of [2, 3, 4]) {
        const q = makeQuiz(d, count, r);
        expect(q.choices).toHaveLength(count);
        expect(new Set(q.choices).size).toBe(count);
        expect(q.choices).toContain(q.target);
        expect(d.seen).toContain(q.target);
        for (const c of q.choices) expect(thingById(c).topic).toBe('vehicles');
      }
    }
  });

  it('tránh hỏi lại thẻ đang xem nếu còn thẻ khác đã xem', () => {
    for (let s = 1; s < 30; s++) {
      const d = nextCard(nextCard(newDeck('home', seeded(s))));
      expect(makeQuiz(d, 3, seeded(s + 7), currentCard(d)).target).not.toBe(currentCard(d));
    }
  });

  it('chạm đúng/sai; sau câu đố đếm lại và sang thẻ kế', () => {
    const d = nextCard(nextCard(newDeck('kitchen', seeded(9))));
    const q = makeQuiz(d, 3, seeded(2));
    expect(answer(q, q.target)).toBe('ok');
    expect(answer(q, q.choices.find((c) => c !== q.target)!)).toBe('wrong');
    const after = afterQuiz(d);
    expect(after.index).toBe((d.index + 1) % d.order.length);
    expect(after.seen).toEqual([currentCard(after)]);
    expect(shouldQuiz(after, 60)).toBe(false);
  });
});

describe('bố cục trong khung 1194×834', () => {
  const ok = (b: Box, label: string) => {
    expect(b.size, label).toBeGreaterThanOrEqual(120);
    expect(b.x, label).toBeGreaterThanOrEqual(24);
    expect(b.x + b.size, label).toBeLessThanOrEqual(SAFE_RIGHT);
    // dưới hàng nút trên cùng (nhà, chủ đề: 24..144)
    expect(b.y, label).toBeGreaterThanOrEqual(168);
    expect(b.y + b.size, label).toBeLessThanOrEqual(STAGE_H - 24);
  };
  const apart = (bs: Box[]) => {
    for (let i = 0; i < bs.length; i++)
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i];
        const b = bs[j];
        const gapX = Math.max(b.x - (a.x + a.size), a.x - (b.x + b.size));
        const gapY = Math.max(b.y - (a.y + a.size), a.y - (b.y + b.size));
        expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(24);
      }
  };

  it('xem thẻ: thẻ và hai nút trong vùng an toàn, cách nhau ≥24px', () => {
    for (const [b, l] of [[VIEW_CARD, 'card'], [PREV_BOX, 'prev'], [NEXT_BOX, 'next']] as const) ok(b, l);
    apart([VIEW_CARD, PREV_BOX, NEXT_BOX]);
  });

  it('câu đố 2/3/4 thẻ', () => {
    for (const n of [2, 3, 4]) {
      const bs = quizLayout(n);
      expect(bs).toHaveLength(n);
      bs.forEach((b, i) => ok(b, `${n}-${i}`));
      apart(bs);
    }
  });

  it('màn chọn chủ đề', () => {
    const bs = topicLayout();
    expect(bs).toHaveLength(TOPIC_IDS.length);
    bs.forEach((b, i) => ok(b, `topic-${i}`));
    apart(bs);
  });
});

describe('manifest', () => {
  it('words ở Nhà, 24–72 tháng, có độ khó', () => {
    expect(manifest.id).toBe('words');
    expect(manifest.place).toBe('place.house');
    expect(manifest.minAge).toBe(24);
    expect(manifest.maxAge).toBe(72);
    expect(manifest.options?.difficulty).toBe(true);
    expect(manifest.title).toEqual({ vi: 'Đồ vật quanh bé', ja: 'みのまわりの もの', en: 'Things around me' });
  });
});
