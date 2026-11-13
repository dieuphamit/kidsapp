/**
 * Bạn đồng hành đất sét: mô tả hình khối thuần dữ liệu (không R3F) để test được trong jsdom.
 * Buddy.tsx vẽ danh sách này bằng mesh. Mọi con chung khung với mèo Đậu Đậu cũ (đầu to chibi,
 * thân, bụng, tay chân, mắt, má hồng); chỉ khác tai, đuôi, mõm và màu lông (tokens BUDDY_HEX).
 */
import { BUDDY_CHEEK, BUDDY_HEX, BUDDY_INK, type BuddyCharacter, type BuddyPalette } from '../core/tokens';

export type V3 = [number, number, number];

/** Nhóm có vai trò được Buddy.tsx cho cử động: wave = tay phải vẫy, wag = đuôi ngoe nguẩy. */
export type PartRole = 'wave' | 'wag';

export type Part =
  | { kind: 'ball'; r: number; color: string; p: V3; s?: V3; opacity?: number }
  | { kind: 'cone'; r: number; h: number; color: string; p: V3; s?: V3 }
  | { kind: 'torus'; r: number; tube: number; arc: number; color: string; p: V3 }
  /** đốm sáng trong mắt: vật liệu không nhận ánh sáng, luôn trắng */
  | { kind: 'shine'; r: number; p: V3 }
  | { kind: 'group'; p: V3; rot?: V3; role?: PartRole; tag?: string; children: Part[] };

export type EarStyle = 'pointy' | 'floppy' | 'long' | 'round';
export type TailStyle = 'curl' | 'wag' | 'puff' | 'stub';
export type MuzzleStyle = 'cat' | 'dog' | 'bunny' | 'bear';

export interface BuddyLook {
  ears: EarStyle;
  tail: TailStyle;
  muzzle: MuzzleStyle;
  palette: BuddyPalette;
}

export const BUDDY_LOOKS: Record<BuddyCharacter, BuddyLook> = {
  cat: { ears: 'pointy', tail: 'curl', muzzle: 'cat', palette: BUDDY_HEX.cat },
  dog: { ears: 'floppy', tail: 'wag', muzzle: 'dog', palette: BUDDY_HEX.dog },
  bunny: { ears: 'long', tail: 'puff', muzzle: 'bunny', palette: BUDDY_HEX.bunny },
  bear: { ears: 'round', tail: 'stub', muzzle: 'bear', palette: BUDDY_HEX.bear },
};

const ball = (r: number, color: string, p: V3, s?: V3, opacity?: number): Part => ({ kind: 'ball', r, color, p, s, opacity });

function ears(style: EarStyle, c: BuddyPalette): Part[] {
  const pair = (make: (side: 1 | -1) => Part) => [make(-1), make(1)];
  switch (style) {
    case 'pointy': // tai mèo nhọn, lòng tai hồng đẩy ra trước để không trùng mặt
      return pair((side) => ({
        kind: 'group', tag: 'ear', p: [side * 0.5, 2.72, 0.05], rot: [-0.12, 0, -side * 0.38],
        children: [
          { kind: 'cone', r: 0.3, h: 0.6, color: c.fur, p: [0, 0, 0], s: [1, 1, 0.6] },
          { kind: 'cone', r: 0.18, h: 0.4, color: c.accent, p: [0, -0.05, 0.1], s: [1, 1, 0.5] },
        ],
      }));
    case 'floppy': // tai cún cụp hai bên má, màu đậm
      return pair((side) => ({
        kind: 'group', tag: 'ear', p: [side * 0.8, 2.42, 0.02], rot: [0.1, 0, side * 0.32],
        children: [ball(0.3, c.accent, [0, -0.32, 0], [0.72, 1.45, 0.5])],
      }));
    case 'long': // tai thỏ dài dựng đứng, lòng tai hồng
      return pair((side) => ({
        kind: 'group', tag: 'ear', p: [side * 0.3, 2.62, -0.05], rot: [-0.1, 0, -side * 0.16],
        children: [
          ball(0.2, c.fur, [0, 0.46, 0], [1, 2.6, 0.7]),
          ball(0.12, c.accent, [0, 0.46, 0.1], [1, 2.3, 0.45]),
        ],
      }));
    case 'round': // tai gấu tròn, lòng tai màu bụng
      return pair((side) => ({
        kind: 'group', tag: 'ear', p: [side * 0.6, 2.6, 0], rot: [0, 0, 0],
        children: [ball(0.27, c.fur, [0, 0, 0], [1, 1, 0.6]), ball(0.15, c.belly, [0, -0.02, 0.1], [1, 1, 0.4])],
      }));
  }
}

