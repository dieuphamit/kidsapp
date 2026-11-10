# Plan A: nền móng app Bé Học

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng khung PWA offline cho iPad, gồm design system đất sét, khung cảnh 3D có mèo Đậu Đậu, phần lõi (âm thanh vi/ja, cài đặt, hẹn giờ, cổng phụ huynh), registry game, lệnh `npm run verify`, công cụ TTS và deploy lên GitHub Pages. Đây là nền để runner (plan B) giao các game cho agent làm qua đêm.

**Architecture:** Vite + React + TS trong `app/`. Logic thuần (i18n, audio URL, timer, gate, registry) nằm ở `src/core` và test bằng Vitest. Giao diện ở `src/ui`, dùng CSS variable từ `tokens.css`. Mỗi game là một thư mục `src/games/<id>/` có `manifest.ts`, được tìm tự động bằng `import.meta.glob`. Playwright WebKit với khung iPad kiểm tra luật UX và chạy offline.

**Tech Stack:** Vite, React 19, TypeScript, vite-plugin-pwa, three + @react-three/fiber + @react-three/drei, howler, idb-keyval, @fontsource/baloo-2, Vitest + Testing Library + fake-indexeddb, Playwright, edge-tts (Python 3.12 qua uv).

**Spec:** `docs/superpowers/specs/2026-11-10-be-hoc-design.md`

**Quy ước:** mọi lệnh `npm` chạy trong `C:\Dieupham\Projects\be-hoc\app` trừ khi ghi khác. Commit message bằng tiếng Việt, kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Bản đồ file

| File | Trách nhiệm |
|---|---|
| `app/vite.config.ts` | base `/be-hoc/`, PWA, Vitest |
| `app/src/core/tokens.css`, `tokens.ts` | design tokens (màu đất sét, bóng, vùng chạm) |
| `app/src/core/i18n.ts` | kiểu `Lang`, `ContentItem`, kiểm tra content |
| `app/src/core/content.ts` | nạp mọi `src/content/*.json` |
| `app/src/core/audio.ts` | URL mp3 theo key/ngôn ngữ, `createSpeaker` (Howler) |
| `app/src/core/settings.ts` | lưu cài đặt vào IndexedDB |
| `app/src/core/session.ts` | logic hẹn giờ phiên chơi + khóa |
| `app/src/core/parentGate.ts` | logic câu hỏi phụ huynh |
| `app/src/core/games.ts` | kiểu `GameManifest`, registry, lọc theo tuổi |
| `app/src/ui/ClayButton.tsx` (+ `.module.css`) | nút đất sét |
| `app/src/ui/ParentGate.tsx` | vùng giữ 3 giây + câu hỏi |
| `app/src/ui/ParentArea.tsx` | khu cài đặt phụ huynh |
| `app/src/ui/Scene3D.tsx` | Canvas R3F chuẩn (ánh sáng, bóng) |
| `app/src/ui/DauDau.tsx` | mèo Đậu Đậu tạm dựng bằng khối cơ bản, nhảy khi chạm |
| `app/src/ui/Home.tsx`, `SleepScreen.tsx` | màn hình chính tạm (giai đoạn 1 sẽ thay bằng WorldMap), màn hình ngủ |
| `app/src/App.tsx` | ghép các màn hình |
| `app/src/content/ui.json` | câu nói chung (vi/ja) |
| `app/e2e/ux-rules.spec.ts`, `app/playwright.config.ts` | test luật UX, offline, chụp ảnh |
| `app/scripts/check-audio.mjs` | đủ mp3 cho mọi key |
| `tools/tts/generate.py` | sinh mp3 bằng edge-tts |
| `.github/workflows/deploy.yml` | deploy GitHub Pages |
| `CLAUDE.md` | luật cho agent |

---

### Task 1: Dựng khung Vite + Vitest

**Files:** Create `app/` (scaffold), Modify `app/vite.config.ts`, `app/package.json`, Create `app/src/test-setup.ts`, `app/src/core/smoke.test.ts`

- [ ] **Step 1: Scaffold**

```bash
cd /c/Dieupham/Projects/be-hoc
npm create vite@latest app -- --template react-ts
cd app
npm install
npm install three @react-three/fiber @react-three/drei howler idb-keyval @fontsource/baloo-2
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb @types/howler @types/three vite-plugin-pwa @playwright/test
npx playwright install webkit
```

- [ ] **Step 2: Ghi đè `app/vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/be-hoc/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
```

