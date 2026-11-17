// Thú "ảnh thật 2.5D" của trò Thế giới: tách nền ảnh chụp thật trên Wikimedia Commons thành
// public/world-photos/<id>.png (cắt sát thân, nền trong suốt) + src/ui/hybrid/photoMeta.json (cỡ ảnh, hướng đầu)
// + public/world-photos/CREDITS.md.
//   node scripts/world-photos.mjs
// Dùng lại cách của photo-cards.mjs: ảnh gốc lưu ở ../assets-src/photos-world/ (không commit), tách nền bằng
// BiRefNet-lite (scripts/photo_cut.py). Con nào vẽ bằng ảnh, con nào bằng model 3D: xem src/ui/hybrid/look.ts.
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, '..');
const PHOTOS = join(APP, '..', 'assets-src', 'photos-world');
const MODEL = join(APP, '..', 'assets-src', 'models-rembg', 'birefnet-lite.onnx');
const MODEL_URL =
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx';
const OUT = join(APP, 'public', 'world-photos');
const PYTHON = 'C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe';
const UA = 'BeHocCards/1.0 (personal non-commercial project)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OK_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [0-9.]+)/i;

// face: hướng đầu trong ảnh gốc ('left' | 'right'); crop: [x0,y0,x1,y1] theo tỉ lệ ảnh gốc
const PHOTOS_WORLD = {
  // Biển
  clownfish: { file: 'Clownfisch (Amphiprion ocellaris).jpg', face: 'right' },
  puffer: { file: 'Pez globo (Arothron diadematus), mar Rojo, Egipto, 2023-04-17, DD 19.jpg', face: 'right' },
  manta: { file: 'Manta alfredi cruising - journal.pone.0046170.g002A.jpg', face: 'right' },
  'yellow-tang': { file: 'Zebrasoma flavescens Luc Viatour.jpg', face: 'left' },
  // Ao hồ
  goldfish: { file: 'Carassius wild golden fish 2013 G1.jpg', face: 'right' },
  koi: { file: 'Japan-Koi.jpg', face: 'left' },
  frog: { file: 'Green treefrog.jpg', face: 'left' },
  duck: { file: 'Mallard Drake (Anas Platyrhynchos).jpg', face: 'right', crop: [0, 0, 1, 0.56] },
  // Trời
  bee: { file: 'Honey bee flying.JPG', face: 'left', crop: [0.36, 0.02, 0.8, 0.68] },
  parrot: { file: 'Ara macao -flying away-8a.jpg', face: 'right', crop: [0.08, 0, 1, 1] },
  bat: { file: 'Fruit bat flying (35883279984).jpg', face: 'right', crop: [0.28, 0.28, 0.82, 0.88] },
  pigeon: { file: 'Common pigeon at Waterlow Park, London 01.jpg', face: 'left' },
  // Rừng, đồng cỏ: con chưa có model 3D có texture đạt (sư tử: model tìm được không rõ nguồn; gấu mèo: không có)
  raccoon: { file: 'Raccoon in Central Park (35264).jpg', face: 'right' },
  lion: { file: 'Lion (Panthera leo) walking on the road ... (50133447418).jpg', face: 'left' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s = '') =>
  s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } }).catch((e) => ({ ok: false, status: e.cause?.code ?? e.message }));
    if (r.ok) return r;
    console.log(`  ${r.status}, chờ rồi thử lại…`);
    await sleep(15000 * (i + 1));
  }
  throw new Error('tải thất bại: ' + url);
}

async function fetchPhoto(id, file) {
  const metaPath = join(PHOTOS, `${id}.json`);
  const imgPath = join(PHOTOS, `${id}.jpg`);
  if (existsSync(metaPath) && existsSync(imgPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (meta.file === file) return meta;
  }
  const p = new URLSearchParams({
    action: 'query', format: 'json', titles: 'File:' + file, prop: 'imageinfo',
    iiprop: 'url|extmetadata|size', iiurlwidth: '1280',
  });
  const j = await (await get(`${API}?${p}`)).json();
  const ii = Object.values(j.query.pages)[0].imageinfo?.[0];
  if (!ii) throw new Error(`${id}: không thấy File:${file}`);
  const em = ii.extmetadata ?? {};
  const meta = {
    id, file, page: ii.descriptionurl,
    author: stripHtml(em.Artist?.value) || 'unknown',
    license: em.LicenseShortName?.value ?? '',
    licenseUrl: em.LicenseUrl?.value ?? '',
  };
  if (!OK_LICENSE.test(meta.license)) throw new Error(`${id}: giấy phép không nhận: ${meta.license}`);
  await sleep(1000);
  // Ảnh gốc nhỏ hơn 1280px: API trả luôn link file gốc, mà file gốc hay bị 429; xin lại ảnh thu nhỏ cỡ chuẩn
  // nhỏ hơn ảnh gốc (960/500px), đi qua máy chủ ảnh thu nhỏ
  let src = ii.thumburl ?? ii.url;
  if (src.includes('thumbnail_unscaled') || !src.includes('/thumb/')) {
    const w = [1280, 960, 500].find((x) => x < ii.width) ?? 500;
    const q = new URLSearchParams({ action: 'query', format: 'json', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(w) });
    const j2 = await (await get(`${API}?${q}`)).json();
    src = Object.values(j2.query.pages)[0].imageinfo?.[0]?.thumburl ?? src;
  }
  const buf = Buffer.from(await (await get(src)).arrayBuffer());
  writeFileSync(imgPath, buf);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`  tải ${id} (${Math.round(buf.length / 1024)} KB, ${meta.license})`);
  await sleep(1000);
  return meta;
}

