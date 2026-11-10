// Vẽ icon mặt mèo bằng SVG rồi xuất PNG qua Playwright (đã cài), không cần thêm thư viện
import { chromium } from '@playwright/test';
import path from 'node:path';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#bfe6ff"/><polygon points="130,200 170,80 240,170" fill="#f6c27a"/><polygon points="382,200 342,80 272,170" fill="#f6c27a"/><circle cx="256" cy="290" r="170" fill="#f6c27a"/><ellipse cx="256" cy="345" rx="80" ry="55" fill="#fff1dc"/><circle cx="196" cy="270" r="22" fill="#2b2233"/><circle cx="316" cy="270" r="22" fill="#2b2233"/><circle cx="256" cy="320" r="12" fill="#ff8fa3"/></svg>`;
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: path.join(import.meta.dirname, '..', 'public', `icon-${size}.png`) });
}
await browser.close();
