/** Màu trong bảng (mỗi màu có token --paint-<id> trong tokens.css và câu đọc color.<id>). */
export const PAINTS = [
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'teal',
  'sky',
  'blue',
  'purple',
  'pink',
  'brown',
  'cream',
  'gray',
  'white',
  'black',
] as const;
export type Paint = (typeof PAINTS)[number];

/** Công cụ vui: đổ màu cầu vồng (dải chuyển màu) hoặc lấp lánh (vàng có sao). */
export const SPECIALS = ['rainbow', 'sparkle'] as const;
export type Special = (typeof SPECIALS)[number];

export type FillId = Paint | Special;
export const FILL_IDS: readonly FillId[] = [...PAINTS, ...SPECIALS];

export function isFillId(v: unknown): v is FillId {
  return typeof v === 'string' && (FILL_IDS as readonly string[]).includes(v);
}

/** Câu đọc khi chọn màu/công cụ. */
export function fillKey(f: FillId): string {
  return f === 'rainbow' || f === 'sparkle' ? `coloring.${f}` : `color.${f}`;
}

/** Vùng → màu đã tô của một tranh. */
export type Fills = Readonly<Record<string, FillId>>;

export type History = { past: Fills[]; present: Fills; future: Fills[] };

/** Giữ tối đa chừng này bước hoàn tác. */
export const MAX_UNDO = 50;

export function newHistory(present: Fills = {}): History {
  return { past: [], present, future: [] };
}

/** Đổ màu vào vùng. Đổ lại đúng màu đang có thì không tạo bước mới. */
export function paint(h: History, region: string, fill: FillId): History {
  if (h.present[region] === fill) return h;
  return {
    past: [...h.past, h.present].slice(-MAX_UNDO),
    present: { ...h.present, [region]: fill },
    future: [],
  };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}

export function undo(h: History): History {
  if (!canUndo(h)) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  if (!canRedo(h)) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

/** Tranh đã tô hết mọi vùng chưa. */
export function isComplete(fills: Fills, regionIds: readonly string[]): boolean {
  return regionIds.length > 0 && regionIds.every((id) => fills[id] !== undefined);
}

/** Số vùng đã tô (đếm vùng có trong tranh). */
export function filledCount(fills: Fills, regionIds: readonly string[]): number {
  return regionIds.filter((id) => fills[id] !== undefined).length;
}
