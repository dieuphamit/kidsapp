// dots: nối điểm. Sinh src/games/dots/outlines.json từ kênh alpha của ảnh thẻ thật (public/cards/<id>.png).
//   node scripts/dots-outlines.mjs
// Thu ảnh về lưới 96×96, lấy mảng liền lớn nhất, lấp khe (chân, tai) rồi dò viền ngoài và
// lấy mẫu đều theo chu vi (src/games/dots/outline.ts, Node chạy thẳng file .ts).
// Game đọc json này để đặt chấm, nên không phải đọc pixel ảnh lúc chạy.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { outlineFromAlpha } from '../src/games/dots/outline.ts';

const APP = join(import.meta.dirname, '..');
const GRID = 96;
// Trùng danh sách ANIMALS trong src/games/dots/logic.ts (test unit kiểm tra khớp)
const IDS = ['elephant', 'giraffe', 'rabbit', 'fish', 'horse', 'chicken', 'duck', 'pig'];

const out = {};
for (const id of IDS) {
  const { data, info } = await sharp(join(APP, 'public', 'cards', `${id}.png`))
    .ensureAlpha()
    .resize(GRID, GRID, { fit: 'fill' })
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true });
  out[id] = outlineFromAlpha(data, info.width, info.height, 8);
  console.log(id, out[id].bbox.join(' '), out[id].pts.length, 'điểm');
}
const lines = Object.entries(out).map(([id, o]) => `  ${JSON.stringify(id)}: ${JSON.stringify(o)}`);
writeFileSync(join(APP, 'src', 'games', 'dots', 'outlines.json'), `{\n${lines.join(',\n')}\n}\n`);
