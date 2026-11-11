// Sinh tiếng kêu THẬT của con vật: public/audio/sfx/animal-<id>.mp3 và public/audio/sfx/CREDITS.md
// từ manifest scripts/animal-sounds.json (nguồn Wikimedia Commons, giấy phép CC0/PD/CC BY/CC BY-SA).
//
// Chạy trong app/:  node scripts/animal-sounds.mjs [id ...]
//   - file gốc giữ ở ../assets-src/sounds/raw/ (git-ignore); thiếu thì tải về (User-Agent chung, có nghỉ giữa các lần tải)
//   - mỗi mục: cắt các đoạn `segments` [[giây bắt đầu, giây kết thúc], ...], fade 40ms hai đầu mỗi đoạn,
//     ghép bằng khoảng lặng `gap` giây, mono 44.1kHz, lọc ồn thấp (highpass), chuẩn hóa độ to về
//     LUFS_TARGET bằng một mức khuếch đại cố định (đo bằng ebur128) + limiter, xuất mp3 CBR 80kbps
//   - cuối cùng đo lại từng file (độ dài, LUFS, true peak, lặng đầu) và báo lỗi nếu lệch chuẩn
// Cần ffmpeg trên PATH.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const APP = path.resolve(import.meta.dirname, '..');
const RAW = path.resolve(APP, '..', 'assets-src', 'sounds', 'raw');
const OUT = path.join(APP, 'public', 'audio', 'sfx');
const MANIFEST = path.join(import.meta.dirname, 'animal-sounds.json');
const UA = 'BeHocSounds/1.0 (personal non-commercial project)';
const LUFS_TARGET = -18;
const LIMIT_DB = -3; // trần mẫu sau limiter; true peak sau mp3 phải ≤ -1.5 dBTP
const FADE = 0.04;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
// ebur128/silencedetect ghi kết quả ra stderr nên dùng spawnSync
function spawn(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg lỗi (${args.join(' ')}):\n${r.stderr}`);
  return r;
}

const rawName = (title) => title.replace(/^File:/, '').replace(/[^\w.\-()]+/g, '_');

async function ensureRaw(item) {
  fs.mkdirSync(RAW, { recursive: true });
  // `file` + `url`: dùng bản chuyển mã của Commons (file gốc quá lớn hoặc là video) thay cho file gốc
  const dest = path.join(RAW, item.file ?? rawName(item.title));
  if (fs.existsSync(dest)) return dest;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(item.url, { headers: { 'User-Agent': UA } });
    if (r.ok) {
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      console.log('tải', path.basename(dest));
      await sleep(2500);
      return dest;
    }
    console.log(`  ${r.status}, thử lại sau ${10 * (i + 1)}s`);
    await sleep(10000 * (i + 1));
  }
  throw new Error(`Không tải được ${item.url}`);
}

/** Bộ lọc: cắt + fade từng đoạn, ghép với khoảng lặng, mono 44.1k, highpass */
function buildFilter(item) {
  const parts = [];
  const labels = [];
  const gap = item.gap ?? 0.15;
  item.segments.forEach(([s, e], i) => {
    const d = e - s;
    parts.push(`[0:a]atrim=${s}:${e},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono,` +
      `afade=t=in:d=${FADE},afade=t=out:st=${(d - FADE).toFixed(3)}:d=${FADE}[s${i}]`);
    labels.push(`[s${i}]`);
    if (i < item.segments.length - 1) {
      parts.push(`anullsrc=r=44100:cl=mono,atrim=0:${gap}[g${i}]`);
      labels.push(`[g${i}]`);
    }
  });
  parts.push(`${labels.join('')}concat=n=${labels.length}:v=0:a=1,highpass=f=${item.highpass ?? 70}[out]`);
  return parts.join(';');
}

function measure(file) {
  const err = spawn(['-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
  const summary = err.slice(err.lastIndexOf('Summary:'));
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
  const tp = Number(/Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(summary)?.[1]);
  return { I, tp };
}

function leadingSilence(file) {
  const err = spawn(['-i', file, '-af', 'silencedetect=n=-45dB:d=0.02', '-f', 'null', '-']).stderr;
  const m = /silence_start: (-?[\d.e-]+)[\s\S]*?silence_end: ([\d.]+)/.exec(err);
  return m && Number(m[1]) <= 0.001 ? Number(m[2]) : 0;
}

function duration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(out.trim());
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const only = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP ?? process.env.TMPDIR ?? '/tmp'), 'animal-sounds-'));
  const problems = [];
  for (const item of manifest.sounds) {
    if (only.length && !only.includes(item.id)) continue;
    const src = await ensureRaw(item);
    const mid = path.join(tmp, `${item.id}.wav`);
    ff(['-y', '-i', src, '-filter_complex', buildFilter(item), '-map', '[out]', '-c:a', 'pcm_f32le', mid]);
    // khuếch đại cố định rồi limiter; âm có nhiều đỉnh nhọn (bọt nước) bị limiter ăn bớt độ to nên lặp vài lần cho tới đích
    const dest = path.join(OUT, `animal-${item.id}.mp3`);
    let gain = LUFS_TARGET - measure(mid).I;
    let m;
    for (let i = 0; i < 4; i++) {
      ff(['-y', '-i', mid, '-af',
        `volume=${gain.toFixed(2)}dB,alimiter=limit=${Math.pow(10, LIMIT_DB / 20).toFixed(4)}:attack=5:release=60:level=false`,
        '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', dest]);
      m = measure(dest);
      if (Math.abs(m.I - LUFS_TARGET) <= 0.7) break;
      gain += LUFS_TARGET - m.I;
    }
    const d = duration(dest);
    const lead = leadingSilence(dest);
    const line = `${item.id.padEnd(9)} ${d.toFixed(2)}s  I=${m.I.toFixed(1)} LUFS  TP=${m.tp.toFixed(1)} dBTP  lặng đầu=${(lead * 1000).toFixed(0)}ms  ${(fs.statSync(dest).size / 1024).toFixed(1)}KB  (gain ${gain.toFixed(1)}dB)`;
    console.log(line);
    if (d < 1 || d > 3.05) problems.push(`${item.id}: độ dài ${d.toFixed(2)}s ngoài 1–3s`);
    if (Math.abs(m.I - LUFS_TARGET) > 1.5) problems.push(`${item.id}: độ to ${m.I.toFixed(1)} LUFS lệch mục tiêu ${LUFS_TARGET}`);
    if (m.tp > -1.5) problems.push(`${item.id}: true peak ${m.tp.toFixed(1)} > -1.5 dBTP`);
    if (lead > 0.1) problems.push(`${item.id}: lặng đầu ${(lead * 1000).toFixed(0)}ms > 100ms`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!only.length) writeCredits(manifest);
  if (problems.length) {
    console.error(`\nKhông đạt:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
}