function tail(style: TailStyle, c: BuddyPalette): Part {
  switch (style) {
    case 'curl': { // đuôi mèo cong tròn
      const a = Math.PI * 1.25;
      return {
        kind: 'group', tag: 'tail', p: [0.78, 0.92, -0.38], rot: [0, -0.5, -Math.PI / 2],
        children: [
          { kind: 'torus', r: 0.32, tube: 0.1, arc: a, color: c.fur, p: [0, 0, 0] },
          ball(0.1, c.fur, [0.32 * Math.cos(a), 0.32 * Math.sin(a), 0]),
        ],
      };
    }
    case 'wag': // đuôi cún vểnh lên, ngoe nguẩy
      return {
        kind: 'group', tag: 'tail', role: 'wag', p: [0, 0.7, -0.6], rot: [-0.6, 0, 0],
        children: [ball(0.13, c.fur, [0, 0.24, 0], [0.85, 2, 0.85]), ball(0.11, c.belly, [0, 0.5, 0])],
      };
    case 'puff': // đuôi thỏ bông tròn
      return { kind: 'group', tag: 'tail', p: [0, 0.5, -0.64], children: [ball(0.23, c.belly, [0, 0, 0])] };
    case 'stub': // đuôi gấu cụt
      return { kind: 'group', tag: 'tail', p: [0, 0.48, -0.62], children: [ball(0.15, c.fur, [0, 0, 0])] };
  }
}

function muzzle(style: MuzzleStyle, c: BuddyPalette): Part {
  const children: Part[] = (() => {
    switch (style) {
      case 'cat':
        return [
          ball(0.17, c.belly, [-0.12, 1.72, 0.76], [1.15, 0.85, 0.7]),
          ball(0.17, c.belly, [0.12, 1.72, 0.76], [1.15, 0.85, 0.7]),
          ball(0.06, c.accent, [0, 1.83, 0.86], [1.3, 0.9, 0.8]),
        ];
      case 'dog': // mõm dài, mũi đen to, lưỡi hồng
        return [
          ball(0.3, c.belly, [0, 1.7, 0.7], [1.15, 0.8, 0.8]),
          ball(0.1, BUDDY_INK, [0, 1.84, 0.93], [1.3, 0.95, 0.9]),
          ball(0.08, BUDDY_CHEEK, [0, 1.55, 0.86], [1, 0.65, 0.5]),
        ];
      case 'bunny': // mõm nhỏ, mũi hồng, hai răng cửa
        return [
          ball(0.15, c.belly, [-0.1, 1.72, 0.77], [1.1, 0.85, 0.7]),
          ball(0.15, c.belly, [0.1, 1.72, 0.77], [1.1, 0.85, 0.7]),
          ball(0.06, c.accent, [0, 1.83, 0.87], [1.3, 0.9, 0.8]),
          ball(0.045, c.belly, [-0.035, 1.58, 0.84], [0.8, 1.3, 0.5]),
          ball(0.045, c.belly, [0.035, 1.58, 0.84], [0.8, 1.3, 0.5]),
        ];
      case 'bear': // mõm tròn màu kem, mũi đen
        return [
          ball(0.28, c.belly, [0, 1.7, 0.72], [1.2, 0.85, 0.75]),
          ball(0.09, BUDDY_INK, [0, 1.8, 0.93], [1.4, 1, 0.9]),
        ];
    }
  })();
  return { kind: 'group', tag: 'muzzle', p: [0, 0, 0], children };
}

