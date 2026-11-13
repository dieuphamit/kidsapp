/**
 * Logic chuyển động tự nhiên cho thú 3D (thế giới thú, Sở thú), tách khỏi React/three để test unit.
 *
 * Thay cho đi theo làn thẳng (wander.ts): mỗi con chọn đích ngẫu nhiên (seeded) trong vùng chữ nhật của mình,
 * tiến tới bằng seek + arrive, quay đầu có giới hạn tốc độ góc, đẩy nhau để không chồng lên nhau; tới nơi thì
 * nghỉ, ăn hoặc đi tiếp. Chạm thì dừng, ngoảnh về bé, làm động tác vui rồi đi tiếp.
 *
 * Kiểu di chuyển:
 * - `walk`: thú cạn đi trên mặt đất (y = 0)
 * - `hop`: nhảy từng cú (ếch): chỉ tiến lên khi đang ở trên không, nghỉ ngắn giữa các cú
 * - `swim`: một con bơi lượn 3D nhẹ (cá voi, cá heo, cá koi...), không bao giờ đứng hẳn
 * - `school`: đàn cá (boids: tách, cùng hướng, gom lại + kéo về đích chung của đàn)
 * - `fly`: bay theo vòng tròn/số 8, nhấp nhô hình sin, nghiêng thân theo độ cong
 *
 * Quy ước góc: yaw = 0 là nhìn thẳng về camera (+z); đi theo hướng `heading` là (sin h, cos h) trên mặt xz.
 * Mọi hàm chỉ sửa object có sẵn (không cấp phát mỗi frame) để chạy trong useFrame.
 */

export type Motion = 'walk' | 'hop' | 'swim' | 'school' | 'fly';
export type AgentMode = 'walk' | 'rest' | 'eat' | 'react' | 'idle';

/**
 * Vùng hoạt động (đơn vị 3D). yMin/yMax chỉ dùng cho bơi/bay; bỏ trống là 0.
 * `cam`: vị trí camera (x = 0, toạ độ của khu) để agent có zWeight < 1 tính chồng nhau theo hình chiếu trên màn
 * hình: con đứng sau trông gần giữa màn hình hơn và (camera cao) trông cao hơn.
 */
export type Area = { xMin: number; xMax: number; zMin: number; zMax: number; yMin?: number; yMax?: number; cam?: { y: number; z: number } };

/** Đích chung của một đàn cá (dùng chung giữa các con trong đàn) */
export type Flock = { tx: number; ty: number; tz: number; t: number; seed: number; tick: number; cx: number; cy: number; cz: number };

/** Quỹ đạo bay: tâm, bán kính theo x/z, hình số 8 hay vòng tròn, chiều bay, biên độ nhấp nhô */
export type FlyPath = { cx: number; cy: number; cz: number; rx: number; rz: number; eight: boolean; dir: 1 | -1; bob: number };

export type Agent = {
  id: string;
  motion: Motion;
  area: Area;
  x: number;
  y: number;
  z: number;
  /** vận tốc (dùng cho đàn cá) */
  vx: number;
  vy: number;
  vz: number;
  /** hướng đi thật */
  heading: number;
  /** hướng mặt hiển thị (hơi chếch về camera khi đi ngang) */
  yaw: number;
  /** ngóc/chúc đầu (radian, dương = ngóc lên) */
  pitch: number;
  /** nghiêng thân khi lượn (radian) */
  roll: number;
  /** tốc độ hiện tại (đơn vị/giây) */
  speed: number;
  maxSpeed: number;
  /** tốc độ quay đầu tối đa (rad/giây) */
  turnRate: number;
  /** bán kính thân để đẩy nhau (theo phương ngang: nửa chiều dài thân) */
  radius: number;
  /** nửa chiều cao thân (y của agent là đáy thân, tâm thân ở y + halfH) */
  halfH: number;
  /**
   * Cách tính chạm nhau. 1 (mặc định): hình tròn trên mặt xz. Nhỏ hơn 1: theo màn hình — hai thân chạm nhau khi
   * chồng nhau trên khung hình (chiếu từ camera area.cam: ngang và dọc), chiều sâu chỉ góp thêm
   * zWeight; con đứng trước/sau nhau vẫn bị coi là chạm nên chúng tách nhau theo chiều ngang.
   */
  zWeight: number;
  tx: number;
  ty: number;
  tz: number;
  mode: AgentMode;
  /** thời gian (giây) ở mode hiện tại */
  t: number;
  /** thời lượng của lần nghỉ/ăn hiện tại */
  dur: number;
  /** 0..1: mức đang di chuyển (mượt) để trộn clip Idle/Walk */
  moving: number;
  /** tiến độ cú nhảy (hop) 0..1, -1 = đang ngồi */
  hop: number;
  /** thời gian chờ còn lại trước cú nhảy kế tiếp */
  hopWait: number;
  /** không bao giờ rời chỗ (đứng một góc, chỉ lắc lư) */
  fixed: boolean;
  /** hướng mặt khi đứng yên */
  restYaw: number;
  canEat: boolean;
  /** mode trước khi bị chạm */
  before: AgentMode;
  flock: Flock | null;
  path: FlyPath | null;
  /** tham số trên quỹ đạo bay */
  theta: number;
  seed: number;
};

