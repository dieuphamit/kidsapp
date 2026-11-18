/**
 * Vẽ bùn, bọt xà phòng và giọt nước lên canvas 2D (chỉ chạy trong trình duyệt; jsdom không có canvas).
 * Mọi màu bùn/bọt/nước đặt ở hằng số có tên dưới đây (luật 7 cho phép màu riêng cho lớp vẽ canvas).
 */
import { alphaAt, rng, type AlphaMap, type MudBlob } from './logic';

/** Bùn ướt: nâu sẫm ở lõi, nâu đất ở giữa, nâu nhạt khô ở rìa. */
export const MUD_CORE = 'rgb(74, 48, 26)';
export const MUD_BODY = 'rgb(108, 74, 42)';
export const MUD_EDGE = 'rgb(140, 104, 66)';
export const MUD_DRY = 'rgb(168, 134, 96)';
/** Bọt xà phòng: trắng hơi xanh, bóng xám xanh ở đáy, chấm sáng ở đỉnh. */
export const FOAM_WHITE = 'rgba(255, 255, 255, 0.96)';
export const FOAM_SHADE = 'rgba(176, 196, 214, 0.9)';
export const FOAM_RIM = 'rgba(140, 162, 186, 0.55)';
/** Giọt nước và lớp ướt (bước lau khăn). */
export const WATER_DROP = 'rgba(150, 205, 240, 0.55)';
export const WATER_RIM = 'rgba(60, 120, 170, 0.45)';
export const WATER_SHINE = 'rgba(255, 255, 255, 0.9)';
export const WET_TINT = 'rgba(120, 170, 210, 0.16)';

type Ctx = CanvasRenderingContext2D;

/** Đường cong kín đi qua các đỉnh (nối trung điểm bằng cong bậc hai: mép mềm, không góc cạnh). */
function blobPath(ctx: Ctx, cx: number, cy: number, r: number, wobble: number[], scale: number) {
  const n = wobble.length;
  const pt = (i: number) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * wobble[i % n] * scale;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86] as const;
  };
  ctx.beginPath();
  const [x0, y0] = pt(0);
  const [x1, y1] = pt(1);
  ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
  for (let i = 1; i <= n; i++) {
    const [ax, ay] = pt(i);
    const [bx, by] = pt(i + 1);
    ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
  }
  ctx.closePath();
}

