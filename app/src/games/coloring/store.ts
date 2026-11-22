import { get, set } from 'idb-keyval';
import { isFillId, type FillId, type Fills } from './paint';

/** Tranh đã tô (lưu trên máy, không mạng): id tranh → vùng → màu. */
export type Art = Readonly<Record<string, Fills>>;

export const ART_KEY = 'behoc.coloring';

/** Giữ lại phần hợp lệ của dữ liệu đọc được (dữ liệu cũ/hỏng thì bỏ qua). */
export function cleanArt(raw: unknown): Art {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Fills> = {};
  for (const [pic, fills] of Object.entries(raw as Record<string, unknown>)) {
    if (!fills || typeof fills !== 'object' || Array.isArray(fills)) continue;
    const clean: Record<string, FillId> = {};
    for (const [region, f] of Object.entries(fills as Record<string, unknown>)) {
      if (isFillId(f)) clean[region] = f;
    }
    if (Object.keys(clean).length > 0) out[pic] = clean;
  }
  return out;
}

export async function loadArt(): Promise<Art> {
  try {
    return cleanArt(await get<unknown>(ART_KEY));
  } catch {
    return {};
  }
}

export async function saveArt(art: Art): Promise<void> {
  try {
    await set(ART_KEY, art);
  } catch {
    // Không lưu được (chế độ riêng tư...) thì tranh chỉ không còn khi vào lại
  }
}

/** Ghi màu mới của một tranh vào bộ tranh (tranh trống thì bỏ khỏi bộ). */
export function withFills(art: Art, pictureId: string, fills: Fills): Art {
  const next: Record<string, Fills> = { ...art };
  if (Object.keys(fills).length === 0) delete next[pictureId];
  else next[pictureId] = fills;
  return next;
}