/** Mặt hơi chếch về camera khi đi ngang (rad), giống wander.ts */
export const FACE_BIAS = 0.28;
/** Tổng thời gian phản ứng khi được chạm (giây) */
export const REACT_TIME = 2.4;
/** Con đứng yên một chỗ chỉ nhún 0.6s khi được chạm */
export const REACT_TIME_FIXED = 0.6;
/** Bước thời gian lớn nhất (tab ẩn rồi hiện lại cho dt rất lớn) */
export const MAX_DT = 0.25;
/** Chia nhỏ bước để đẩy nhau/boids ổn định khi máy chậm */
const SUB_DT = 1 / 30;
/** Góc ngoảnh về bé khi nghỉ / khi được chạm */
const LOOK_YAW = 0.4;
/** Bắt đầu chậm lại khi còn cách đích (đơn vị) */
const ARRIVE_R = 1.0;
const ARRIVE_EPS = 0.2;
/** gia tốc (đơn vị/giây²) */
const ACCEL = 1.0;
/** khoảng đẩy nhau = (r1 + r2) * SEP_MULT */
const SEP_MULT = 1.6;
const SEP_W = 2.2;
/** cú nhảy của ếch */
export const HOP_TIME = 0.55;

let tick = 0;

export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  else if (r <= -Math.PI) r += Math.PI * 2;
  return r;
}

/** Hướng mặt hiển thị khi đi theo `heading`: lệch về phía camera một chút (đi ngang thì lệch nhiều nhất) */
export function faceYaw(heading: number): number {
  return heading - FACE_BIAS * Math.sin(heading);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Số ngẫu nhiên 0..1 từ seed (Mulberry32: seed liền nhau vẫn cho dãy khác hẳn nhau), cập nhật seed */
function rand(a: { seed: number }): number {
  a.seed = (a.seed + 0x6d2b79f5) >>> 0;
  let t = a.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function ease(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-dt * rate));
}

export type AgentOptions = {
  id: string;
  motion: Motion;
  area: Area;
  seed: number;
  /** vị trí ban đầu; bỏ trống thì chọn ngẫu nhiên trong vùng */
  pos?: readonly [number, number, number];
  /** tốc độ tối đa (đơn vị/giây); giữ chậm cho bé kịp nhìn và chạm */
  maxSpeed?: number;
  turnRate?: number;
  radius?: number;
  halfH?: number;
  zWeight?: number;
  fixed?: boolean;
  restYaw?: number;
  canEat?: boolean;
  flock?: Flock;
  path?: FlyPath;
};

export function createFlock(area: Area, seed: number): Flock {
  const f: Flock = { tx: 0, ty: 0, tz: 0, t: 0, seed: (seed * 2654435761) >>> 0 || 1, tick: -1, cx: 0, cy: 0, cz: 0 };
  pickFlockTarget(f, area);
  return f;
}

/** Quỹ đạo bay mặc định: vòng tròn/số 8 nằm trong vùng */
export function defaultPath(area: Area, eight: boolean, dir: 1 | -1 = 1): FlyPath {
  const yMin = area.yMin ?? 0;
  const yMax = area.yMax ?? yMin;
  return {
    cx: (area.xMin + area.xMax) / 2,
    cy: (yMin + yMax) / 2,
    cz: (area.zMin + area.zMax) / 2,
    rx: (area.xMax - area.xMin) / 2,
    rz: (area.zMax - area.zMin) / 2,
    eight,
    dir,
    bob: Math.min(0.35, (yMax - yMin) / 2),
  };
}

