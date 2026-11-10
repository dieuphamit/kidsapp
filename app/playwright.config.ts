import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}/be-hoc/`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/artifacts',
  timeout: 30_000,
  use: { baseURL, video: 'retain-on-failure', serviceWorkers: 'allow' },
  projects: [
    {
      // Máy công ty chặn WebKit của Playwright (thiếu libwebpmux.dll do chính sách application control),
      // nên giả lập iPad bằng Chromium: cùng viewport, cảm ứng, devicePixelRatio với iPad Pro 11 landscape.
      // Khi có máy chạy được WebKit, bỏ dòng browserName để dùng engine thật của iPad.
      name: 'ipad',
      use: { ...devices['iPad Pro 11 landscape'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
