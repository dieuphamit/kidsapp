# Bé Học: thiết kế hệ thống

**Ngày:** 10/11/2026 · **Trạng thái:** đã duyệt từng phần, đã duyệt bản viết
**Người dùng cuối:** một bé 2 tuổi 4 tháng, dùng tiếp đến 5 tuổi · **Thiết bị:** iPad để ngang

## 1. Mục tiêu

- App học và chơi cho bé, cài lên iPad, chạy offline, không quảng cáo, không có link ra ngoài.
- **Giao diện là ưu tiên số một:** đẹp, cuốn hút, hợp với trẻ chưa biết đọc.
- Hai ngôn ngữ **tiếng Việt và tiếng Nhật**, có nút chuyển trong khu phụ huynh.
- Lớn dần theo tuổi bé: thêm game mới mà không phải sửa phần lõi.
- Xây chủ yếu bằng agent chạy batch qua đêm trên máy Windows; ban ngày bố mẹ duyệt khoảng 15 phút.

**Không làm (YAGNI):** tài khoản người dùng, backend, đồng bộ giữa nhiều máy, phát hành App Store, quảng cáo, mua trong app, nhiều hồ sơ bé.

## 2. Nền tảng và công nghệ

| Hạng mục | Lựa chọn |
|---|---|
| Dạng app | PWA offline, cài từ Safari bằng "Thêm vào màn hình chính", khóa bằng Guided Access |
| Khung | Vite + React + TypeScript, `vite-plugin-pwa` (Workbox precache toàn bộ asset) |
| 3D | three.js qua React Three Fiber + drei, model glTF/GLB nén Draco/meshopt |
| Âm thanh | Howler.js, file mp3 sinh trước |
| Giọng đọc | edge-tts (giọng neural vi-VN và ja-JP), sinh lúc build bằng `tools/tts`. Chạy bằng `uv` trỏ `--python` tới Python312 có sẵn |
| Lưu trữ | IndexedDB (cài đặt, tiến độ), chỉ lưu trên máy |
| Test | Vitest (unit), Playwright WebKit với khung iPad 1180×820 (e2e + ảnh chụp màn hình) |
| Hosting | GitHub Pages (có HTTPS, đủ để cài PWA), deploy bằng GitHub Actions khi `main` có thay đổi. Vite đặt `base` theo tên repo. Bố mẹ tự push; agent không được push |

## 3. Hướng hình ảnh (đã chốt qua mockup)

- **Menu và nút bấm: đất sét 2.5D bằng CSS.** Khối phồng, bóng đổ mềm, bấm vào lún xuống (scale 0.92 + đổi bóng). Màu pastel tươi, nền gradient trời.
- **Khoảnh khắc "wow": 3D thật.** Con vật 3D trong game Con vật, hình khối 3D trong game Màu và hình, linh vật 3D trên màn hình chính.
- **Model 3D:** chỉ dùng gói CC0 (Kenney, Quaternius). Mỗi model ghi nguồn vào `app/public/models/CREDITS.md`.
- **Màn hình chính kiểu "Thế giới nhỏ":** bản đồ có 4 địa điểm, gồm Trang trại (con vật), Hồ nước (màu và hình), Vườn quả (đếm số), Nhà nhạc (vẽ và âm nhạc). Đậu Đậu đứng giữa, nói "Đi đâu chơi?" và chạy tới nơi bé chạm. Khi bé lớn thì thêm "đảo" mới.
- **Linh vật: mèo Đậu Đậu 🐱.** Tiếng Việt gọi "Đậu Đậu"; tiếng Nhật gọi theo âm đọc là "ダウダウ", để bé nghe ra cùng một tên ở cả hai ngôn ngữ. Model mèo 3D CC0, màu kem cam, mắt to. Đậu Đậu dẫn đường, khen bé, và đi ngủ khi hết giờ chơi.
- Mockup tham khảo nằm trong `.superpowers/brainstorm/` (visual-style, home-layout).
- Bước đầu của giai đoạn 0 là tạo **design tokens** (màu, bo góc, bóng, khoảng cách, chuyển động) và bộ component `ClayButton`, `ClayCard`, `Scene3D`, `Mascot`. Mọi game chỉ được dùng các token và component này.

