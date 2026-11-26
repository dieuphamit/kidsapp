import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANIMALS,
  ANIMAL_IDS,
  MISSIONS,
  MISSION_IDS,
  VEHICLE_IDS,
  MISSIONS_PER_ROUND,
  GARAGE_COUNT,
  DRIVE_NEED,
  RUB_NEED,
  ACT_KIND,
  stepsFor,
  newRound,
  currentMission,
  currentStep,
  pickVehicle,
  hintVehicle,
  drive,
  driveProgress,
  completeDrag,
  rub,
  rubLeft,
  advance,
  isDone,
  callKey,
  goKey,
  carKey,
  doKey,
  doneKey,
  HELLO_KEY,
  OTHER_KEY,
  DRIVE_KEY,
  PARTY_KEY,
  missionById,
  animalById,
  type Act,
  type State,
} from './logic';
import sharp from 'sharp';
import { CAPTAIN, CAPTAIN_PICK, HANDLE, STAGE_H, STAGE_W, bodyPoint, clampHandle, layoutGarage, reached, rescueLayout } from './layout';
import type { Level } from '../../core/variety';

const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');
const CONTENT = join(import.meta.dirname, '..', '..', 'content');
const LEVELS: Level[] = ['easy', 'medium', 'hard'];

/** Số giả ngẫu nhiên cố định cho test lặp lại được. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function contentKeys(): Map<string, { vi: string; ja: string; en: string }> {
  const map = new Map<string, { vi: string; ja: string; en: string }>();
  for (const f of ['rescue.json', 'feed.json']) {
    for (const item of JSON.parse(readFileSync(join(CONTENT, f), 'utf8'))) map.set(item.key, item);
  }
  return map;
}

/** Đi tới phần cứu hộ của nhiệm vụ đang làm. */
function toRescue(s: State): State {
  const m = currentMission(s)!;
  const picked = pickVehicle(s, m.vehicle);
  expect(picked.result).toBe('right');
  const arrived = drive(picked.state, 99_999);
  expect(arrived.arrived).toBe(true);
  return arrived.state;
}

/** Làm hết các bước cứu hộ của nhiệm vụ đang làm. */
function finishRescue(s: State): State {
  let cur = s;
  for (let guard = 0; guard < 20 && cur.phase === 'rescue'; guard++) {
    const st = currentStep(cur)!;
    if (st.kind === 'drag') cur = completeDrag(cur).state;
    else for (let i = 0; i < st.targets; i++) cur = rub(cur, i, 99_999).state;
  }
  return cur;
}

