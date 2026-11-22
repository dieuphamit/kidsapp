/**
 * Tranh tô màu: mỗi tranh vẽ trong khung 400×400, gồm các vùng kín (path, chạm để đổ màu; vẽ theo thứ tự,
 * vùng sau đè vùng trước) và các nét trang trí (mắt, miệng, râu...) vẽ trên cùng, không nhận chạm.
 */

export const VIEW = 400;

export type GroupId = 'animals' | 'sea' | 'bugs' | 'vehicles' | 'fruits' | 'things' | 'daudau';

export const GROUPS: { id: GroupId; icon: string }[] = [
  { id: 'animals', icon: '🐷' },
  { id: 'sea', icon: '🐠' },
  { id: 'bugs', icon: '🦋' },
  { id: 'vehicles', icon: '🚗' },
  { id: 'fruits', icon: '🍓' },
  { id: 'things', icon: '🏠' },
  { id: 'daudau', icon: '🐱' },
];

export type Region = { id: string; d: string };
/** ink = chấm đen đặc (mắt, mũi); line = nét đen; glint = đốm trắng (ánh mắt, bóng). */
export type Detail = { kind: 'ink' | 'line' | 'glint'; d: string };
export type Picture = { id: string; group: GroupId; regions: Region[]; details: Detail[] };

// ---- Hình cơ bản sinh chuỗi path ----
const n = (v: number) => Math.round(v * 10) / 10;

export function circ(cx: number, cy: number, r: number): string {
  return ell(cx, cy, r, r);
}

export function ell(cx: number, cy: number, rx: number, ry: number): string {
  return `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)} Z`;
}

