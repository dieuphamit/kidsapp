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
  // Nối điểm phóng gà ~730px khung (~1460px màn retina): thẻ 512 bảng màu bị vỡ hạt → thẻ 1024 từ ảnh gốc 3107px
  chicken: { file: 'Kogut na ulicy w Chintown w Singapurze, 20240122 0853 2966.jpg', width: 3840, work: 3107, size: 1024, limitKB: 900 },
  duck: { file: 'Mallard Drake - Flickr - treegrow.jpg' },
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
  // E4: thú có tiếng kêu thật cho Ú òa / Đường về nhà. Không nằm trong cards/index.json (Lật hình, Ghép hình giữ nguyên).
  zebra: { file: 'Plains zebra standing close up - DPLA - 5a17abfc936af2a7cad34115b462e9a3.jpg' },
  deer: { file: '2025-11-10 15 11 40 A white-tailed deer doe standing on fallen Japanese Maple and Pin Oak leaves in autumn along Delaware Avenue in the Mountainview section of Ewing Township, Mercer County, New Jersey.jpg' },
  raccoon: { file: 'Raccoon in Central Park (35264).jpg' },
  frog: { file: 'Green treefrog.jpg' },
  bee: { file: 'Apis mellifera - Prunus padus - Keila.jpg', crop: [0.13, 0.03, 0.78, 0.63] },
  pigeon: { file: 'Common pigeon at Waterlow Park, London 01.jpg' },
  dolphin: { file: '010 Atlantic bottlenose dolphin jumping at Pelican point Photo by Giles Laurent.jpg' },
  whale: { file: '001 Humpback whale breaching in Ballena Marine National Park Photo by Giles Laurent.jpg' },
  // Phase 3: thẻ chuyện ba tranh (cards/story/) và topping Tiệm bánh (cards/extra/).
  // Không nằm trong cards/index.json để Lật hình, Ghép hình không lấy nhầm.
  // scene: true = ảnh cảnh, không tách nền, chỉ cắt vuông.
  'story/plant-1': { file: 'Yard long bean seeds.jpg', keep: 'all' },
  'story/plant-2': { file: 'Radish seedling with three (3) cotyledons (49877392258).jpg' },
  'story/plant-3': { file: 'Sunflower head 2026 G3.jpg' },
  'story/chick-1': { file: 'A brown chicken egg on white background.png' },
  'story/chick-2': { file: 'Brown egg hatching.jpg' },
  'story/chick-3': { file: 'Yellow Chick.jpg' },
  'story/butterfly-1': { file: 'Monarch caterpillar (23229).jpg' },
  'story/butterfly-2': { file: 'Monarch Butterfly Chrysalis (45553422001).jpg' },
  'story/butterfly-3': { file: 'Danaus plexippus MHNT.jpg', crop: [0, 0, 1, 0.5] },
  'story/frog-1': { file: 'Tadpoles 10 days.jpg' },
  'story/frog-2': { file: 'Leptob hasselt T04 080208-4570 clobk.jpg' },
  'story/frog-3': { file: 'Green treefrog.jpg' },
  'story/banana-1': { file: 'Bananas. Costa Rica.jpg', keep: 'all' },
  'story/banana-2': { file: 'Liat Portal for Foodie Disorder - A Single Banana.jpg' },
  'story/banana-3': { file: 'Banane-A-05 cropped.jpg', keep: 'all' },
  'story/rain-1': { file: 'White Cumulus Clouds against Blue Sky with Sun Shining.jpg', scene: true },
  'story/rain-2': { file: 'Moody Raindrops In Dark Blue Puddle (2387754376).jpg', scene: true },
  'story/rain-3': { file: 'WhereRainbowRises.jpg', scene: true },
  'extra/candle': { file: 'Birthday candle, Downpatrick, July 2010.JPG' },
  'extra/chocolate': { file: '2023 Gorzka czekolada.jpg', keep: 'all' },
  // bath: tắm cho thú — thú chiếm ~60% màn hình nên cần thẻ lớn (size 1024, ≤ limitKB).
  // width: cỡ ảnh tải từ Commons, chỉ dùng cỡ thumbnail chuẩn 1920/3840 (tải ảnh gốc bị Wikimedia chặn 429);
  // work: cỡ làm việc khi tách nền (mặc định 1600).
  // Chọn thú lông sáng để vệt bùn nâu nhìn rõ. Không nằm trong cards/index.json.
  'bath/pig': { file: 'Aschersleben, Zoo, Hausschwein, Ferkel.jpg', width: 1920, work: 1920, size: 1024, limitKB: 450 },
  'bath/dog': { file: 'Golden Retriever Puppy in the House.JPG', width: 1920, work: 1920, size: 1024, limitKB: 450 },
  'bath/sheep': { file: 'Lamb 09807-a.jpg', width: 1920, work: 1920, size: 1024, limitKB: 450 },
  'bath/duck': { file: 'Pekin duck in Buddha park lake, Eluru.jpg', width: 3840, work: 3200, size: 1024, limitKB: 450 },
  'bath/elephant': { file: '178 Male African bush elephant in Etosha National Park Photo by Giles Laurent.jpg', width: 3840, work: 3000, size: 1024, limitKB: 450 },
  'bath/panda': { file: 'Chengdu Sichuan China Panda-breeding-and-research-center-02.jpg', width: 1920, work: 1920, size: 1024, limitKB: 450 },
  'bath/cow': { file: 'HF in der Rhön auf der Weide.jpg', width: 3840, work: 3000, size: 1024, limitKB: 450 },
  'bath/rabbit': { file: 'Heimtier 004 2023 08 26.jpg', width: 3840, work: 3000, size: 1024, limitKB: 450 },
  // mama: mẹ và con
  // Trò "Mẹ ơi, con đâu?": thú con (cards/baby/) và thú mẹ chưa có thẻ trưởng thành (cards/mama/).
  // Không nằm trong cards/index.json. Mẹ bò, vịt, ngựa, chó dùng lại thẻ cow, duck, horse, dog.
  'baby/calf': { file: 'HOLSTEIN FRIESIAN CALF.jpg' },
  'baby/chick': { file: 'CSIRO ScienceImage 2857 A Day Old Chick.jpg', crop: [0, 0, 1, 0.888] },
  'baby/duckling': { file: 'Cute ducklings waddling on pavement near children.jpg', crop: [0.4, 0.36, 0.78, 0.95] },
  'baby/lamb': { file: 'Spring Lamb - geograph.org.uk - 2967473.jpg' },
  'baby/piglet': { file: 'Einmal strecken buntes Bentheimer Landschwein Ferkel 2011.JPG' },
  'baby/foal': { file: 'Bay arabian foal, Germany.jpg' },
  'baby/puppy': { file: 'Lone puppy.jpg' },
  'mama/hen': { file: 'Australorps henne.jpg' },
  'mama/sheep': { file: 'Texel ewe and three lambs.jpg', crop: [0.27, 0.22, 0.68, 0.74] },
  'mama/pig': { file: 'Sow.jpg' },
  // feed: cho thú ăn
  // Trò "Cho thú ăn": món ăn (cards/feed/<món>.png, 512) và thú hiển thị lớn chưa có bản 1024 (cards/feed/<thú>.png).
  // Tải thumbnail 1280 (Wikimedia hay trả 429). Thỏ, gấu trúc, cún dùng lại cards/bath/; chuối, táo dùng thẻ sẵn có.
  'feed/carrot': { file: 'Vegetable-Carrot-Bundle-wStalks.jpg', width: 1280 },
  'feed/fish': { file: 'Homemade fish smoking - Raw mackerel prepared for smoking.jpg', width: 1280, crop: [0, 0.08, 1, 0.37] },
  'feed/corn': { file: 'Corn on the cob - Massachusetts.jpg', width: 1280, crop: [0.2, 0, 0.78, 1], keep: 'all' },
  'feed/bamboo': { file: 'Bamboo Sky - Flickr - pfly.jpg', width: 1280, crop: [0.3, 0, 1, 1], keep: 'all' },
  'feed/bone': { file: 'Dog chew.jpg', width: 1280, crop: [0.22, 0.14, 0.46, 0.65] },
  'feed/monkey': { file: 'Rhesus macaque (Macaca mulatta mulatta), male, Gokarna.jpg', width: 1280, work: 1280, size: 1024, limitKB: 450 },
  'feed/cat': { file: 'Felis catus-cat on snow.jpg', width: 1280, work: 1280, size: 1024, limitKB: 450 },
  'feed/horse': { file: 'Horse in Calchaquí Valleys, Argentina.jpg', width: 1280, work: 1280, size: 1024, limitKB: 450 },
  'feed/hen': { file: 'Australorps henne.jpg', width: 1280, work: 1280, size: 1024, limitKB: 450 },
  // words: đồ vật quanh bé
  // Trò "Đồ vật quanh bé" (cards/words/). Không nằm trong cards/index.json.
  // width: cỡ thumbnail chuẩn tải từ Commons (tải ảnh gốc bị Wikimedia chặn 429).
  'words/pants': { file: 'Jeans Gul&Blå i modellen Dallas.jpg', width: 500 },
  'words/shoes': { file: 'Paar witte sneakers, merk G-Unit, maat 40, objectnr 87415-7.A-B.JPG', keep: 'all', width: 1280 },
  'words/boots': { file: 'Rain boots on Stairs.jpg', crop: [0.3, 0.24, 0.96, 0.98], width: 1280 },
  'words/spoon': { file: 'Stainless Steel Soup Spoon.jpg', width: 1280 },
  'words/fork': { file: 'Fork isolated on white background 03.jpg', width: 1280 },
  'words/pot': { file: 'Cooking Pot March.jpg', width: 1280 },
  'words/bus': { file: 'Hyundai - school bus in Bulgaria.JPG', width: 1280 },
  'words/firetruck': { file: 'KAMAZ fire truck - Moscow.jpg', width: 1280 },
  'words/ambulance': { file: 'Dutch Volkswagen ambulance 2016-12-27.jpg', width: 1280 },
  'words/train': { file: 'NSW XPT passenger train Galong, NSW.jpg', width: 1280 },
  'words/bicycle': { file: 'White single-speed bicycle on yellow background.png', width: 1280 },
  'words/boat': { file: 'Fishing boat Nørre Vorupør 2012-11-18 cropped.jpg', width: 1280 },
  'words/teddy': { file: 'Handmade teddy bear.jpg', width: 1280 },
  'words/shirt': { file: 'Classical polo shirt.jpg', width: 1280 },
  'words/socks': { file: 'Hand Knitted Socks.JPG', keep: 'all', width: 1280 },
  'words/hat': { file: "Straw hat, Vietnamese Women's Museum.jpg", width: 1280 },
  'words/cup': { file: 'Party red plastic cup.png', width: 500 },
  'words/bowl': { file: 'Simple-ceramic-bowl (cropped).jpg', width: 960 },
  'words/plate': { file: 'Ceramic Plate.jpg', width: 1280 },
  'words/car': { file: '1991 Holden Caprice (VQ) armoured car side.jpg', width: 1280 },
  'words/airplane': { file: 'Saudi Airliens Takeoff a320.jpg', width: 1280 },
  'words/ball': { file: 'Soccer ball on ground.jpg', width: 1280 },
  'words/book': { file: "SIDGWICK-PAINTER(1895) The children's book of gardening (15628997510).jpg", width: 960 },
  'words/chair': { file: 'Kitchen chair made by Lübke. Germany.jpeg', width: 1280 },
  'words/bed': { file: 'Bunk bed (wooden).jpg', width: 1280 },
  'words/toothbrush': { file: 'Gum manual toothbrush.jpg', width: 1280 },
  'words/clock': { file: 'Classic alarm clock 20180513.jpg', width: 1280 },
  // cook: Bếp nấu ăn — nguyên liệu chưa có thẻ (cards/cook/). Trứng dùng lại story/chick-1,
  // rau quả khác dùng thẻ sẵn có. Không nằm trong cards/index.json.
  'cook/tomato': { file: 'Tomato (41282993051).jpg', width: 1280 },
  'cook/potato': { file: 'Potato cv Dejima.jpg', width: 1280, crop: [0, 0, 0.52, 1] },
  'cook/broccoli': { file: 'Good broccoli Deal!.jpg', width: 1280 },
  'cook/rice': { file: 'A bowl of rice.jpg', width: 1280 },
  'cook/mushroom': { file: 'WHITE MUSHROOM.jpg', width: 1280 },
  'cook/noodles': { file: '75g Nissin Seafood Cup Noodles 2026-09-25 uncooked in plate 05.jpg', width: 1280, crop: [0.3, 0.08, 0.72, 0.78] },
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

