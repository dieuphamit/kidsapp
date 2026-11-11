import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(root, 'src', 'content');
const missing = [];
const animalIds = new Set();
for (const f of fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  for (const item of JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'))) {
    for (const lang of ['vi', 'ja']) {
      const mp3 = path.join(root, 'public', 'audio', lang, `${item.key}.mp3`);
      if (!fs.existsSync(mp3)) missing.push(`${lang}/${item.key}.mp3`);
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
console.log(`check-audio: đủ âm thanh vi/ja và ${animalIds.size} tiếng kêu con vật`);