export function rrect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${n(x + r)} ${n(y)} L${n(x + w - r)} ${n(y)} Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)} ` +
    `L${n(x + w)} ${n(y + h - r)} Q${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} ` +
    `L${n(x + r)} ${n(y + h)} Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)} ` +
    `L${n(x)} ${n(y + r)} Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)} Z`
  );
}

export function poly(...pts: [number, number][]): string {
  return `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z`;
}

/** Mắt tròn có đốm sáng. */
function eye(cx: number, cy: number, r = 12): Detail[] {
  return [
    { kind: 'ink', d: circ(cx, cy, r) },
    { kind: 'glint', d: circ(cx + r * 0.35, cy - r * 0.35, r * 0.35) },
  ];
}

const line = (d: string): Detail => ({ kind: 'line', d });
const ink = (d: string): Detail => ({ kind: 'ink', d });
const R = (id: string, d: string): Region => ({ id, d });

/** Mặt mèo Đậu Đậu (mắt, mũi, miệng, râu) quanh điểm giữa hai mắt. */
function catFace(cx: number, cy: number, gap: number, s = 1): Detail[] {
  const ny = cy + 30 * s;
  return [
    ...eye(cx - gap, cy, 13 * s),
    ...eye(cx + gap, cy, 13 * s),
    ink(poly([cx - 11 * s, ny], [cx + 11 * s, ny], [cx, ny + 12 * s])),
    line(`M${n(cx)} ${n(ny + 12 * s)} Q${n(cx - 10 * s)} ${n(ny + 27 * s)} ${n(cx - 22 * s)} ${n(ny + 21 * s)} M${n(cx)} ${n(ny + 12 * s)} Q${n(cx + 10 * s)} ${n(ny + 27 * s)} ${n(cx + 22 * s)} ${n(ny + 21 * s)}`),
    line(
      `M${n(cx - gap - 55 * s)} ${n(ny - 4 * s)} L${n(cx - gap - 8 * s)} ${n(ny + 4 * s)} M${n(cx - gap - 55 * s)} ${n(ny + 20 * s)} L${n(cx - gap - 8 * s)} ${n(ny + 16 * s)} ` +
        `M${n(cx + gap + 55 * s)} ${n(ny - 4 * s)} L${n(cx + gap + 8 * s)} ${n(ny + 4 * s)} M${n(cx + gap + 55 * s)} ${n(ny + 20 * s)} L${n(cx + gap + 8 * s)} ${n(ny + 16 * s)}`,
    ),
  ];
}

export const PICTURES: Picture[] = [
  // ---------- Các con vật ----------
  {
    id: 'pig',
    group: 'animals',
    regions: [
      R('ear-l', 'M116 150 Q104 74 136 56 Q172 74 194 118 Z'),
      R('ear-r', 'M284 150 Q296 74 264 56 Q228 74 206 118 Z'),
      R('head', circ(200, 205, 120)),
      R('snout', ell(200, 245, 55, 38)),
      R('cheek-l', circ(118, 240, 22)),
      R('cheek-r', circ(282, 240, 22)),
    ],
    details: [...eye(155, 175), ...eye(245, 175), ink(ell(182, 245, 9, 13)), ink(ell(218, 245, 9, 13))],
  },
  {
    id: 'bear',
    group: 'animals',
    regions: [
      R('ear-l', circ(115, 105, 45)),
      R('ear-l-in', circ(115, 105, 22)),
      R('ear-r', circ(285, 105, 45)),
      R('ear-r-in', circ(285, 105, 22)),
      R('head', circ(200, 210, 125)),
      R('muzzle', ell(200, 262, 62, 46)),
    ],
    details: [...eye(150, 185), ...eye(250, 185), ink(ell(200, 240, 20, 14)), line('M200 252 L200 270 M178 272 Q200 290 222 272')],
  },
  {
    id: 'rabbit',
    group: 'animals',
    regions: [
      R('ear-l', ell(160, 110, 30, 85)),
      R('ear-l-in', ell(160, 115, 14, 60)),
      R('ear-r', ell(240, 110, 30, 85)),
      R('ear-r-in', ell(240, 115, 14, 60)),
      R('head', circ(200, 260, 110)),
      R('cheek-l', circ(135, 290, 20)),
      R('cheek-r', circ(265, 290, 20)),
    ],
    details: [
      ...eye(165, 245),
      ...eye(235, 245),
      ink(poly([188, 270], [212, 270], [200, 284])),
      line('M200 284 Q190 300 178 294 M200 284 Q210 300 222 294'),
    ],
  },
  {
    id: 'elephant',
    group: 'animals',
    regions: [
      R('ear-l', ell(100, 200, 80, 100)),
      R('ear-r', ell(300, 200, 80, 100)),
      R('head', ell(200, 195, 100, 95)),
      R('trunk', 'M172 240 C168 300 175 345 215 362 C240 370 258 352 248 338 C222 336 212 300 228 240 Z'),
      R('hat', poly([160, 115], [200, 35], [240, 115])),
      R('pompom', circ(200, 35, 16)),
    ],
    details: [...eye(160, 190), ...eye(240, 190), line('M135 235 Q150 245 162 236 M265 235 Q250 245 238 236')],
  },

  // ---------- Dưới biển ----------
  {
    id: 'fish',
    group: 'sea',
    regions: [
      R('tail', poly([290, 200], [372, 130], [372, 270])),
      R('fin-top', 'M150 125 Q190 70 240 122 Z'),
      R('fin-bottom', 'M170 275 Q195 322 228 278 Z'),
      R('body', ell(190, 200, 120, 85)),
      R('stripe', 'M215 118 Q238 200 215 282 L250 273 Q273 200 250 127 Z'),
      R('bubble-1', circ(70, 90, 26)),
      R('bubble-2', circ(115, 42, 18)),
    ],
    details: [...eye(130, 182, 14), line('M92 222 Q106 236 122 226')],
  },
  {
    id: 'whale',
    group: 'sea',
    regions: [
      R('spout', 'M190 125 Q172 62 138 62 Q176 44 192 84 Q206 44 244 62 Q212 62 204 125 Z'),
      R('tail', poly([300, 225], [382, 160], [362, 228], [388, 292])),
      R('body', 'M60 230 Q60 120 190 120 Q320 120 330 230 Q330 300 200 300 Q60 300 60 230 Z'),
      R('belly', 'M86 268 Q200 318 316 262 Q296 300 200 300 Q102 300 86 268 Z'),
      R('water', 'M20 332 Q60 304 100 332 Q140 360 180 332 Q220 304 260 332 Q300 360 340 332 Q366 314 384 332 L384 386 L20 386 Z'),
    ],
    details: [...eye(115, 200), line('M78 236 Q96 252 122 242')],
  },
  {
    id: 'octopus',
    group: 'sea',
    regions: [
      R('leg-1', 'M95 230 Q75 300 95 340 Q110 365 125 340 Q110 300 135 230 Z'),
      R('leg-2', 'M150 230 Q130 310 150 350 Q165 375 180 350 Q165 310 190 230 Z'),
      R('leg-3', 'M210 230 Q235 310 220 350 Q235 375 250 350 Q270 310 250 230 Z'),
      R('leg-4', 'M265 230 Q290 300 275 340 Q290 365 305 340 Q325 300 305 230 Z'),
      R('head', ell(200, 160, 112, 105)),
      R('cheek-l', circ(128, 192, 19)),
      R('cheek-r', circ(272, 192, 19)),
    ],
    details: [...eye(160, 150, 14), ...eye(240, 150, 14), line('M172 196 Q200 220 228 196')],
  },
  {
    id: 'turtle',
    group: 'sea',
    regions: [
      R('leg-l', ell(110, 285, 34, 24)),
      R('leg-r', ell(290, 285, 34, 24)),
      R('head', circ(352, 225, 38)),
      R('shell', 'M70 262 Q80 108 200 104 Q320 108 330 262 Z'),
      R('hex', poly([160, 165], [240, 165], [268, 210], [240, 255], [160, 255], [132, 210])),
      R('rim', rrect(56, 250, 288, 32, 16)),
    ],
    details: [...eye(362, 216, 9), line('M346 242 Q360 254 376 240')],
  },

  // ---------- Chim và côn trùng ----------
  {
    id: 'butterfly',
    group: 'bugs',
    regions: [
      R('wing-tl', ell(122, 145, 84, 72)),
      R('wing-tr', ell(278, 145, 84, 72)),
      R('wing-bl', ell(140, 268, 62, 56)),
      R('wing-br', ell(260, 268, 62, 56)),
      R('spot-l', circ(112, 145, 30)),
      R('spot-r', circ(288, 145, 30)),
      R('body', rrect(180, 112, 40, 212, 20)),
      R('head', circ(200, 92, 30)),
    ],
    details: [
      line('M190 66 Q176 30 155 30 M210 66 Q224 30 245 30'),
      ink(circ(155, 30, 8)),
      ink(circ(245, 30, 8)),
      ink(circ(189, 88, 5)),
      ink(circ(211, 88, 5)),
      line('M189 101 Q200 109 211 101'),
    ],
  },
  {
    id: 'ladybug',
    group: 'bugs',
    regions: [
      R('head', ell(200, 100, 62, 46)),
      R('wing-l', 'M200 92 A130 130 0 0 0 200 352 Z'),
      R('wing-r', 'M200 92 A130 130 0 0 1 200 352 Z'),
      R('spot-1', circ(138, 180, 25)),
      R('spot-2', circ(148, 275, 27)),
      R('spot-3', circ(262, 180, 25)),
      R('spot-4', circ(252, 275, 27)),
    ],
    details: [
      line('M175 60 Q160 25 140 25 M225 60 Q240 25 260 25'),
      ink(circ(140, 25, 8)),
      ink(circ(260, 25, 8)),
      ...eye(178, 88, 8),
      ...eye(222, 88, 8),
      line('M74 200 L44 186 M72 252 L40 262 M326 200 L356 186 M328 252 L360 262'),
    ],
  },
  {
    id: 'bird',
    group: 'bugs',
    regions: [
      R('branch', rrect(40, 345, 320, 26, 13)),
      R('tail', 'M92 212 L25 160 L45 230 L25 292 L97 246 Z'),
      R('beak', poly([296, 192], [352, 214], [296, 236])),
      R('body', ell(190, 220, 115, 90)),
      R('wing', 'M140 200 Q200 160 252 215 Q210 272 140 232 Z'),
      R('belly', 'M110 255 Q190 330 280 255 Q262 300 190 310 Q126 305 110 255 Z'),
    ],
    details: [...eye(255, 188, 12), line('M170 308 L166 350 M212 308 L216 350 M150 352 L182 352 M200 352 L232 352')],
  },
  {
    id: 'snail',
    group: 'bugs',
    regions: [
      R('sun', circ(342, 66, 36)),
      R('ground', rrect(14, 318, 372, 64, 20)),
      R('body', 'M40 320 Q40 262 80 252 L95 182 Q100 150 125 165 Q132 200 122 262 L330 272 Q380 282 370 320 Z'),
      R('shell', circ(222, 192, 100)),
      R('shell-core', circ(222, 192, 42)),
    ],
    details: [
      line('M105 166 L92 120 M120 166 L132 118'),
      ink(circ(92, 114, 9)),
      ink(circ(132, 112, 9)),
      line('M78 238 Q90 248 104 240'),
      line('M222 150 Q282 150 284 210 M222 234 Q162 234 160 172'),
    ],
  },

  // ---------- Xe cộ ----------
  {
    id: 'car',
    group: 'vehicles',
    regions: [
      R('road', rrect(20, 318, 360, 30, 15)),
      R('body', 'M50 270 L50 210 Q50 190 75 190 L120 190 L160 130 Q170 120 185 120 L270 120 Q285 120 295 135 L330 190 L345 190 Q360 190 360 210 L360 270 Z'),
      R('win-l', 'M138 190 L170 142 L205 142 L205 190 Z'),
      R('win-r', 'M220 142 L268 142 Q278 142 284 152 L308 190 L220 190 Z'),
      R('wheel-l', circ(120, 275, 42)),
      R('wheel-r', circ(290, 275, 42)),
      R('hub-l', circ(120, 275, 17)),
      R('hub-r', circ(290, 275, 17)),
    ],
    details: [ink(circ(346, 224, 9)), line('M212 205 L212 262')],
  },
  {
    id: 'bus',
    group: 'vehicles',
    regions: [
      R('body', rrect(40, 105, 320, 195, 28)),
      R('win-1', rrect(68, 132, 72, 62, 12)),
      R('win-2', rrect(164, 132, 72, 62, 12)),
      R('win-3', rrect(260, 132, 72, 62, 12)),
      R('stripe', 'M40 218 L360 218 L360 246 L40 246 Z'),
      R('wheel-l', circ(110, 302, 40)),
      R('wheel-r', circ(290, 302, 40)),
    ],
    details: [ink(circ(342, 274, 9)), ink(circ(110, 302, 12)), ink(circ(290, 302, 12))],
  },
  {
    id: 'boat',
    group: 'vehicles',
    regions: [
      R('sun', circ(330, 78, 40)),
      R('sail-l', poly([194, 62], [194, 232], [86, 232])),
      R('sail-r', poly([212, 92], [212, 232], [304, 232])),
      R('flag', poly([204, 22], [252, 38], [204, 54])),
      R('hull', poly([58, 250], [342, 250], [300, 322], [100, 322])),
      R('water', 'M15 300 Q55 275 95 300 Q135 325 175 300 Q215 275 255 300 Q295 325 335 300 Q365 282 385 300 L385 386 L15 386 Z'),
    ],
    details: [line('M203 22 L203 250')],
  },
  {
    id: 'rocket',
    group: 'vehicles',
    regions: [
      R('flame', 'M150 250 Q200 386 250 250 Z'),
      R('flame-in', 'M174 250 Q200 330 226 250 Z'),
      R('fin-l', poly([138, 186], [84, 272], [138, 252])),
      R('fin-r', poly([262, 186], [316, 272], [262, 252])),
      R('body', 'M200 36 Q272 100 265 252 L135 252 Q128 100 200 36 Z'),
      R('nose', 'M200 36 Q236 66 252 104 L148 104 Q164 66 200 36 Z'),
      R('window', circ(200, 160, 34)),
    ],
    details: [{ kind: 'glint', d: circ(212, 148, 9) }, ink(circ(60, 70, 5)), ink(circ(340, 110, 5)), ink(circ(80, 330, 5))],
  },

  // ---------- Hoa quả ----------
  {
    id: 'apple',
    group: 'fruits',
    regions: [
      R('body', 'M200 112 Q260 72 310 122 Q360 192 320 282 Q290 352 230 337 Q200 327 170 337 Q110 352 80 282 Q40 192 90 122 Q140 72 200 112 Z'),
      R('stem', 'M194 116 Q188 72 204 44 L218 50 Q205 80 210 114 Z'),
      R('leaf-r', 'M212 76 Q260 30 302 56 Q266 102 212 76 Z'),
      R('leaf-l', 'M194 80 Q150 42 118 64 Q154 104 194 80 Z'),
    ],
    details: [...eye(162, 222), ...eye(238, 222), line('M182 254 Q200 270 218 254'), { kind: 'glint', d: ell(112, 196, 12, 26) }],
  },
  {
    id: 'strawberry',
    group: 'fruits',
    regions: [
      R('plate', ell(200, 356, 172, 28)),
      R('body', 'M200 342 Q90 302 85 192 Q90 132 200 137 Q310 132 315 192 Q310 302 200 342 Z'),
      R('crown', 'M200 152 L150 118 L176 106 L140 76 L190 90 L200 54 L210 90 L260 76 L224 106 L250 118 Z'),
      R('cheek-l', circ(150, 242, 17)),
      R('cheek-r', circ(250, 242, 17)),
    ],
    details: [
      ...eye(170, 210, 11),
      ...eye(230, 210, 11),
      line('M186 238 Q200 250 214 238'),
      ink(ell(130, 190, 4, 7)),
      ink(ell(270, 190, 4, 7)),
      ink(ell(160, 285, 4, 7)),
      ink(ell(240, 285, 4, 7)),
      ink(ell(200, 300, 4, 7)),
      ink(ell(120, 250, 4, 7)),
      ink(ell(280, 250, 4, 7)),
    ],
  },
  {
    id: 'watermelon',
    group: 'fruits',
    regions: [
      R('rind', 'M40 160 A160 160 0 0 0 360 160 Z'),
      R('band', 'M54 160 A146 146 0 0 0 346 160 Z'),
      R('flesh', 'M70 160 A130 130 0 0 0 330 160 Z'),
      R('sun', circ(330, 62, 36)),
    ],
    details: [
      ink(ell(150, 200, 6, 10)),
      ink(ell(200, 230, 6, 10)),
      ink(ell(250, 200, 6, 10)),
      ink(ell(170, 255, 6, 10)),
      ink(ell(230, 255, 6, 10)),
      ink(ell(110, 185, 6, 10)),
      ink(ell(290, 185, 6, 10)),
    ],
  },
  {
    id: 'flower',
    group: 'fruits',
    regions: [
      R('stem', rrect(191, 228, 18, 140, 8)),
      R('leaf-l', 'M200 312 Q140 262 108 292 Q150 334 200 312 Z'),
      R('leaf-r', 'M200 286 Q260 236 292 266 Q250 308 200 286 Z'),
      R('petal-1', circ(270, 165, 48)),
      R('petal-2', circ(235, 226, 48)),
      R('petal-3', circ(165, 226, 48)),
      R('petal-4', circ(130, 165, 48)),
      R('petal-5', circ(165, 104, 48)),
      R('petal-6', circ(235, 104, 48)),
      R('center', circ(200, 165, 46)),
    ],
    details: [...eye(183, 158, 8), ...eye(217, 158, 8), line('M188 178 Q200 188 212 178')],
  },

  // ---------- Đồ vật ----------
  {
    id: 'house',
    group: 'things',
    regions: [
      R('grass', rrect(20, 344, 360, 40, 20)),
      R('sun', circ(70, 70, 36)),
      R('chimney', rrect(256, 88, 36, 72, 4)),
      R('wall', rrect(90, 178, 220, 170, 8)),
      R('roof', poly([58, 192], [200, 68], [342, 192])),
      R('door', rrect(170, 258, 60, 90, 12)),
      R('win-l', rrect(108, 210, 52, 46, 6)),
      R('win-r', rrect(240, 210, 52, 46, 6)),
    ],
    details: [ink(circ(218, 306, 5)), line('M134 210 L134 256 M108 233 L160 233 M266 210 L266 256 M240 233 L292 233')],
  },
  {
    id: 'icecream',
    group: 'things',
    regions: [
      R('cone', poly([138, 200], [262, 200], [200, 362])),
      R('scoop-l', circ(158, 182, 52)),
      R('scoop-r', circ(242, 182, 52)),
      R('scoop-top', circ(200, 120, 56)),
      R('cherry', circ(200, 54, 18)),
    ],
    details: [line('M204 38 Q210 20 226 14'), line('M168 230 L222 278 M232 230 L178 278 M200 212 L240 248 M200 212 L160 248')],
  },
  {
    id: 'cake',
    group: 'things',
    regions: [
      R('plate', ell(200, 346, 165, 26)),
      R('base', rrect(78, 248, 244, 92, 14)),
      R('top', rrect(108, 180, 184, 76, 14)),
      R('icing', 'M108 194 Q108 180 122 180 L278 180 Q292 180 292 194 L292 210 Q277 232 262 210 Q247 232 232 210 Q217 232 200 210 Q183 232 168 210 Q153 232 138 210 Q123 232 108 210 Z'),
      R('candle', rrect(187, 118, 26, 62, 6)),
      R('flame', 'M200 72 Q224 102 200 116 Q176 102 200 72 Z'),
    ],
    details: [ink(circ(130, 295, 6)), ink(circ(170, 300, 6)), ink(circ(230, 300, 6)), ink(circ(270, 295, 6))],
  },
  {
    id: 'balloons',
    group: 'things',
    regions: [
      R('balloon-l', ell(124, 150, 62, 74)),
      R('balloon-r', ell(276, 150, 62, 74)),
      R('balloon-m', ell(200, 112, 64, 76)),
      R('bow-l', poly([200, 330], [156, 302], [156, 358])),
      R('bow-r', poly([200, 330], [244, 302], [244, 358])),
    ],
    details: [
      line('M124 224 Q150 290 200 330 M276 224 Q250 290 200 330 M200 188 L200 330'),
      { kind: 'glint', d: ell(100, 120, 10, 20) },
      { kind: 'glint', d: ell(252, 120, 10, 20) },
      { kind: 'glint', d: ell(176, 82, 10, 20) },
    ],
  },

  // ---------- Mèo Đậu Đậu ----------
  {
    id: 'dd-face',
    group: 'daudau',
    regions: [
      R('ear-l', poly([92, 155], [110, 48], [182, 108])),
      R('ear-l-in', poly([112, 132], [120, 76], [160, 110])),
      R('ear-r', poly([308, 155], [290, 48], [218, 108])),
      R('ear-r-in', poly([288, 132], [280, 76], [240, 110])),
      R('head', ell(200, 215, 132, 115)),
      R('muzzle', ell(200, 258, 52, 34)),
      R('cheek-l', circ(122, 284, 18)),
      R('cheek-r', circ(278, 284, 18)),
    ],
    details: catFace(200, 205, 50),
  },
  {
    id: 'dd-sit',
    group: 'daudau',
    regions: [
      R('tail', 'M290 322 Q372 302 362 222 Q356 190 334 200 Q346 262 284 292 Z'),
      R('body', ell(200, 292, 102, 80)),
      R('belly', ell(200, 304, 56, 54)),
      R('paw-l', ell(158, 362, 32, 18)),
      R('paw-r', ell(242, 362, 32, 18)),
      R('ear-l', poly([118, 124], [124, 46], [182, 92])),
      R('ear-r', poly([282, 124], [276, 46], [218, 92])),
      R('head', ell(200, 160, 96, 82)),
    ],
    details: catFace(200, 150, 36, 0.8),
  },
  {
    id: 'dd-yarn',
    group: 'daudau',
    regions: [
      R('yarn', circ(282, 272, 86)),
      R('ear-l', poly([64, 162], [70, 84], [122, 126])),
      R('ear-r', poly([216, 162], [210, 84], [158, 126])),
      R('head', ell(140, 192, 92, 80)),
      R('paw', ell(214, 256, 32, 22)),
    ],
    details: [
      ...catFace(140, 182, 32, 0.75),
      line('M228 222 Q284 196 346 236 M206 286 Q282 252 364 290 M226 336 Q290 306 352 322'),
      line('M196 352 Q150 372 110 350 Q80 334 50 356'),
    ],
  },
  {
    id: 'dd-box',
    group: 'daudau',
    regions: [
      R('ear-l', poly([124, 152], [130, 82], [182, 124])),
      R('ear-r', poly([276, 152], [270, 82], [218, 124])),
      R('head', ell(200, 192, 92, 76)),
      R('box', rrect(80, 232, 240, 130, 10)),
      R('flap-l', poly([82, 232], [28, 176], [92, 176], [138, 232])),
      R('flap-r', poly([318, 232], [372, 176], [308, 176], [262, 232])),
      R('paw-l', ell(126, 236, 28, 18)),
      R('paw-r', ell(274, 236, 28, 18)),
    ],
    details: [...catFace(200, 178, 36, 0.8), line('M150 300 Q200 330 250 300')],
  },
];

export function picturesOf(group: GroupId): Picture[] {
  return PICTURES.filter((p) => p.group === group);
}

export function pictureById(id: string): Picture | undefined {
  return PICTURES.find((p) => p.id === id);
}
