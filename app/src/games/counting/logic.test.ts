import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { initial, pick, reset, newRound, POOL, itemSayKey, helloKey, doneKey, type Round } from './logic';
import { contentByKey } from '../../core/content';
import type { Level } from '../../core/variety';
import type { Topic } from '../../core/gameOptions';

describe('counting/logic', () => {
  it('picks 3 different fruits returning count 1, 2, 3', () => {
    let state = initial();
    let result = pick(state, 1);
    expect(result.count).toBe(1);
    state = result.state;

    result = pick(state, 3);
    expect(result.count).toBe(2);
    state = result.state;

    result = pick(state, 5);
    expect(result.count).toBe(3);
    expect(state.done).toBe(false);
  });

  it('returns null when picking already picked fruit', () => {
    let state = initial();
    let result = pick(state, 2);
    expect(result.count).toBe(1);
    state = result.state;

    result = pick(state, 2);
    expect(result.count).toBeNull();
    expect(result.state.picked.length).toBe(1);
  });

  it('sets done when 10 fruits picked', () => {
    let state = initial();
    for (let i = 1; i <= 10; i++) {
      const result = pick(state, i);
      expect(result.count).toBe(i);
      state = result.state;
    }
    expect(state.done).toBe(true);
    expect(state.picked.length).toBe(10);
  });

  it('reset returns initial state', () => {
    let state = initial();
    state = pick(state, 1).state;
    state = pick(state, 2).state;
    const resetState = reset();
    expect(resetState.picked).toEqual([]);
    expect(resetState.done).toBe(false);
  });
});

describe('counting content keys exist', () => {
  it('number.1 to number.10, count.hello, count.done exist in content', () => {
    const content = contentByKey();
    for (let i = 1; i <= 10; i++) {
      expect(content.has(`number.${i}`)).toBe(true);
    }
    expect(content.has('count.hello')).toBe(true);
    expect(content.has('count.done')).toBe(true);
  });
});

describe('counting: độ khó và chủ đề', () => {
  const rounds = (level: Level, topic: Topic, n = 40) => {
    const out: Round[] = [];
    let last: Round | null = null;
    for (let i = 0; i < n; i++) {
      last = newRound(level, topic, last);
      out.push(last);
    }
    return out;
  };

  it('dễ 1–3, vừa 2–5: hiện đúng số cần đếm', () => {
    for (const r of rounds('easy', 'mix')) {
      expect(r.target).toBeGreaterThanOrEqual(1);
      expect(r.target).toBeLessThanOrEqual(3);
      expect(r.shown).toBe(r.target);
    }
    for (const r of rounds('medium', 'mix')) {
      expect(r.target).toBeGreaterThanOrEqual(2);
      expect(r.target).toBeLessThanOrEqual(5);
      expect(r.shown).toBe(r.target);
    }
  });

  it('khó: cây có 10 món, bé lấy đúng 2–10 món', () => {
    for (const r of rounds('hard', 'mix')) {
      expect(r.shown).toBe(10);
      expect(r.target).toBeGreaterThanOrEqual(2);
      expect(r.target).toBeLessThanOrEqual(10);
    }
  });

  it('chủ đề cố định loại món; trộn thì đổi loại mỗi lượt', () => {
    for (const topic of ['animals', 'fruits', 'shapes'] as const) {
      for (const r of rounds('medium', topic, 10)) {
        expect(r.kind).toBe(topic);
        expect(POOL[topic]).toContain(r.item);
      }
    }
    const mix = rounds('easy', 'mix');
    for (let i = 1; i < mix.length; i++) expect(mix[i].kind).not.toBe(mix[i - 1].kind);
  });

  it('lượt sau không lặp món và số của lượt trước', () => {
    const rs = rounds('hard', 'fruits');
    for (let i = 1; i < rs.length; i++) {
      expect(rs[i].item).not.toBe(rs[i - 1].item);
      expect(rs[i].target).not.toBe(rs[i - 1].target);
    }
  });

  it('hình có màu học, món khác không có màu', () => {
    for (const r of rounds('medium', 'shapes', 10)) expect(r.color).not.toBeNull();
    for (const r of rounds('medium', 'animals', 10)) expect(r.color).toBeNull();
  });

  it('đủ số thì không đếm thêm', () => {
    let s = initial(2);
    s = pick(s, 1).state;
    const r2 = pick(s, 5);
    expect(r2.count).toBe(2);
    expect(r2.state.done).toBe(true);
    expect(pick(r2.state, 7).count).toBeNull();
  });

  it('mọi món có ảnh/tiếng đọc, câu mới có đủ vi/ja/en', () => {
    const content = contentByKey();
    for (const kind of ['fruits', 'animals', 'shapes'] as const) {
      expect(content.has(helloKey(kind)), kind).toBe(true);
      for (const item of POOL[kind]) {
        expect(content.has(itemSayKey(kind, item)), `${kind}/${item}`).toBe(true);
        if (kind !== 'shapes') expect(existsSync(join(import.meta.dirname, '../../../public/cards', `${item}.png`)), item).toBe(true);
      }
    }
    for (const k of ['count.ask', 'count.all']) {
      const c = content.get(k)!;
      expect(c.vi && c.ja && c.en, k).toBeTruthy();
    }
    expect(doneKey({ kind: 'fruits', target: 10 })).toBe('count.done');
    expect(doneKey({ kind: 'animals', target: 10 })).toBe('count.all');
    expect(doneKey({ kind: 'fruits', target: 3 })).toBe('count.all');
  });
});
