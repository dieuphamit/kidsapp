/**
 * Trò "Đội cứu hộ": chuông báo có bạn thú cần giúp (bong bóng hình, không chữ). Bé chọn xe hợp
 * nhiệm vụ trong ga-ra, giữ tay để lái xe tới nơi rồi làm thao tác cứu hộ (phun nước, kéo thang,
 * kéo móc, ném phao, dán băng, thả giỏ trực thăng). Chọn xe khác chỉ được bấm còi chào và gợi ý
 * (không âm báo sai, không điểm, không đồng hồ, không thua).
 * File này là logic thuần (không toạ độ, không React); toạ độ ở layout.ts.
 */
import { pickManyFresh, shuffle, type Level } from '../../core/variety';

export const VEHICLE_IDS = ['firetruck', 'ladder', 'tractor', 'boat', 'ambulance', 'heli'] as const;
export type VehicleId = (typeof VEHICLE_IDS)[number];

export interface Animal {
  id: string;
  /** Ảnh thú thật tách nền, đường dẫn trong public/ (không có BASE_URL). */
  img: string;
  /** Tiếng kêu (key câu nói): ghi âm thật 'animal.<x>-sound' hoặc câu TTS. */
  sound: string;
  /** Ảnh thẻ vuông có viền trống quanh con vật: phóng to và hạ xuống cho chân chạm đất. */
  padded?: boolean;
  /** Phóng thêm cho con to (bò, ngựa) hay thu bớt cho con nhỏ. */
  scale?: number;
  /** Tỉ lệ rộng/cao của phần thấy được (để đặt biểu cảm ngay trên đầu). */
  ar: number;
  /**
   * Điểm neo nằm chắc trên thân con vật (tỉ lệ x, y trong file ảnh; tâm các vòng tròn lớn nhất lọt
   * trong hình, đo từ kênh alpha): chỗ đau/băng dán, vệt bùn, giọt nước, chỗ móc dây đặt theo đây
   * nên luôn nằm trên thân dù con vật dáng ngang hay dáng đứng. Điểm đầu là giữa thân.
   */
  body: readonly (readonly [number, number])[];
}

export const ANIMALS = [
  { id: 'cow', img: 'world-photos/cow.png', sound: 'animal.cow-sound', ar: 1.8, scale: 1.18, body: [[0.4, 0.33], [0.63, 0.32], [0.2, 0.54]] },
  { id: 'pig', img: 'world-photos/pig.png', sound: 'animal.pig-sound', ar: 2.0, scale: 1.1, body: [[0.31, 0.37], [0.66, 0.42], [0.83, 0.59]] },
  { id: 'sheep', img: 'world-photos/sheep.png', sound: 'animal.sheep-sound', ar: 1.28, body: [[0.64, 0.41], [0.36, 0.38], [0.2, 0.13]] },
  { id: 'horse', img: 'cards/feed/horse.png', sound: 'animal.horse-sound', ar: 1.3, padded: true, scale: 1.12, body: [[0.4, 0.44], [0.62, 0.42], [0.21, 0.29]] },
  { id: 'chicken', img: 'world-photos/chicken.png', sound: 'animal.chicken-sound', ar: 1.2, scale: 0.86, body: [[0.58, 0.62], [0.3, 0.51], [0.74, 0.49]] },
  { id: 'cat', img: 'cards/feed/cat.png', sound: 'animal.cat-sound', ar: 1.3, padded: true, body: [[0.51, 0.49], [0.31, 0.45], [0.18, 0.32]] },
  { id: 'raccoon', img: 'world-photos/raccoon.png', sound: 'animal.raccoon-sound', ar: 1.24, scale: 0.95, body: [[0.6, 0.47], [0.28, 0.69], [0.86, 0.16]] },
  { id: 'duck', img: 'world-photos/farm-duck.png', sound: 'animal.duck-sound', ar: 1.42, scale: 0.9, body: [[0.46, 0.52], [0.74, 0.64], [0.26, 0.14]] },
  { id: 'rabbit', img: 'world-photos/rabbit.png', sound: 'animal.rabbit-sound', ar: 1.04, scale: 0.9, body: [[0.68, 0.7], [0.36, 0.63], [0.16, 0.44]] },
  { id: 'dog', img: 'world-photos/dog.png', sound: 'animal.dog-sound', ar: 1.44, body: [[0.63, 0.48], [0.3, 0.45], [0.18, 0.64]] },
] as const satisfies readonly Animal[];

