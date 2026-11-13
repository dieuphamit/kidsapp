import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(root, 'src', 'content');
// Câu có {name} cần một file cho mỗi tên bạn đồng hành: tên mặc định (phần tử đầu) ở <key>.mp3,
// tên khác ở <key>~<nameId>.mp3 (tools/tts/generate.py).
const names = JSON.parse(fs.readFileSync(path.join(root, 'src', 'core', 'buddyNames.json'), 'utf8'));
const missing = [];
let namedCount = 0;
const animalIds = new Set();
for (const f of fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  for (const item of JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'))) {
    const named = item.vi.includes('{name}');
    if (named) namedCount++;
    const stems = named ? names.map((n, i) => (i === 0 ? item.key : `${item.key}~${n.id}`)) : [item.key];
    for (const lang of ['vi', 'ja', 'en']) {
      for (const stem of stems) {
        const mp3 = path.join(root, 'public', 'audio', lang, `${stem}.mp3`);
        if (!fs.existsSync(mp3)) missing.push(`${lang}/${stem}.mp3`);
      }
    }
    const m = /^animal\.([a-z]+)$/.exec(item.key);
    if (m) animalIds.add(m[1]);
  }
}
// Tiếng kêu con vật là ghi âm thật, không phải TTS: say('animal.<id>-sound') phát sfx/animal-<id>.mp3
// (speechUrl trong src/core/audio.ts). Mọi con vật có tên trong content phải có file này.
const missingSfx = [...animalIds]
  .map((id) => `sfx/animal-${id}.mp3`)
  .filter((rel) => !fs.existsSync(path.join(root, 'public', 'audio', rel)));
if (missing.length) {
  console.error(`Thiếu ${missing.length} file âm thanh:\n  ${missing.join('\n  ')}\nChạy: tools/tts/generate.py`);
}
if (missingSfx.length) {
  console.error(`Thiếu ${missingSfx.length} tiếng kêu con vật:\n  ${missingSfx.join('\n  ')}\nChạy: node scripts/animal-sounds.mjs`);
}
if (missing.length || missingSfx.length) process.exit(1);
console.log(`check-audio: đủ âm thanh vi/ja/en (${namedCount} câu có tên × ${names.length} tên) và ${animalIds.size} tiếng kêu con vật`);