describe('Đội cứu hộ: dữ liệu', () => {
  it('có ≥6 nhiệm vụ, ≥5 loại xe, ≥8 con vật được cứu', () => {
    expect(MISSIONS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(MISSIONS.map((m) => m.vehicle)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(MISSIONS.flatMap((m) => [...m.animals])).size).toBeGreaterThanOrEqual(8);
    for (const m of MISSIONS) {
      expect(VEHICLE_IDS).toContain(m.vehicle);
      expect(m.animals.length).toBeGreaterThanOrEqual(3);
      for (const a of m.animals) expect(ANIMAL_IDS).toContain(a);
    }
    // con vật nào trong kho cũng được dùng
    for (const a of ANIMAL_IDS) expect(MISSIONS.some((m) => (m.animals as readonly string[]).includes(a)), a).toBe(true);
  });

  it('mọi con vật có ảnh thật và tiếng kêu (ghi âm thật hoặc câu trong content)', () => {
    const keys = contentKeys();
    for (const a of ANIMALS) {
      expect(existsSync(join(PUBLIC, a.img)), a.img).toBe(true);
      const m = /^animal\.([a-z]+)-sound$/.exec(a.sound);
      if (m) expect(existsSync(join(PUBLIC, 'audio', 'sfx', `animal-${m[1]}.mp3`)), a.sound).toBe(true);
      else expect(keys.has(a.sound), a.sound).toBe(true);
    }
  });

  it('mọi câu nói của trò có trong content với đủ vi, ja, en và có file giọng đọc', () => {
    const keys = contentKeys();
    const acts = Object.keys(ACT_KIND) as Act[];
    const need = [
      'game.rescue',
      HELLO_KEY,
      OTHER_KEY,
      DRIVE_KEY,
      PARTY_KEY,
      ...MISSION_IDS.flatMap((m) => [callKey(m), doneKey(m)]),
      ...VEHICLE_IDS.flatMap((v) => [goKey(v), carKey(v)]),
      ...acts.map(doKey),
    ];
    for (const k of need) {
      const item = keys.get(k);
      expect(item, k).toBeDefined();
      for (const lang of ['vi', 'ja', 'en'] as const) {
        expect(item?.[lang], `${k}.${lang}`).toBeTruthy();
        expect(existsSync(join(PUBLIC, 'audio', lang, `${k}.mp3`)), `${lang}/${k}.mp3`).toBe(true);
      }
    }
    // thao tác nào cũng được dùng trong ít nhất một nhiệm vụ
    const used = new Set(MISSION_IDS.flatMap((m) => LEVELS.flatMap((l) => stepsFor(m, l).map((s) => s.act))));
    for (const a of acts) expect(used.has(a), a).toBe(true);
  });
});

describe('Đội cứu hộ: độ khó', () => {
  it('bé nhỏ 1 bước ngắn; mức vừa dài hơn; bé lớn 3 bước nhỏ', () => {
    for (const m of MISSION_IDS) {
      const units = (l: Level) => stepsFor(m, l).reduce((n, s) => n + s.targets, 0);
      expect(units('easy'), m).toBe(1);
      // mức vừa: mọi nhiệm vụ đều 2 phần việc (trước đây "kẹt trên cây" chỉ có 1 bước)
      expect(units('medium'), m).toBe(2);
      expect(units('hard'), m).toBe(3);
      for (const l of LEVELS) for (const s of stepsFor(m, l)) expect(s.kind).toBe(ACT_KIND[s.act]);
    }
    expect(stepsFor('fire', 'medium')[0].targets).toBe(2);
    expect(stepsFor('hurt', 'medium').map((s) => s.n)).toEqual([0, 1]);
    expect(stepsFor('tree', 'medium').map((s) => s.act)).toEqual(['ladderUp', 'animalDown']);
    expect(GARAGE_COUNT).toEqual({ easy: 2, medium: 3, hard: 4 });
    expect(MISSIONS_PER_ROUND).toEqual({ easy: 3, medium: 4, hard: 5 });
    expect(DRIVE_NEED.easy).toBeLessThan(DRIVE_NEED.hard);
  });

  it('lượt mới: đủ số nhiệm vụ khác nhau, ga-ra có xe đúng và không trùng xe', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 40; seed++) {
        const s = newRound(level, seeded(seed));
        expect(s.missions).toHaveLength(MISSIONS_PER_ROUND[level]);
        expect(new Set(s.missions.map((m) => m.id)).size).toBe(s.missions.length);
        for (const m of s.missions) {
          expect(m.garage).toHaveLength(GARAGE_COUNT[level]);
          expect(new Set(m.garage).size).toBe(m.garage.length);
          expect(m.garage).toContain(m.vehicle);
          expect(MISSIONS.find((x) => x.id === m.id)!.animals).toContain(m.animal);
          expect(m.steps).toEqual(stepsFor(m.id, level));
        }
        expect(s.phase).toBe('pick');
        expect(s.index).toBe(0);
      }
    }
  });

  it('không lặp y hệt lượt trước: ưu tiên nhiệm vụ và con vật chưa gặp', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = seeded(seed);
      const a = newRound('easy', rand);
      const b = newRound('easy', rand, { missions: a.missions.map((m) => m.id), animals: a.missions.map((m) => m.animal) });
      // 6 nhiệm vụ, mỗi lượt 3: lượt sau toàn nhiệm vụ mới
      for (const m of b.missions) expect(a.missions.map((x) => x.id)).not.toContain(m.id);
      // trong một lượt 3 nhiệm vụ không con vật nào lặp lại
      expect(new Set(b.missions.map((m) => m.animal)).size).toBe(3);

      const h = newRound('hard', rand);
      const h2 = newRound('hard', rand, { missions: h.missions.map((m) => m.id) });
      const unseen = MISSION_IDS.find((id) => !h.missions.some((m) => m.id === id))!;
      expect(h2.missions[0].id).toBe(unseen);
      expect(h2.missions[0].id).not.toBe(h.missions.at(-1)!.id);
    }
  });
});