- [ ] **Step 3: Tạo `app/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [ ] **Step 4: Thêm scripts vào `app/package.json`** (giữ các script `dev`, `build`, `preview` sẵn có)

```json
"test": "vitest run",
"e2e": "playwright test",
"check:audio": "node scripts/check-audio.mjs",
"verify": "tsc -b && eslint . && vitest run && npm run check:audio && playwright test"
```

- [ ] **Step 5: Viết test khói `app/src/core/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => { it('runs', () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 6: Chạy** `npm test`. Kỳ vọng: `1 passed`.

- [ ] **Step 7: Xóa demo của Vite**: xóa `app/src/assets/react.svg`, `app/public/vite.svg`, `app/src/App.css`. Đặt nội dung `app/src/index.css` thành rỗng (sẽ điền ở Task 2).

- [ ] **Step 8: Commit**

```bash
cd /c/Dieupham/Projects/be-hoc && git add app && git commit -m "chore: dựng khung Vite React TS + Vitest"
```

---

### Task 2: Design tokens đất sét

**Files:** Create `app/src/core/tokens.css`, `app/src/core/tokens.ts`, `app/src/core/tokens.test.ts`, Modify `app/src/index.css`, `app/src/main.tsx`

- [ ] **Step 1: Test `app/src/core/tokens.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { TOUCH_MIN_PX, TOUCH_GAP_PX, CLAY_COLORS } from './tokens';

describe('tokens', () => {
  it('vùng chạm theo luật UX', () => {
    expect(TOUCH_MIN_PX).toBeGreaterThanOrEqual(120);
    expect(TOUCH_GAP_PX).toBeGreaterThanOrEqual(24);
  });
  it('có đủ 5 màu đất sét', () => {
    expect(CLAY_COLORS).toEqual(['peach', 'mint', 'butter', 'leaf', 'lilac']);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/tokens.test.ts`. Kỳ vọng FAIL `Cannot find module './tokens'`.

- [ ] **Step 3: `app/src/core/tokens.ts`**

```ts
export const TOUCH_MIN_PX = 120;
export const TOUCH_GAP_PX = 24;
export const CLAY_COLORS = ['peach', 'mint', 'butter', 'leaf', 'lilac'] as const;
export type ClayColor = (typeof CLAY_COLORS)[number];
```

- [ ] **Step 4: `app/src/core/tokens.css`**

```css
:root {
  --sky-top: #bfe6ff;
  --sky-bottom: #e9d9ff;
  --grass: #9be38a;
  --clay-peach: #ffb4a2;
  --clay-mint: #a0e7e5;
  --clay-butter: #ffe29a;
  --clay-leaf: #b4f8c8;
  --clay-lilac: #cdb4ff;
  --ink: #3b2a6b;
  --ink-soft: #5b3fa8;
  --paper: #ffffff;
  --radius-clay: 36px;
  --radius-bubble: 16px;
  --shadow-clay: inset -8px -10px 18px rgba(0, 0, 0, 0.18), inset 8px 10px 18px rgba(255, 255, 255, 0.7),
    0 14px 22px rgba(60, 40, 120, 0.25);
  --shadow-clay-pressed: inset -4px -5px 10px rgba(0, 0, 0, 0.2), inset 4px 5px 10px rgba(255, 255, 255, 0.6),
    0 4px 8px rgba(60, 40, 120, 0.25);
  --touch-min: 120px;
  --touch-gap: 24px;
  --ease-squish: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-press: 120ms;
  --font-kid: 'Baloo 2', 'Nunito', system-ui, sans-serif;
}
```

- [ ] **Step 5: `app/src/index.css`**

```css
@import './core/tokens.css';
* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; overflow: hidden; }
body {
  font-family: var(--font-kid);
  color: var(--ink);
  background: linear-gradient(160deg, var(--sky-top), var(--sky-bottom));
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  overscroll-behavior: none;
}
```

- [ ] **Step 6: Thêm font vào đầu `app/src/main.tsx`**: dòng `import '@fontsource/baloo-2/700.css';` đặt trước `import './index.css';`.

- [ ] **Step 7:** `npx vitest run src/core/tokens.test.ts`. Kỳ vọng PASS.

- [ ] **Step 8: Commit** `git add app && git commit -m "feat: design tokens đất sét"`

---

### Task 3: ClayButton

**Files:** Create `app/src/ui/ClayButton.tsx`, `app/src/ui/ClayButton.module.css`, `app/src/ui/ClayButton.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClayButton } from './ClayButton';

describe('ClayButton', () => {
  it('không bao giờ nhỏ hơn 120px dù truyền size nhỏ', () => {
    render(<ClayButton color="peach" label="Con bò" size={50} onPress={() => {}}>🐮</ClayButton>);
    const b = screen.getByRole('button', { name: 'Con bò' });
    expect(b.style.width).toBe('120px');
    expect(b.style.height).toBe('120px');
  });
  it('gọi onPress ngay khi chạm xuống (pointerdown)', () => {
    const onPress = vi.fn();
    render(<ClayButton color="mint" label="Hồ nước" onPress={onPress}>💧</ClayButton>);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hồ nước' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('dùng màu đất sét từ token', () => {
    render(<ClayButton color="butter" label="x" onPress={() => {}}>x</ClayButton>);
    expect(screen.getByRole('button').style.background).toBe('var(--clay-butter)');
  });
});
```

- [ ] **Step 2:** `npx vitest run src/ui/ClayButton.test.tsx`. Kỳ vọng FAIL (không có module).

- [ ] **Step 3: `app/src/ui/ClayButton.module.css`**

```css
.clay {
  border: 0;
  border-radius: var(--radius-clay);
  box-shadow: var(--shadow-clay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font: 700 clamp(28px, 4vw, 56px) / 1 var(--font-kid);
  color: var(--ink);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-press) var(--ease-squish), box-shadow var(--dur-press);
}
.clay:active {
  transform: scale(0.92) translateY(4px);
  box-shadow: var(--shadow-clay-pressed);
}
.caption { font-size: 18px; }
```

- [ ] **Step 4: `app/src/ui/ClayButton.tsx`**

```tsx
import type { ReactNode, CSSProperties } from 'react';
import styles from './ClayButton.module.css';
import { TOUCH_MIN_PX, type ClayColor } from '../core/tokens';

type Props = {
  color: ClayColor;
  label: string;
  onPress(): void;
  children: ReactNode;
  size?: number;
  caption?: string;
  style?: CSSProperties;
};

export function ClayButton({ color, label, onPress, children, size = 160, caption, style }: Props) {
  const px = `${Math.max(size, TOUCH_MIN_PX)}px`;
  return (
    <button
      type="button"
      aria-label={label}
      className={styles.clay}
      style={{ width: px, height: px, background: `var(--clay-${color})`, ...style }}
      onPointerDown={onPress}
    >
      {children}
      {caption && <span className={styles.caption}>{caption}</span>}
    </button>
  );
}
```

- [ ] **Step 5:** Chạy lại test. Kỳ vọng `3 passed`.

- [ ] **Step 6: Commit** `git add app && git commit -m "feat: ClayButton đất sét"`

---

### Task 4: i18n và nạp content

**Files:** Create `app/src/core/i18n.ts`, `app/src/core/content.ts`, `app/src/content/ui.json`, `app/src/core/i18n.test.ts`, `app/src/core/content.test.ts`

- [ ] **Step 1: Test `i18n.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { validateContent, textOf } from './i18n';

describe('validateContent', () => {
  it('nhận mảng hợp lệ', () => {
    const items = validateContent([{ key: 'animal.cow', vi: 'Con bò', ja: 'うし' }], 'x.json');
    expect(textOf(items[0], 'ja')).toBe('うし');
  });
  it('báo lỗi khi thiếu tiếng Nhật', () => {
    expect(() => validateContent([{ key: 'a.b', vi: 'A', ja: '' }], 'x.json')).toThrow(/x.json.*a.b.*ja/);
  });
  it('báo lỗi key sai định dạng', () => {
    expect(() => validateContent([{ key: 'Bad Key', vi: 'A', ja: 'B' }], 'x.json')).toThrow(/key/);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/i18n.test.ts`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/core/i18n.ts`**

```ts
export type Lang = 'vi' | 'ja';
export const LANGS: Lang[] = ['vi', 'ja'];

export interface ContentItem {
  key: string;
  vi: string;
  ja: string;
}

const KEY_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

export function validateContent(raw: unknown, source: string): ContentItem[] {
  if (!Array.isArray(raw)) throw new Error(`${source}: phải là mảng`);
  return raw.map((it, i) => {
    const item = it as Partial<ContentItem>;
    if (!item.key || !KEY_RE.test(item.key)) throw new Error(`${source}[${i}]: key "${item.key}" sai định dạng a.b`);
    for (const lang of LANGS) {
      if (!item[lang] || !String(item[lang]).trim()) throw new Error(`${source}: ${item.key} thiếu ${lang}`);
    }
    return { key: item.key, vi: item.vi!, ja: item.ja! };
  });
}

export function textOf(item: ContentItem, lang: Lang): string {
  return item[lang];
}
```

- [ ] **Step 4:** Chạy lại test. Kỳ vọng `3 passed`.

- [ ] **Step 5: `app/src/content/ui.json`**

```json
[
  { "key": "ui.where", "vi": "Đi đâu chơi nào?", "ja": "どこであそぶ?" },
  { "key": "ui.mascot-name", "vi": "Đậu Đậu", "ja": "ダウダウ" },
  { "key": "ui.hello", "vi": "Chào bạn! Mình là Đậu Đậu!", "ja": "こんにちは!ダウダウだよ!" },
  { "key": "ui.great", "vi": "Giỏi quá!", "ja": "すごいね!" },
  { "key": "ui.sleep", "vi": "Đậu Đậu buồn ngủ rồi. Mai mình chơi tiếp nhé!", "ja": "ダウダウはねむくなっちゃった。またあしたあそぼうね!" }
]
```

- [ ] **Step 6: Test `content.test.ts`** (kiểm tra mọi file content thật, không trùng key)

```ts
import { describe, it, expect } from 'vitest';
import { allContent } from './content';

describe('content', () => {
  it('mọi file content hợp lệ và key không trùng', () => {
    const items = allContent();
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('ui.mascot-name');
  });
});
```

- [ ] **Step 7: `app/src/core/content.ts`**

```ts
import { validateContent, type ContentItem } from './i18n';

const files = import.meta.glob<unknown>('../content/*.json', { eager: true, import: 'default' });

export function allContent(): ContentItem[] {
  return Object.entries(files).flatMap(([path, data]) => validateContent(data, path));
}

export function contentByKey(): Map<string, ContentItem> {
  return new Map(allContent().map((i) => [i.key, i]));
}
```

- [ ] **Step 8:** `npx vitest run src/core`. Kỳ vọng tất cả PASS.

- [ ] **Step 9: Commit** `git add app && git commit -m "feat: i18n vi/ja và nạp content"`

---

### Task 5: Âm thanh

**Files:** Create `app/src/core/audio.ts`, `app/src/core/audio.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { play, stop, Howl } = vi.hoisted(() => {
  const play = vi.fn();
  const stop = vi.fn();
  const Howl = vi.fn(() => ({ play, stop }));
  return { play, stop, Howl };
});
vi.mock('howler', () => ({ Howl }));

import { audioUrl, sfxUrl, createSpeaker } from './audio';

describe('audio', () => {
  beforeEach(() => { Howl.mockClear(); play.mockClear(); stop.mockClear(); });
  it('URL theo ngôn ngữ', () => {
    expect(audioUrl('animal.cow', 'ja', '/be-hoc/')).toBe('/be-hoc/audio/ja/animal.cow.mp3');
    expect(sfxUrl('cow', '/be-hoc/')).toBe('/be-hoc/audio/sfx/cow.mp3');
  });
  it('say() phát đúng file của ngôn ngữ hiện tại, cache Howl', () => {
    let lang: 'vi' | 'ja' = 'vi';
    const sp = createSpeaker(() => lang, '/b/');
    sp.say('ui.great');
    sp.say('ui.great');
    expect(Howl).toHaveBeenCalledTimes(1);
    expect(Howl).toHaveBeenCalledWith({ src: ['/b/audio/vi/ui.great.mp3'] });
    expect(play).toHaveBeenCalledTimes(2);
    lang = 'ja';
    sp.say('ui.great');
    expect(Howl).toHaveBeenLastCalledWith({ src: ['/b/audio/ja/ui.great.mp3'] });
  });
  it('say() dừng câu đang nói trước khi nói câu mới', () => {
    const sp = createSpeaker(() => 'vi', '/b/');
    sp.say('ui.hello');
    sp.say('ui.great');
    expect(stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/audio.test.ts`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/core/audio.ts`**

```ts
import { Howl } from 'howler';
import type { Lang } from './i18n';

const BASE = import.meta.env.BASE_URL;

export function audioUrl(key: string, lang: Lang, base = BASE): string {
  return `${base}audio/${lang}/${key}.mp3`;
}

export function sfxUrl(name: string, base = BASE): string {
  return `${base}audio/sfx/${name}.mp3`;
}

export interface Speaker {
  say(key: string): void;
  sfx(name: string): void;
}

export function createSpeaker(getLang: () => Lang, base = BASE): Speaker {
  const cache = new Map<string, Howl>();
  let current: Howl | null = null;
  const get = (src: string) => {
    let h = cache.get(src);
    if (!h) {
      h = new Howl({ src: [src] });
      cache.set(src, h);
    }
    return h;
  };
  return {
    say(key) {
      current?.stop();
      current = get(audioUrl(key, getLang(), base));
      current.play();
    },
    sfx(name) {
      get(sfxUrl(name, base)).play();
    },
  };
}
```

- [ ] **Step 4:** Chạy lại test. Kỳ vọng `3 passed`.

- [ ] **Step 5: Commit** `git add app && git commit -m "feat: speaker vi/ja bằng Howler"`

---

### Task 6: Lưu cài đặt

**Files:** Create `app/src/core/settings.ts`, `app/src/core/settings.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('settings', () => {
  it('mặc định khi chưa lưu', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ lang: 'vi', ageMonths: 28, sessionMinutes: 15 });
  });
  it('lưu rồi đọc lại', async () => {
    await saveSettings({ lang: 'ja', ageMonths: 30, sessionMinutes: 10 });
    expect(await loadSettings()).toEqual({ lang: 'ja', ageMonths: 30, sessionMinutes: 10 });
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/settings.test.ts`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/core/settings.ts`**

```ts
import { get, set } from 'idb-keyval';
import type { Lang } from './i18n';

export interface Settings {
  lang: Lang;
  ageMonths: number;
  sessionMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'vi', ageMonths: 28, sessionMinutes: 15 };
const KEY = 'behoc.settings';

export async function loadSettings(): Promise<Settings> {
  const saved = await get<Partial<Settings>>(KEY);
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await set(KEY, s);
}
```

- [ ] **Step 4:** Chạy lại test. Kỳ vọng `2 passed`.

- [ ] **Step 5: Commit** `git add app && git commit -m "feat: lưu cài đặt IndexedDB"`

---

### Task 7: Hẹn giờ phiên chơi

Trạng thái khóa lưu trong `localStorage`, nên bé tắt rồi mở lại app vẫn bị khóa cho đến khi phụ huynh mở.

**Files:** Create `app/src/core/session.ts`, `app/src/core/session.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { startSession, isOver, remainingMs, readLocked, writeLocked } from './session';

describe('session', () => {
  beforeEach(() => localStorage.clear());
  it('hết giờ đúng sau N phút', () => {
    const s = startSession(1_000, 15);
    expect(isOver(s, 1_000 + 15 * 60_000 - 1)).toBe(false);
    expect(isOver(s, 1_000 + 15 * 60_000)).toBe(true);
    expect(remainingMs(s, 1_000 + 60_000)).toBe(14 * 60_000);
    expect(remainingMs(s, 99_999_999)).toBe(0);
  });
  it('trạng thái khóa còn sau khi tải lại', () => {
    expect(readLocked()).toBe(false);
    writeLocked(true);
    expect(readLocked()).toBe(true);
    writeLocked(false);
    expect(readLocked()).toBe(false);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/session.test.ts`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/core/session.ts`**

```ts
export interface Session {
  startedAt: number;
  limitMs: number;
}

export function startSession(now: number, minutes: number): Session {
  return { startedAt: now, limitMs: minutes * 60_000 };
}

export function remainingMs(s: Session, now: number): number {
  return Math.max(0, s.startedAt + s.limitMs - now);
}

export function isOver(s: Session, now: number): boolean {
  return remainingMs(s, now) === 0;
}

const LOCK_KEY = 'behoc.locked';

export function readLocked(): boolean {
  try { return localStorage.getItem(LOCK_KEY) === '1'; } catch { return false; }
}

export function writeLocked(locked: boolean): void {
  try {
    if (locked) localStorage.setItem(LOCK_KEY, '1');
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* Safari chế độ riêng tư: bỏ qua, khóa chỉ còn trong phiên hiện tại */
  }
}
```

- [ ] **Step 4:** Chạy lại test. Kỳ vọng `2 passed`.

- [ ] **Step 5: Commit** `git add app && git commit -m "feat: hẹn giờ phiên chơi + khóa"`

---

### Task 8: Logic cổng phụ huynh

**Files:** Create `app/src/core/parentGate.ts`, `app/src/core/parentGate.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { makeQuestion, checkAnswer, HOLD_MS } from './parentGate';

describe('parentGate', () => {
  it('giữ 3 giây', () => expect(HOLD_MS).toBe(3000));
  it('phép cộng 2 chữ số', () => {
    const q = makeQuestion(() => 0.5);
    expect(q.a).toBeGreaterThanOrEqual(10);
    expect(q.a).toBeLessThanOrEqual(49);
    expect(q.answer).toBe(q.a + q.b);
  });
  it('kiểm tra đáp án, bỏ khoảng trắng', () => {
    const q = { a: 12, b: 30, answer: 42 };
    expect(checkAnswer(q, ' 42 ')).toBe(true);
    expect(checkAnswer(q, '41')).toBe(false);
    expect(checkAnswer(q, '')).toBe(false);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/parentGate.test.ts`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/core/parentGate.ts`**

```ts
export const HOLD_MS = 3000;

export interface GateQuestion {
  a: number;
  b: number;
  answer: number;
}

export function makeQuestion(rand: () => number = Math.random): GateQuestion {
  const a = 10 + Math.floor(rand() * 40);
  const b = 10 + Math.floor(rand() * 40);
  return { a, b, answer: a + b };
}

export function checkAnswer(q: GateQuestion, input: string): boolean {
  const t = input.trim();
  return t !== '' && Number(t) === q.answer;
}
```

- [ ] **Step 4:** Chạy lại test. Kỳ vọng `3 passed`.

- [ ] **Step 5: Commit** `git add app && git commit -m "feat: logic cổng phụ huynh"`

---

### Task 9: Registry game

**Files:** Create `app/src/core/games.ts`, `app/src/core/games.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest';
import { gamesForAge, type GameManifest } from './games';

const g = (id: string, minAge: number, maxAge: number) =>
  ({ id, minAge, maxAge, title: { vi: id, ja: id }, place: `place.${id}`, icon: '⭐', color: 'peach', Component: null as never }) as GameManifest;

describe('gamesForAge', () => {
  it('lọc theo tháng tuổi, giữ thứ tự', () => {
    const list = [g('a', 24, 72), g('b', 36, 72), g('c', 18, 30)];
    expect(gamesForAge(list, 28).map((x) => x.id)).toEqual(['a', 'c']);
    expect(gamesForAge(list, 40).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/games.test.ts`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/core/games.ts`**

```ts
import type { ComponentType, LazyExoticComponent } from 'react';
import type { Lang } from './i18n';
import type { ClayColor } from './tokens';
import type { Speaker } from './audio';

export interface GameProps {
  lang: Lang;
  speaker: Speaker;
  onExit(): void;
}

export interface GameManifest {
  id: string;
  title: { vi: string; ja: string };
  place: string; // key content của tên địa điểm, ví dụ "place.farm"
  icon: string;
  color: ClayColor;
  minAge: number; // tháng
  maxAge: number; // tháng
  Component: LazyExoticComponent<ComponentType<GameProps>>;
}

const modules = import.meta.glob<{ manifest: GameManifest }>('../games/*/manifest.ts', { eager: true });

export const ALL_GAMES: GameManifest[] = Object.values(modules)
  .map((m) => m.manifest)
  .sort((a, b) => a.id.localeCompare(b.id));

export function gamesForAge(games: GameManifest[], ageMonths: number): GameManifest[] {
  return games.filter((g) => ageMonths >= g.minAge && ageMonths <= g.maxAge);
}
```

Ghi chú: spec định nghĩa `GameProps` với `say(key)`. Ở đây truyền cả `speaker` (gồm `say` và `sfx`) vì game con vật cần phát tiếng kêu. Thêm `icon` và `color` để màn hình chính vẽ được nút.

- [ ] **Step 4:** Chạy lại test. Kỳ vọng PASS.

- [ ] **Step 5: Commit** `git add app && git commit -m "feat: registry game theo tuổi"`

---

### Task 10: Scene3D và mèo Đậu Đậu tạm

Canvas WebGL không chạy trong jsdom, nên phần này chỉ kiểm tra bằng e2e ở Task 13. Đậu Đậu tạm dựng từ khối cơ bản; giai đoạn 1 sẽ thay bằng model CC0.

**Files:** Create `app/src/ui/Scene3D.tsx`, `app/src/ui/DauDau.tsx`

- [ ] **Step 1: `app/src/ui/Scene3D.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';

export function Scene3D({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.6, 6], fov: 40 }}
        style={{ touchAction: 'manipulation' }}
        gl={{ antialias: true, alpha: true }}
      >
        <hemisphereLight args={['#ffffff', '#88cc77', 1.1]} />
        <directionalLight position={[3, 6, 4]} intensity={1.4} castShadow />
        {children}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} blur={2.5} scale={8} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: `app/src/ui/DauDau.tsx`**

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const FUR = '#f6c27a';
const CREAM = '#fff1dc';
const INK = '#2b2233';

type V3 = [number, number, number];

function Ball({ r, c, p, s = [1, 1, 1] }: { r: number; c: string; p: V3; s?: V3 }) {
  return (
    <mesh position={p} scale={s} castShadow>
      <sphereGeometry args={[r, 32, 24]} />
      <meshStandardMaterial color={c} roughness={0.75} />
    </mesh>
  );
}

function Ear({ x }: { x: number }) {
  return (
    <mesh position={[x, 2.62, 0]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]} castShadow>
      <coneGeometry args={[0.24, 0.5, 24]} />
      <meshStandardMaterial color={FUR} roughness={0.75} />
    </mesh>
  );
}

export function DauDau({ onTap }: { onTap(): void }) {
  const ref = useRef<Group>(null);
  const jump = useRef(0); // 1 → 0 trong 0.6 giây; dùng ref để không render lại mỗi khung hình
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.4;
    if (jump.current > 0) {
      jump.current = Math.max(0, jump.current - dt / 0.6);
      const p = 1 - jump.current;
      g.position.y = Math.sin(p * Math.PI) * 1.0;
      const sq = 1 + Math.sin(p * Math.PI * 2) * 0.06;
      g.scale.set(sq, 1 / sq, sq);
    } else {
      g.position.y = 0;
      g.scale.set(1, 1, 1);
    }
  });
  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation();
        jump.current = 1;
        onTap();
      }}
    >
      <Ball r={0.85} c={FUR} p={[0, 0.9, 0]} s={[1, 1.05, 0.9]} />
      <Ball r={0.5} c={CREAM} p={[0, 0.85, 0.5]} s={[1, 1.1, 0.5]} />
      <Ball r={0.72} c={FUR} p={[0, 2.05, 0]} />
      <Ear x={-0.45} />
      <Ear x={0.45} />
      <Ball r={0.3} c={CREAM} p={[0, 1.88, 0.55]} s={[1.2, 0.8, 0.7]} />
      <Ball r={0.07} c={'#ff8fa3'} p={[0, 1.98, 0.85]} />
      <Ball r={0.11} c={INK} p={[-0.26, 2.2, 0.6]} />
      <Ball r={0.11} c={INK} p={[0.26, 2.2, 0.6]} />
      <Ball r={0.3} c={FUR} p={[-0.45, 0.22, 0.35]} />
      <Ball r={0.3} c={FUR} p={[0.45, 0.22, 0.35]} />
      <mesh position={[0.85, 0.9, -0.3]} rotation={[0.4, 0, -0.8]} castShadow>
        <capsuleGeometry args={[0.12, 0.9, 8, 16]} />
        <meshStandardMaterial color={FUR} roughness={0.75} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 3:** `npx tsc -b`. Kỳ vọng không có lỗi.

- [ ] **Step 4: Commit** `git add app && git commit -m "feat: Scene3D + mèo Đậu Đậu tạm"`

---

### Task 11: ParentGate, ParentArea, SleepScreen, Home, App

**Files:** Create `app/src/ui/ParentGate.tsx`, `app/src/ui/ParentGate.test.tsx`, `app/src/ui/ParentArea.tsx`, `app/src/ui/SleepScreen.tsx`, `app/src/ui/Home.tsx`, `app/src/ui/screens.module.css`; Modify `app/src/App.tsx`

- [ ] **Step 1: Test `ParentGate.test.tsx`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ParentGate } from './ParentGate';

afterEach(() => vi.useRealTimers());

describe('ParentGate', () => {
  it('chạm nhanh không mở; giữ 3 giây rồi trả lời đúng thì mở', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<ParentGate onOpen={onOpen} rand={() => 0} />);
    const zone = screen.getByRole('button', { name: 'Khu phụ huynh' });
    fireEvent.pointerDown(zone);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.pointerUp(zone);
    expect(screen.queryByLabelText('Đáp án')).toBeNull();

    fireEvent.pointerDown(zone);
    act(() => { vi.advanceTimersByTime(3000); });
    const input = screen.getByLabelText('Đáp án');
    expect(screen.getByText('10 + 10 = ?')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/ui/ParentGate.test.tsx`. Kỳ vọng FAIL.

- [ ] **Step 3: `app/src/ui/screens.module.css`**

```css
.full { position: fixed; inset: 0; }
.gateZone {
  position: fixed; top: 0; right: 0; width: 120px; height: 120px;
  background: transparent; border: 0; z-index: 50;
}
.dialog {
  position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center;
  background: rgba(59, 42, 107, 0.45);
}
.card {
  background: var(--paper); border-radius: var(--radius-clay); box-shadow: var(--shadow-clay);
  padding: 32px; display: flex; flex-direction: column; gap: 16px; min-width: 360px; font-size: 28px;
}
.card input, .card select { font: inherit; padding: 8px 12px; border-radius: 12px; border: 2px solid var(--clay-lilac); }
.card button { font: inherit; min-height: 64px; border-radius: 20px; border: 0; background: var(--clay-mint); box-shadow: var(--shadow-clay); }
.homeGrid {
  position: fixed; left: 0; right: 0; bottom: 40px; display: flex; justify-content: center; gap: var(--touch-gap);
}
.bubble {
  position: fixed; top: 32px; left: 50%; transform: translateX(-50%);
  background: var(--paper); color: var(--ink-soft); border-radius: var(--radius-bubble);
  padding: 10px 24px; font-size: 32px; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}
.sleep {
  background: linear-gradient(#2b2f6b, #5b3fa8); color: var(--paper);
  display: flex; align-items: center; justify-content: center; font-size: 96px;
}
```

Ghi chú: các nút trong khu phụ huynh (cao 64px) cố ý nhỏ hơn 120px vì là cho người lớn. Test e2e luật UX chỉ kiểm tra khi khu phụ huynh đang đóng.

- [ ] **Step 4: `app/src/ui/ParentGate.tsx`**

```tsx
import { useRef, useState } from 'react';
import styles from './screens.module.css';
import { HOLD_MS, makeQuestion, checkAnswer, type GateQuestion } from '../core/parentGate';

export function ParentGate({ onOpen, rand = Math.random }: { onOpen(): void; rand?: () => number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [q, setQ] = useState<GateQuestion | null>(null);
  const [value, setValue] = useState('');

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const submit = () => {
    const ok = q !== null && checkAnswer(q, value);
    setQ(null);
    if (ok) onOpen();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Khu phụ huynh"
        className={styles.gateZone}
        onPointerDown={() => {
          cancel();
          timer.current = setTimeout(() => { setQ(makeQuestion(rand)); setValue(''); }, HOLD_MS);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
      />
      {q && (
        <div className={styles.dialog} role="dialog" aria-label="Xác nhận phụ huynh">
          <div className={styles.card}>
            <span>{`${q.a} + ${q.b} = ?`}</span>
            <input aria-label="Đáp án" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
            <button type="button" onClick={submit}>Mở</button>
            <button type="button" onClick={() => setQ(null)}>Đóng</button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 5:** Chạy lại test. Kỳ vọng PASS.

- [ ] **Step 6: `app/src/ui/ParentArea.tsx`**

```tsx
import { useState } from 'react';
import styles from './screens.module.css';
import type { Settings } from '../core/settings';

type Props = { settings: Settings; onSave(s: Settings): void; onUnlock(): void; onClose(): void };

export function ParentArea({ settings, onSave, onUnlock, onClose }: Props) {
  const [s, setS] = useState(settings);
  return (
    <div className={styles.dialog} role="dialog" aria-label="Cài đặt phụ huynh">
      <div className={styles.card}>
        <label>Ngôn ngữ{' '}
          <select aria-label="Ngôn ngữ" value={s.lang} onChange={(e) => setS({ ...s, lang: e.target.value as Settings['lang'] })}>
            <option value="vi">Tiếng Việt</option>
            <option value="ja">日本語</option>
          </select>
        </label>
        <label>Tuổi (tháng){' '}
          <input aria-label="Tuổi (tháng)" type="number" min={18} max={84} value={s.ageMonths}
            onChange={(e) => setS({ ...s, ageMonths: Number(e.target.value) })} />
        </label>
        <label>Phút mỗi phiên{' '}
          <input aria-label="Phút mỗi phiên" type="number" min={5} max={60} value={s.sessionMinutes}
            onChange={(e) => setS({ ...s, sessionMinutes: Number(e.target.value) })} />
        </label>
        <button type="button" onClick={() => { onSave(s); onUnlock(); onClose(); }}>Lưu và cho bé chơi tiếp</button>
        <button type="button" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: `app/src/ui/SleepScreen.tsx`**

```tsx
import { useEffect } from 'react';
import styles from './screens.module.css';
import type { Speaker } from '../core/audio';

export function SleepScreen({ speaker }: { speaker: Speaker }) {
  useEffect(() => { speaker.say('ui.sleep'); }, [speaker]);
  return <div className={`${styles.full} ${styles.sleep}`} data-testid="sleep">😴🐱🌙</div>;
}
```

- [ ] **Step 8: `app/src/ui/Home.tsx`** (màn hình chính tạm; giai đoạn 1 thay bằng WorldMap)

```tsx
import styles from './screens.module.css';
import { Scene3D } from './Scene3D';
import { DauDau } from './DauDau';
import { ClayButton } from './ClayButton';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';
import { contentByKey } from '../core/content';

const content = contentByKey();

type Props = { games: GameManifest[]; lang: Lang; speaker: Speaker; onPick(g: GameManifest): void };

export function Home({ games, lang, speaker, onPick }: Props) {
  return (
    <div className={styles.full} data-testid="home">
      <Scene3D label="Đậu Đậu">
        <DauDau onTap={() => speaker.say('ui.hello')} />
      </Scene3D>
      <div className={styles.bubble}>{content.get('ui.where')?.[lang]}</div>
      <div className={styles.homeGrid}>
        {games.map((g) => (
          <ClayButton key={g.id} color={g.color} label={g.title[lang]} caption={g.title[lang]}
            onPress={() => { speaker.say(g.place); onPick(g); }}>
            {g.icon}
          </ClayButton>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Ghi đè `app/src/App.tsx`**

```tsx
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './core/settings';
import { createSpeaker } from './core/audio';
import { ALL_GAMES, gamesForAge, type GameManifest } from './core/games';
import { startSession, isOver, readLocked, writeLocked } from './core/session';
import { Home } from './ui/Home';
import { SleepScreen } from './ui/SleepScreen';
import { ParentGate } from './ui/ParentGate';
import { ParentArea } from './ui/ParentArea';

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [game, setGame] = useState<GameManifest | null>(null);
  const [parentOpen, setParentOpen] = useState(false);
  const [locked, setLocked] = useState(readLocked);
  const langRef = useRef(settings.lang);
  useEffect(() => { langRef.current = settings.lang; }, [settings.lang]);
  const speaker = useMemo(() => createSpeaker(() => langRef.current), []);
  const [session, setSession] = useState(() => startSession(Date.now(), DEFAULT_SETTINGS.sessionMinutes));

  useEffect(() => {
    loadSettings().then((s) => { setSettings(s); setSession(startSession(Date.now(), s.sessionMinutes)); });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!locked && isOver(session, Date.now())) { writeLocked(true); setLocked(true); setGame(null); }
    }, 1000);
    return () => clearInterval(id);
  }, [session, locked]);

  const games = gamesForAge(ALL_GAMES, settings.ageMonths);

  return (
    <>
      {locked ? (
        <SleepScreen speaker={speaker} />
      ) : game ? (
        <Suspense fallback={null}>
          <game.Component lang={settings.lang} speaker={speaker} onExit={() => setGame(null)} />
        </Suspense>
      ) : (
        <Home games={games} lang={settings.lang} speaker={speaker} onPick={setGame} />
      )}
      <ParentGate onOpen={() => setParentOpen(true)} />
      {parentOpen && (
        <ParentArea
          settings={settings}
          onSave={(s) => { setSettings(s); void saveSettings(s); }}
          onUnlock={() => { writeLocked(false); setLocked(false); setSession(startSession(Date.now(), settings.sessionMinutes)); }}
          onClose={() => setParentOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 10:** `npx tsc -b && npx vitest run`. Kỳ vọng không có lỗi type và mọi test PASS. Sau đó chạy `npm run dev`, mở `http://localhost:5173/be-hoc/` trên trình duyệt: thấy Đậu Đậu xoay qua lại, bấm vào thì nhảy (chưa có tiếng vì chưa có mp3).

- [ ] **Step 11: Commit** `git add app && git commit -m "feat: khung app: home, cổng phụ huynh, màn hình ngủ"`

---

### Task 12: Công cụ TTS và kiểm tra âm thanh

**Files:** Create `tools/tts/generate.py`, `app/scripts/check-audio.mjs`, `app/public/audio/{vi,ja}/*.mp3`

- [ ] **Step 1: `app/scripts/check-audio.mjs`**

```js
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
```

- [ ] **Step 2:** `npm run check:audio`. Kỳ vọng FAIL, báo thiếu 10 file (5 key × 2 ngôn ngữ).

- [ ] **Step 3: `tools/tts/generate.py`** (chỉ sinh lại khi nội dung câu hoặc giọng đọc thay đổi, nhờ file băm `.hashes.json`)

```python
"""Sinh mp3 vi/ja từ app/src/content/*.json bằng edge-tts.

Chạy từ thư mục gốc dự án:
  uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py
"""
import asyncio
import hashlib
import json
import pathlib
import sys

import edge_tts

VOICES = {"vi": "vi-VN-HoaiMyNeural", "ja": "ja-JP-NanamiNeural"}
RATE = "-10%"  # chậm hơn một chút cho bé
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
CONTENT = ROOT / "app" / "src" / "content"
OUT = ROOT / "app" / "public" / "audio"
HASHES = OUT / ".hashes.json"


def digest(text: str, voice: str) -> str:
    return hashlib.sha1(f"{voice}|{RATE}|{text}".encode("utf-8")).hexdigest()


async def main() -> None:
    hashes = json.loads(HASHES.read_text(encoding="utf-8")) if HASHES.exists() else {}
    made = 0
    for f in sorted(CONTENT.glob("*.json")):
        for item in json.loads(f.read_text(encoding="utf-8")):
            for lang, voice in VOICES.items():
                dest = OUT / lang / f"{item['key']}.mp3"
                h = digest(item[lang], voice)
                rel = f"{lang}/{item['key']}"
                if dest.exists() and hashes.get(rel) == h:
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                await edge_tts.Communicate(item[lang], voice, rate=RATE).save(str(dest))
                hashes[rel] = h
                made += 1
                print("made", rel)
    HASHES.parent.mkdir(parents=True, exist_ok=True)
    HASHES.write_text(json.dumps(hashes, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(f"done: {made} file mới")


asyncio.run(main())
```

- [ ] **Step 4: Chạy** (từ `C:\Dieupham\Projects\be-hoc`)

```bash
uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py
```
Kỳ vọng: in ra 10 dòng `made ...`, cuối cùng `done: 10 file mới`. Chạy lại lần nữa: `done: 0 file mới`.

- [ ] **Step 5:** `cd app && npm run check:audio`. Kỳ vọng `check-audio: đủ âm thanh vi/ja`. Mở `app/public/audio/vi/ui.hello.mp3` nghe thử: phải là giọng tiếng Việt rõ ràng.

- [ ] **Step 6: Commit** `git add tools app && git commit -m "feat: sinh giọng đọc vi/ja bằng edge-tts + kiểm tra đủ mp3"`

---

### Task 13: PWA offline + Playwright iPad + luật UX

**Files:** Modify `app/vite.config.ts`, `app/index.html`, `.gitignore`; Create `app/scripts/make-icons.mjs`, `app/public/icon-192.png`, `app/public/icon-512.png`, `app/playwright.config.ts`, `app/e2e/ux-rules.spec.ts`

- [ ] **Step 1: Icon tạm**: tạo `app/scripts/make-icons.mjs`

```js
// Vẽ icon mặt mèo bằng SVG rồi xuất PNG qua Playwright (đã cài), không cần thêm thư viện
import { webkit } from '@playwright/test';
import path from 'node:path';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#bfe6ff"/><polygon points="130,200 170,80 240,170" fill="#f6c27a"/><polygon points="382,200 342,80 272,170" fill="#f6c27a"/><circle cx="256" cy="290" r="170" fill="#f6c27a"/><ellipse cx="256" cy="345" rx="80" ry="55" fill="#fff1dc"/><circle cx="196" cy="270" r="22" fill="#2b2233"/><circle cx="316" cy="270" r="22" fill="#2b2233"/><circle cx="256" cy="320" r="12" fill="#ff8fa3"/></svg>`;
const browser = await webkit.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: path.join(import.meta.dirname, '..', 'public', `icon-${size}.png`) });
}
await browser.close();
```
Chạy `node scripts/make-icons.mjs`. Kỳ vọng có `public/icon-192.png` và `public/icon-512.png`.

- [ ] **Step 2: Thêm PWA vào `app/vite.config.ts`**: thêm `import { VitePWA } from 'vite-plugin-pwa';` và đổi `plugins` thành:

```ts
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3,glb,woff2}'],
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
```
Trong `app/index.html`: thay thẻ `<meta name="viewport" ...>` sẵn có bằng
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Đậu Đậu" />
<link rel="apple-touch-icon" href="/be-hoc/icon-192.png" />
```
xóa dòng `<link rel="icon" ... vite.svg>`, đổi `<title>` thành `Đậu Đậu`, đổi `lang="en"` thành `lang="vi"`.

- [ ] **Step 3: `app/playwright.config.ts`** (cổng lấy từ `E2E_PORT` để runner chạy song song nhiều worktree mà không đụng nhau)

```ts
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}/be-hoc/`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/artifacts',
  timeout: 30_000,
  use: { baseURL, video: 'retain-on-failure', serviceWorkers: 'allow' },
  projects: [{ name: 'ipad-webkit', use: { ...devices['iPad Pro 11 landscape'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
```

Ghi chú: thiết bị `iPad Pro 11 landscape` của Playwright có viewport 1194×834, gần với 1180×820 ghi trong spec. Dùng preset có sẵn để giữ đúng user agent và hành vi chạm.

- [ ] **Step 4: `app/e2e/ux-rules.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test';

async function assertUxRules(page: Page, shot: string) {
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label') ?? e.textContent, w: r.width, h: r.height };
    }),
  );
  for (const b of boxes) {
    expect(b.w, `vùng chạm "${b.name}" rộng`).toBeGreaterThanOrEqual(120);
    expect(b.h, `vùng chạm "${b.name}" cao`).toBeGreaterThanOrEqual(120);
  }
  expect(await page.locator('a[href^="http"]').count(), 'không có link ra ngoài').toBe(0);
  await page.screenshot({ path: `test-results/shots/${shot}.png` });
}

test('màn hình chính đạt luật UX', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();
  await page.waitForTimeout(800);
  await assertUxRules(page, 'home');
});

test('chạy offline sau lần tải đầu', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('home')).toBeVisible();
});

test('đang khóa thì hiện màn hình ngủ', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('behoc.locked', '1'));
  await page.reload();
  await expect(page.getByTestId('sleep')).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/sleep.png' });
});
```

- [ ] **Step 5:** `npx playwright test`. Kỳ vọng `3 passed` và có `test-results/shots/home.png`, `sleep.png`. Mở `home.png` xem: nền trời, Đậu Đậu ở giữa, bong bóng "Đi đâu chơi nào?". Nếu test offline fail trên WebKit vì service worker, đọc log lỗi rồi sửa cấu hình; không được xóa test.

- [ ] **Step 6:** Thêm hai dòng `test-results/` và `playwright-report/` vào `.gitignore` ở thư mục gốc dự án.

- [ ] **Step 7: Commit** `git add -A && git commit -m "feat: PWA offline + e2e luật UX trên iPad WebKit"`

---

### Task 14: Lệnh verify chạy được từ đầu đến cuối

**Files:** Modify `app/eslint.config.js` (nếu cần)

- [ ] **Step 1:** `npm run verify`. Kỳ vọng: tsc, eslint, vitest, check-audio, playwright đều qua, exit code 0.
- [ ] **Step 2:** Nếu eslint báo lỗi trong `test-results/`, `playwright-report/` hoặc `dev-dist/`, thêm các thư mục đó vào `globalIgnores([...])` sẵn có trong `app/eslint.config.js` rồi chạy lại. Chỉ sửa lỗi thật trong `src/`, không tắt rule cho cả dự án.
- [ ] **Step 3: Commit** `git add -A && git commit -m "chore: npm run verify xanh"`

---

### Task 15: Deploy GitHub Pages

**Files:** Create `.github/workflows/deploy.yml`

- [ ] **Step 1: `.github/workflows/deploy.yml`**

```yaml
name: deploy
on:
  push:
    branches: [main]
    paths: ['app/**', '.github/workflows/deploy.yml']
  workflow_dispatch: {}
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: app/package-lock.json
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: app/dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit** `git add .github && git commit -m "ci: deploy GitHub Pages"`

- [ ] **Step 3 (bố mẹ tự làm, vì đây là thao tác đẩy ra ngoài):** tạo repo `be-hoc` trên GitHub. Repo private thì GitHub Pages cần gói trả phí; nếu không có thì để public, vì app không chứa dữ liệu cá nhân. Sau đó:
```bash
git remote add origin https://github.com/<tài-khoản>/be-hoc.git
git push -u origin main
```
Vào Settings → Pages → Source chọn "GitHub Actions". Chờ workflow xanh, mở `https://<tài-khoản>.github.io/be-hoc/` trên iPad bằng Safari, chọn Chia sẻ → Thêm vào MH chính. Bật Guided Access ở Cài đặt → Trợ năng → Truy cập được hướng dẫn.

---

### Task 16: CLAUDE.md cho agent

**Files:** Create `CLAUDE.md` (thư mục gốc dự án)

- [ ] **Step 1: `CLAUDE.md`**

````markdown
# Bé Học: luật cho agent

App PWA học và chơi cho bé 2–5 tuổi trên iPad. Spec: `docs/superpowers/specs/2026-11-10-be-hoc-design.md`. Linh vật: mèo Đậu Đậu (ja: ダウダウ).

## Lệnh
- Trong `app/`: `npm run verify` (tsc + eslint + vitest + check-audio + playwright). Task chỉ được tính là xong khi lệnh này qua.
- Sinh giọng đọc sau khi sửa `app/src/content/*.json` (chạy từ thư mục gốc):
  `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`

## Luật UX trẻ em (không được vi phạm)
1. Vùng chạm ≥120×120px, cách nhau ≥24px. Dùng `ClayButton`, không tự viết nút.
2. Mọi lần chạm đều có phản hồi trong 100ms (`onPointerDown`, âm thanh hoặc chuyển động).
3. Không âm báo sai, không điểm số, không thua.
4. Không cần biết đọc: mọi chỉ dẫn qua `speaker.say(key)`; mọi câu nói phải có trong `src/content/*.json` với cả `vi` và `ja`.
5. Không link ra ngoài, không gọi mạng lúc chạy, không thu thập dữ liệu.
6. Chỉ chạm và kéo đơn giản. Không vuốt nhiều ngón, không chạm đúp.
7. Chỉ dùng màu và bóng từ `src/core/tokens.css`. Scene 3D dùng `Scene3D`; model chỉ lấy từ gói CC0 (Kenney, Quaternius) và ghi nguồn vào `app/public/models/CREDITS.md`.
8. Mỗi scene 3D ≤ ~50k tam giác; nén GLB bằng `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt`.

## Cấu trúc
- Game mới: `app/src/games/<id>/manifest.ts` export `manifest: GameManifest` (xem `src/core/games.ts`), `Game.tsx`, test unit, và `app/e2e/<id>.spec.ts` có chụp ảnh vào `test-results/shots/<id>-*.png`.
- Game không import lẫn nhau; dùng chung chỉ qua `src/core` và `src/ui`.

## Thư viện được phép
react, three, @react-three/fiber, @react-three/drei, howler, idb-keyval, @fontsource/*. Muốn thêm thư viện khác thì ghi vào phần câu hỏi trong report, không tự cài.

## Cấm
Sửa `ops/`, `git push`, xóa/skip/làm yếu test, sửa file ngoài `scope` của task, đổi `base` trong `vite.config.ts`.
````

- [ ] **Step 2: Commit** `git add CLAUDE.md && git commit -m "docs: CLAUDE.md luật cho agent"`

---

## Hoàn tất plan A khi
- `npm run verify` xanh trên `main`.
- Có ảnh `test-results/shots/home.png` đúng hướng đất sét + 3D.
- (Sau Task 15 Step 3) App mở được trên iPad thật, chạy offline, cài lên màn hình chính được.