export function createAgent(o: AgentOptions): Agent {
  const a: Agent = {
    id: o.id,
    motion: o.motion,
    area: o.area,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    yaw: o.restYaw ?? 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    maxSpeed: o.maxSpeed ?? 0.45,
    turnRate: o.turnRate ?? 1.6,
    radius: o.radius ?? 0.5,
    halfH: o.halfH ?? o.radius ?? 0.5,
    zWeight: o.zWeight ?? 1,
    tx: 0,
    ty: 0,
    tz: 0,
    mode: o.fixed ? 'idle' : 'walk',
    t: 0,
    dur: 0,
    moving: 0,
    hop: -1,
    hopWait: 0,
    fixed: !!o.fixed,
    restYaw: o.restYaw ?? 0,
    canEat: !!o.canEat,
    before: 'walk',
    flock: o.flock ?? null,
    path: o.path ?? null,
    theta: 0,
    seed: (o.seed * 2654435761) >>> 0 || 1,
  };
  const ar = o.area;
  const yMin = ar.yMin ?? 0;
  const yMax = ar.yMax ?? yMin;
  if (o.pos) {
    a.x = o.pos[0];
    a.y = o.pos[1];
    a.z = o.pos[2];
  } else {
    a.x = ar.xMin + rand(a) * (ar.xMax - ar.xMin);
    a.y = yMin + rand(a) * (yMax - yMin);
    a.z = ar.zMin + rand(a) * (ar.zMax - ar.zMin);
  }
  if (a.motion === 'walk' || a.motion === 'hop') a.y = 0;
  if (a.fixed) return a;

  if (a.motion === 'fly') {
    if (!a.path) a.path = defaultPath(ar, rand(a) < 0.5);
    a.theta = rand(a) * Math.PI * 2;
    placeOnPath(a, 0);
    a.speed = a.maxSpeed;
    a.yaw = faceYaw(a.heading);
    return a;
  }
  pickTarget(a);
  a.heading = Math.atan2(a.tx - a.x, a.tz - a.z);
  a.yaw = faceYaw(a.heading);
  if (a.motion === 'school') {
    a.vx = Math.sin(a.heading) * a.maxSpeed * 0.7;
    a.vz = Math.cos(a.heading) * a.maxSpeed * 0.7;
    a.speed = a.maxSpeed * 0.7;
  }
  a.hopWait = rand(a) * 0.5;
  return a;
}

/**
 * Chọn đích mới trong vùng. Trên mặt đất ưu tiên đi ngang (|dz| ≤ 0.6·|dx|) để bé luôn thấy mặt/thân con vật,
 * không đi thẳng vào sâu (quay lưng lại bé).
 */
export function pickTarget(a: Agent): void {
  const ar = a.area;
  const w = ar.xMax - ar.xMin;
  let tx = ar.xMin + rand(a) * w;
  const minLat = Math.min(w * 0.3, 2);
  if (Math.abs(tx - a.x) < minLat) {
    tx = a.x + (tx >= a.x ? minLat : -minLat);
    if (tx > ar.xMax || tx < ar.xMin) tx = a.x - (tx - a.x);
  }
  tx = clamp(tx, ar.xMin, ar.xMax);
  const dzMax = Math.abs(tx - a.x) * 0.6;
  const tz = clamp(a.z + (rand(a) * 2 - 1) * dzMax, ar.zMin, ar.zMax);
  const yMin = ar.yMin ?? 0;
  const yMax = ar.yMax ?? yMin;
  a.tx = tx;
  a.tz = tz;
  a.ty = a.motion === 'walk' || a.motion === 'hop' ? 0 : yMin + rand(a) * (yMax - yMin);
}

function pickFlockTarget(f: Flock, ar: Area): void {
  const yMin = ar.yMin ?? 0;
  const yMax = ar.yMax ?? yMin;
  // Đích của đàn nằm trong phần giữa vùng để cả đàn (toả ra quanh đích) không chạm mép
  f.tx = ar.xMin + (0.15 + rand(f) * 0.7) * (ar.xMax - ar.xMin);
  f.ty = yMin + (0.2 + rand(f) * 0.6) * (yMax - yMin);
  f.tz = ar.zMin + (0.2 + rand(f) * 0.6) * (ar.zMax - ar.zMin);
  f.t = 0;
}

/** Con vật được chạm: dừng lại, ngoảnh về bé; động tác vui do component vẽ theo mode 'react' */
export function startReact(a: Agent): void {
  if (a.mode !== 'react') a.before = a.mode;
  a.mode = 'react';
  a.t = 0;
  a.hop = -1;
}

/** Thời lượng phản ứng của con này */
export function reactTime(a: Agent): number {
  return a.fixed ? REACT_TIME_FIXED : REACT_TIME;
}

/** Tiến độ cú nhảy vui khi được chạm (0..1), -1 nếu không nhảy. Nhảy sau khi kịp ngoảnh lại. */
export function reactJump(a: Agent): number {
  if (a.mode !== 'react') return -1;
  const start = a.fixed ? 0 : 0.25;
  const p = (a.t - start) / 0.6;
  return p < 0 || p > 1 ? -1 : p;
}

/** Bước cả nhóm thêm dt giây (đẩy nhau, đàn cá cần biết các con khác). */
export function stepAgents(agents: readonly Agent[], rawDt: number): void {
  const dt = rawDt > MAX_DT ? MAX_DT : rawDt < 0 ? 0 : rawDt;
  let left = dt;
  while (left > 1e-6) {
    const h = left > SUB_DT ? SUB_DT : left;
    left -= h;
    tick++;
    for (let i = 0; i < agents.length; i++) stepOne(agents[i], agents, h);
  }
}