export type AnimalId = (typeof ANIMALS)[number]['id'];
export const ANIMAL_IDS: readonly AnimalId[] = ANIMALS.map((a) => a.id);

export function animalById(id: AnimalId): Animal {
  const a = ANIMALS.find((x) => x.id === id);
  if (!a) throw new Error('không có con vật ' + id);
  return a;
}

/**
 * Một thao tác cứu hộ. 'drag' = kéo một vật (thang, móc, phao, băng dán, giỏ…) tới đích;
 * 'rub' = giữ/chà ngón tay lên chỗ cần làm (phun nước vào lửa, lau bùn, lau khô).
 */
export type Act =
  | 'spray'
  | 'ladderUp'
  | 'animalDown'
  | 'ladderDown'
  | 'hook'
  | 'pull'
  | 'wash'
  | 'buoy'
  | 'tow'
  | 'dry'
  | 'clean'
  | 'plaster'
  | 'basketDown'
  | 'basketUp'
  | 'basketHome';

export const ACT_KIND: Record<Act, 'drag' | 'rub'> = {
  spray: 'rub',
  ladderUp: 'drag',
  animalDown: 'drag',
  ladderDown: 'drag',
  hook: 'drag',
  pull: 'drag',
  wash: 'rub',
  buoy: 'drag',
  tow: 'drag',
  dry: 'rub',
  clean: 'rub',
  plaster: 'drag',
  basketDown: 'drag',
  basketUp: 'drag',
  basketHome: 'drag',
};

export interface Step {
  act: Act;
  kind: 'drag' | 'rub';
  /** Số chỗ cần chà (đám lửa…); thao tác kéo luôn là 1. */
  targets: number;
  /** Lần thứ mấy của cùng thao tác trong nhiệm vụ (băng dán thứ 0, thứ 1). */
  n: number;
}

export interface MissionDef {
  id: string;
  vehicle: VehicleId;
  /** Con vật có thể gặp trong tình huống này (đổi ngẫu nhiên giữa các lượt). */
  animals: readonly AnimalId[];
  /** Thao tác theo mức: dễ 1 bước ngắn, vừa 2 phần việc, khó 3 bước nhỏ. Viết 'spray*2' = 2 chỗ. */
  plan: Record<Level, readonly string[]>;
}

export const MISSIONS = [
  {
    id: 'fire',
    vehicle: 'firetruck',
    animals: ['cow', 'pig', 'sheep', 'horse', 'chicken'],
    plan: { easy: ['spray*1'], medium: ['spray*2'], hard: ['spray*3'] },
  },
  {
    id: 'tree',
    vehicle: 'ladder',
    animals: ['cat', 'raccoon', 'chicken'],
    plan: { easy: ['ladderUp'], medium: ['ladderUp', 'animalDown'], hard: ['ladderUp', 'animalDown', 'ladderDown'] },
  },
  {
    id: 'mud',
    vehicle: 'tractor',
    animals: ['pig', 'cow', 'horse', 'sheep'],
    plan: { easy: ['hook'], medium: ['hook', 'pull'], hard: ['hook', 'pull', 'wash'] },
  },
  {
    id: 'lake',
    vehicle: 'boat',
    animals: ['duck', 'rabbit', 'dog'],
    plan: { easy: ['buoy'], medium: ['buoy', 'tow'], hard: ['buoy', 'tow', 'dry'] },
  },
  {
    id: 'hurt',
    vehicle: 'ambulance',
    animals: ['rabbit', 'dog', 'sheep', 'cat'],
    plan: { easy: ['plaster'], medium: ['plaster', 'plaster'], hard: ['clean', 'plaster', 'plaster'] },
  },
  {
    id: 'sky',
    vehicle: 'heli',
    animals: ['sheep', 'chicken', 'cat', 'raccoon'],
    plan: { easy: ['basketDown'], medium: ['basketDown', 'basketHome'], hard: ['basketDown', 'basketUp', 'basketHome'] },
  },
] as const satisfies readonly MissionDef[];

export type MissionId = (typeof MISSIONS)[number]['id'];
export const MISSION_IDS: readonly MissionId[] = MISSIONS.map((m) => m.id);

export function missionById(id: MissionId): MissionDef {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error('không có nhiệm vụ ' + id);
  return m;
}

