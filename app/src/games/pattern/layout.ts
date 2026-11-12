/** Vị trí hạt trên dây cong (toạ độ khung Stage 1194×834). Thuần, test được. */

export const STAGE_W = 1194;
export const STAGE_H = 834;
export const BEAD = 140;
export const CHOICE = 160;
export const CHOICE_GAP = 64;
export const CHOICE_BOTTOM = 40;

/** Dây treo: hai đầu ở y = TOP, võng xuống SAG ở giữa (một parabol = Bézier bậc hai). */
const TOP = 210;
const SAG = 140;
const END_PAD = 90;

export interface Point {
  x: number;
  y: number;
}

export interface ChainLayout {
  beads: Point[]; // tâm từng hạt, hạt cuối là ô ?
  string: { start: Point; control: Point; end: Point };
}

export function chainLayout(count: number): ChainLayout {
  const spacing = count >= 7 ? 150 : 166;
  const span = (count - 1) * spacing;
  const x0 = STAGE_W / 2 - span / 2;
  const xs = x0 - END_PAD;
  const xe = x0 + span + END_PAD;
  const yAt = (x: number) => {
    const u = (x - xs) / (xe - xs);
    return TOP + SAG * 4 * u * (1 - u);
  };
  const beads = Array.from({ length: count }, (_, i) => {
    const x = x0 + i * spacing;
    return { x, y: yAt(x) };
  });
  return {
    beads,
    string: {
      start: { x: xs, y: TOP },
      control: { x: STAGE_W / 2, y: TOP + 2 * SAG },
      end: { x: xe, y: TOP },
    },
  };
}

/** Tâm nút lựa chọn thứ k (3 nút, giữa đáy khung). */
export function choiceCenter(k: number, count = 3): Point {
  const total = count * CHOICE + (count - 1) * CHOICE_GAP;
  const left = STAGE_W / 2 - total / 2;
  return { x: left + k * (CHOICE + CHOICE_GAP) + CHOICE / 2, y: STAGE_H - CHOICE_BOTTOM - CHOICE / 2 };
}