async function fetchPhoto(id, file, width = 1920) {
  const metaPath = join(PHOTOS, `${id}.json`);
  const imgPath = join(PHOTOS, `${id}.jpg`);
  mkdirSync(dirname(imgPath), { recursive: true });
  if (existsSync(metaPath) && existsSync(imgPath)) {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (meta.file === file) return meta;
  }
  const p = new URLSearchParams({
    action: 'query', format: 'json', titles: 'File:' + file, prop: 'imageinfo',
    iiprop: 'url|extmetadata|size', iiurlwidth: String(width),
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
  const src = ii.thumburl && ii.width > width ? ii.thumburl : ii.url;
  const buf = Buffer.from(await (await get(src)).arrayBuffer());
  writeFileSync(imgPath, buf);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`  tải ${id} (${Math.round(buf.length / 1024)} KB, ${meta.license})`);
  await sleep(1500);
  return meta;
}

/** Đọc lại các dòng nguồn trong CREDITS.md hiện có: id → { id, file, page, author, license, licenseUrl }. */
function creditRows() {
  const map = new Map();
  const path = join(OUT, 'CREDITS.md');
  if (!existsSync(path)) return map;
  const unesc = (s) => s.replace(/\\\|/g, '|');
  const re = /^\| ([^|]+?) \| \[(.+?)\]\((.+?)\) \| ((?:\\\||[^|])*) \| (.*) \|$/;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = re.exec(line);
    if (!m) continue;
    const lic = /^\[(.*)\]\((.*)\)$/.exec(m[5]);
    map.set(m[1], {
      id: m[1], file: unesc(m[2]), page: m[3], author: unesc(m[4]),
      license: lic ? lic[1] : m[5], licenseUrl: lic ? lic[2] : '',
    });
  }
  return map;
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
  lines.push('', '`daudau.png`: render từ model Đậu Đậu tự làm (`src/ui/DauDau.tsx`) bằng `scripts/render-daudau.mjs`.');
  lines.push(
    '',
    '## Hình khối (shapes/*.svg)',
    '',
    'Tự vẽ bằng SVG cho dự án (hình đơn giản có mặt cười, màu lấy từ `src/core/tokens.css`), không dùng tài nguyên bên ngoài.',
  );
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

  // CREDITS.md luôn ghi đủ mọi thẻ. Khi chỉ làm vài thẻ, thẻ khác giữ nguyên dòng nguồn đã có
  // (cùng ảnh gốc) thay vì tải lại ảnh gốc của cả bộ.
  const known = only.length ? creditRows() : new Map();
  const metas = [];
  for (const id of Object.keys(CARDS)) {
    const row = known.get(id);
    if (!only.includes(id) && row && row.file === CARDS[id].file) metas.push(row);
    else metas.push(await fetchPhoto(id, CARDS[id].file, CARDS[id].width));
  }
  writeCredits(metas);

  const jobs = ids.map((id) => ({
    id, src: join(PHOTOS, `${id}.jpg`), out: join(OUT, `${id}.png`),
    crop: CARDS[id].crop, keep: CARDS[id].keep ?? 'largest', minPart: CARDS[id].minPart, thresh: CARDS[id].thresh,
    scene: CARDS[id].scene,
    // bath: tắm cho thú — cỡ thẻ / cỡ làm việc / trần dung lượng riêng (thiếu thì theo mặc định chung)
    size: CARDS[id].size, work: CARDS[id].work, limit: CARDS[id].limitKB ? CARDS[id].limitKB * 1024 : undefined,
  }));
  for (const j of jobs) mkdirSync(dirname(j.out), { recursive: true });
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
    if (kb > (CARDS[id].limitKB ?? 150)) console.warn(`  ⚠ ${id}.png ${kb.toFixed(0)} KB > 150 KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
