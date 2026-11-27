// Thú "ảnh thật 2.5D" của trò Thế giới: tách nền ảnh chụp thật trên Wikimedia Commons thành
// public/world-photos/<id>.png (cắt sát thân, nền trong suốt) + src/ui/hybrid/photoMeta.json (cỡ ảnh, hướng đầu)
// + public/world-photos/CREDITS.md.
//   node scripts/world-photos.mjs            → làm lại mọi ảnh
//   node scripts/world-photos.mjs bee fox    → chỉ làm vài ảnh (ảnh khác, dòng nguồn và photoMeta giữ nguyên)
// Dùng lại cách của photo-cards.mjs: ảnh gốc lưu ở ../assets-src/photos-world/ (không commit), tách nền bằng
// BiRefNet-lite (scripts/photo_cut.py). Con nào vẽ bằng ảnh, con nào bằng model 3D: xem src/ui/hybrid/look.ts.
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

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
  // ong nhìn ngang, đủ cánh, thân vàng nâu rõ khoang (ảnh cũ chụp cận từ dưới lên, viền xanh, bé sợ)
  bee: { file: 'Apis mellifera - Prunus padus - Keila.jpg', face: 'left', crop: [0.13, 0.03, 0.78, 0.63] },
  // bay nghiêng, nền đen: đủ hai cánh, không bị cắt mép
  parrot: { file: 'Scarlet Macaws -11 100- (33404691865).jpg', face: 'right', crop: [0.5, 0, 1, 1] },
  // dang hai cánh sẫm, nhìn từ dưới lên: vỗ cánh đều hai bên (kiểu 'wings')
  bat: { file: 'Mauritian flying fox (Pteropus niger) in flight 3.jpg', face: 'right' },
  pigeon: { file: 'Common pigeon at Waterlow Park, London 01.jpg', face: 'left' },
  // Rừng, đồng cỏ: con chưa có model 3D có texture đạt (sư tử: model tìm được không rõ nguồn; gấu mèo: không có)
  raccoon: { file: 'Raccoon in Central Park (35264).jpg', face: 'right' },
  // cáo, ngựa vằn: model 3D tìm được là low-poly, lạc phong cách cạnh thú ảnh thật → dùng ảnh nghiêng đủ bốn chân
  // roundEnd: chóp đuôi bị mép trái ảnh gốc cắt → bo tròn 12% bề ngang ở đầu đuôi
  fox: { file: 'Red fox walking across the sand and rocks. (cd648e7a-155d-451f-67c2-22e947c5a1c6).jpg', face: 'right', roundEnd: 0.12 },
  zebra: { file: 'A plains zebra 3.jpg', face: 'right' },
  lion: { file: 'Lion (Panthera leo) walking on the road ... (50133447418).jpg', face: 'left' },
  // Sở thú, nông trại: ảnh nghiêng đủ bốn chân, nền thoáng
  tiger: { file: 'Bengal tiger in Sanjay Dubri Tiger Reserve December 2024 by Tisha Mukherjee 15.jpg', face: 'left' },
  sheep: { file: 'Ovella. Galiza.jpg', face: 'left' },
  cow: { file: 'Seitenansicht Milchkuh mit prallem Euter.JPG', face: 'right' },
  // chó đứng nghiêng trên cỏ ngắn, thấy rõ cả bốn bàn chân (ảnh cũ 1Shiba Inu Kazumi.jpg: chân lấp trong cỏ, bị cụt)
  dog: { file: 'Cream shiba inu dllu.jpg', face: 'left', crop: [0.2, 0.12, 0.8, 0.85] },
  // vịt nhà đứng trên đất, thấy rõ hai chân (con 'duck' ở trên đang bơi)
  'farm-duck': { file: 'Anas platyrhynchos Кряква в Санкт-Петербурге Нестандартная окраска 07.jpg', face: 'left' },
  pig: { file: 'Mettingen Hausschwein 01.jpg', face: 'right' },
  rabbit: { file: 'Heimtier 004 2023 08 26.jpg', face: 'left' },
  // gấu trúc: không có ảnh nghiêng hẳn đủ chân, dùng ảnh ba phần tư đang đi, đủ bốn chân
  panda: { file: 'Panda Walking 4.jpg', face: 'right' },
  monkey: { file: '20160802 - Rhesus macaque - Mount Popa, Myanmar - 7170.jpg', face: 'right' },
  // ngồi thẳng trên thanh gỗ: cắt bỏ phần lớn thanh gỗ bên dưới
  // hq: lông xám nhiều hạt, bảng màu thường làm bệt màu khi phóng to (khách của Bếp nấu ăn) → giảm màu có dither
  koala: { file: 'AUS koala1.jpg', face: 'right', crop: [0.2, 0.15, 0.72, 0.9], hq: true, degreen: true },
  penguin: { file: 'Aptenodytes patagonicus Nils Olav at Edinburgh zoo.jpg', face: 'right' },
  // vẹt đứng trên tảng đá: cắt ngang chân để bỏ tảng đá
  'parrot-stand': { file: 'Scarlet macaw (Ara macao macao) Yasuni.jpg', face: 'left', crop: [0.24, 0.2, 0.86, 0.785] },
  chicken: { file: 'Kogut na ulicy w Chintown w Singapurze, 20240122 0853 2966.jpg', face: 'right' },
  // khách mèo của Bếp nấu ăn (cards/feed/cat.png là thẻ vuông có lề nên mèo lơ lửng sau quầy): ảnh cắt sát thân
  cat: { file: 'Felis catus-cat on snow.jpg', face: 'left' },
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
    hq = p.startswith('hq:')
    p = p[3:] if hq else p
    im = Image.open(p).convert('RGBA')
    box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(box)
    # photo_cut.py đã lưu bảng 256 màu: lượng tử lại (giữ alpha) cho nhẹ
    # hq: để nguyên 32-bit, world-photos.mjs giảm màu bằng sharp (libimagequant, có dither)
    if hq:
        im.save(p, optimize=True)
    else:
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
  const only = process.argv.slice(2);
  for (const id of only) if (!PHOTOS_WORLD[id]) throw new Error('không có ảnh ' + id);
  const ids = only.length ? only : Object.keys(PHOTOS_WORLD);
  const metas = [];
  for (const id of ids) metas.push(await fetchPhoto(id, PHOTOS_WORLD[id].file));

  const jobs = ids.map((id) => ({
    id, src: join(PHOTOS, `${id}.jpg`), out: join(OUT, `${id}.png`), crop: PHOTOS_WORLD[id].crop, keep: 'largest',
    // hq: không cho photo_cut.py giảm màu (trần dung lượng lớn), giảm màu sau bằng sharp
    limit: PHOTOS_WORLD[id].hq ? 4 * 1024 * 1024 : undefined,
  }));
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
  py([trimPy, sizesPath, ...jobs.map((j) => (PHOTOS_WORLD[j.id].hq ? 'hq:' : '') + j.out)]);
  const hqSizes = {};
  for (const j of jobs) {
    const o = PHOTOS_WORLD[j.id];
    if (!o.hq && !o.degreen && !o.roundEnd) continue;
    const { data, info } = await sharp(readFileSync(j.out)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    if (o.degreen) {
      // thú lông xám chụp trên nền lá: mép lông tơ còn ám xanh → kéo kênh xanh lá về bằng kênh lớn hơn trong hai kênh kia
      for (let i = 0; i < data.length; i += 4) {
        const m = Math.max(data[i], data[i + 2]);
        if (data[i + 1] > m) data[i + 1] = m;
      }
    }
    if (o.roundEnd) {
      // đuôi bị mép ảnh gốc cắt ngang: bo tròn đầu mút (nửa elip) để không còn vết cắt thẳng
      const depth = Math.round(o.roundEnd * w);
      let y0 = h;
      let y1 = 0;
      for (let y = 0; y < h; y++) if (data[(y * w + depth) * 4 + 3] > 40 && y < h * 0.8) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const cy = (y0 + y1) / 2;
      const ry = (y1 - y0) / 2 + 2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < depth; x++) {
          const d = Math.hypot((depth - x) / depth, (y - cy) / ry);
          // mép mềm ~2px
          const k = Math.min(1, Math.max(0, (1 - d) * depth * 0.5));
          data[(y * w + x) * 4 + 3] = Math.round(data[(y * w + x) * 4 + 3] * k);
        }
      }
    }
    // hq: giữ PNG 32-bit (sharp bản Windows không có libimagequant, bảng màu của PIL thì bệt màu); thu nhỏ dần tới
    // khi ≤ 145 KB (test look.test.ts: ảnh ≤ 150 KB). Ảnh hơi nhỏ nhưng mịn nhìn đẹp hơn ảnh to mà bệt màu.
    let buf;
    let k = 1;
    for (;;) {
      const img = sharp(data, { raw: { width: w, height: h, channels: 4 } });
      if (k < 1) img.resize(Math.round(w * k), Math.round(h * k), { kernel: 'lanczos3' });
      buf = await (o.hq ? img.png({ compressionLevel: 9, effort: 10 }) : img.png({ palette: true, quality: 100, effort: 10 })).toBuffer();
      if (!o.hq || buf.length <= 145 * 1024) break;
      k *= 0.94;
    }
    writeFileSync(j.out, buf);
    hqSizes[j.out] = [Math.round(w * k), Math.round(h * k)];
  }
  const sizes = { ...JSON.parse(readFileSync(sizesPath, 'utf8')), ...hqSizes };
  const metaPath = join(APP, 'src', 'ui', 'hybrid', 'photoMeta.json');
  // chỉ làm vài ảnh: giữ nguyên cỡ ảnh và dòng nguồn của các ảnh khác
  const index = only.length ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
  for (const j of jobs) {
    const [w, h] = sizes[j.out];
    index[j.id] = { w, h, face: PHOTOS_WORLD[j.id].face };
    console.log(`  ${j.id}.png ${w}×${h} ${(statSync(j.out).size / 1024).toFixed(0)} KB`);
  }
  writeFileSync(join(APP, 'src', 'ui', 'hybrid', 'photoMeta.json'), JSON.stringify(index, null, 1) + '\n');
  const author = (m) => (m.author === 'unknown' ? '(Commons không ghi tên tác giả)' : m.author.replace(/\|/g, '\\|'));
  const creditsPath = join(OUT, 'CREDITS.md');
  const row = (m) =>
    `| ${m.id}.png | [${m.file}](${m.page}) | ${author(m)} | ${m.licenseUrl ? `[${m.license}](${m.licenseUrl})` : m.license} | ${(statSync(join(OUT, m.id + '.png')).size / 1024).toFixed(0)} KB |`;
  const oldRows = new Map();
  if (only.length && existsSync(creditsPath)) {
    for (const line of readFileSync(creditsPath, 'utf8').split(/\r?\n/)) {
      const m = /^\| ([^| ]+)\.png \|/.exec(line);
      if (m) oldRows.set(m[1], line);
    }
  }
  const newRows = new Map(metas.map((m) => [m.id, row(m)]));
  writeFileSync(
    creditsPath,
    [
      '# Nguồn ảnh thú của trò Thế giới (world-photos/*.png)',
      '',
      'Ảnh chụp thật lấy từ Wikimedia Commons, tách nền (BiRefNet-lite), cắt sát thân và thu nhỏ bằng',
      '`scripts/world-photos.mjs` (thay đổi so với ảnh gốc: cắt nền, cắt khung, đổi cỡ, giảm màu). Giấy phép giữ',
      'nguyên như ảnh gốc; ảnh CC BY-SA khi đã chỉnh sửa vẫn theo CC BY-SA. Riêng fox.png bo tròn chóp đuôi (ảnh gốc cắt mất chóp đuôi), koala.png khử ám xanh ở mép lông.',
      '',
      '| File | Ảnh gốc | Tác giả | Giấy phép | Dung lượng |',
      '|---|---|---|---|---|',
      ...Object.keys(PHOTOS_WORLD).map((id) => newRows.get(id) ?? oldRows.get(id)).filter(Boolean),
    ].join('\n') + '\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