describe('Đội cứu hộ: vòng chơi', () => {
  it('chạm xe khác: không đổi gì ngoài bật gợi ý; chạm xe đúng: lên đường', () => {
    const s = newRound('hard', seeded(7));
    const m = currentMission(s)!;
    expect(hintVehicle(s)).toBe(false);
    const other = m.garage.find((v) => v !== m.vehicle)!;
    const r = pickVehicle(s, other);
    expect(r.result).toBe('other');
    expect(r.state.phase).toBe('pick');
    expect(r.state.index).toBe(0);
    expect(hintVehicle(r.state)).toBe(true);
    // xe không có trong ga-ra thì bỏ qua
    const absent = VEHICLE_IDS.find((v) => !m.garage.includes(v))!;
    expect(pickVehicle(s, absent).result).toBe('ignored');
    const ok = pickVehicle(r.state, m.vehicle);
    expect(ok.result).toBe('right');
    expect(ok.state.phase).toBe('drive');
    expect(pickVehicle(ok.state, m.vehicle).result).toBe('ignored');
    // bé nhỏ: xe đúng nhấp nháy ngay từ đầu
    expect(hintVehicle(newRound('easy', seeded(7)))).toBe(true);
  });

  it('lái: chỉ tiến khi giữ tay (cộng dồn), đủ quãng thì tới nơi', () => {
    let s = pickVehicle(newRound('medium', seeded(3)), currentMission(newRound('medium', seeded(3)))!.vehicle).state;
    expect(drive(s, 0).state).toBe(s);
    s = drive(s, 1000).state;
    expect(s.phase).toBe('drive');
    expect(driveProgress(s)).toBeCloseTo(1000 / DRIVE_NEED.medium);
    const done = drive(s, DRIVE_NEED.medium);
    expect(done.arrived).toBe(true);
    expect(done.state.phase).toBe('rescue');
    expect(done.state.step).toBe(0);
    expect(driveProgress(done.state)).toBe(1);
    expect(drive(done.state, 500).state).toBe(done.state);
  });

  it('cứu hộ: kéo xong từng bước, phun từng chỗ; xong hết thì bạn thú được cứu', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 12; seed++) {
        let s = newRound(level, seeded(seed));
        while (!isDone(s)) {
          s = toRescue(s);
          const m = currentMission(s)!;
          for (let i = 0; i < m.steps.length; i++) {
            const st = currentStep(s)!;
            expect(st).toEqual(m.steps[i]);
            if (st.kind === 'drag') {
              expect(rub(s, 0, 500).state).toBe(s);
              const r = completeDrag(s);
              expect(r.done).toBe(true);
              expect(r.saved).toBe(i === m.steps.length - 1);
              s = r.state;
            } else {
              expect(completeDrag(s).done).toBe(false);
              expect(s.hp).toHaveLength(st.targets);
              expect(rub(s, st.targets, 500).state).toBe(s);
              for (let t = 0; t < st.targets; t++) {
                const half = rub(s, t, RUB_NEED[level] / 2);
                expect(half.cleared).toBe(false);
                expect(rubLeft(half.state, t)).toBeCloseTo(0.5);
                const r = rub(half.state, t, RUB_NEED[level]);
                expect(r.cleared).toBe(true);
                expect(r.done).toBe(t === st.targets - 1);
                s = r.state;
              }
            }
          }
          expect(s.phase).toBe('saved');
          expect(currentStep(s)).toBeUndefined();
          s = advance(s);
        }
        expect(s.index).toBe(MISSIONS_PER_ROUND[level]);
        expect(currentMission(s)).toBeUndefined();
      }
    }
  });

  it('sang nhiệm vụ kế thì bắt đầu lại từ chọn xe', () => {
    const s0 = newRound('easy', seeded(5));
    const s = advance(finishRescue(toRescue(s0)));
    expect(s.index).toBe(1);
    expect(s.phase).toBe('pick');
    expect(s.wrong).toBe(0);
    expect(s.driven).toBe(0);
    expect(isDone(s)).toBe(false);
  });
});