function radial(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/**
 * Vẽ bùn rồi cắt theo viền con vật (destination-in với ảnh PNG đã tách nền).
 * Mỗi vệt: quầng nhạt loang rộng → thân nâu → lõi sẫm, cụm vệt con, lốm đốm bắn quanh,
 * vệt chảy xuống, vân hạt đất và ánh ướt.
 */
export function drawMud(ctx: Ctx, w: number, h: number, blobs: MudBlob[], img: CanvasImageSource, seed: number) {
  const r = rng(seed ^ 0x5bd1e995);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const b of blobs) {
    const cx = b.x * w;
    const cy = b.y * h;
    const R = b.r * w;
    // Nhiều lớp loang chồng nhau, lớp ngoài nhạt và rộng, lớp trong đậm và hẹp; mỗi lớp méo một kiểu
    // → mép vệt mờ dần, không viền cứng (canvas không có blur chạy chắc trên Safari cũ).
    const LAYERS = 8;
    for (let k = 0; k < LAYERS; k++) {
      const t = k / (LAYERS - 1);
      const wob = b.wobble.map((v) => v * (0.88 + r() * 0.24));
      const ox = (r() - 0.5) * R * 0.12;
      const oy = (r() - 0.5) * R * 0.12 + t * R * 0.08;
      ctx.globalAlpha = 0.2 + t * 0.12;
      // gradient tắt hẳn ở mép mỗi lớp → không lộ vòng ranh giới giữa các lớp
      ctx.fillStyle = radial(ctx, cx + ox, cy + oy, R * (1.35 - t * 0.6), [
        [0, t > 0.5 ? MUD_CORE : MUD_BODY],
        [0.55, t > 0.5 ? MUD_BODY : MUD_EDGE],
        [1, 'rgba(140,104,66,0)'],
      ]);
      blobPath(ctx, cx + ox, cy + oy, R, wob, 1.35 - t * 0.6);
      ctx.fill();
    }
    // cụm vệt con quanh vệt chính
    for (const [dx, dy, lr] of b.lumps) {
      const lx = cx + dx * w;
      const ly = cy + dy * h;
      const LR = lr * w;
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.2 + k * 0.08;
        ctx.fillStyle = radial(ctx, lx, ly, LR * (1.3 - k * 0.25), [[0, MUD_BODY], [0.7, MUD_EDGE], [1, 'rgba(140,104,66,0)']]);
        blobPath(ctx, lx, ly, LR, b.wobble.map((v) => v * (0.85 + r() * 0.3)), 1.25 - k * 0.3);
        ctx.fill();
      }
    }
    // vệt quệt (như bùn bị cọ lên lông): nét cong mờ chạy ra khỏi vệt
    for (let k = 0; k < 4; k++) {
      const a0 = r() * Math.PI * 2;
      const len = R * (0.5 + r() * 0.5);
      const sx = cx + Math.cos(a0) * R * 0.3;
      const sy = cy + Math.sin(a0) * R * 0.3;
      const ex = sx + Math.cos(a0) * len;
      const ey = sy + Math.sin(a0) * len * 0.8;
      ctx.globalAlpha = 0.08 + r() * 0.07;
      ctx.strokeStyle = MUD_BODY;
      ctx.lineWidth = R * (0.14 + r() * 0.12);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + (r() - 0.5) * R * 1.6, sy + (r() - 0.5) * R * 1.6, ex, ey);
      ctx.stroke();
    }
    // vệt chảy xuống: chuỗi chấm nhỏ dần lượn nhẹ, cuối đọng một giọt tròn
    for (const [dx, len, wd] of b.drips) {
      const L = len * w;
      const W = wd * w;
      let x = cx + dx * w;
      const y0 = cy + R * 0.35;
      const steps = Math.max(6, Math.round(L / 3));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        x += (r() - 0.5) * 1.2;
        ctx.globalAlpha = 0.5 - t * 0.12;
        ctx.fillStyle = t < 0.5 ? MUD_BODY : MUD_CORE;
        ctx.beginPath();
        ctx.arc(x, y0 + L * t, W * (0.55 - t * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.ellipse(x, y0 + L + W * 0.2, W * 0.45, W * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // lốm đốm bắn quanh: chấm méo, có chấm kèm vệt nhỏ
    for (const [dx, dy, sr] of b.specks) {
      const sx = cx + dx * w;
      const sy = cy + dy * h;
      const rr = sr * w;
      ctx.globalAlpha = 0.45 + r() * 0.35;
      ctx.fillStyle = r() < 0.5 ? MUD_BODY : MUD_CORE;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rr, rr * (0.55 + r() * 0.4), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      if (r() < 0.4) {
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(sx + (r() - 0.5) * rr * 3, sy + (r() - 0.5) * rr * 3, rr * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // vân đất: hạt và cục nhỏ sáng/tối chỉ trên chỗ đã có bùn
  ctx.globalCompositeOperation = 'source-atop';
  for (const b of blobs) {
    const cx = b.x * w;
    const cy = b.y * h;
    const R = b.r * w;
    const grains = Math.round(R * 7);
    for (let i = 0; i < grains; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R * 1.4;
      const big = r() < 0.12;
      ctx.globalAlpha = big ? 0.3 + r() * 0.25 : 0.12 + r() * 0.25;
      ctx.fillStyle = r() < 0.6 ? MUD_CORE : MUD_DRY;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, big ? 2.5 + r() * 4 : 0.7 + r() * 1.8, big ? 2 + r() * 3 : 0.7 + r() * 1.6, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // chỉ giữ bùn trong viền con vật
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

/** Mẫu cục tẩy mềm: lõi xoá hẳn (≤ 0,72r), viền mờ dần tới r. */
export function makeEraser(radius: number, dpr: number): HTMLCanvasElement {
  const s = Math.ceil(radius * 2 * dpr);
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = radial(g, s / 2, s / 2, s / 2, [[0, 'rgba(0,0,0,1)'], [0.72, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(0, 0, s, s);
  }
  return c;
}

/** Tỉ lệ lõi xoá hẳn của cục tẩy: lưới bùn chỉ tính ô trong lõi là sạch. */
export const ERASER_CORE = 0.72;

export function erase(ctx: Ctx, eraser: HTMLCanvasElement, x: number, y: number, r: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(eraser, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Mẫu một bong bóng xà phòng (vẽ sẵn để mỗi lần chà chỉ cần drawImage, không tốn khung hình). */
export function makeBubble(px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  const g = c.getContext('2d');
  if (g) {
    const r = px / 2 - 1;
    const m = px / 2;
    // thân bọt: trắng ở trên-trái, xám xanh ở dưới-phải (khối tròn)
    g.fillStyle = radial(g, m - r * 0.35, m - r * 0.4, r * 1.5, [[0, FOAM_WHITE], [0.55, FOAM_WHITE], [1, FOAM_SHADE]]);
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = FOAM_RIM;
    g.lineWidth = Math.max(1, px / 28);
    g.stroke();
    // chấm sáng
    g.fillStyle = WATER_SHINE;
    g.beginPath();
    g.ellipse(m - r * 0.38, m - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/**
 * Nổi bọt quanh điểm chà: vài bong bóng to nhỏ lệch ngẫu nhiên trong nét, chỉ đặt trên thân thú
 * (alpha của ảnh tại đó đủ đậm) để bọt không bay lơ lửng ngoài viền.
 */
export function drawFoam(
  ctx: Ctx,
  bubble: HTMLCanvasElement,
  x: number,
  y: number,
  brush: number,
  w: number,
  h: number,
  mask: AlphaMap,
  rand: () => number,
) {
  // lớp bọt mịn trắng đục làm nền cho bong bóng
  if (alphaAt(mask, x / w, y / h) >= 120) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, brush * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(240,246,252,0.35)');
    g.addColorStop(1, 'rgba(240,246,252,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, brush * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * brush * 0.75;
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d;
    if (alphaAt(mask, bx / w, by / h) < 120) continue;
    const br = brush * (0.06 + rand() * 0.18);
    ctx.drawImage(bubble, bx - br, by - br, br * 2, br * 2);
  }
}

/** Bước lau khăn: phủ lớp ướt nhạt trên thân và rải giọt nước. Trả về nothing; lưới lấy từ canvas sau khi vẽ giọt. */
export function drawDrops(ctx: Ctx, w: number, h: number, mask: AlphaMap, img: CanvasImageSource, seed: number, count: number) {
  const r = rng(seed ^ 0x2c1b3c6d);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 20; tries++) {
    const fx = 0.05 + r() * 0.9;
    const fy = 0.05 + r() * 0.9;
    if (alphaAt(mask, fx, fy) < 230) continue;
    placed++;
    const x = fx * w;
    const y = fy * h;
    const s = 7 + r() * 11;
    // giọt: thân xanh trong, viền đậm phía dưới, chấm sáng phía trên
    ctx.fillStyle = radial(ctx, x - s * 0.2, y - s * 0.3, s * 1.3, [[0, 'rgba(225,244,255,0.55)'], [0.6, WATER_DROP], [1, WATER_RIM]]);
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.8, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WATER_SHINE;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.28, y - s * 0.4, s * 0.2, s * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

/** Lớp ướt nhạt phủ cả thân, vẽ trên canvas riêng (canvas bọt) nên không tính vào % lau. */
export function drawWetTint(ctx: Ctx, w: number, h: number, img: CanvasImageSource) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = WET_TINT;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Đọc lưới bẩn từ canvas: thu canvas về cols×rows (một lần getImageData nhỏ), ô có alpha > ngưỡng là bẩn.
 */
export function readGrid(src: HTMLCanvasElement, cols: number, rows: number, minAlpha = 60): boolean[] {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return [];
  g.drawImage(src, 0, 0, cols, rows);
  const d = g.getImageData(0, 0, cols, rows).data;
  const out: boolean[] = [];
  for (let i = 0; i < cols * rows; i++) out.push(d[i * 4 + 3] > minAlpha);
  return out;
}

/** Mặt nạ alpha của ảnh thú ở cỡ nhỏ (một lần getImageData). */
export function readMask(img: CanvasImageSource, size: number): AlphaMap | null {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, size, size);
  const d = g.getImageData(0, 0, size, size).data;
  const data = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) data[i] = d[i * 4 + 3];
  return { w: size, h: size, data };
}