function stepOne(a: Agent, all: readonly Agent[], dt: number): void {
  a.t += dt;
  if (a.mode === 'react' && a.t >= reactTime(a)) {
    a.t = 0;
    if (a.fixed) a.mode = 'idle';
    else {
      // phản ứng xong thì luôn đi tiếp (đích mới) để bé thấy con vật "vui vẻ đi chơi tiếp"
      a.mode = 'walk';
      if (a.motion !== 'fly' && a.motion !== 'school') pickTarget(a);
    }
  }
  if (a.fixed) {
    a.speed = 0;
    a.moving = ease(a.moving, 0, 8, dt);
    return;
  }
  switch (a.motion) {
    case 'walk':
    case 'hop':
      stepGround(a, all, dt);
      break;
    case 'swim':
      stepSwim(a, all, dt);
      break;
    case 'school':
      stepSchool(a, all, dt);
      break;
    case 'fly':
      stepFly(a, dt);
      break;
  }
  const m = a.maxSpeed > 0 ? clamp(a.speed / a.maxSpeed, 0, 1) : 0;
  a.moving = ease(a.moving, m, 8, dt);
}

/** Quay heading về `want` không quá turnRate·dt; quay hơn ~140° thì luôn quay qua phía camera (yaw 0) */
function turnToward(a: Agent, want: number, dt: number): number {
  let err = wrapAngle(want - a.heading);
  if (Math.abs(err) > 2.4) {
    const h = wrapAngle(a.heading);
    const towardCam = h > 0 ? -1 : 1;
    if (Math.sign(err) !== towardCam) err = towardCam * (Math.PI * 2 - Math.abs(err));
  }
  const maxTurn = a.turnRate * dt;
  const d = clamp(err, -maxTurn, maxTurn);
  a.heading = wrapAngle(a.heading + d);
  return err;
}

/** Nhóm va chạm: con đi/nhảy đẩy nhau trên mặt đất, con bơi (lẻ và đàn) đẩy nhau trong nước; con bay đi theo quỹ đạo */
function medium(a: Agent): 0 | 1 | 2 {
  return a.motion === 'walk' || a.motion === 'hop' ? 0 : a.motion === 'fly' ? 2 : 1;
}

/**
 * Khoảng cách chuẩn hoá giữa thân hai con: < 1 là hai thân chạm nhau. Kết quả ở `nd` = [ex, ev, ez, n, rs, hs]:
 * - zWeight = 1: ex = dx / rs, ez = dz / rs (tròn trên mặt xz), ev = độ lệch tâm thân theo y / hs (chỉ khi bơi).
 * - zWeight < 1 (theo màn hình): chiếu tâm thân hai con từ camera (area.cam) lên mặt phẳng ở độ sâu trung bình của
 *   chúng; ex, ev = độ lệch ngang, dọc trên mặt phẳng đó / rs, hs; ez = dz × zWeight / rs.
 * rs = tổng nửa chiều dài thân, hs = tổng nửa chiều cao (khi chiếu: theo kích thước trên mặt phẳng chiếu). `proj` giữ hệ số chiếu của a, o: [ka, ko, camY].
 */
const nd = [0, 0, 0, 0, 0, 0];
const proj = [1, 1, 0];
function normDist(a: Agent, o: Agent): void {
  const zw = Math.min(a.zWeight, o.zWeight);
  const ground = medium(a) === 0;
  const cam = zw < 1 ? a.area.cam : undefined;
  let ka = 1;
  let ko = 1;
  let cy = 0;
  if (cam) {
    const dm = cam.z - (a.z + o.z) / 2;
    ka = dm / Math.max(0.5, cam.z - a.z);
    ko = dm / Math.max(0.5, cam.z - o.z);
    cy = cam.y;
  }
  // con gần camera trông to hơn: kích thước trên mặt phẳng chiếu cũng nhân hệ số chiếu
  const rs = a.radius * ka + o.radius * ko;
  const hs = a.halfH * ka + o.halfH * ko;
  const dx = a.x * ka - o.x * ko;
  // mặt đất: chân cùng chạm đất, so tâm thân; khi có camera thì luôn tính theo hình chiếu
  const ya = ground && !cam ? 0 : a.y + a.halfH;
  const yo = ground && !cam ? 0 : o.y + o.halfH;
  const dy = cy + (ya - cy) * ka - (cy + (yo - cy) * ko);
  nd[0] = dx / rs;
  nd[1] = dy / hs;
  nd[2] = ((a.z - o.z) * (cam ? zw : 1)) / rs;
  nd[3] = Math.hypot(nd[0], nd[1], nd[2]);
  nd[4] = rs;
  nd[5] = hs;
  proj[0] = ka;
  proj[1] = ko;
  proj[2] = cy;
}

