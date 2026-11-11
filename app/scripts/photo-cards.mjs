// Tạo thẻ hình public/cards/<id>.png từ ẢNH CHỤP THẬT trên Wikimedia Commons.
//   npm run cards:photo            → làm lại cả 37 thẻ
//   npm run cards:photo -- cow pig → chỉ làm vài thẻ
// Bước: tải ảnh gốc (lưu ở ../assets-src/photos/, không commit) → tách nền bằng
// model BiRefNet-lite (scripts/photo_cut.py, onnxruntime) → căn giữa, chiếm ~85% khung
// 512×512, nền trong suốt → ghi public/cards/CREDITS.md (tác giả + giấy phép).
// render-cards.mjs (render model 3D) vẫn giữ nhưng không còn sinh thẻ đang dùng.
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = join(__dirname, '..');
const PHOTOS = join(APP, '..', 'assets-src', 'photos');
const MODEL = join(APP, '..', 'assets-src', 'models-rembg', 'birefnet-lite.onnx');
const MODEL_URL =
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx';
const OUT = join(APP, 'public', 'cards');
const PYTHON = 'C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe';
const UA = 'BeHocCards/1.0 (personal non-commercial project)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OK_LICENSE = /^(cc0|public domain|pd\b|cc by(-sa)? [0-9.]+)/i;

// Ảnh đã chọn tay (xem bảng ảnh ứng viên khi đổi). crop: [x0,y0,x1,y1] theo tỉ lệ ảnh gốc,
// keep: 'all' khi chủ thể có nhiều phần rời (quả + nửa quả, chùm quả nhỏ).
const CARDS = {
  cow: { file: 'HF in der Rhön auf der Weide.jpg' },
  chicken: { file: 'Kogut na ulicy w Chintown w Singapurze, 20240122 0853 2966.jpg' },
  duck: { file: 'Pekin duck in Buddha park lake, Eluru.jpg' },
  pig: { file: 'Pigs in the Altai Mountains. Village Ortolyk.jpg', crop: [0.73, 0.38, 0.975, 0.71] },
  dog: { file: '3-BerneseMountainDogInGrass.jpg' },
  sheep: { file: 'Lamb 09807-a.jpg' },
  horse: { file: 'Horse in Calchaquí Valleys, Argentina.jpg' },
  rabbit: { file: 'Heimtier 004 2023 08 26.jpg' },
  cat: { file: 'Felis catus-cat on snow.jpg' },
  elephant: { file: '178 Male African bush elephant in Etosha National Park Photo by Giles Laurent.jpg' },
  giraffe: { file: '042 Masai giraffe in the Serengeti National Park Photo by Giles Laurent.jpg' },
  lion: { file: 'Lion (Panthera leo) old male Chobe.jpg' },
  tiger: { file: 'Bengal tiger in Sanjay Dubri Tiger Reserve December 2024 by Tisha Mukherjee 15.jpg' },
  monkey: { file: 'Rhesus macaque (Macaca mulatta mulatta), male, Gokarna.jpg' },
  panda: { file: 'Chengdu Sichuan China Panda-breeding-and-research-center-02.jpg' },
  penguin: { file: 'Wikimania 2018, Cape Town ( 1050603).jpg' },
  koala: { file: 'Koala in Zoo Duisburg.jpg' },
  fox: { file: 'Red fox catches a vole - Tolyatti, Russia.jpg' },
  bear: { file: 'Ursus arctos, Kuterevo (HR) -- 2022 -- 0379.jpg' },
  parrot: { file: 'Scarlet macaw at Cougar Mountain Zoological Park.jpg' },
  fish: { file: 'Carassius wild golden fish 2013 G1.jpg' },
  apple: { file: 'Honeycrisp-Apple.jpg' },
  banana: { file: 'Cavendish bananas DS.jpg' },
  cherries: { file: 'Cherry fruit on white background.jpg', keep: 'all' },
  grapes: { file: 'Grappolo di uva nera.jpg', keep: 'all' },
  lemon: { file: 'Lemon-Whole-Split.jpg', keep: 'all' },
  orange: { file: 'Mandarin fruit on white background.jpg' },
  pear: { file: 'Conference pear 2017 A1.jpg' },
  pineapple: { file: 'Ananas~May 2008-1.jpg' },
  strawberry: { file: 'Perfect strawberry (3613641379).jpg' },
  watermelon: { file: 'Slice of Watermelon from Wilson Farm, Lexington MA.jpg' },
  kiwi: { file: 'Kiwi aka.jpg', keep: 'all' },
  papaya: { file: 'Papaya - longitudinal section.jpg' },
  avocado: { file: 'Persea americana from Canadian supermarket.jpg', keep: 'all' },
  coconut: { file: 'Kokosnuss-Coconut.jpg', keep: 'all' },
  blueberry: { file: 'Food Portions (Team Nutrition) (20210902-FNS-UNC-0038).jpg', keep: 'all' },
  peach: { file: 'White-Peaches-Bunch.jpg', keep: 'all' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s = '') =>
  s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function get(url) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return r;
    console.log(`  HTTP ${r.status}, chờ rồi thử lại…`);
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
    iiprop: 'url|extmetadata|size', iiurlwidth: '1920',
  });
  const j = await (await get(`${API}?${p}`)).json();
  const page = Object.values(j.query.pages)[0];
  const ii = page.imageinfo?.[0];
  if (!ii) throw new Error(`${id}: không thấy File:${file}`);
  const em = ii.extmetadata ?? {};
  const meta = {
    id, file,
    page: ii.descriptionurl,
    author: stripHtml(em.Artist?.value) || 'unknown',
    license: em.LicenseShortName?.value ?? '',
    licenseUrl: em.LicenseUrl?.value ?? '',
  };
  if (!OK_LICENSE.test(meta.license)) throw new Error(`${id}: giấy phép không nhận: ${meta.license}`);
  await sleep(1500);
  const src = ii.thumburl && ii.width > 1920 ? ii.thumburl : ii.url;
  const buf = Buffer.from(await (await get(src)).arrayBuffer());
  writeFileSync(imgPath, buf);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`  tải ${id} (${Math.round(buf.length / 1024)} KB, ${meta.license})`);
  await sleep(1500);
  return meta;
}