describe('Đội cứu hộ: bố cục trong khung 1194×834', () => {
  const inGate = (x: number, y: number, pad: number) => x + pad > STAGE_W - 144 && y - pad < 120;

  it('ô xe trong ga-ra ≥120px, cách nhau ≥24px, nằm trong khung', () => {
    for (const n of [2, 3, 4]) {
      const bays = layoutGarage(n);
      expect(bays).toHaveLength(n);
      bays.forEach((b, i) => {
        expect(b.w).toBeGreaterThanOrEqual(120);
        expect(b.h).toBeGreaterThanOrEqual(120);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(STAGE_W);
        expect(b.y + b.h).toBeLessThanOrEqual(STAGE_H);
        if (i) expect(b.x - (bays[i - 1].x + bays[i - 1].w)).toBeGreaterThanOrEqual(24);
      });
    }
  });

  it('đội trưởng ≥120px, cách nút về nhà ≥24px, tránh góc cổng bố mẹ', () => {
    for (const c of [CAPTAIN, CAPTAIN_PICK]) {
      expect(c.w).toBeGreaterThanOrEqual(120);
      expect(c.h).toBeGreaterThanOrEqual(120);
      expect(c.x).toBeGreaterThanOrEqual(24 + 120 + 24);
      expect(c.x + c.w).toBeLessThanOrEqual(STAGE_W - 144);
    }
  });

  it('mọi nhiệm vụ, mọi mức: vật kéo và đích nằm trong khung, tránh góc cổng bố mẹ, chưa kéo thì chưa tới đích', () => {
    expect(HANDLE).toBeGreaterThanOrEqual(120);
    for (const m of MISSION_IDS) {
      for (const level of LEVELS) for (const who of missionById(m).animals) {
        const steps = stepsFor(m, level);
        const lay = rescueLayout(m, level, steps, who);
        expect(lay.steps, `${m}/${level}`).toHaveLength(steps.length);
        expect(lay.spots).toHaveLength(steps.length + 1);
        for (const spot of lay.spots) {
          expect(spot.x).toBeGreaterThanOrEqual(0);
          expect(spot.x + lay.animal.w).toBeLessThanOrEqual(STAGE_W);
          expect(spot.y).toBeGreaterThanOrEqual(0);
          expect(spot.y + lay.animal.h).toBeLessThanOrEqual(STAGE_H);
          expect(lay.animal.w).toBeGreaterThanOrEqual(120);
        }
        lay.steps.forEach((g, i) => {
          expect(g.kind, `${m}/${level}/${i}`).toBe(steps[i].kind);
          const pts = g.kind === 'drag' ? [g.from, g.to] : g.targets;
          if (g.kind === 'rub') expect(g.targets).toHaveLength(steps[i].targets);
          for (const p of pts) {
            expect(p.x - HANDLE / 2, `${m}/${level}/${i}`).toBeGreaterThanOrEqual(0);
            expect(p.x + HANDLE / 2).toBeLessThanOrEqual(STAGE_W);
            expect(p.y - HANDLE / 2).toBeGreaterThanOrEqual(0);
            expect(p.y + HANDLE / 2).toBeLessThanOrEqual(STAGE_H);
            expect(inGate(p.x, p.y, HANDLE / 2), `${m}/${level}/${i} cổng bố mẹ`).toBe(false);
          }
          if (g.kind === 'drag') {
            expect(reached(g, g.from), `${m}/${level}/${i} chưa kéo`).toBe(false);
            expect(reached(g, g.to)).toBe(true);
            expect(clampHandle(g, g.to)).toEqual(g.to);
            // thang chỉ trượt lên xuống
            if (g.axis === 'y') expect(clampHandle(g, { x: g.from.x + 300, y: (g.from.y + g.to.y) / 2 }).x).toBe(g.from.x);
          }
        });
        // bạn thú được cứu không còn ở chỗ kẹt (trừ dập lửa và dán băng: bạn đứng yên)
        if (m !== 'fire' && m !== 'hurt') expect(lay.spots.at(-1)).not.toEqual(lay.spots[0]);
      }
    }
  });

  it('điểm neo thân của từng con vật nằm trên phần ảnh có hình (cả một vùng quanh điểm), nên băng dán, vệt bùn, móc dây luôn ở trên thân', async () => {
    for (const a of ANIMALS) {
      const { data, info } = await sharp(join(PUBLIC, a.img)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alpha = (fx: number, fy: number) => {
        const x = Math.min(info.width - 1, Math.max(0, Math.round(fx * info.width)));
        const y = Math.min(info.height - 1, Math.max(0, Math.round(fy * info.height)));
        return data[(y * info.width + x) * info.channels + 3];
      };
      expect(a.body.length, a.id).toBeGreaterThanOrEqual(3);
      for (const [fx, fy] of a.body) {
        // tâm và 8 điểm trên vòng bán kính 5% bề ngang ảnh đều có hình (không rơi ra nền trong suốt)
        for (let k = 0; k <= 8; k++) {
          const ang = (k * Math.PI) / 4;
          const r = k === 8 ? 0 : 0.05;
          expect(alpha(fx + r * Math.cos(ang), fy + (r * Math.sin(ang) * info.width) / info.height), `${a.id} ${fx},${fy}`).toBeGreaterThan(128);
        }
      }
    }
  });

  it('chỗ đau, chỗ móc dây, chỗ lau nằm trong ô con vật đúng như điểm neo thân', () => {
    for (const level of LEVELS) {
      for (const who of missionById('hurt').animals) {
        const lay = rescueLayout('hurt', level, stepsFor('hurt', level), who);
        const spot = lay.spots[0];
        lay.steps.forEach((g, i) => {
          const p = g.kind === 'drag' ? g.to : g.targets[0];
          const k = g.kind === 'drag' ? stepsFor('hurt', level)[i].n % 2 : 0;
          const b = bodyPoint(animalById(who), lay.animal, k);
          expect(p, `${who}/${level}/${i}`).toEqual({ x: spot.x + b.x, y: spot.y + b.y });
        });
      }
      for (const m of ['mud', 'lake'] as const) {
        for (const who of missionById(m).animals) {
          const lay = rescueLayout(m, level, stepsFor(m, level), who);
          const g = lay.steps[0];
          const b = bodyPoint(animalById(who), lay.animal, 0);
          if (g.kind === 'drag') expect(g.to, `${m}/${who}`).toEqual({ x: lay.spots[0].x + b.x, y: lay.spots[0].y + b.y });
        }
      }
    }
  });

  it('thang cho bé lớn cao hơn cho bé nhỏ', () => {
    const up = (level: Level) => {
      const g = rescueLayout('tree', level, stepsFor('tree', level), 'cat').steps[0];
      return g.kind === 'drag' ? g.from.y - g.to.y : 0;
    };
    expect(up('medium')).toBeGreaterThan(up('easy') + 60);
  });
});
