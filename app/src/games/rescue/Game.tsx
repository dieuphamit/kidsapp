import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { useSayThen } from '../../ui/useSayThen';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import { clientToStage } from '../../ui/Stage';
import { useBuddyLook } from '../../ui/buddyContext';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { playSetup, type Level } from '../../core/variety';
import {
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
  animalById,
  callKey,
  goKey,
  carKey,
  doKey,
  doneKey,
  HELLO_KEY,
  OTHER_KEY,
  DRIVE_KEY,
  PARTY_KEY,
  type Act,
  type Animal,
  type AnimalId,
  type MissionId,
  type Phase,
  type PickResult,
  type State,
  type VehicleId,
} from './logic';
import {
  BUBBLE,
  BUBBLE_SMALL_SCALE,
  BRANCH_Y,
  CAPTAIN,
  CAPTAIN_PICK,
  DRIVE_PX_PER_MS,
  DRIVE_VEHICLE,
  GARAGE,
  GROUND_Y,
  HANDLE,
  MEDIUM,
  ROAD_Y,
  STAGE_H,
  STAGE_W,
  bodyPoint,
  clampHandle,
  layoutGarage,
  reached,
  rescueLayout,
  type DragGeo,
  type Pt,
  type Rect,
  type RubGeo,
} from './layout';
import { createRescueSounds } from './sounds';
import { useGlide } from './tween';
import { Vehicle } from './Vehicles';
import { Bell, Emote, Flame, Heart, Helmet, Plaster, SceneBack, SceneFront, Tool } from './Props';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

/** Chờ sau câu chào rồi mới nói tình huống. */
const HELLO_MS = 3600;
/** Chuông reo xong mới nói tình huống. */
const BELL_MS = 700;
/** Xe chạy ra khỏi ga-ra mất bao lâu. */
const DEPART_MS = 1100;
/** Nhịp tính quãng lái / quãng phun khi bé đang giữ tay. */
const TICK_MS = 40;
/** Còi "nee-naw" lặp lại sau chừng này lúc xe đang chạy. */
const SIREN_MS = 1000;
/** Tới nơi: chờ cảnh hiện ra rồi mới nói việc cần làm. */
const ARRIVE_SAY_MS = 500;
/** Cứu xong: bạn thú về chỗ an toàn rồi mới nhảy mừng và kêu. */
const SAVED_MOVE_MS = 1000;
/** Tiếng kêu thật dài tới 2,6 giây: trong lúc đó không câu nói nào được chen vào. */
const ANIMAL_SOUND_MS = 2800;
/** Sau lời khen thì sang nhiệm vụ kế. */
const PRAISE_MS = 3400;
/** Bé ngừng tay chừng này thì thứ cần chạm/kéo nhấp nháy; lâu hơn nữa thì nhắc lại bằng lời. */
const IDLE_MS = 6000;
const IDLE_SAY_MS = 11000;
/** Mỗi lần chạm xuống lúc phun/chà cũng tính ngay một chút (cho bé chỉ chạm chứ chưa giữ). */
const TAP_RUB_MS = 140;

type Mood = 'worried' | 'hope' | 'happy';

/** Vùng cảnh cứu hộ hiện trong bong bóng tình huống (thu nhỏ). */
function bubbleView(mission: MissionId, level: Level): Rect {
  switch (mission) {
    case 'fire':
      return { x: 530, y: 290, w: 640, h: 480 };
    case 'tree':
      return { x: 520, y: Math.max(0, BRANCH_Y[level] - 330), w: 600, h: 450 };
    case 'mud':
      return { x: 712, y: 410, w: 464, h: 348 };
    case 'lake':
      return { x: 740, y: 356, w: 448, h: 336 };
    case 'hurt':
      return { x: 736, y: 420, w: 400, h: 300 };
    case 'sky':
      return { x: 740, y: 282, w: 448, h: 336 };
  }
}

/** Chiều cao phần thấy được của ảnh con vật trong ô (px), để đặt biểu cảm ngay trên đầu. */
function visibleHeight(animal: Animal, box: { w: number; h: number }): number {
  const s = animal.scale ?? 1;
  return Math.min(box.h * 1.1, (animal.padded ? box.h * 0.86 : Math.min(box.h, box.w / animal.ar)) * s);
}

/**
 * Ảnh bạn thú với biểu cảm. Vệt bùn, giọt nước và `marks` (chỗ đau, băng dán, vết bẩn; toạ độ trong
 * ô) nằm bên trong phần lắc lư của con vật nên luôn dính trên thân, kể cả lúc con vật run hay nhún.
 */
function AnimalPic({
  animal,
  box,
  mood,
  raft = false,
  mud = 0,
  wet = 0,
  marks,
}: {
  animal: Animal;
  box: { w: number; h: number };
  mood: Mood;
  raft?: boolean;
  mud?: number;
  wet?: number;
  marks?: ReactNode;
}) {
  const vh = visibleHeight(animal, box);
  const body = animal.body.map((_, k) => bodyPoint(animal, box, k));
  return (
    <div className={styles.animalMood} data-mood={mood} style={{ '--vh': `${Math.round(vh)}px`, '--s': animal.scale ?? 1 } as CSSProperties}>
      {raft && <span className={styles.raft} aria-hidden="true" />}
      <img src={`${BASE}${animal.img}`} alt="" draggable={false} className={styles.animalImg} data-padded={animal.padded ? '' : undefined} />
      {mud > 0 &&
        body.map((p, k) => (
          <span key={k} className={styles.mudBlob} data-k={k} data-testid="mud" style={{ opacity: mud, left: p.x, top: p.y }} aria-hidden="true" />
        ))}
      {wet > 0 &&
        body.map((p, k) => <span key={k} className={styles.wetDrop} data-k={k} style={{ opacity: wet, left: p.x, top: p.y }} aria-hidden="true" />)}
      {marks}
      <span className={styles.emote} key={mood} aria-hidden="true">
        <Emote mood={mood} />
      </span>
    </div>
  );
}