/** Các bước cứu hộ của nhiệm vụ theo mức chơi. */
export function stepsFor(id: MissionId, level: Level): Step[] {
  const seen = new Map<Act, number>();
  return missionById(id).plan[level].map((code) => {
    const [name, count] = code.split('*');
    const act = name as Act;
    const n = seen.get(act) ?? 0;
    seen.set(act, n + 1);
    return { act, kind: ACT_KIND[act], targets: count ? Number(count) : 1, n };
  });
}

/** Số nhiệm vụ mỗi lượt trước khi ăn mừng. */
export const MISSIONS_PER_ROUND: Record<Level, number> = { easy: 3, medium: 4, hard: 5 };
/** Số xe trong ga-ra. */
export const GARAGE_COUNT: Record<Level, number> = { easy: 2, medium: 3, hard: 4 };
/** Phải giữ tay lái bao lâu (ms) thì tới nơi. */
export const DRIVE_NEED: Record<Level, number> = { easy: 2600, medium: 3400, hard: 4200 };
/** Phải phun/chà mỗi chỗ bao lâu (ms). */
export const RUB_NEED: Record<Level, number> = { easy: 900, medium: 1100, hard: 1100 };

export interface Mission {
  id: MissionId;
  vehicle: VehicleId;
  animal: AnimalId;
  /** Xe trong ga-ra (đã xáo), luôn có xe đúng. */
  garage: VehicleId[];
  steps: Step[];
}

export type Phase = 'pick' | 'drive' | 'rescue' | 'saved';

export interface State {
  level: Level;
  missions: Mission[];
  /** Nhiệm vụ đang làm (0..missions.length); bằng missions.length là xong lượt. */
  index: number;
  phase: Phase;
  /** Số lần bé chạm xe khác trong nhiệm vụ này (để bật gợi ý). */
  wrong: number;
  /** Đã lái được bao lâu (ms giữ tay). */
  driven: number;
  driveNeed: number;
  /** Bước cứu hộ đang làm. */
  step: number;
  /** Bước 'rub': mỗi chỗ còn phải chà bao lâu (ms); 0 là xong chỗ đó. */
  hp: number[];
}

/**
 * Lượt mới: các nhiệm vụ khác nhau (tránh `avoid.missions` của lượt trước nếu còn), mỗi nhiệm vụ một
 * con vật khác nhau khi kho còn đủ (tránh `avoid.animals`), ga-ra có xe đúng và vài xe khác.
 */
export function newRound(
  level: Level,
  rand: () => number = Math.random,
  avoid: { missions?: readonly MissionId[]; animals?: readonly AnimalId[] } = {},
): State {
  const ids = pickManyFresh(MISSION_IDS, MISSIONS_PER_ROUND[level], avoid.missions ?? [], rand);
  // Không để nhiệm vụ đầu trùng nhiệm vụ cuối cùng bé vừa chơi
  const last = avoid.missions?.at(-1);
  if (ids.length > 1 && ids[0] === last) ids.push(ids.shift()!);
  const used: AnimalId[] = [];
  const missions = ids.map((id): Mission => {
    const def = missionById(id);
    const animal = pickManyFresh(def.animals, 1, [...(avoid.animals ?? []), ...used], rand)[0];
    // con chưa dùng trong lượt này được ưu tiên hơn con của lượt trước
    const unused = def.animals.filter((a) => !used.includes(a));
    const pick = unused.includes(animal) || unused.length === 0 ? animal : pickManyFresh(unused, 1, avoid.animals ?? [], rand)[0];
    used.push(pick);
    const others = shuffle(VEHICLE_IDS.filter((v) => v !== def.vehicle), rand).slice(0, GARAGE_COUNT[level] - 1);
    return { id, vehicle: def.vehicle, animal: pick, garage: shuffle([def.vehicle, ...others], rand), steps: stepsFor(id, level) };
  });
  return { level, missions, index: 0, phase: 'pick', wrong: 0, driven: 0, driveNeed: DRIVE_NEED[level], step: 0, hp: [] };
}

export function currentMission(state: State): Mission | undefined {
  return state.missions[state.index];
}

export function currentStep(state: State): Step | undefined {
  return state.phase === 'rescue' ? currentMission(state)?.steps[state.step] : undefined;
}

/** Xe đúng có nhấp nháy gợi ý không: mức dễ thì ngay từ đầu, mức khác sau khi bé chạm xe khác. */
export function hintVehicle(state: State): boolean {
  return state.phase === 'pick' && (state.level === 'easy' || state.wrong > 0);
}

