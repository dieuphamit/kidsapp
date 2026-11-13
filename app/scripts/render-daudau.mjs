// Render ảnh 2D bạn đồng hành từ chính component src/ui/Buddy.tsx (512×512, nền trong suốt):
//   mèo → public/cards/daudau.png, con khác → public/cards/buddy-<id>.png.
//   npm run cards:daudau            (cả 4 con)
//   npm run cards:daudau -- dog     (chỉ một con)
// Dùng ở các màn 2D (màn chọn trò, kệ đồ chơi, Trốn ở đâu, Đường về nhà).
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from '@playwright/test';
import { statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ALL = ['cat', 'dog', 'bunny', 'bear'];
const wanted = process.argv.slice(2).filter((c) => ALL.includes(c));
const list = wanted.length ? wanted : ALL;
const outOf = (c) => join(ROOT, 'public', 'cards', c === 'cat' ? 'daudau.png' : `buddy-${c}.png`);

const server = await createServer({
  configFile: false,
  root: join(__dirname, 'cards'),
  plugins: [react()],
  server: { port: 0, fs: { allow: [ROOT] } },
  logLevel: 'warn',
});
await server.listen();
const { port } = server.httpServer.address();

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const c of list) {
    const out = outOf(c);
    const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('pageerror:', e.message));
    await page.goto(`http://localhost:${port}/daudau.html?c=${c}`);
    await page.waitForSelector('body[data-done="1"]', { timeout: 60000 });
    await page.locator('canvas').screenshot({ path: out, omitBackground: true });
    console.log(`${c}: ${out} ${(statSync(out).size / 1024).toFixed(1)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
