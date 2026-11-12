// Render ảnh Đậu Đậu 2D từ chính component src/ui/DauDau.tsx → public/cards/daudau.png (512×512, nền trong suốt).
//   npm run cards:daudau
// Dùng ở các màn 2D (màn chọn trò, kệ đồ chơi, Trốn ở đâu, Đường về nhà).
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from '@playwright/test';
import { statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'cards', 'daudau.png');

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
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(`http://localhost:${port}/daudau.html`);
  await page.waitForSelector('body[data-done="1"]', { timeout: 60000 });
  await page.locator('canvas').screenshot({ path: OUT, omitBackground: true });
  console.log(`daudau.png: ${(statSync(OUT).size / 1024).toFixed(1)} KB`);
} finally {
  await browser.close();
  await server.close();
}