/** Đẩy khỏi các con gần cùng nhóm; trả hướng đẩy vào sep[0] (x), sep[1] (z), sep[2] (y, chỉ khi bơi) */
const sep = [0, 0, 0];
function separation(a: Agent, all: readonly Agent[]): void {
  sep[0] = 0;
  sep[1] = 0;
  sep[2] = 0;
  const m = medium(a);
  for (let i = 0; i < all.length; i++) {
    const o = all[i];
    if (o === a || medium(o) !== m) continue;
    normDist(a, o);
    const n = nd[3];
    if (n < SEP_MULT && n > 1e-6) {
      const w = (SEP_MULT - n) / SEP_MULT / n;
      sep[0] += nd[0] * w;
      sep[1] += nd[2] * w;
      sep[2] += nd[1] * w;
    }
  }
}

/**
 * Tách hẳn nếu thân đã chồng lên con khác cùng nhóm (chỉ con này dịch, con kia đứng nguyên). zWeight = 1: đẩy ra
 * theo hướng nối hai tâm trên mặt xz. zWeight < 1: giữ z, chỉ dịch theo x (và y khi bơi) tới vừa hết chồng trên
 * màn hình; nếu phía đó ra ngoài vùng thì sang phía bên kia.
 */
function resolveOverlap(a: Agent, all: readonly Agent[]): void {
  const m = medium(a);
  for (let i = 0; i < all.length; i++) {
    const o = all[i];
    if (o === a || medium(o) !== m) continue;
    normDist(a, o);
    const [ex, ev, ez, n, rs, hs] = nd;
    if (n >= 1) continue;
    if (a.zWeight >= 1 && o.zWeight >= 1) {
      if (m === 0 || Math.abs(ev) < 1) {
        const d = Math.hypot(ex, ez);
        if (d > 1e-6) {
          a.x = o.x + (ex / d) * rs;
          a.z = o.z + (ez / d) * rs;
        } else a.x = o.x + rs;
      }
      continue;
    }
    const [ka, ko, cy] = proj;
    // mặt đất hoặc mặt nước (vùng không có bề dày y): không đổi được độ lệch dọc, chỉ dịch ngang
    const flat = m === 0 || (a.area.yMax ?? 0) - (a.area.yMin ?? 0) < 1e-6;
    let px = ex;
    let pv = flat ? 0 : ev;
    const fixedV = flat ? ev : 0;
    let p = Math.hypot(px, pv);
    if (p < 1e-6) {
      px = a.seed % 2 ? 1 : -1;
      pv = 0;
      p = 1;
    }
    const need = Math.sqrt(Math.max(0, 1 - ez * ez - fixedV * fixedV)) / p;
    // vị trí cần có trên mặt phẳng chiếu, đổi lại về toạ độ thật của a
    let x = (o.x * ko + px * need * rs) / ka;
    if (x < a.area.xMin || x > a.area.xMax) {
      const alt = (o.x * ko - px * need * rs) / ka;
      if (alt >= a.area.xMin && alt <= a.area.xMax) x = alt;
    }
    a.x = x;
    if (!flat) {
      const yo = cy + (o.y + o.halfH - cy) * ko;
      a.y = cy + (yo + pv * need * hs - cy) / ka - a.halfH;
    }
  }
}

function clampToArea(a: Agent): void {
  const ar = a.area;
  a.x = clamp(a.x, ar.xMin, ar.xMax);
  a.z = clamp(a.z, ar.zMin, ar.zMax);
  if (a.motion !== 'walk' && a.motion !== 'hop') {
    const yMin = ar.yMin ?? 0;
    a.y = clamp(a.y, yMin, ar.yMax ?? yMin);
  }
}