## 4. Luật UX trẻ em (bắt buộc, có test kiểm tra)

1. Vùng chạm tối thiểu 120×120 CSS px; giữa các vùng chạm cách nhau tối thiểu 24px.
2. Mọi lần chạm đều có phản hồi trong vòng 100ms (âm thanh, chuyển động, hoặc cả hai).
3. Không có âm báo sai, không có điểm số, không có thua. Nếu bé chạm sai thì gợi ý nhẹ.
4. Không cần biết đọc. Chữ chỉ để trang trí; mọi chỉ dẫn đều bằng giọng nói.
5. Không có link ra ngoài, không cần mạng sau lần tải đầu, không thu thập dữ liệu.
6. Hẹn giờ phiên chơi mặc định 15 phút (chỉnh được trong khu phụ huynh). Hết giờ, Đậu Đậu đi ngủ và app khóa phần chơi đến khi phụ huynh mở.
7. Cổng phụ huynh: giữ góc trên bên phải 3 giây, rồi trả lời một phép tính có hai chữ số.
8. Chỉ dùng thao tác chạm và kéo đơn giản. Không vuốt nhiều ngón, không chạm đúp, không cần chạm đúng thời điểm.
9. Hiệu năng: 60fps trên iPad đời 2020 trở lên; mỗi scene 3D tối đa khoảng 50k tam giác; tổng bundle offline dưới 60MB.

## 5. Kiến trúc app

```
app/src/
├─ core/        audio (Howler + bảng tra key→file theo ngôn ngữ), i18n (vi/ja),
│               session-timer, parent-gate, storage (IndexedDB), design-tokens
├─ ui/          ClayButton, ClayCard, Scene3D, Mascot, WorldMap
├─ games/<id>/  manifest.ts + Game.tsx + *.test.ts(x) + e2e spec
├─ content/     animals.json, colors.json, shapes.json, numbers.json
└─ app.tsx      router: WorldMap → Game → (SleepScreen | ParentArea)
```

**Hợp đồng của một game** (`games/<id>/manifest.ts`):
```ts
export interface GameManifest {
  id: string;                         // "animals"
  title: { vi: string; ja: string };
  place: string;                      // địa điểm trên WorldMap
  minAge: number; maxAge: number;     // tháng tuổi, ví dụ 24..72
  Component: React.LazyExoticComponent<React.FC<GameProps>>;
}
export interface GameProps { lang: 'vi' | 'ja'; onExit(): void; say(key: string): void; }
```
WorldMap đọc danh sách game, lọc theo tuổi bé (cài trong khu phụ huynh). Mỗi game là một module tải lazy, không import lẫn nhau.

**Nội dung và âm thanh:** mỗi mục nội dung có `key` và text `vi`/`ja`. Ví dụ `{ "key": "animal.cow", "vi": "Con bò", "ja": "うし" }`. Từ đó `tools/tts` sinh `public/audio/vi/animal.cow.mp3` và `public/audio/ja/animal.cow.mp3`. Tiếng kêu của con vật là file SFX riêng (nguồn CC0). Có test kiểm tra mọi key trong content đều có đủ mp3 cho cả hai ngôn ngữ.

## 6. Nội dung MVP (4 game)

| Game | Địa điểm | Cách chơi | 3D |
|---|---|---|---|
| Con vật và tiếng kêu | Trang trại | 6–8 con vật; chạm vào thì con vật nhảy lên, nghe tên (vi/ja) và tiếng kêu | Có (model CC0) |
| Màu và hình | Hồ nước | Chạm vào khối để nghe màu và tên hình; kéo khối vào ô có bóng cùng hình | Có (khối 3D) |
| Đếm 1–10 | Vườn quả | Chạm từng quả, nghe đếm "một, hai…"; quả rơi vào giỏ | Không (2.5D) |
| Vẽ và âm nhạc | Nhà nhạc | Vẽ bằng ngón tay với 6 màu, nút xóa to; đàn 8 phím và 4 trống | Không (2.5D) |

## 7. Cấu trúc dự án và hệ thống agent