function eye(x: number): Part {
  return {
    kind: 'group', tag: 'eye', p: [x, 2.0, 0.78],
    children: [ball(0.13, BUDDY_INK, [0, 0, 0], [1, 1.15, 0.6]), { kind: 'shine', r: 0.045, p: [-0.04, 0.05, 0.075] }],
  };
}

/** Toàn bộ hình khối của một bạn đồng hành, gốc toạ độ ở chân, cao ~2.9 (thỏ ~3.5 với tai). */
export function buddyParts(look: BuddyLook): Part[] {
  const c = look.palette;
  return [
    // thân + bụng (nhô ra trước thân để không z-fight)
    ball(0.7, c.fur, [0, 0.75, 0], [1, 1.05, 0.9]),
    ball(0.42, c.belly, [0, 0.72, 0.47], [1, 1.1, 0.45]),
    // tay trái; tay phải trong nhóm xoay quanh vai để vẫy chào
    ball(0.19, c.fur, [-0.48, 0.82, 0.42], [1, 1.1, 1]),
    { kind: 'group', tag: 'arm', role: 'wave', p: [0.4, 1.14, 0.36], children: [ball(0.19, c.fur, [0.08, -0.32, 0.06], [1, 1.1, 1])] },
    // chân
    ball(0.27, c.fur, [-0.34, 0.2, 0.33], [1, 0.78, 1.2]),
    ball(0.27, c.fur, [0.34, 0.2, 0.33], [1, 0.78, 1.2]),
    tail(look.tail, c),
    // đầu to (tỉ lệ chibi)
    ball(0.88, c.fur, [0, 1.95, 0], [1.05, 0.95, 0.95]),
    ...ears(look.ears, c),
    eye(-0.32),
    eye(0.32),
    muzzle(look.muzzle, c),
    // má hồng
    ball(0.13, BUDDY_CHEEK, [-0.52, 1.8, 0.66], [1, 0.6, 0.4], 0.75),
    ball(0.13, BUDDY_CHEEK, [0.52, 1.8, 0.66], [1, 0.6, 0.4], 0.75),
  ];
}

/** Số đoạn [ngang, dọc] của khối cầu theo bán kính: khối nhỏ ít đoạn hơn, vẫn tròn trên màn. */
export function ballSegments(r: number): [number, number] {
  if (r >= 0.5) return [40, 32];
  if (r >= 0.2) return [28, 20];
  return [20, 14];
}

/** Màu dùng trong một danh sách hình khối (để test chỉ dùng màu token). */
export function partColors(parts: Part[]): Set<string> {
  const out = new Set<string>();
  const walk = (ps: Part[]) => {
    for (const p of ps) {
      if (p.kind === 'group') walk(p.children);
      else if (p.kind !== 'shine') out.add(p.color);
    }
  };
  walk(parts);
  return out;
}

/** Ước lượng số tam giác (cầu theo ballSegments, nón/xuyến 32–48 đoạn) để giữ cảnh ≤ ~50k. */
export function estimateTriangles(parts: Part[]): number {
  let n = 0;
  const walk = (ps: Part[]) => {
    for (const p of ps) {
      if (p.kind === 'group') walk(p.children);
      else if (p.kind === 'ball') { const [w, h] = ballSegments(p.r); n += w * h * 2; }
      else if (p.kind === 'shine') n += 16 * 12 * 2;
      else if (p.kind === 'cone') n += 32 * 2;
      else n += 16 * 48 * 2;
    }
  };
  walk(parts);
  return n;
}
