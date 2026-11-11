/**
 * Logic đi lại của con vật trong cảnh 3D (Trang trại, Sở thú), tách khỏi React/three để test unit.
 *
 * Con vật "đi dạo" đi qua lại theo một làn cố định (z không đổi, x trong [xMin, xMax]); mỗi con một làn
 * ở độ sâu khác nhau nên chúng đi lướt qua nhau mà không chạm. Tới đầu làn thì chậm lại, quay mặt về phía
 * bé rồi quay hẳn sang hướng ngược lại. Thỉnh thoảng dừng nghỉ, ngoảnh nhìn bé một chút.
 * Con vật "đứng yên" chỉ lắc lư, thở, cúi đầu gặm cỏ.
 *
 * Mọi hàm chỉ sửa object trạng thái có sẵn (không cấp phát mỗi frame) để chạy trong useFrame.
 */

/** Kiểu dáng di chuyển: đi bộ, nhảy lò cò (gà, vẹt), lạch bạch (vịt, cánh cụt), bơi (cá) */
export type Gait = 'walk' | 'hop' | 'waddle' | 'swim';

/** Làn đi dạo: z lấy từ vị trí ban đầu của con vật */
export type Lane = {
  xMin: number;
  xMax: number;
  /** đơn vị/giây; giữ chậm (0.35–0.6) cho bé 2 tuổi kịp nhìn và chạm */
  speed: number;
  /** hướng đi ban đầu: 1 = sang phải, -1 = sang trái */
  dir?: 1 | -1;
};

export type WanderMode = 'idle' | 'walk' | 'turn' | 'pause' | 'react';

export type WanderState = {
  x: number;
  z: number;
  dir: 1 | -1;
  /** góc quay quanh trục y; 0 = nhìn thẳng camera */
  yaw: number;
  mode: WanderMode;
  /** thời gian (giây) đã ở mode hiện tại */
  t: number;
  /** pha bước chân (radian), chỉ tăng khi đang đi */
  stride: number;
  /** 0..1: mức đang bước (mượt lên/xuống để dáng đi không giật khi dừng) */
  moving: number;
  /** góc bắt đầu/kết thúc của một lần quay */
  yawFrom: number;
  yawTo: number;
  /** thời lượng của lần quay hiện tại */
  turnDur: number;
  /** quay xong thì có đổi hướng đi không (false: chỉ quay lại hướng cũ sau khi dừng/nghỉ) */
  flipAfterTurn: boolean;
  /** quãng đường còn đi trước lần nghỉ tiếp theo */
  untilPause: number;
  /** mode trước khi bị chạm (để biết sau phản ứng thì đi tiếp hay đứng yên) */
  wasWalker: boolean;
  /** hạt giống ngẫu nhiên riêng (deterministic) cho nhịp nghỉ */
  seed: number;
};

/** Mặt hơi chếch về camera khi đi để bé vẫn thấy mặt con vật (0 = đi ngang hẳn) */
export const FACE_BIAS = 0.28;
/** Quay đầu ở cuối làn (giây) */
export const TURN_TIME = 1.6;
/** Tổng thời gian phản ứng khi được chạm (giây): dừng, nhìn bé, nhảy, rồi mới đi tiếp */
export const REACT_TIME = 2.4;
/** Thời gian nghỉ giữa đường (giây) */
export const PAUSE_TIME = 2.2;
/** Góc ngoảnh về bé khi nghỉ / khi được chạm (tính từ hướng nhìn thẳng camera) */
const LOOK_YAW = 0.45;
/** Đoạn cuối làn (đơn vị) bắt đầu đi chậm lại */
const SLOW_ZONE = 0.9;

/** Góc quay khi đi theo hướng dir */
export function walkYaw(dir: 1 | -1): number {
  return dir * (Math.PI / 2 - FACE_BIAS);
}

/** Số ngẫu nhiên 0..1 từ seed (LCG), cập nhật seed trong state */
function rand(s: WanderState): number {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}

function smooth(p: number): number {
  const c = p < 0 ? 0 : p > 1 ? 1 : p;
  return c * c * (3 - 2 * c);
}

export function createWander(
  pos: readonly [number, number, number],
  restYaw: number,
  lane: Lane | undefined,
  seed: number,
): WanderState {
  const dir = lane?.dir ?? 1;
  const s: WanderState = {
    x: pos[0],
    z: pos[2],
    dir,
    yaw: lane ? walkYaw(dir) : restYaw,
    mode: lane ? 'walk' : 'idle',
    t: 0,
    stride: seed,
    moving: lane ? 1 : 0,
    yawFrom: 0,
    yawTo: 0,
    turnDur: TURN_TIME,
    flipAfterTurn: false,
    untilPause: 0,
    wasWalker: !!lane,
    seed: (seed * 2654435761) >>> 0 || 1,
  };
  s.untilPause = 3 + rand(s) * 4;
  return s;
}

