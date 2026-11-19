/**
 * Trang trí theo mùa: chọn mùa lễ từ ngày của máy, không gọi mạng.
 * Ngày Tết và Trung thu theo âm lịch Việt Nam, ghi sẵn trong bảng (ngoài bảng thì không có hai mùa này).
 */
export type SeasonId = 'tet' | 'trungthu' | 'xmas';
export const SEASON_IDS: readonly SeasonId[] = ['tet', 'trungthu', 'xmas'];

/** Mùng 1 Tết Nguyên Đán (dương lịch, [năm, tháng, ngày]). */
export const TET_DATES: readonly (readonly [number, number, number])[] = [
  [2025, 1, 29],
  [2026, 2, 17],
  [2027, 2, 6],
  [2028, 1, 26],
  [2029, 2, 13],
  [2030, 2, 3],
  [2031, 1, 23],
  [2032, 2, 11],
  [2033, 1, 31],
];

/** Rằm tháng Tám (Tết Trung thu), dương lịch. */
export const TRUNGTHU_DATES: readonly (readonly [number, number, number])[] = [
  [2025, 10, 6],
  [2026, 9, 25],
  [2027, 9, 15],
  [2028, 10, 3],
  [2029, 9, 22],
  [2030, 9, 12],
  [2031, 10, 1],
  [2032, 9, 19],
  [2033, 9, 8],
];

/** Trang trí từ bao nhiêu ngày trước đến bao nhiêu ngày sau ngày lễ (tính cả hai đầu). */
export const TET_WINDOW = { before: 10, after: 7 } as const;
export const TRUNGTHU_WINDOW = { before: 10, after: 3 } as const;
/** Giáng Sinh: 15/12 đến hết 31/12. */
export const XMAS_FROM_DAY = 15;

const DAY_MS = 86_400_000;

/** Số ngày (theo lịch) từ 1/1/1970; dùng ngày giờ địa phương của máy, không lệ thuộc giờ mùa hè. */
function dayNumber(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function inWindow(today: number, table: readonly (readonly [number, number, number])[], w: { before: number; after: number }): boolean {
  return table.some(([y, m, d]) => {
    const diff = today - dayNumber(y, m, d);
    return diff >= -w.before && diff <= w.after;
  });
}

/** Mùa lễ của một ngày (theo giờ địa phương), hoặc null nếu không có mùa nào. */
export function seasonFor(date: Date): SeasonId | null {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const today = dayNumber(y, m, d);
  if (inWindow(today, TET_DATES, TET_WINDOW)) return 'tet';
  if (inWindow(today, TRUNGTHU_DATES, TRUNGTHU_WINDOW)) return 'trungthu';
  if (m === 12 && d >= XMAS_FROM_DAY) return 'xmas';
  return null;
}

/** "2027-02-06" → Date lúc 12 giờ trưa giờ địa phương; chuỗi sai thì null. */
export function parseIsoDate(s: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d, 12);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/**
 * Ngày hiện tại cho trang trí. Móc kiểm thử: `?e2e=1&date=2027-02-06` (chỉ khi có e2e=1) ép ngày.
 */
export function seasonToday(search: string, now: Date = new Date()): Date {
  const params = new URLSearchParams(search);
  if (params.get('e2e') === '1') return parseIsoDate(params.get('date')) ?? now;
  return now;
}

/**
 * Mùa đang trang trí theo địa chỉ trang. Khi chạy e2e (e2e=1) mà không ép ngày thì không trang trí,
 * để các test khác không đổi theo ngày chạy máy.
 */
export function seasonFromLocation(search: string, now: Date = new Date()): SeasonId | null {
  const params = new URLSearchParams(search);
  if (params.get('e2e') === '1' && !parseIsoDate(params.get('date'))) return null;
  return seasonFor(seasonToday(search, now));
}

/** Key câu chào của mùa (src/content/season.json). */
export function greetingKey(id: SeasonId): string {
  return `season.${id}`;
}

/** Chuỗi ngày "YYYY-MM-DD" theo giờ địa phương (để chỉ chào một lần mỗi ngày). */
export function dayStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
