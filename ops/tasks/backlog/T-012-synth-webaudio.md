---
id: T-012
title: "Âm thanh đàn và trống bằng WebAudio"
type: logic
depends_on: []
scope:
  - app/src/core/synth.ts
  - app/src/core/synth.test.ts
acceptance:
  - npm run verify
  - "synth.test.ts kiểm tra 8 tần số đô–đô, 4 loại trống, và tái dùng Howler.ctx thay vì tạo AudioContext thứ hai"
---
## Mục tiêu
Đàn 8 phím và 4 trống trong Nhà âm nhạc (T-015) phát tiếng ngay khi bé chạm, không cần file âm thanh: tiếng đàn tròn ấm như mộc cầm đồ chơi, tiếng trống vui, âm lượng vừa phải cho tai bé.

## Chi tiết
- `app/src/core/synth.ts` export:
  - `NOTE_FREQS`: 8 tần số đô trưởng C4–C5: `[261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]`.
  - `type DrumKind = 'boom' | 'tap' | 'shaker' | 'bell'` và `DRUM_KINDS` (trống cái, trống con, lắc, chuông).
  - `createSynth(getCtx: () => AudioContext | null, getDest?: (ctx) => AudioNode)` trả `{ playNote(i: number): void; playDrum(kind: DrumKind): void }`. Mặc định export `synth = createSynth(defaultCtx, defaultDest)`.
  - `playNote(i)`: `i` ngoài 0..7 thì bỏ qua (không ném). Oscillator `triangle` + một oscillator `sine` gấp đôi tần số nhỏ hơn (âm sắc mộc cầm), gain envelope: attack 5ms tới 0.35, giảm `exponentialRampToValueAtTime` về 0.001 sau 0.9s, rồi `stop` và `disconnect` khi `onended`.
  - `playDrum`: `boom` = sine 140Hz trượt xuống 50Hz trong 0.25s; `tap` = noise buffer ngắn qua `BiquadFilter` bandpass ~1800Hz, 0.15s; `shaker` = noise qua highpass ~6000Hz, 0.12s; `bell` = sine 880Hz + 1320Hz, decay 1.2s. Đỉnh gain mọi loại ≤ 0.4. Noise buffer tạo một lần rồi dùng lại.
  - Giới hạn tối đa 12 âm cùng lúc (quá thì bỏ âm cũ nhất) để không rè khi bé đập liên tục.
- **AudioContext dùng chung với Howler, không tạo cái thứ hai:**
  - `defaultCtx()`: nếu `Howler.ctx` chưa có thì gọi `Howler.volume()` (getter; trong howler 2.2 hàm này gọi `setupAudioContext()` khi `ctx` chưa có — đã kiểm trong `node_modules/howler/dist/howler.js`), rồi trả `Howler.ctx ?? null`. Không bao giờ `new AudioContext()` trong file này.
  - `defaultDest(ctx)`: `Howler.masterGain ?? ctx.destination` để tắt tiếng/âm lượng chung của Howler cũng áp dụng cho đàn.
  - Luồng mở khóa iOS đã có: `unlockAudioOnFirstGesture()` trong `src/core/audio.ts` (nối sẵn trong App) resume `Howler.ctx` ở touchend/click đầu tiên. Không viết lại luồng đó. Chỉ thêm: nếu `ctx.state === 'suspended'` lúc `playNote/playDrum` (đang trong handler chạm) thì `void ctx.resume()` rồi vẫn lên lịch phát.
  - `getCtx()` trả `null` (môi trường không có Web Audio) → hai hàm im lặng, không ném.

## Kiểm thử
`app/src/core/synth.test.ts` (jsdom không có AudioContext; dùng ctx giả):
- Ctx giả ghi lại `createOscillator()` (với `frequency.setValueAtTime/value`, `start`, `stop`, `connect`), `createGain()`, `createBiquadFilter()`, `createBuffer()`, `currentTime`, `state`, `resume`.
- `playNote(0)` dùng 261.63Hz, `playNote(7)` dùng 523.25Hz; `playNote(8)` và `playNote(-1)` không tạo node nào.
- Mỗi `DrumKind` tạo ít nhất một node và gọi `start`; đỉnh gain đặt ≤ 0.4.
- Ctx `state: 'suspended'` → `resume` được gọi.
- `getCtx` trả `null` → không ném.
- Tái dùng Howler: `vi.mock('howler', ...)` với `Howler = { ctx: fakeCtx, masterGain: fakeGain, volume: vi.fn() }`, stub `globalThis.AudioContext = vi.fn()`; gọi `synth.playNote(0)` → oscillator được tạo trên `fakeCtx`, nối vào `fakeGain`, và `AudioContext` **không** được gọi. Trường hợp `Howler.ctx` ban đầu `undefined`: `Howler.volume` được gọi.

## Không làm
- Không tạo file mp3, không sửa `audio.ts` hay `App.tsx`, không làm UI đàn/trống (T-015).
- Không thêm thư viện âm thanh (Tone.js…).

## Tham khảo
- Spec mục 6 (Vẽ và âm nhạc: đàn 8 phím, 4 trống); CLAUDE.md luật 4 (mở khóa âm thanh iOS).