function startTurn(s: WanderState, to: number, dur: number, flip: boolean): void {
  s.mode = 'turn';
  s.t = 0;
  s.yawFrom = s.yaw;
  s.yawTo = to;
  s.turnDur = dur;
  s.flipAfterTurn = flip;
}

/** Con vật được chạm: dừng lại, ngoảnh về bé; phần nhảy do component vẽ theo s.t */
export function startReact(s: WanderState): void {
  // Đang quay đầu ở cuối làn: coi như đã quay xong, đi tiếp theo hướng mới sau khi phản ứng
  if (s.mode === 'turn' && s.flipAfterTurn) s.dir = s.dir === 1 ? -1 : 1;
  s.mode = 'react';
  s.t = 0;
  s.yawFrom = s.yaw;
}

/** Bước trạng thái thêm dt giây. Bước chân tính theo quãng đường đi được (strideRate rad/đơn vị). */
export function stepWander(s: WanderState, lane: Lane | undefined, rawDt: number, strideRate: number): void {
  // Tab ẩn rồi hiện lại cho dt rất lớn: kẹp để con vật không "dịch chuyển tức thời"
  // (0.25s: máy chậm vài khung hình/giây vẫn đi đúng tốc độ thật)
  const dt = rawDt > 0.25 ? 0.25 : rawDt < 0 ? 0 : rawDt;
  s.t += dt;
  let targetMoving = 0;

  switch (s.mode) {
    case 'idle':
      break;

    case 'walk': {
      if (!lane) {
        s.mode = 'idle';
        break;
      }
      // Gần cuối làn thì đi chậm lại cho mượt (không thấp hơn 30%)
      const left = s.dir > 0 ? lane.xMax - s.x : s.x - lane.xMin;
      const ease = 0.3 + 0.7 * smooth(left / SLOW_ZONE);
      const dx = lane.speed * ease * dt;
      s.x += s.dir * dx;
      s.stride += dx * strideRate;
      s.untilPause -= dx;
      targetMoving = ease;
      // Quay mặt dần về đúng hướng đi (sau khi nghỉ/được chạm)
      const want = walkYaw(s.dir);
      s.yaw += (want - s.yaw) * (1 - Math.exp(-dt * 6));

      if (left - dx <= 0) {
        s.x = s.dir > 0 ? lane.xMax : lane.xMin;
        startTurn(s, walkYaw(s.dir === 1 ? -1 : 1), TURN_TIME, true);
      } else if (s.untilPause <= 0 && left > 1.5) {
        s.mode = 'pause';
        s.t = 0;
        s.yawFrom = s.yaw;
        s.untilPause = 3 + rand(s) * 4;
      }
      break;
    }

    case 'turn': {
      const p = smooth(s.t / s.turnDur);
      s.yaw = s.yawFrom + (s.yawTo - s.yawFrom) * p;
      // Bước nhẹ tại chỗ khi quay đầu
      s.stride += dt * strideRate * 0.15;
      targetMoving = 0.35;
      if (s.t >= s.turnDur) {
        s.yaw = s.yawTo;
        if (s.flipAfterTurn) s.dir = s.dir === 1 ? -1 : 1;
        s.mode = 'walk';
        s.t = 0;
      }
      break;
    }

    case 'pause': {
      // Ngoảnh về phía bé một chút rồi đứng ngắm
      const look = s.dir * LOOK_YAW;
      s.yaw += (look - s.yaw) * (1 - Math.exp(-dt * 2.5));
      if (s.t >= PAUSE_TIME) startTurn(s, walkYaw(s.dir), 0.9, false);
      break;
    }

    case 'react': {
      if (s.wasWalker) {
        const look = s.dir * LOOK_YAW * 0.6;
        s.yaw += (look - s.yaw) * (1 - Math.exp(-dt * 7));
      }
      if (s.t >= REACT_TIME || (!s.wasWalker && s.t >= 0.6)) {
        if (s.wasWalker) startTurn(s, walkYaw(s.dir), 0.8, false);
        else {
          s.mode = 'idle';
          s.t = 0;
        }
      }
      break;
    }
  }

  s.moving += (targetMoving - s.moving) * (1 - Math.exp(-dt * 8));
}

/** Tiến độ cú nhảy khi được chạm (0..1), hoặc -1 nếu không đang nhảy. Nhảy sau khi kịp ngoảnh lại. */
export function jumpProgress(s: WanderState): number {
  if (s.mode !== 'react') return -1;
  const start = s.wasWalker ? 0.25 : 0;
  const p = (s.t - start) / 0.6;
  return p < 0 || p > 1 ? -1 : p;
}