function stepGround(a: Agent, all: readonly Agent[], dt: number): void {
  switch (a.mode) {
    case 'react': {
      // Đứng hẳn lại một chỗ, ngoảnh về bé
      a.speed = 0;
      a.hop = -1;
      const look = (a.heading >= 0 ? 1 : -1) * LOOK_YAW * 0.6;
      a.yaw = ease(a.yaw, look, 7, dt);
      return;
    }
    case 'rest':
    case 'eat': {
      a.speed = 0;
      a.hop = -1;
      // nghỉ thì ngoảnh nhìn bé; ăn thì giữ hướng, cúi đầu (clip Eat)
      if (a.mode === 'rest') a.yaw = ease(a.yaw, (a.heading >= 0 ? 1 : -1) * LOOK_YAW, 2.5, dt);
      if (a.t >= a.dur) {
        a.mode = 'walk';
        a.t = 0;
        pickTarget(a);
      }
      return;
    }
    case 'idle':
      a.mode = 'walk';
      a.t = 0;
      pickTarget(a);
      return;
  }

  const dx = a.tx - a.x;
  const dz = a.tz - a.z;
  const d = Math.hypot(dx, dz);
  separation(a, all);
  const ux = (d > 1e-6 ? dx / d : 0) + sep[0] * SEP_W;
  const uz = (d > 1e-6 ? dz / d : 0) + sep[1] * SEP_W;

  const hopping = a.motion === 'hop';
  // Ếch chỉ đổi hướng lúc đang ngồi giữa hai cú nhảy
  const err = !hopping || a.hop < 0 ? turnToward(a, Math.atan2(ux, uz), dt) : wrapAngle(Math.atan2(ux, uz) - a.heading);
  const align = Math.max(0, Math.cos(err));
  const arrive = Math.max(0.2, Math.min(1, d / ARRIVE_R));
  const want = a.maxSpeed * arrive * (0.2 + 0.8 * align * align);

  if (hopping) {
    if (a.hop < 0) {
      a.speed = 0;
      a.hopWait -= dt;
      if (a.hopWait <= 0 && align > 0.7) a.hop = 0;
    }
    if (a.hop >= 0) {
      a.hop += dt / HOP_TIME;
      // Trên không đi nhanh gấp ~2 để tốc độ trung bình bằng want (nửa thời gian ngồi chờ)
      a.speed = want * 2;
      if (a.hop >= 1) {
        a.hop = -1;
        a.hopWait = 0.35 + rand(a) * 0.5;
      }
    }
  } else {
    a.speed += clamp(want - a.speed, -ACCEL * dt, ACCEL * dt);
  }

  a.x += Math.sin(a.heading) * a.speed * dt;
  a.z += Math.cos(a.heading) * a.speed * dt;
  clampToArea(a);
  resolveOverlap(a, all);
  clampToArea(a);
  a.yaw = ease(a.yaw, faceYaw(a.heading), 6, dt);
  // Ngóc/chúc theo độ dốc là 0 trên mặt đất; nghiêng nhẹ vào khúc cua cho sống động
  a.roll = ease(a.roll, 0, 6, dt);

  if (d < ARRIVE_EPS && (!hopping || a.hop < 0)) {
    a.t = 0;
    const r = rand(a);
    if (r < 0.3) {
      a.mode = 'rest';
      a.dur = 1.8 + rand(a) * 2.2;
    } else if (r < 0.55 && a.canEat) {
      a.mode = 'eat';
      a.dur = 2.5 + rand(a) * 2.5;
    } else {
      pickTarget(a);
    }
  }
}

function stepSwim(a: Agent, all: readonly Agent[], dt: number): void {
  if (a.mode === 'react') {
    a.speed = ease(a.speed, 0, 5, dt);
    a.yaw = ease(a.yaw, (a.heading >= 0 ? 1 : -1) * LOOK_YAW, 5, dt);
    a.pitch = ease(a.pitch, 0, 4, dt);
    a.roll = ease(a.roll, 0, 4, dt);
    return;
  }
  if (a.mode !== 'walk') a.mode = 'walk';
  const dx = a.tx - a.x;
  const dy = a.ty - a.y;
  const dz = a.tz - a.z;
  const dh = Math.hypot(dx, dz);
  separation(a, all);
  const ux = (dh > 1e-6 ? dx / dh : 0) + sep[0] * SEP_W;
  const uz = (dh > 1e-6 ? dz / dh : 0) + sep[1] * SEP_W;
  const before = a.heading;
  const err = turnToward(a, Math.atan2(ux, uz), dt);
  const align = Math.max(0, Math.cos(err));
  // cá không đứng yên: chậm lại khi phải quay nhiều nhưng vẫn lượn
  const want = a.maxSpeed * (0.35 + 0.65 * align);
  a.speed += clamp(want - a.speed, -ACCEL * dt, ACCEL * dt);
  const wantPitch = clamp(Math.atan2(dy + sep[2] * SEP_W, Math.max(dh, 0.3)), -0.45, 0.45);
  a.pitch = ease(a.pitch, wantPitch, 2, dt);
  const cp = Math.cos(a.pitch);
  a.x += Math.sin(a.heading) * cp * a.speed * dt;
  a.z += Math.cos(a.heading) * cp * a.speed * dt;
  a.y += Math.sin(a.pitch) * a.speed * dt;
  clampToArea(a);
  resolveOverlap(a, all);
  clampToArea(a);
  // Nghiêng vào khúc lượn
  const turnRate = dt > 0 ? wrapAngle(a.heading - before) / dt : 0;
  a.roll = ease(a.roll, clamp(-turnRate * 0.35, -0.4, 0.4), 3, dt);
  a.yaw = ease(a.yaw, faceYaw(a.heading), 5, dt);
  if (Math.hypot(dh, dy) < 0.5) pickTarget(a);
}

/** Thông số boids */
const NEIGH = 1.6;
const SEP_D = 0.55;
const W_SEP = 2.4;
const W_ALI = 0.8;
const W_COH = 0.5;
const W_SEEK = 0.7;
const MAX_ACC = 1.6;
/** Đàn cá tránh con bơi khác/đàn khác trong khoảng (r1 + r2) × AVOID_MULT */
const AVOID_MULT = 1.5;
const W_AVOID = 3;

