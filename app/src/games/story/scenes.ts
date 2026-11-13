/**
 * Tranh của các chuyện có bạn đồng hành: ghép từ ảnh bạn đồng hành, ảnh thẻ có sẵn (`cards/<id>.png`,
 * `cards/story/…`, `cards/extra/…`) và vài hình vẽ đơn giản (mặt trời, trăng, sao, tim…) bằng màu token.
 * Toạ độ theo % của khung tranh: (x, y) là tâm, `size` là bề rộng (% khung).
 */
import type { StoryId } from './logic';

export type Bg = 'room' | 'day' | 'night' | 'pond' | 'garden' | 'sea' | 'party';
export type Shape = 'sun' | 'moon' | 'star' | 'heart' | 'balloon' | 'drop' | 'soil' | 'ball' | 'zzz' | 'tear';
export type Color = 'red' | 'yellow' | 'green' | 'blue' | 'orange' | 'purple';

export type Sprite =
  | { buddy: true; x: number; y: number; size: number; flip?: boolean }
  | { card: string; x: number; y: number; size: number; flip?: boolean; rot?: number }
  | { shape: Shape; x: number; y: number; size: number; color?: Color };

export interface Scene {
  bg: Bg;
  sprites: Sprite[];
}

const B = (x: number, y: number, size = 46, flip = false): Sprite => ({ buddy: true, x, y, size, flip });
const C = (card: string, x: number, y: number, size: number, flip = false, rot = 0): Sprite => ({ card, x, y, size, flip, rot });
const S = (shape: Shape, x: number, y: number, size: number, color?: Color): Sprite => ({ shape, x, y, size, color });

const CAKE = (x: number, y: number) => C('extra/chocolate', x, y, 38);
const CANDLE = (x: number, y: number) => C('extra/candle', x, y - 18, 16);

export const SCENES: Partial<Record<StoryId, Scene[]>> = {
  // Sinh nhật: làm bánh → cắm nến → các bạn tới → cả nhà mừng
  party: [
    { bg: 'room', sprites: [B(30, 60), CAKE(72, 70)] },
    { bg: 'room', sprites: [B(28, 60), CAKE(70, 72), CANDLE(70, 72)] },
    { bg: 'room', sprites: [C('rabbit', 16, 62, 30), B(40, 62, 38), C('bear', 82, 58, 32, true), CAKE(60, 80), CANDLE(60, 80)] },
    {
      bg: 'party',
      sprites: [
        S('balloon', 14, 22, 18, 'red'),
        S('balloon', 86, 20, 18, 'blue'),
        S('balloon', 50, 14, 16, 'yellow'),
        C('rabbit', 18, 66, 30),
        B(50, 62, 38),
        C('bear', 82, 64, 32, true),
        S('heart', 34, 34, 12, 'red'),
        S('heart', 66, 32, 10, 'purple'),
      ],
    },
  ],
  // Một ngày: thức dậy → ăn sáng → chơi với cún → đi ngủ
  day: [
    { bg: 'day', sprites: [S('sun', 76, 22, 30), B(40, 64, 50)] },
    { bg: 'room', sprites: [B(34, 60, 46), C('banana', 74, 66, 34, false, -12)] },
    { bg: 'garden', sprites: [B(28, 62, 40), C('dog', 72, 62, 40, true), S('ball', 50, 84, 14, 'red')] },
    { bg: 'night', sprites: [S('moon', 78, 20, 24), S('star', 20, 18, 10), S('star', 44, 12, 8), S('star', 58, 28, 7), B(46, 68, 46), S('zzz', 76, 50, 16)] },
  ],
  // Chia táo: hái ba quả → cho thỏ một quả → ai cũng có táo
  share: [
    { bg: 'garden', sprites: [B(34, 58, 46), C('apple', 70, 50, 18), C('apple', 82, 66, 18), C('apple', 66, 76, 18)] },
    { bg: 'garden', sprites: [B(26, 58, 40), C('apple', 46, 80, 16), C('apple', 30, 86, 16), C('rabbit', 76, 58, 36, true), C('apple', 70, 82, 16)] },
    {
      bg: 'garden',
      sprites: [
        C('rabbit', 16, 56, 30),
        C('apple', 16, 82, 14),
        B(50, 54, 34),
        C('apple', 50, 82, 14),
        C('pig', 84, 56, 30, true),
        C('apple', 84, 82, 14),
        S('heart', 34, 20, 12, 'red'),
        S('heart', 66, 18, 10, 'red'),
      ],
    },
  ],
  // Vịt con lạc mẹ: lạc → gặp bạn → cùng đi tìm → gặp mẹ
  duckling: [
    { bg: 'pond', sprites: [C('duck', 50, 62, 30), S('tear', 58, 44, 6, 'blue')] },
    { bg: 'pond', sprites: [B(32, 58, 44), C('duck', 72, 70, 28, true)] },
    { bg: 'garden', sprites: [C('duck', 24, 72, 24), B(62, 58, 42), S('heart', 40, 40, 8, 'red')] },
    { bg: 'pond', sprites: [C('duck', 34, 56, 48), C('duck', 72, 72, 26, true), S('heart', 54, 24, 14, 'red'), B(84, 30, 22)] },
  ],
  // Trồng hoa: gieo hạt → tưới nước → nảy mầm → hoa nở, ong tới
  garden: [
    { bg: 'garden', sprites: [B(30, 52, 42), S('soil', 66, 84, 50), C('story/plant-1', 66, 70, 26)] },
    { bg: 'garden', sprites: [B(30, 52, 42), S('soil', 66, 84, 50), S('drop', 60, 44, 8, 'blue'), S('drop', 70, 56, 8, 'blue'), S('drop', 78, 42, 8, 'blue')] },
    { bg: 'garden', sprites: [B(28, 52, 40), S('soil', 66, 86, 50), C('story/plant-2', 66, 64, 34)] },
    { bg: 'day', sprites: [S('sun', 16, 16, 20), B(24, 62, 36), C('story/plant-3', 66, 50, 52), C('bee', 84, 22, 22, true)] },
  ],
  // Đi biển: ra biển → cá heo chào → cá voi tới chơi
  sea: [
    { bg: 'sea', sprites: [S('sun', 80, 16, 20), B(36, 70, 46)] },
    { bg: 'sea', sprites: [S('sun', 80, 16, 20), B(26, 72, 40), C('dolphin', 68, 42, 46, false, -10)] },
    { bg: 'sea', sprites: [B(18, 76, 32), C('dolphin', 46, 40, 36, false, -10), C('whale', 78, 46, 42)] },
  ],
};