function writeCredits(manifest) {
  const rows = manifest.sounds.map((s) =>
    `| ${s.id} | [${s.title.replace(/^File:/, '').replace(/\|/g, '\\|')}](${s.page}) | ${s.author} | ${s.license} | ${s.what} | ${s.segments.map(([a, b]) => `${a}–${b}s`).join(' + ')} |`);
  const md = `# Tiếng kêu con vật (ghi âm thật)

File \`animal-<id>.mp3\` là tiếng thật của con vật, phát khi game gọi \`say('animal.<id>-sound')\`
(ánh xạ ở \`speechUrl\` trong \`src/core/audio.ts\`, không phụ thuộc ngôn ngữ).
Nguồn: Wikimedia Commons. Mỗi file đã được cắt đoạn, đổi mono, chuẩn hóa độ to (${LUFS_TARGET} LUFS) và nén mp3 —
đây là bản phái sinh (adapted) của tác phẩm gốc; giấy phép CC BY-SA áp dụng tiếp cho bản phái sinh tương ứng.
Sinh lại: trong \`app/\` chạy \`node scripts/animal-sounds.mjs\` (manifest: \`scripts/animal-sounds.json\`). File này được sinh tự động.

| id | Nguồn (trang file trên Commons) | Tác giả | Giấy phép | Nội dung | Đoạn dùng |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
  fs.writeFileSync(path.join(OUT, 'CREDITS.md'), md);
}

await main();