// Cắt sát thân (bỏ lề trong suốt) và đo tỉ lệ khung: photo_cut.py luôn ra ảnh vuông
const TRIM = `
import json, sys
from PIL import Image
out = {}
for p in sys.argv[2:]:
    im = Image.open(p).convert('RGBA')
    box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(box)
    # photo_cut.py đã lưu bảng 256 màu: lượng tử lại (giữ alpha) cho nhẹ
    im.quantize(256, method=Image.Quantize.FASTOCTREE).save(p, optimize=True)
    out[p] = [im.width, im.height]
json.dump(out, open(sys.argv[1], 'w'))
`;

async function main() {
  mkdirSync(PHOTOS, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  mkdirSync(dirname(MODEL), { recursive: true });
  if (!existsSync(MODEL)) {
    console.log('Tải model BiRefNet-lite (~220 MB)…');
    writeFileSync(MODEL, Buffer.from(await (await get(MODEL_URL)).arrayBuffer()));
  }
  const ids = Object.keys(PHOTOS_WORLD);
  const metas = [];
  for (const id of ids) metas.push(await fetchPhoto(id, PHOTOS_WORLD[id].file));

  const jobs = ids.map((id) => ({ id, src: join(PHOTOS, `${id}.jpg`), out: join(OUT, `${id}.png`), crop: PHOTOS_WORLD[id].crop, keep: 'largest' }));
  const jobsPath = join(PHOTOS, 'jobs.json');
  writeFileSync(jobsPath, JSON.stringify({ model: MODEL, size: 640, fill: 1, jobs }, null, 1));
  const py = (args) => {
    const r = spawnSync('uv', ['run', '--python', PYTHON, '--with', 'onnxruntime', '--with', 'pillow', '--with', 'numpy', '--with', 'scipy', 'python', ...args], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('python lỗi (mã ' + r.status + ')');
  };
  py([join(__dirname, 'photo_cut.py'), jobsPath]);
  const trimPy = join(PHOTOS, 'trim.py');
  const sizesPath = join(PHOTOS, 'sizes.json');
  writeFileSync(trimPy, TRIM);
  py([trimPy, sizesPath, ...jobs.map((j) => j.out)]);
  const sizes = JSON.parse(readFileSync(sizesPath, 'utf8'));
  const index = {};
  for (const j of jobs) {
    const [w, h] = sizes[j.out];
    index[j.id] = { w, h, face: PHOTOS_WORLD[j.id].face };
    console.log(`  ${j.id}.png ${w}×${h} ${(statSync(j.out).size / 1024).toFixed(0)} KB`);
  }
  writeFileSync(join(APP, 'src', 'ui', 'hybrid', 'photoMeta.json'), JSON.stringify(index, null, 1) + '\n');
  const author = (m) => (m.author === 'unknown' ? '(Commons không ghi tên tác giả)' : m.author.replace(/\|/g, '\\|'));
  writeFileSync(
    join(OUT, 'CREDITS.md'),
    [
      '# Nguồn ảnh thú của trò Thế giới (world-photos/*.png)',
      '',
      'Ảnh chụp thật lấy từ Wikimedia Commons, tách nền (BiRefNet-lite), cắt sát thân và thu nhỏ bằng',
      '`scripts/world-photos.mjs` (thay đổi so với ảnh gốc: cắt nền, cắt khung, đổi cỡ, giảm màu). Giấy phép giữ',
      'nguyên như ảnh gốc; ảnh CC BY-SA khi đã chỉnh sửa vẫn theo CC BY-SA.',
      '',
      '| File | Ảnh gốc | Tác giả | Giấy phép | Dung lượng |',
      '|---|---|---|---|---|',
      ...metas.map(
        (m) =>
          `| ${m.id}.png | [${m.file}](${m.page}) | ${author(m)} | ${m.licenseUrl ? `[${m.license}](${m.licenseUrl})` : m.license} | ${(statSync(join(OUT, m.id + '.png')).size / 1024).toFixed(0)} KB |`,
      ),
    ].join('\n') + '\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