function updateFlock(f: Flock, a: Agent, all: readonly Agent[], dt: number): void {
  if (f.tick === tick) return;
  f.tick = tick;
  f.t += dt;
  let n = 0;
  f.cx = 0;
  f.cy = 0;
  f.cz = 0;
  for (let i = 0; i < all.length; i++) {
    const o = all[i];
    if (o.flock !== f) continue;
    f.cx += o.x;
    f.cy += o.y;
    f.cz += o.z;
    n++;
  }
  if (n) {
    f.cx /= n;
    f.cy /= n;
    f.cz /= n;
  }
  if (Math.hypot(f.cx - f.tx, f.cy - f.ty, f.cz - f.tz) < 0.8 || f.t > 9) pickFlockTarget(f, a.area);
}

function stepSchool(a: Agent, all: readonly Agent[], dt: number): void {
  const f = a.flock;
  if (f) updateFlock(f, a, all, dt);
  if (a.mode === 'react') {
    a.vx = ease(a.vx, 0, 4, dt);
    a.vy = ease(a.vy, 0, 4, dt);
    a.vz = ease(a.vz, 0, 4, dt);
    a.speed = Math.hypot(a.vx, a.vy, a.vz);
    a.yaw = ease(a.yaw, (a.heading >= 0 ? 1 : -1) * LOOK_YAW, 5, dt);
    a.pitch = ease(a.pitch, 0, 4, dt);
    a.roll = ease(a.roll, 0, 4, dt);
    return;
  }
  if (a.mode !== 'walk') a.mode = 'walk';
  let sx = 0,
    sy = 0,
    sz = 0,
    alx = 0,
    aly = 0,
    alz = 0,
    cx = 0,
    cy = 0,
    cz = 0,
    n = 0;
  for (let i = 0; i < all.length; i++) {
    const o = all[i];
    if (o === a || o.flock !== a.flock) continue;
    const dx = a.x - o.x;
    const dy = a.y - o.y;
    const dz = a.z - o.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > NEIGH) continue;
    if (d < SEP_D && d > 1e-6) {
      const w = (SEP_D - d) / SEP_D / d;
      sx += dx * w;
      sy += dy * w;
      sz += dz * w;
    }
    // giữ thân cá trong đàn không chồng nhau (theo kích thước thật)
    normDist(a, o);
    if (nd[3] < 1.2 && nd[3] > 1e-6) {
      const w = (1.2 - nd[3]) / 1.2 / nd[3];
      sx += nd[0] * w;
      sy += nd[1] * w;
      sz += nd[2] * w;
    }
    alx += o.vx;
    aly += o.vy;
    alz += o.vz;
    cx += o.x;
    cy += o.y;
    cz += o.z;
    n++;
  }
  let ax = sx * W_SEP;
  let ay = sy * W_SEP;
  let az = sz * W_SEP;
  if (n) {
    ax += (alx / n - a.vx) * W_ALI + (cx / n - a.x) * W_COH;
    ay += (aly / n - a.vy) * W_ALI + (cy / n - a.y) * W_COH;
    az += (alz / n - a.vz) * W_ALI + (cz / n - a.z) * W_COH;
  }
  if (f) {
    const dx = f.tx - a.x;
    const dy = f.ty - a.y;
    const dz = f.tz - a.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    ax += ((dx / d) * a.maxSpeed - a.vx) * W_SEEK;
    ay += ((dy / d) * a.maxSpeed - a.vy) * W_SEEK;
    az += ((dz / d) * a.maxSpeed - a.vz) * W_SEEK;
  }
  // Tránh các con bơi khác (cá lớn, đàn khác) để các đàn không dồn vào một chỗ, chồng lên nhau
  for (let i = 0; i < all.length; i++) {
    const o = all[i];
    if (o === a || o.flock === a.flock || medium(o) !== 1) continue;
    normDist(a, o);
    const n = nd[3];
    if (n < AVOID_MULT && n > 1e-6) {
      const w = ((AVOID_MULT - n) / AVOID_MULT / n) * W_AVOID;
      // ey đã chuẩn hoá theo chiều cao (nhỏ) nên nhân 2 để đàn cá né lên/xuống không yếu hơn né ngang
      ax += nd[0] * w;
      ay += nd[1] * w * 2;
      az += nd[2] * w;
    }
  }
  // Kéo về trong vùng (lực lò xo khi ra gần mép)
  const ar = a.area;
  const m = 0.4;
  const yMin = ar.yMin ?? 0;
  const yMax = ar.yMax ?? yMin;
  if (a.x < ar.xMin + m) ax += (ar.xMin + m - a.x) * 4;
  if (a.x > ar.xMax - m) ax -= (a.x - ar.xMax + m) * 4;
  if (a.z < ar.zMin + m) az += (ar.zMin + m - a.z) * 4;
  if (a.z > ar.zMax - m) az -= (a.z - ar.zMax + m) * 4;
  if (a.y < yMin + 0.2) ay += (yMin + 0.2 - a.y) * 4;
  if (a.y > yMax - 0.2) ay -= (a.y - yMax + 0.2) * 4;
  // Cá bơi gần như nằm ngang
  ay *= 0.5;
  const acc = Math.hypot(ax, ay, az);
  if (acc > MAX_ACC) {
    const k = MAX_ACC / acc;
    ax *= k;
    ay *= k;
    az *= k;
  }
  a.vx += ax * dt;
  a.vy += ay * dt;
  a.vz += az * dt;
  let sp = Math.hypot(a.vx, a.vy, a.vz);
  const lo = a.maxSpeed * 0.4;
  if (sp < 1e-6) {
    a.vx = Math.sin(a.heading) * lo;
    a.vz = Math.cos(a.heading) * lo;
    sp = lo;
  } else if (sp > a.maxSpeed || sp < lo) {
    const k = clamp(sp, lo, a.maxSpeed) / sp;
    a.vx *= k;
    a.vy *= k;
    a.vz *= k;
    sp = clamp(sp, lo, a.maxSpeed);
  }
  a.speed = sp;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  a.z += a.vz * dt;
  clampToArea(a);
  resolveOverlap(a, all);
  clampToArea(a);
  const before = a.heading;
  a.heading = Math.atan2(a.vx, a.vz);
  const turn = dt > 0 ? wrapAngle(a.heading - before) / dt : 0;
  a.pitch = ease(a.pitch, clamp(Math.atan2(a.vy, Math.hypot(a.vx, a.vz)), -0.4, 0.4), 4, dt);
  a.roll = ease(a.roll, clamp(-turn * 0.3, -0.4, 0.4), 3, dt);
  a.yaw = ease(a.yaw, faceYaw(a.heading), 6, dt);
}