export type PickResult = 'right' | 'other' | 'ignored';

/** Bé chạm xe `v` trong ga-ra. 'right' = xe hợp nhiệm vụ, lên đường; 'other' = xe khác (chỉ chào). */
export function pickVehicle(state: State, v: VehicleId): { state: State; result: PickResult } {
  const m = currentMission(state);
  if (!m || state.phase !== 'pick' || !m.garage.includes(v)) return { state, result: 'ignored' };
  if (v !== m.vehicle) return { state: { ...state, wrong: state.wrong + 1 }, result: 'other' };
  return { state: { ...state, phase: 'drive', driven: 0 }, result: 'right' };
}

function enterStep(state: State, step: number): State {
  const s = currentMission(state)?.steps[step];
  const hp = s?.kind === 'rub' ? Array.from({ length: s.targets }, () => RUB_NEED[state.level]) : [];
  return { ...state, step, hp };
}

/** Giữ tay lái thêm `ms`. Đủ quãng thì tới nơi, sang phần cứu hộ. */
export function drive(state: State, ms: number): { state: State; arrived: boolean } {
  if (state.phase !== 'drive' || ms <= 0) return { state, arrived: false };
  const driven = Math.min(state.driveNeed, state.driven + ms);
  if (driven < state.driveNeed) return { state: { ...state, driven }, arrived: false };
  return { state: enterStep({ ...state, driven, phase: 'rescue' }, 0), arrived: true };
}

/** Tiến độ lái 0..1. */
export function driveProgress(state: State): number {
  return state.driveNeed > 0 ? state.driven / state.driveNeed : 1;
}

function finishStep(state: State): { state: State; saved: boolean } {
  const m = currentMission(state)!;
  if (state.step + 1 >= m.steps.length) return { state: { ...state, step: m.steps.length, hp: [], phase: 'saved' }, saved: true };
  return { state: enterStep(state, state.step + 1), saved: false };
}

/** Bé kéo vật tới đích: xong bước kéo đang làm. */
export function completeDrag(state: State): { state: State; done: boolean; saved: boolean } {
  if (currentStep(state)?.kind !== 'drag') return { state, done: false, saved: false };
  return { ...finishStep(state), done: true };
}

/**
 * Phun/chà chỗ `target` thêm `ms`. `cleared` = chỗ đó vừa xong (lửa tắt);
 * `done` = xong cả bước; `saved` = xong cả nhiệm vụ.
 */
export function rub(state: State, target: number, ms: number): { state: State; cleared: boolean; done: boolean; saved: boolean } {
  const s = currentStep(state);
  const left = state.hp[target];
  if (s?.kind !== 'rub' || ms <= 0 || left === undefined || left <= 0) return { state, cleared: false, done: false, saved: false };
  const hp = state.hp.map((h, i) => (i === target ? Math.max(0, h - ms) : h));
  const cleared = hp[target] === 0;
  if (!hp.every((h) => h === 0)) return { state: { ...state, hp }, cleared, done: false, saved: false };
  return { ...finishStep({ ...state, hp }), cleared, done: true };
}

/** Phần còn lại 0..1 của chỗ `target` (1 = chưa chà, 0 = xong). */
export function rubLeft(state: State, target: number): number {
  const h = state.hp[target];
  return h === undefined ? 0 : h / RUB_NEED[state.level];
}

/** Sang nhiệm vụ kế (sau khi con vật mừng xong). */
export function advance(state: State): State {
  return { ...state, index: Math.min(state.index + 1, state.missions.length), phase: 'pick', wrong: 0, driven: 0, step: 0, hp: [] };
}

export function isDone(state: State): boolean {
  return state.index >= state.missions.length;
}

/** Key câu nói. */
export const HELLO_KEY = 'rescue.hello';
export const OTHER_KEY = 'rescue.other';
export const DRIVE_KEY = 'rescue.drive';
export const PARTY_KEY = 'rescue.party';
export const callKey = (m: MissionId) => `rescue.call.${m}`;
export const goKey = (v: VehicleId) => `rescue.go.${v}`;
export const carKey = (v: VehicleId) => `rescue.car.${v}`;
/** Key chỉ dùng chữ thường: 'ladderUp' → 'rescue.do.ladder-up'. */
export const doKey = (a: Act) => `rescue.do.${a.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;
export const doneKey = (m: MissionId) => `rescue.done.${m}`;