function writeCredits(metas) {
  const lines = [
    '# Nguồn ảnh thẻ (cards/*.png)',
    '',
    'Ảnh chụp thật lấy từ Wikimedia Commons, đã tách nền và thu nhỏ bằng `scripts/photo-cards.mjs`',
    '(thay đổi so với ảnh gốc: cắt nền, cắt khung, đổi cỡ). Giấy phép giữ nguyên như ảnh gốc;',
    'ảnh CC BY-SA khi đã chỉnh sửa vẫn theo CC BY-SA.',
    '',
    '| Thẻ | Ảnh gốc | Tác giả | Giấy phép |',
    '|---|---|---|---|',
  ];
  for (const m of metas) {
    const lic = m.licenseUrl ? `[${m.license}](${m.licenseUrl})` : m.license;
    lines.push(`| ${m.id} | [${m.file.replace(/\|/g, '\\|')}](${m.page}) | ${m.author.replace(/\|/g, '\\|')} | ${lic} |`);
  }
  writeFileSync(join(OUT, 'CREDITS.md'), lines.join('\n') + '\n');
}

async function main() {
  mkdirSync(PHOTOS, { recursive: true });
  mkdirSync(dirname(MODEL), { recursive: true });
  if (!existsSync(MODEL)) {
    console.log('Tải model BiRefNet-lite (~220 MB)…');
    writeFileSync(MODEL, Buffer.from(await (await get(MODEL_URL)).arrayBuffer()));
  }
  const only = process.argv.slice(2);
  const ids = only.length ? only : Object.keys(CARDS);
  for (const id of ids) if (!CARDS[id]) throw new Error('không có thẻ ' + id);

  const metas = [];
  for (const id of Object.keys(CARDS)) {
    // CREDITS.md luôn ghi đủ 37 thẻ; chỉ tải ảnh chưa có.
    metas.push(await fetchPhoto(id, CARDS[id].file));
  }
  writeCredits(metas);

  const jobs = ids.map((id) => ({
    id, src: join(PHOTOS, `${id}.jpg`), out: join(OUT, `${id}.png`),
    crop: CARDS[id].crop, keep: CARDS[id].keep ?? 'largest', minPart: CARDS[id].minPart, thresh: CARDS[id].thresh,
  }));
  const jobsPath = join(PHOTOS, 'jobs.json');
  writeFileSync(jobsPath, JSON.stringify({ model: MODEL, size: 512, fill: 0.85, jobs }, null, 1));
  const r = spawnSync('uv', [
    'run', '--python', PYTHON, '--with', 'onnxruntime', '--with', 'pillow', '--with', 'numpy', '--with', 'scipy',
    'python', join(__dirname, 'photo_cut.py'), jobsPath,
  ], { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('photo_cut.py lỗi (mã ' + r.status + ')');
  for (const id of ids) {
    const kb = statSync(join(OUT, `${id}.png`)).size / 1024;
    if (kb > 150) console.warn(`  ⚠ ${id}.png ${kb.toFixed(0)} KB > 150 KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