```
be-hoc/
├─ CLAUDE.md            luật cho agent (tóm tắt mục 3–4 và 7), lệnh verify
├─ app/  tools/tts/  docs/specs  docs/plans
└─ ops/
   ├─ tasks/{backlog,todo,doing,review,done,failed}/T-NNN-<slug>.md
   ├─ runner/night-run.ps1, prompts/{worker,asset,reviewer}.md
   ├─ reports/YYYY-MM-DD.html (+ shots/)
   └─ logs/
```

**File task** (frontmatter YAML): `id`, `title`, `type` (ui|logic|asset|tts|test), `depends_on`, `scope` (glob các file được phép sửa), `acceptance` (danh sách điều kiện), `attempts`. Mỗi task dài khoảng 30–60 phút làm việc của agent.

**Runner** (`night-run.ps1`, Task Scheduler bật lúc 23:00, dừng lúc 6:30):
1. Lấy các task trong `todo/` đã có đủ `depends_on` trong `done/`.
2. Chạy tối đa 3 task song song. Mỗi task có worktree riêng `wt/T-NNN` (nhánh `task/T-NNN`) và một lệnh `claude -p` với prompt theo vai cộng nội dung task. Dùng `--permission-mode acceptEdits`, có allowlist công cụ, có `--max-turns`.
3. Sau khi agent xong, runner tự chạy `npm run verify` trong worktree. Agent không được tự tuyên bố là đã đạt.
4. Kiểm tra `git diff` chỉ chạm các file nằm trong `scope`. Nếu vượt scope thì coi như fail.
5. Pass và không phải ui: rebase rồi merge vào `main` (mỗi lần một task), chạy lại verify trên main, thành công thì chuyển vào `done/`. Pass và là ui: chuyển vào `review/` kèm ảnh và video Playwright. Fail: thử lại 1 lần có kèm log lỗi, lần 2 vẫn fail thì chuyển vào `failed/`.
6. Chạm giới hạn quota: ngủ đến lúc quota làm mới rồi chạy tiếp, không tính là fail.
7. Cuối đêm, agent reviewer đọc diff và log rồi viết `reports/YYYY-MM-DD.html`: tổng kết, thư viện ảnh để duyệt task UI, task failed kèm lý do, câu hỏi cho bố mẹ.

**Agent bị cấm:** sửa `ops/`, `git push`, xóa hoặc skip test, thêm thư viện ngoài danh sách đã duyệt trong CLAUDE.md, gọi mạng trừ npm, edge-tts và tải asset CC0.

**Duyệt ban ngày:** đọc report, duyệt hoặc yêu cầu sửa các task trong `review/` (yêu cầu sửa sẽ thành task mới), chuyển task từ backlog sang todo.

## 8. Giai đoạn

- **Giai đoạn 0 (làm trực tiếp, không qua runner):** git, khung Vite/PWA, design tokens và component đất sét, Scene3D, core (audio, i18n, timer, gate, storage), lệnh verify, thư mục ops, runner và prompt, chạy thử runner với 1 task mẫu.
- **Giai đoạn 1 (runner chạy đêm):** WorldMap, linh vật, 4 game MVP, TTS vi/ja, asset CC0.
- **Giai đoạn 2:** deploy lên GitHub Pages, cài lên iPad, bé chơi thử, điều chỉnh theo phản ứng thực tế của bé.
- **Sau này (3–5 tuổi):** thêm đảo mới (chữ cái, ghép hình, phân loại, kể chuyện), mỗi game là một module.

## 9. Rủi ro

- **Duyệt UI là nút cổ chai:** chỉ người mới đánh giá được "đẹp". Task UI luôn phải qua `review/`.
- **Kéo thả 3D trên Safari:** cần test trên iPad thật ở giai đoạn 2. Playwright WebKit không giống hoàn toàn.
- **Quota Claude:** số task mỗi đêm phụ thuộc gói đang dùng. Report ghi mức quota đã dùng để điều chỉnh số task mỗi đêm.
- **Máy ngủ hoặc Windows Update khởi động lại:** đặt power plan không ngủ, Task Scheduler bật "wake to run", runner tiếp tục được từ trạng thái của thư mục.
- **edge-tts là dịch vụ không chính thức:** sinh mp3 một lần rồi commit vào repo; nếu dịch vụ hỏng thì thay bằng giọng bố mẹ thu.
