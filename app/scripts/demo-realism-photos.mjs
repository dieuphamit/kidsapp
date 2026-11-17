// DEMO (?demo=realism, phương án B "ảnh thật 2.5D"): tách nền ảnh chụp thật trên Wikimedia Commons thành
// public/demo-realism/photos/<id>.png (cắt sát thân, nền trong suốt) + src/ui/realism/photoMeta.json (cỡ ảnh, hướng đầu).
//   node scripts/demo-realism-photos.mjs
// Dùng lại cách của photo-cards.mjs: ảnh gốc lưu ở ../assets-src/photos-demo/ (không commit), tách nền bằng
// BiRefNet-lite (scripts/photo_cut.py). Credit ghi vào public/demo-realism/CREDITS.md (phần ảnh).
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, '..');
const PHOTOS = join(APP, '..', 'assets-src', 'photos-demo');
const MODEL = join(APP, '..', 'assets-src', 'models-rembg', 'birefnet-lite.onnx');
const MODEL_URL =
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx';
const OUT = join(APP, 'public', 'demo-realism', 'photos');
const PYTHON = 'C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe';
const UA = 'BeHocCards/1.0 (personal non-commercial project)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OK_LICENSE = /^(cc0|public domain|pd\b|cc by(-sa)? [0-9.]+)/i;

// face: hướng đầu trong ảnh gốc ('left' | 'right'); crop: [x0,y0,x1,y1] theo tỉ lệ ảnh gốc
const PHOTOS_DEMO = {
  whale: { file: 'Humpback Whale underwater shot.jpg', face: 'left', crop: [0, 0, 1, 0.82] },
  dolphin: { file: 'A spinner dolphin in the Red Sea.jpg', face: 'right' },
  clownfish: { file: 'Clownfisch (Amphiprion ocellaris).jpg', face: 'right' },
  puffer: { file: 'Pez globo (Arothron diadematus), mar Rojo, Egipto, 2023-04-17, DD 19.jpg', face: 'right' },
  manta: { file: 'Manta alfredi cruising - journal.pone.0046170.g002A.jpg', face: 'right' },
  horse: { file: 'Horse in Calchaquí Valleys, Argentina.jpg', face: 'left' },
  cow: { file: 'HF in der Rhön auf der Weide.jpg', face: 'left' },
  zebra: { file: 'Plains zebra standing close up - DPLA - 5a17abfc936af2a7cad34115b462e9a3.jpg', face: 'left' },
  deer: { file: 'Sika deer october.jpg', face: 'left' },
  fox: { file: 'Red fox walking across the sand and rocks. (cd648e7a-155d-451f-67c2-22e947c5a1c6).jpg', face: 'right' },
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
  const src = ii.thumburl ?? ii.url;
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
  const ids = Object.keys(PHOTOS_DEMO);
  const metas = [];
  for (const id of ids) metas.push(await fetchPhoto(id, PHOTOS_DEMO[id].file));

  const jobs = ids.map((id) => ({ id, src: join(PHOTOS, `${id}.jpg`), out: join(OUT, `${id}.png`), crop: PHOTOS_DEMO[id].crop, keep: 'largest' }));
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
    index[j.id] = { w, h, face: PHOTOS_DEMO[j.id].face };
    console.log(`  ${j.id}.png ${w}×${h} ${(statSync(j.out).size / 1024).toFixed(0)} KB`);
  }
  writeFileSync(join(APP, 'src', 'ui', 'realism', 'photoMeta.json'), JSON.stringify(index, null, 1) + '\n');
  writeFileSync(
    join(PHOTOS, 'credits.md'),
    metas
      .map((m) => `| photos/${m.id}.png | [${m.file}](${m.page}) | ${m.author.replace(/\|/g, '\\|')} | ${m.licenseUrl ? `[${m.license}](${m.licenseUrl})` : m.license} | ${(statSync(join(OUT, m.id + '.png')).size / 1024).toFixed(0)} KB |`)
      .join('\n') + '\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