export interface RescueSnapshot {
  level: Level;
  index: number;
  count: number;
  phase: Phase;
  mission: MissionId;
  vehicle: VehicleId;
  animal: AnimalId;
  garage: VehicleId[];
  acts: Act[];
  step: number;
  hp: number[];
  driven: number;
  driveNeed: number;
}

declare global {
  interface Window {
    __behocRescue?: {
      snapshot(): RescueSnapshot | null;
      pick(v: VehicleId): PickResult;
      drive(ms: number): boolean;
      dragDone(): boolean;
      rub(target: number, ms: number): boolean;
    };
  }
}

function makeRound(level: Level): State {
  const s = newRound(level, Math.random, {
    missions: recentPicks<MissionId>('rescue'),
    animals: recentPicks<AnimalId>('rescue-animal'),
  });
  rememberPicks('rescue', s.missions.map((m) => m.id), 1);
  rememberPicks('rescue-animal', s.missions.map((m) => m.animal), 1);
  return s;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export default function Game({ lang, speaker, ageMonths, options, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const sounds = useMemo(() => createRescueSounds(), []);
  const [{ level }] = useState(() => playSetup(ageMonths, options));
  const [state, setState] = useState<State>(() => makeRound(level));
  const [party, setParty] = useState(false);
  /** Xe đúng đang chạy ra khỏi ga-ra. */
  const [leaving, setLeaving] = useState(false);
  /** Bé đang giữ tay lái. */
  const [holding, setHolding] = useState(false);
  /** Vật đang kéo nằm ở đâu (null = ở điểm đầu của bước). */
  const [handle, setHandle] = useState<Pt | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Ngón tay đang phun/chà ở đâu. */
  const [finger, setFinger] = useState<Pt | null>(null);
  /** Bạn thú đã về chỗ an toàn và đang nhảy mừng. */
  const [celebrate, setCelebrate] = useState(false);
  const [hint, setHint] = useState(false);
  const [activity, setActivity] = useState(0);
  const [lastSay, setLastSay] = useState('');
  const [bell, setBell] = useState(0);
  const [animalBounce, setAnimalBounce] = useState(0);
  const [captainBounce, setCaptainBounce] = useState(0);
  const [honk, setHonk] = useState<{ id: string; n: number } | null>(null);
  const [partyHop, setPartyHop] = useState<{ i: number; n: number } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rubTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (holdTimer.current) clearInterval(holdTimer.current);
      if (rubTimer.current) clearInterval(rubTimer.current);
    },
    [],
  );

  const live = useRef(state);
  live.current = state;
  const commit = useCallback((s: State) => {
    live.current = s;
    setState(s);
  }, []);

  /**
   * Nói một câu. Tiếng kêu con vật phát ngay; câu nói khác mà rơi vào lúc tiếng kêu còn đang phát thì
   * chờ tiếng kêu phát hết mới nói (say() của speaker dừng tiếng trước đó). Câu app TỰ nói (`auto`:
   * tình huống, việc cần làm khi tới nơi, nhắc khi bé ngừng tay, ăn mừng) còn chờ cả câu đang đọc dở
   * xong, nên câu chào 6s / lời khen 5–6s / "lên đường" 6,4s không bị câu kế cắt. Chỉ giữ câu chờ mới
   * nhất; `guard` kiểm lại lúc tới lượt nói (bé đã làm khác thì thôi).
   */
  const sayAll = useSayThen(speaker, setLastSay);
  const playing = useRef<{ id: number; sound: boolean } | null>(null);
  const seq = useRef(0);
  const pending = useRef<{ key: string; guard?: () => boolean } | null>(null);
  const speak = useCallback(
    (key: string, sound: boolean) => {
      const id = ++seq.current;
      playing.current = { id, sound };
      sayAll([key], {
        // loa giả (test) không báo hết tiếng: coi tiếng kêu dài ANIMAL_SOUND_MS, câu nói hết ngay
        fallbackMs: sound ? ANIMAL_SOUND_MS : 0,
        onDone: () => {
          if (playing.current?.id !== id) return;
          playing.current = null;
          const p = pending.current;
          pending.current = null;
          if (p && (!p.guard || p.guard())) speak(p.key, false);
        },
      });
    },
    [sayAll],
  );
  const say = useCallback(
    (key: string, isAnimalSound = false, auto = false, guard?: () => boolean) => {
      pending.current = null;
      const cur = playing.current;
      if (!isAnimalSound && cur && (cur.sound || auto)) {
        pending.current = { key, guard };
        return;
      }
      speak(key, isAnimalSound);
    },
    [speak],
  );

  const touch = useCallback(() => {
    setActivity((a) => a + 1);
    setHint(false);
  }, []);

  const mission = currentMission(state);
  const phase = state.phase;
  const step = currentStep(state);
  const animal = mission ? animalById(mission.animal) : null;
  const layout = useMemo(() => (mission ? rescueLayout(mission.id, level, mission.steps, mission.animal) : null), [mission, level]);
  const geo = layout && step ? layout.steps[state.step] : null;
  const dragGeo: DragGeo | null = geo?.kind === 'drag' ? geo : null;
  const rubGeo: RubGeo | null = geo?.kind === 'rub' ? geo : null;
  const view: 'party' | 'garage' | 'drive' | 'rescue' = party ? 'party' : phase === 'pick' || leaving ? 'garage' : phase === 'drive' ? 'drive' : 'rescue';

  /** Chuông reo rồi Đậu Đậu nói tình huống của nhiệm vụ đang chờ chọn xe. */
  const announce = useCallback(
    (s: State, wait: number) => {
      setBell(Date.now());
      sounds.bell();
      later(() => {
        const now = live.current;
        const m = currentMission(now);
        // bé đã kịp chọn xe rồi thì thôi không nói chen vào
        // bé đã kịp chọn xe rồi thì thôi không nói chen vào (kiểm lại lúc tới lượt nói)
        const still = () => {
          const n = live.current;
          return n.missions === s.missions && n.index === s.index && n.phase === 'pick' && n.wrong === 0;
        };
        if (m && still()) say(callKey(m.id), false, true, still);
      }, wait);
    },
    [later, say, sounds],
  );

  // Câu chào khi vào trò, rồi nói tình huống đầu tiên
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(HELLO_KEY);
    announce(live.current, HELLO_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Việc cần làm lúc này (để nhắc lại khi bé chạm đội trưởng hoặc ngừng tay lâu). */
  const promptKey = useCallback((): string => {
    const s = live.current;
    const m = currentMission(s);
    if (!m) return PARTY_KEY;
    if (s.phase === 'pick') return callKey(m.id);
    if (s.phase === 'drive') return DRIVE_KEY;
    const st = currentStep(s);
    return st ? doKey(st.act) : doneKey(m.id);
  }, []);

  // Bé ngừng tay: thứ cần chạm/kéo nhấp nháy, lâu hơn thì nhắc bằng lời (không chữ, không bàn tay minh hoạ)
  const busy = holding || dragging || finger !== null || leaving;
  useEffect(() => {
    if (party || phase === 'saved' || busy) return;
    const blink = setTimeout(() => {
      setHint(true);
      if (phase === 'drive') say(DRIVE_KEY, false, true);
    }, IDLE_MS);
    const remind = setTimeout(() => {
      if (phase !== 'drive') say(promptKey(), false, true);
    }, IDLE_SAY_MS);
    return () => {
      clearTimeout(blink);
      clearTimeout(remind);
    };
  }, [activity, party, phase, busy, state.index, state.step, say, promptKey]);

  /* ---------- Chọn xe ---------- */
  const onPick = useCallback(
    (v: VehicleId): PickResult => {
      const s0 = live.current;
      const { state: s, result } = pickVehicle(s0, v);
      touch();
      if (result === 'ignored' || party) return 'ignored';
      setHonk({ id: v, n: Date.now() });
      commit(s);
      if (result === 'other') {
        // Không âm báo sai: xe bấm còi chào, lắc vui; xe hợp nhiệm vụ nhấp nháy
        sounds.horn();
        say(OTHER_KEY);
        return result;
      }
      sounds.vroom();
      say(goKey(v));
      setLeaving(true);
      later(() => setLeaving(false), DEPART_MS);
      return result;
    },
    [commit, later, party, say, sounds, touch],
  );

  /* ---------- Cứu xong, sang nhiệm vụ kế ---------- */
  const nextMission = useCallback(
    (s: State) => {
      const next = advance(s);
      setCelebrate(false);
      setHandle(null);
      setFinger(null);
      commit(next);
      if (isDone(next)) {
        setParty(true);
        sounds.happy();
        say(PARTY_KEY, false, true);
        return;
      }
      announce(next, BELL_MS);
    },
    [announce, commit, say, sounds],
  );

  const afterStep = useCallback(
    (s: State, saved: boolean) => {
      setDragging(false);
      setHandle(null);
      setFinger(null);
      if (rubTimer.current) clearInterval(rubTimer.current);
      rubTimer.current = null;
      touch();
      const m = currentMission(s);
      if (!m) return;
      if (!saved) {
        sounds.ding();
        const st = currentStep(s);
        if (st) say(doKey(st.act));
        return;
      }
      // Bạn thú về chỗ an toàn, nhảy mừng và kêu tiếng thật; khen đúng việc bé vừa làm; rồi nhiệm vụ kế
      sounds.happy();
      later(() => {
        setCelebrate(true);
        setAnimalBounce(Date.now());
        say(animalById(m.animal).sound, true);
        say(doneKey(m.id));
      }, SAVED_MOVE_MS);
      later(() => nextMission(s), SAVED_MOVE_MS + ANIMAL_SOUND_MS + PRAISE_MS);
    },
    [later, nextMission, say, sounds, touch],
  );

  /* ---------- Lái xe: xe chỉ chạy khi bé đang giữ tay ---------- */
  const stopHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
  }, []);

  const doDrive = useCallback(
    (ms: number): boolean => {
      const s0 = live.current;
      const { state: s, arrived } = drive(s0, ms);
      if (s === s0) return false;
      commit(s);
      if (!arrived) return false;
      stopHold();
      sounds.ding();
      setHandle(null);
      setAnimalBounce(Date.now());
      touch();
      later(() => {
        const now = live.current;
        const st = currentStep(now);
        const still = () => {
          const n = live.current;
          return n.missions === s.missions && n.index === s.index && n.step === 0;
        };
        // "lên đường" dài ~6,4s: việc cần làm chờ câu đó đọc xong
        if (st && still()) say(doKey(st.act), false, true, still);
      }, ARRIVE_SAY_MS);
      return true;
    },
    [commit, later, say, sounds, stopHold, touch],
  );

  const sirenIn = useRef(0);
  const startHold = useCallback(() => {
    if (holdTimer.current) return;
    setHolding(true);
    sirenIn.current = 0;
    holdTimer.current = setInterval(() => {
      if (sirenIn.current <= 0) {
        sounds.siren();
        sirenIn.current = SIREN_MS;
      }
      sirenIn.current -= TICK_MS;
      doDrive(TICK_MS);
    }, TICK_MS);
  }, [doDrive, sounds]);

  /* ---------- Phun nước / lau: giữ hoặc chà ngón tay lên chỗ cần làm ---------- */
  const fingerAt = useRef<Pt | null>(null);
  const rubTicks = useRef(0);

  const doRub = useCallback(
    (target: number, ms: number): boolean => {
      const s0 = live.current;
      const st = currentStep(s0);
      const { state: s, cleared, done, saved } = rub(s0, target, ms);
      if (s === s0) return false;
      commit(s);
      if (cleared && st?.act === 'spray') sounds.fizz();
      if (done) afterStep(s, saved);
      return done;
    },
    [afterStep, commit, sounds],
  );

  const rubAt = useCallback(
    (p: Pt, ms: number) => {
      const s = live.current;
      const m = currentMission(s);
      const st = currentStep(s);
      if (!m || st?.kind !== 'rub') return;
      const g = rescueLayout(m.id, s.level, m.steps, m.animal).steps[s.step];
      if (g.kind !== 'rub') return;
      if (rubTicks.current++ % 6 === 0) (st.act === 'spray' ? sounds.spray : sounds.wipe)();
      for (let i = 0; i < g.targets.length; i++) {
        if (s.hp[i] > 0 && dist(p, g.targets[i]) <= g.r) {
          doRub(i, ms);
          return;
        }
      }
    },
    [doRub, sounds],
  );

  const stopRub = useCallback(() => {
    if (rubTimer.current) clearInterval(rubTimer.current);
    rubTimer.current = null;
    fingerAt.current = null;
    setFinger(null);
  }, []);

  const startRub = useCallback(
    (p: Pt) => {
      fingerAt.current = p;
      setFinger(p);
      rubTicks.current = 0;
      rubAt(p, TAP_RUB_MS);
      if (rubTimer.current || currentStep(live.current)?.kind !== 'rub') return;
      rubTimer.current = setInterval(() => {
        if (fingerAt.current) rubAt(fingerAt.current, TICK_MS);
      }, TICK_MS);
    },
    [rubAt],
  );

  /* ---------- Kéo dụng cụ tới đích ---------- */
  const grab = useRef({ dx: 0, dy: 0 });

  const finishDrag = useCallback((): boolean => {
    const { state: s, done, saved } = completeDrag(live.current);
    if (!done) return false;
    commit(s);
    afterStep(s, saved);
    return true;
  }, [afterStep, commit]);

  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragGeo) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    const cur = handle ?? dragGeo.from;
    grab.current = { dx: p.x - cur.x, dy: p.y - cur.y };
    sounds.pop();
    setDragging(true);
  };

  const onHandleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragGeo) return;
    const p = clientToStage(e.clientX, e.clientY);
    const pos = clampHandle(dragGeo, { x: p.x - grab.current.dx, y: p.y - grab.current.dy });
    setHandle(pos);
    if (reached(dragGeo, pos)) finishDrag();
  };

  const onHandleUp = () => setDragging(false);

  /* ---------- Chạm khắp màn hình: lái hoặc phun/chà ---------- */
  const onSceneDown = (e: PointerEvent<HTMLDivElement>) => {
    touch();
    if (view === 'drive') startHold();
    else if (view === 'rescue' && rubGeo) startRub(clientToStage(e.clientX, e.clientY));
  };

  const onSceneMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!fingerAt.current) return;
    const p = clientToStage(e.clientX, e.clientY);
    fingerAt.current = p;
    setFinger(p);
  };

  const onSceneUp = () => {
    stopHold();
    stopRub();
  };

  /* ---------- Chạm nhân vật: luôn có phản ứng ---------- */
  const onAnimalDown = () => {
    if (!animal) return;
    setAnimalBounce(Date.now());
    say(animal.sound, true);
  };

  const onVehicleDown = (v: VehicleId) => {
    setHonk({ id: v, n: Date.now() });
    sounds.horn();
    if (view === 'rescue') say(carKey(v));
  };

  const onCaptainDown = () => {
    setCaptainBounce(Date.now());
    say(promptKey());
  };

  const onPartyAnimal = (i: number, id: AnimalId) => {
    setPartyHop({ i, n: Date.now() });
    say(animalById(id).sound, true);
  };

  const replay = () => {
    const s = makeRound(level);
    setParty(false);
    setCelebrate(false);
    setHint(false);
    commit(s);
    announce(s, BELL_MS);
  };

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocRescue = {
      snapshot: () => {
        const s = live.current;
        const m = currentMission(s);
        if (!m) return null;
        return {
          level: s.level,
          index: s.index,
          count: s.missions.length,
          phase: s.phase,
          mission: m.id,
          vehicle: m.vehicle,
          animal: m.animal,
          garage: [...m.garage],
          acts: m.steps.map((x) => x.act),
          step: s.step,
          hp: [...s.hp],
          driven: s.driven,
          driveNeed: s.driveNeed,
        };
      },
      pick: (v) => onPick(v),
      drive: (ms) => doDrive(ms),
      dragDone: () => finishDrag(),
      rub: (i, ms) => doRub(i, ms),
    };
    return () => {
      delete window.__behocRescue;
    };
  });

  /* ---------- Tính hình ---------- */
  const saved = phase === 'saved';
  const mood: Mood = saved && celebrate ? 'happy' : view === 'rescue' ? 'hope' : 'worried';
  const medium = mission ? MEDIUM[mission.vehicle] : 'road';
  const offset = state.driven * DRIVE_PX_PER_MS;
  const progress = driveProgress(state);
  const showHint = hint && !busy;

  // Vật đang kéo, đầu dây, chỗ bạn thú
  const cur: Pt | null = dragGeo ? (handle ?? dragGeo.from) : null;
  let animalAt: Pt | null = null;
  if (layout && (phase === 'rescue' || saved)) {
    const spot = layout.spots[Math.min(state.step, layout.spots.length - 1)];
    animalAt = dragGeo?.carry && cur ? { x: spot.x + cur.x - dragGeo.from.x, y: spot.y + cur.y - dragGeo.from.y } : spot;
  }
  const acts = mission?.steps.map((s) => s.act) ?? [];
  const toolAct: Act | null = mission
    ? mission.id === 'mud'
      ? 'hook'
      : mission.id === 'lake'
        ? 'buoy'
        : mission.id === 'sky'
          ? 'basketDown'
          : null
    : null;
  /**
   * Bạn thú và vật kéo trượt êm bằng JS (useGlide) chứ không bằng CSS transition: đầu dây, móc và
   * con vật đọc cùng toạ độ ở mỗi khung hình nên không bao giờ lệch nhau giữa chừng.
   */
  const animalShown = useGlide(animalAt, dragging && !!dragGeo?.carry);
  const curShown = useGlide(cur, dragging);
  /** Móc/phao/giỏ: theo tay khi đang là bước kéo, không thì nằm ở chỗ nghỉ. */
  const toolGlide = useGlide(toolAct && layout ? (cur ?? layout.rest) : null, dragging);
  /** Móc/phao đã bám vào con vật (sau bước móc/ném phao): đi theo đúng điểm neo trên thân. */
  const hookOn = layout && (toolAct === 'hook' || toolAct === 'buoy') && (state.step > 0 || saved) && layout.steps[0].kind === 'drag' ? layout.steps[0] : null;
  const toolAt: Pt | null =
    hookOn && animalShown && layout
      ? { x: animalShown.x + hookOn.to.x - layout.spots[0].x, y: animalShown.y + hookOn.to.y - layout.spots[0].y }
      : toolGlide;
  const upGeo = layout && mission?.id === 'tree' ? layout.steps[acts.indexOf('ladderUp')] : null;
  let ladderTop: number | null = null;
  if (layout && mission?.id === 'tree' && upGeo?.kind === 'drag') {
    ladderTop = saved ? (layout.rest?.y ?? upGeo.to.y) : step?.act === 'ladderUp' || step?.act === 'ladderDown' ? curShown!.y : upGeo.to.y;
  }
  const plasters = layout && mission?.id === 'hurt' ? mission.steps.map((s, i) => ({ s, i, g: layout.steps[i] })).filter((x) => x.s.act === 'plaster') : [];
  const cleanIdx = acts.indexOf('clean');
  const washIdx = Math.max(acts.indexOf('wash'), acts.indexOf('dry'));
  /** Bùn/nước còn bám trên bạn thú: có bước lau thì theo tiến độ lau, không thì hết khi được cứu. */
  let dirty = 0;
  if (mission && (mission.id === 'mud' || mission.id === 'lake') && view === 'rescue') {
    if (washIdx < 0) dirty = saved ? 0 : 1;
    else dirty = state.step < washIdx ? 1 : state.step === washIdx && !saved ? rubLeft(state, 0) : 0;
  }
  /** Vật kéo trên màn: đang là bước kéo thì ở tay bé, không thì (móc/phao/giỏ) ở chỗ nghỉ. */
  const handleAt: Pt | null = toolAct ? toolAt : curShown;
  const handleAct: Act = dragGeo && step ? step.act : (toolAct ?? 'hook');
  /** Đầu dây: tâm móc/phao, riêng giỏ thì buộc vào đỉnh quai giỏ. */
  const ropeEnd: Pt | null = toolAt ? (toolAct === 'basketDown' ? { x: toolAt.x, y: toolAt.y - 86 } : toolAt) : null;
  const rope =
    layout && ropeEnd
      ? { len: dist(layout.mount, ropeEnd), ang: (Math.atan2(ropeEnd.y - layout.mount.y, ropeEnd.x - layout.mount.x) * 180) / Math.PI }
      : null;
  /** Cứu xong: móc và phao được tháo ra (mờ dần) để không che bạn thú đang mừng. */
  const toolOff = saved && celebrate && (toolAct === 'hook' || toolAct === 'buoy');
  const spraying = step?.act === 'spray' && finger !== null && layout !== null;
  const rubTool: Pt | null = rubGeo && step && step.act !== 'spray' ? (finger ?? { x: rubGeo.targets[0].x - 170, y: rubGeo.targets[0].y - 150 }) : null;

  const view0 = mission ? bubbleView(mission.id, level) : null;
  const INNER = { w: BUBBLE.w - 40, h: BUBBLE.h - 40 };
  const k = view0 ? Math.min(INNER.w / view0.w, INNER.h / view0.h) : 1;
  const mini0 = mission && layout ? layout.spots[0] : null;

  const bays = mission ? layoutGarage(mission.garage.length) : [];
  const driver = DRIVE_VEHICLE[medium];
  const signX = 640 + (1 - progress) * 380;

  return (
    <div
      className={styles.scene}
      data-testid="game-rescue"
      data-last-say={lastSay}
      data-phase={party ? 'party' : leaving ? 'depart' : phase}
      data-view={view}
      data-turn={state.index}
      data-step={state.step}
      data-level={level}
      onPointerDown={onSceneDown}
      onPointerMove={onSceneMove}
      onPointerUp={onSceneUp}
      onPointerCancel={onSceneUp}
      onPointerLeave={onSceneUp}
    >
      <Scenery variant={view === 'rescue' ? 'meadow' : 'farm'} />
      <BackHome onExit={onExit} />

      {/* ================= Ga-ra: chuông báo, bong bóng tình huống, chọn xe ================= */}
      {view === 'garage' && mission && (
        <div key={`garage-${state.index}`} className={styles.fade}>
          <div className={styles.garage} style={{ left: GARAGE.x, top: GARAGE.y, width: GARAGE.w, height: GARAGE.h }} aria-hidden="true">
            <span className={styles.garageRoof} />
            <span className={styles.garageWall} />
          </div>
          <div key={`bell${bell}`} className={styles.bell} data-ring={bell ? '' : undefined} aria-hidden="true">
            <Bell />
          </div>
          {mission.garage.map((v, i) => {
            const r = bays[i];
            const right = v === mission.vehicle;
            const going = leaving && right;
            const blink = !leaving && right && (hintVehicle(state) || showHint);
            return (
              <div
                key={v}
                className={styles.bay}
                style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
                role="button"
                aria-label={`car-${v}`}
                data-testid={`car-${v}`}
                data-vehicle={v}
                data-hint={blink ? '' : undefined}
                data-leaving={going ? '' : undefined}
                onPointerDown={() => onPick(v)}
              >
                <span className={styles.bayDoor} aria-hidden="true" />
                <div className={styles.carSlot}>
                  <div key={`h${honk?.id === v ? honk.n : 0}`} className={styles.carMove} data-honk={honk?.id === v && !going ? '' : undefined} data-engine={going ? '' : undefined}>
                    <Vehicle id={v} moving={going} lights={going || blink} onLand />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= Lái xe: giữ tay thì xe chạy ================= */}
      {view === 'drive' && mission && (
        <div key={`drive-${state.index}`} className={styles.fade}>
          <div className={styles.bushes} style={{ top: ROAD_Y - 96, backgroundPositionX: -offset * 0.5 }} aria-hidden="true" />
          <div className={styles.road} data-medium={medium} style={{ top: ROAD_Y, backgroundPositionX: -offset }} aria-hidden="true" />
          {medium === 'air' && <span className={styles.shadow} style={{ left: driver.x + 60, top: GROUND_Y - 14, width: driver.w - 120 }} aria-hidden="true" />}
          <div
            className={styles.driver}
            style={{ left: driver.x, top: driver.y, width: driver.w, height: driver.h }}
            role="button"
            aria-label={`car-${mission.vehicle}`}
            data-testid="driver"
            data-vehicle={mission.vehicle}
            data-medium={medium}
            data-holding={holding ? '' : undefined}
            data-hint={showHint ? '' : undefined}
            onPointerDown={() => onVehicleDown(mission.vehicle)}
          >
            <div key={`h${honk?.n ?? 0}`} className={styles.carMove} data-honk={honk ? '' : undefined} data-engine="">
              <Vehicle id={mission.vehicle} moving={holding} lights />
            </div>
            {holding && medium !== 'air' && (
              <span className={styles.dust} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          {medium === 'water' && <div className={styles.roadFront} style={{ top: ROAD_Y + 44, backgroundPositionX: -offset * 1.2 }} aria-hidden="true" />}
          <span className={styles.signPost} style={{ left: signX + (BUBBLE.w * BUBBLE_SMALL_SCALE) / 2 - 8, top: 150 + BUBBLE.h * BUBBLE_SMALL_SCALE - 6, height: ROAD_Y - 150 - BUBBLE.h * BUBBLE_SMALL_SCALE + 14 }} aria-hidden="true" />
        </div>
      )}

      {/* ================= Bong bóng tình huống (hình, không chữ) ================= */}
      {(view === 'garage' || view === 'drive') && mission && animal && layout && view0 && mini0 && (
        <div
          key={`bubble-${state.index}`}
          className={styles.bubble}
          data-testid="bubble"
          data-mission={mission.id}
          data-size={view === 'garage' ? 'big' : 'small'}
          style={view === 'garage' ? { left: BUBBLE.x, top: BUBBLE.y, width: BUBBLE.w, height: BUBBLE.h } : { left: signX, top: 150, width: BUBBLE.w, height: BUBBLE.h }}
          aria-hidden="true"
        >
          <div className={styles.bubbleView} style={{ width: INNER.w, height: INNER.h }}>
            <div
              className={styles.mini}
              style={{ width: STAGE_W, height: STAGE_H, transform: `translate(${(INNER.w - view0.w * k) / 2}px, ${(INNER.h - view0.h * k) / 2}px) scale(${k}) translate(${-view0.x}px, ${-view0.y}px)` }}
            >
              <SceneBack mission={mission.id} level={level} mini />
              <div className={styles.animal} style={{ left: mini0.x, top: mini0.y, width: layout.animal.w, height: layout.animal.h }}>
                <AnimalPic
                  animal={animal}
                  box={layout.animal}
                  mood="worried"
                  raft={mission.id === 'lake'}
                  mud={mission.id === 'mud' ? 1 : 0}
                  marks={plasters.slice(0, 1).map(
                    ({ g, i }) => g.kind === 'drag' && <span key={i} className={styles.sore} style={{ left: g.to.x - mini0.x, top: g.to.y - mini0.y }} />,
                  )}
                />
              </div>
              <SceneFront mission={mission.id} />
              {mission.id === 'fire' &&
                layout.steps[0].kind === 'rub' &&
                layout.steps[0].targets.map((t, i) => (
                  <div key={i} className={styles.flameSpot} style={{ left: t.x - 60, top: t.y - 100 }}>
                    <Flame left={1} />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= Cứu hộ ================= */}
      {view === 'rescue' && mission && animal && layout && animalShown && (
        <div key={`rescue-${state.index}`} className={styles.fade}>
          <SceneBack mission={mission.id} level={level} />

          {/* Thang (xe thang): phần tử riêng, dài theo tay kéo */}
          {ladderTop !== null && (
            <div
              className={styles.ladder}
              data-drag={dragging ? '' : undefined}
              style={{ left: layout.mount.x - 36, top: ladderTop - 16, height: layout.mount.y - ladderTop + 30 }}
              aria-hidden="true"
            />
          )}

          <div
            className={styles.parked}
            style={{ left: layout.vehicle.x, top: layout.vehicle.y, width: layout.vehicle.w, height: layout.vehicle.h }}
            role="button"
            aria-label={`car-${mission.vehicle}`}
            data-testid="vehicle"
            data-vehicle={mission.vehicle}
            data-float={mission.vehicle === 'boat' ? 'water' : mission.vehicle === 'heli' ? 'air' : undefined}
            onPointerDown={() => onVehicleDown(mission.vehicle)}
          >
            <div key={`h${honk?.n ?? 0}`} className={styles.carMove} data-honk={honk ? '' : undefined} data-engine="">
              <Vehicle id={mission.vehicle} moving={mission.vehicle === 'heli'} lights={!saved} noLadder />
            </div>
          </div>

          {/* Dây tời / dây phao / dây giỏ */}
          {rope && (
            <span
              className={styles.rope}
              data-drag={dragging ? '' : undefined}
              data-off={toolOff ? '' : undefined}
              style={{ left: layout.mount.x, top: layout.mount.y - 4, width: rope.len, transform: `rotate(${rope.ang}deg)` }}
              aria-hidden="true"
            />
          )}

          {/* Bạn thú cần giúp */}
          <div
            className={styles.animal}
            style={{ left: animalShown.x, top: animalShown.y, width: layout.animal.w, height: layout.animal.h }}
            role="button"
            aria-label={`animal-${mission.animal}`}
            data-testid="animal"
            data-animal={mission.animal}
            data-mood={mood}
            data-drag={dragging && dragGeo?.carry ? '' : undefined}
            data-hint={showHint && step?.act === 'animalDown' ? '' : undefined}
            onPointerDown={onAnimalDown}
          >
            <div key={`b${animalBounce}`} className={styles.animalBounce} data-bounce={animalBounce ? '' : undefined}>
              <AnimalPic
                animal={animal}
                box={layout.animal}
                mood={mood}
                raft={mission.id === 'lake' && state.step === 0 && !saved}
                mud={mission.id === 'mud' ? dirty : 0}
                wet={mission.id === 'lake' ? dirty : 0}
                marks={
                  <>
                    {/* Chỗ đau và băng dán: ở trong ô con vật (đứng yên ở spot) nên lắc lư theo thân */}
                    {plasters.map(({ g, i }) => {
                      if (g.kind !== 'drag') return null;
                      const at = { left: g.to.x - layout.spots[0].x, top: g.to.y - layout.spots[0].y };
                      return state.step > i || saved ? (
                        <span key={i} className={styles.stuck} style={at} data-testid={`plaster-${i}`} aria-hidden="true">
                          <Plaster />
                        </span>
                      ) : (
                        <span key={i} className={styles.sore} style={at} data-testid={`sore-${i}`} aria-hidden="true" />
                      );
                    })}
                    {cleanIdx >= 0 && state.step === cleanIdx && rubGeo && (
                      <span
                        className={styles.smudge}
                        style={{ left: rubGeo.targets[0].x - layout.spots[0].x, top: rubGeo.targets[0].y - layout.spots[0].y, opacity: rubLeft(state, 0) }}
                        aria-hidden="true"
                      />
                    )}
                  </>
                }
              />
            </div>
            {mood === 'happy' && (
              <div className={styles.hearts} data-testid="happy" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} style={{ left: `${6 + i * 20}%`, animationDelay: `${i * 150}ms` }}>
                    <Heart />
                  </span>
                ))}
              </div>
            )}
          </div>

          <SceneFront mission={mission.id} />

          {/* Lửa trên chuồng */}
          {mission.id === 'fire' &&
            layout.steps[0].kind === 'rub' &&
            layout.steps[0].targets.map((t, i) => {
              const left = saved ? 0 : rubLeft(state, i);
              return (
                <div
                  key={i}
                  className={styles.flameSpot}
                  style={{ left: t.x - 60, top: t.y - 100 }}
                  data-testid={`flame-${i}`}
                  data-left={Math.round(left * 100)}
                  data-hint={showHint && left > 0 ? '' : undefined}
                >
                  <Flame left={left} />
                </div>
              );
            })}


          {/* Đích của bước kéo */}
          {dragGeo && (
            <span
              className={styles.target}
              data-testid="target"
              data-axis={dragGeo.axis}
              data-hint={showHint ? '' : undefined}
              style={{ left: dragGeo.to.x - 70, top: dragGeo.to.y - 70 }}
              aria-hidden="true"
            />
          )}
          {rubGeo &&
            rubGeo.targets.map((t, i) => (
              <span key={i} className={styles.rubSpot} data-testid={`spot-${i}`} data-act={step?.act} data-hint={showHint && state.hp[i] > 0 ? '' : undefined} style={{ left: t.x - 70, top: t.y - 70 }} aria-hidden="true" />
            ))}

          {/* Vật bé kéo. Móc/phao/giỏ là một phần tử suốt nhiệm vụ: hết bước kéo thì bám theo bạn thú về chỗ nghỉ */}
          {handleAt && (step || toolAct) && (
            <div
              key="handle"
              className={styles.handle}
              style={{ left: handleAt.x - HANDLE / 2, top: handleAt.y - HANDLE / 2, width: HANDLE, height: HANDLE }}
              role="button"
              aria-label={`tool-${handleAct}`}
              data-testid="handle"
              data-act={handleAct}
              data-live={dragGeo ? '' : undefined}
              data-off={toolOff ? '' : undefined}
              data-drag={dragging ? '' : undefined}
              data-pressed={dragging ? '' : undefined}
              data-hint={showHint && dragGeo ? '' : undefined}
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
            >
              {handleAct !== 'animalDown' && <Tool act={toolAct && handleAct !== 'plaster' ? toolAct : handleAct} />}
            </div>
          )}

          {/* Tia nước theo ngón tay */}
          {spraying && finger && (
            <svg className={styles.water} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} data-testid="water" aria-hidden="true">
              <path
                d={`M${layout.mount.x} ${layout.mount.y} Q${(layout.mount.x + finger.x) / 2} ${Math.min(layout.mount.y, finger.y) - dist(layout.mount, finger) * 0.28} ${finger.x} ${finger.y}`}
              />
              <circle cx={finger.x} cy={finger.y} r={26} />
            </svg>
          )}
          {/* Khăn / bọt biển / bông theo ngón tay */}
          {rubTool && step && (
            <span
              className={styles.rubTool}
              data-testid="rub-tool"
              data-act={step.act}
              data-busy={finger ? '' : undefined}
              data-hint={showHint ? '' : undefined}
              style={{ left: rubTool.x - 60, top: rubTool.y - 60 }}
              aria-hidden="true"
            >
              <Tool act={step.act} />
            </span>
          )}
        </div>
      )}

      {/* ================= Đội trưởng (bạn đồng hành) ================= */}
      {!party && (
        <div
          className={styles.captain}
          style={view === 'garage' ? { left: CAPTAIN_PICK.x, top: CAPTAIN_PICK.y, width: CAPTAIN_PICK.w, height: CAPTAIN_PICK.h } : { left: CAPTAIN.x, top: CAPTAIN.y, width: CAPTAIN.w, height: CAPTAIN.h }}
          role="button"
          aria-label="captain"
          data-testid="captain"
          onPointerDown={onCaptainDown}
        >
          <span className={styles.cloudSeat} aria-hidden="true" />
          <div key={`cb${captainBounce}`} className={styles.captainMove} data-bounce={captainBounce ? '' : undefined} data-cheer={mood === 'happy' ? '' : undefined}>
            <img src={buddy.img} alt={buddy.name} className={styles.captainImg} draggable={false} />
            <span className={styles.helmet} aria-hidden="true">
              <Helmet />
            </span>
          </div>
        </div>
      )}

      {/* ================= Ăn mừng cả đội ================= */}
      {party && (
        <div className={styles.party} data-testid="party">
          <span className={styles.partyCloud} aria-hidden="true" />
          <div className={styles.partyCaptain}>
            <img src={buddy.img} alt={buddy.name} className={styles.captainImg} draggable={false} />
            <span className={styles.helmet} aria-hidden="true">
              <Helmet />
            </span>
          </div>
          {state.missions.map((m, i) => {
            const a = animalById(m.animal);
            const n = state.missions.length;
            const box = { w: 180, h: 180 };
            const x = STAGE_W / 2 + (i - (n - 1) / 2) * 206 - box.w / 2;
            return (
              <div
                key={`${m.id}-${i}`}
                className={styles.animal}
                style={{ left: x, top: GROUND_Y - box.h, width: box.w, height: box.h }}
                role="button"
                aria-label={`animal-${m.animal}`}
                data-testid={`party-animal-${i}`}
                onPointerDown={() => onPartyAnimal(i, m.animal)}
              >
                <div key={`p${partyHop?.i === i ? partyHop.n : 0}`} className={styles.animalBounce} data-bounce={partyHop?.i === i ? '' : undefined} style={{ animationDelay: `${i * 120}ms` }}>
                  <AnimalPic animal={a} box={box} mood="happy" />
                </div>
              </div>
            );
          })}
          {[4, 14, 24, 33, 63, 72, 82, 92].map((x, i) => (
            <span key={i} className={styles.partyHeart} style={{ left: `${x}%`, animationDelay: `${(i % 4) * 230}ms` }} aria-hidden="true">
              <Heart />
            </span>
          ))}
          <ClayButton color="leaf" size={150} label="Chơi lại" onPress={replay} className={styles.replay}>
            <svg viewBox="0 0 100 100" className={styles.replayIcon} aria-hidden="true">
              <path d="M76 50 A26 26 0 1 1 62 27" />
              <path d="M54 12 L70 28 L50 36 Z" />
            </svg>
          </ClayButton>
        </div>
      )}
    </div>
  );
}
