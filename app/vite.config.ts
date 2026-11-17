/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/kidsapp/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3,glb,woff2}'],
        // Giọng đọc của tên bạn đồng hành khác tên mặc định (<key>~<nameId>.mp3, ~22MB cho 7 tên)
        // không precache: app nạp sẵn bộ của tên đang chọn vào cache 'buddy-audio' (src/core/buddyAudio.ts)
        // và service worker phục vụ CacheFirst từ đó, nên tên đang chọn vẫn chạy offline.
        globIgnores: ['**/audio/*/*~*.mp3'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/audio\/[a-z]+\/[^/]+~[a-z0-9]+\.mp3$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'buddy-audio' },
          },
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      manifest: {
        name: 'Bé Học cùng Đậu Đậu',
        short_name: 'Đậu Đậu',
        lang: 'vi',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#bfe6ff',
        theme_color: '#bfe6ff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
