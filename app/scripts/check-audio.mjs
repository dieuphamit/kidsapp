import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(root, 'src', 'content');
const missing = [];
for (const f of fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  for (const item of JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'))) {
    for (const lang of ['vi', 'ja']) {
      const mp3 = path.join(root, 'public', 'audio', lang, `${item.key}.mp3`);
      if (!fs.existsSync(mp3)) missing.push(`${lang}/${item.key}.mp3`);
    }
  }
}
if (missing.length) {
  console.error(`Thiếu ${missing.length} file âm thanh:\n  ${missing.join('\n  ')}\nChạy: tools/tts/generate.py`);
  process.exit(1);
}
console.log('check-audio: đủ âm thanh vi/ja');