/** Đặt con bay lên quỹ đạo theo theta; cập nhật heading theo đạo hàm */
function placeOnPath(a: Agent, time: number): void {
  const p = a.path!;
  const s = Math.sin(a.theta);
  const c = Math.cos(a.theta);
  let dx: number;
  let dz: number;
  if (p.eight) {
    // Lemniscate Gerono: x = sin θ, z = sin θ cos θ
    a.x = p.cx + p.rx * s;
    a.z = p.cz + p.rz * s * c;
    dx = p.rx * c;
    dz = p.rz * Math.cos(2 * a.theta);
  } else {
    a.x = p.cx + p.rx * s;
    a.z = p.cz + p.rz * c;
    dx = p.rx * c;
    dz = -p.rz * s;
  }
  a.y = p.cy + p.bob * Math.sin(time * 1.6 + (a.seed % 100) * 0.1);
  a.heading = Math.atan2(dx * p.dir, dz * p.dir);
}

/** Độ dài |dP/dθ| để tiến theta với tốc độ dài cố định */
function pathRate(a: Agent): number {
  const p = a.path!;
  const c = Math.cos(a.theta);
  const s = Math.sin(a.theta);
  const dx = p.rx * c;
  const dz = p.eight ? p.rz * Math.cos(2 * a.theta) : -p.rz * s;
  return Math.max(0.3, Math.hypot(dx, dz));
}

/** Thời gian bay (để nhấp nhô liên tục cả khi lơ lửng) */
function stepFly(a: Agent, dt: number): void {
  const p = a.path;
  if (!p) return;
  a.dur += dt; // dùng dur làm đồng hồ bay (không reset theo mode)
  if (a.mode === 'react') {
    // Lơ lửng tại chỗ, quay mặt về bé, nhún nhảy trên không
    a.speed = ease(a.speed, 0, 5, dt);
    a.yaw = ease(a.yaw, 0, 4, dt);
    a.roll = ease(a.roll, 0, 4, dt);
    a.y = p.cy + p.bob * Math.sin(a.dur * 1.6 + (a.seed % 100) * 0.1) + Math.sin(Math.min(1, a.t / 0.8) * Math.PI) * 0.3;
    return;
  }
  if (a.mode !== 'walk') a.mode = 'walk';
  a.speed = ease(a.speed, a.maxSpeed, 2, dt);
  const before = a.heading;
  a.theta += (p.dir * a.speed * dt) / pathRate(a);
  placeOnPath(a, a.dur);
  const turn = dt > 0 ? wrapAngle(a.heading - before) / dt : 0;
  // Nghiêng thân vào phía trong vòng cua (nhiều hơn khi bay nhanh)
  a.roll = ease(a.roll, clamp(-turn * a.speed * 0.6, -0.6, 0.6), 4, dt);
  a.pitch = ease(a.pitch, clamp(Math.cos(a.dur * 1.6 + (a.seed % 100) * 0.1) * 0.25, -0.3, 0.3), 4, dt);
  a.yaw = ease(a.yaw, faceYaw(a.heading), 6, dt);
}
