# Plan B: runner chạy batch qua đêm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hệ thống chạy task không người trông trên máy Windows từ 23:00 đến 6:30. Runner lấy task Markdown từ `ops/tasks/todo`, chạy tối đa 3 agent `claude -p` song song, mỗi agent trong một git worktree riêng. Task chỉ được tính là xong khi qua `npm run verify` và không sửa ngoài scope. Task UI vào cột chờ bố mẹ duyệt. Sáng ra có report HTML kèm ảnh chụp.

**Architecture:** Node ESM thuần trong `ops/runner/` (không cần build), test bằng `node --test`. Mỗi file `lib/*.mjs` lo một việc (task, scope, git, agent, report, pipeline). `night-run.mjs` chỉ là vòng lặp điều phối. `task.mjs` là CLI cho bố mẹ (list/new/promote/approve/reject/retry). Task Scheduler gọi `night-run.ps1`.

**Tech Stack:** Node 24 (ESM, `node:test`, `node:util.parseArgs`), `yaml`, `picomatch`, git worktree, Claude Code CLI 2.1 (`-p --output-format json --permission-mode dontAsk --settings`), PowerShell + Task Scheduler.

**Spec:** `docs/superpowers/specs/2026-11-10-be-hoc-design.md` mục 7. **Phụ thuộc:** plan A xong (có `app/`, `npm run verify`, `CLAUDE.md`).

**Khác spec một chút:** spec ghi runner là `night-run.ps1`. Ở đây phần logic viết bằng Node để test được; `night-run.ps1` chỉ là lớp mỏng cho Task Scheduler gọi.

**Quy ước:** lệnh `npm test` chạy trong `C:\Dieupham\Projects\be-hoc\ops\runner`; lệnh `node ops/runner/...` và `git` chạy ở thư mục gốc dự án. Commit tiếng Việt, kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Bản đồ file

| File | Trách nhiệm |
|---|---|
| `ops/runner/package.json` | deps `yaml`, `picomatch`; `npm test` = `node --test` |
| `ops/runner/lib/tasks.mjs` | đọc/ghi/chuyển file task, chọn task đủ điều kiện |
| `ops/runner/lib/scope.mjs` | kiểm tra file sửa có nằm trong scope |
| `ops/runner/lib/time.mjs` | hạn chót, ngày local, ngủ chờ quota |
| `ops/runner/lib/lock.mjs` | khóa tuần tự cho bước merge |
| `ops/runner/lib/sh.mjs` | chạy tiến trình con (timeout, log, stdin) |
| `ops/runner/lib/git.mjs` | worktree, commit, rebase, merge ff |
| `ops/runner/lib/agent.mjs` | dựng prompt, gọi `claude -p`, nhận diện giới hạn quota |
| `ops/runner/lib/report.mjs` | dựng report HTML |
| `ops/runner/lib/pipeline.mjs` | vòng đời một task: agent → scope → verify → review/done/failed |
| `ops/runner/night-run.mjs` | điều phối cả đêm |
| `ops/runner/task.mjs` | CLI cho bố mẹ |
| `ops/runner/agent-settings.json`, `reviewer-settings.json` | quyền của agent |
| `ops/runner/prompts/{worker,asset,reviewer}.md` | prompt theo vai |
| `ops/runner/night-run.ps1`, `register-task.ps1` | Task Scheduler |
| `ops/tasks/_template.md` | mẫu task |

---

### Task 1: Khung `ops/` và module task

**Files:** Create `ops/runner/package.json`, `ops/runner/lib/tasks.mjs`, `ops/runner/test/tasks.test.mjs`, `ops/tasks/{backlog,todo,doing,review,done,failed}/.gitkeep`; Modify `.gitignore`

- [ ] **Step 1: Thư mục và package** (từ thư mục gốc)

```bash
mkdir -p ops/runner/lib ops/runner/test ops/runner/prompts ops/reports ops/logs
for s in backlog todo doing review done failed; do mkdir -p ops/tasks/$s && touch ops/tasks/$s/.gitkeep; done
printf 'ops/logs/\nops/reports/shots/\nops/runner/node_modules/\nassets-src/\n' >> .gitignore
```

`ops/runner/package.json`:
```json
{
  "name": "behoc-runner",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test test/" },
  "dependencies": { "picomatch": "^4.0.2", "yaml": "^2.6.0" }
}
```
Chạy `cd ops/runner && npm install`.

- [ ] **Step 2: Test `ops/runner/test/tasks.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseTask, serializeTask, loadAll, eligible, moveTask } from '../lib/tasks.mjs';

const SAMPLE = `---
id: T-008
title: Bò 3D nhảy
type: ui
depends_on: [T-003]
scope: ["app/src/games/animals/**"]
acceptance:
  - npm run verify
---
Mô tả task.
`;

test('parseTask đọc frontmatter, có giá trị mặc định', () => {
  const t = parseTask(SAMPLE.replace(/\n/g, '\r\n'), 'x.md');
  assert.equal(t.id, 'T-008');
  assert.deepEqual(t.depends_on, ['T-003']);
  assert.equal(t.attempts, 0);
  assert.match(t.body, /Mô tả task/);
});

test('parseTask báo lỗi khi thiếu trường bắt buộc', () => {
  assert.throws(() => parseTask('---\nid: T-1\n---\nx', 'bad.md'), /bad.md: thiếu title/);
});

test('serialize rồi parse lại giữ nguyên dữ liệu', () => {
  const t = parseTask(SAMPLE, 'x.md');
  const back = parseTask(serializeTask({ ...t, attempts: 2 }), 'x.md');
  assert.equal(back.attempts, 2);
  assert.equal(back.title, 'Bò 3D nhảy');
  assert.equal(back.body, t.body);
});

test('eligible chỉ lấy todo đã đủ phụ thuộc trong done, theo thứ tự id', () => {
  const mk = (id, state, deps = []) => ({ id, state, depends_on: deps });
  const list = [mk('T-003', 'review'), mk('T-002', 'done'), mk('T-009', 'todo', ['T-002']), mk('T-008', 'todo', ['T-003']), mk('T-004', 'todo')];
  assert.deepEqual(eligible(list).map((t) => t.id), ['T-004', 'T-009']);
});

test('moveTask chuyển file sang thư mục trạng thái mới', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-'));
  fs.mkdirSync(path.join(dir, 'todo'));
  fs.writeFileSync(path.join(dir, 'todo', 'T-008-bo.md'), SAMPLE);
  const [t] = loadAll(dir);
  assert.equal(t.state, 'todo');
  const moved = moveTask(dir, { ...t, attempts: 1 }, 'failed');
  assert.equal(moved.state, 'failed');
  assert.ok(!fs.existsSync(path.join(dir, 'todo', 'T-008-bo.md')));
  assert.equal(loadAll(dir)[0].attempts, 1);
});
```

- [ ] **Step 3:** `npm test`. Kỳ vọng FAIL (không có `lib/tasks.mjs`).

- [ ] **Step 4: `ops/runner/lib/tasks.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const STATES = ['backlog', 'todo', 'doing', 'review', 'done', 'failed'];
const REQUIRED = ['id', 'title', 'type', 'scope', 'acceptance'];
const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseTask(text, file) {
  const m = text.match(FM);
  if (!m) throw new Error(`${file}: thiếu frontmatter ---`);
  const meta = YAML.parse(m[1]) ?? {};
  for (const k of REQUIRED) if (meta[k] == null) throw new Error(`${file}: thiếu ${k}`);
  return { ...meta, depends_on: meta.depends_on ?? [], attempts: meta.attempts ?? 0, body: m[2].replace(/\r\n/g, '\n'), file };
}

export function serializeTask(task) {
  const { body, file, state, ...meta } = task;
  return `---\n${YAML.stringify(meta)}---\n${body}`;
}

export function loadAll(tasksDir) {
  const out = [];
  for (const state of STATES) {
    const dir = path.join(tasksDir, state);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const file = path.join(dir, f);
      out.push({ ...parseTask(fs.readFileSync(file, 'utf8'), file), state });
    }
  }
  return out;
}

export function eligible(tasks) {
  const done = new Set(tasks.filter((t) => t.state === 'done').map((t) => t.id));
  return tasks
    .filter((t) => t.state === 'todo' && t.depends_on.every((d) => done.has(d)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function moveTask(tasksDir, task, to) {
  const dest = path.join(tasksDir, to, path.basename(task.file));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, serializeTask(task));
  if (path.resolve(dest) !== path.resolve(task.file) && fs.existsSync(task.file)) fs.rmSync(task.file);
  return { ...task, state: to, file: dest };
}
```

- [ ] **Step 5:** `npm test`. Kỳ vọng `5 pass`.
- [ ] **Step 6: Commit** `git add .gitignore ops && git commit -m "feat(ops): module task Markdown"`

---

### Task 2: Kiểm tra scope

**Files:** Create `ops/runner/lib/scope.mjs`, `ops/runner/test/scope.test.mjs`

- [ ] **Step 1: Test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outOfScope } from '../lib/scope.mjs';

test('trả về các file nằm ngoài scope', () => {
  const scope = ['app/src/games/animals/**', 'app/e2e/animals.spec.ts'];
  const files = ['app/src/games/animals/Game.tsx', 'app/e2e/animals.spec.ts', 'app/src/core/audio.ts', 'ops/runner/x.mjs'];
  assert.deepEqual(outOfScope(files, scope), ['app/src/core/audio.ts', 'ops/runner/x.mjs']);
});

test('ops/, CLAUDE.md, .github/ luôn bị cấm, kể cả khi scope cho phép', () => {
  assert.deepEqual(outOfScope(['ops/tasks/a.md', 'CLAUDE.md', '.github/x.yml'], ['**']), ['ops/tasks/a.md', 'CLAUDE.md', '.github/x.yml']);
});
```

- [ ] **Step 2:** `npm test`. Kỳ vọng FAIL.

- [ ] **Step 3: `ops/runner/lib/scope.mjs`**

```js
import picomatch from 'picomatch';

const ALWAYS_FORBIDDEN = picomatch(['ops/**', 'CLAUDE.md', '.github/**'], { dot: true });

export function outOfScope(files, scope) {
  const allowed = picomatch(scope, { dot: true });
  return files.filter((f) => ALWAYS_FORBIDDEN(f) || !allowed(f));
}
```

- [ ] **Step 4:** `npm test`. Kỳ vọng tất cả pass.
- [ ] **Step 5: Commit** `git add ops && git commit -m "feat(ops): kiểm tra scope"`

---

### Task 3: Thời gian và khóa merge

**Files:** Create `ops/runner/lib/time.mjs`, `ops/runner/lib/lock.mjs`, `ops/runner/test/time-lock.test.mjs`

- [ ] **Step 1: Test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlineFrom, localDate, sleepUntil } from '../lib/time.mjs';
import { createLock } from '../lib/lock.mjs';

test('deadline 06:30 lúc 23:00 là sáng hôm sau', () => {
  const d = deadlineFrom(new Date(2026, 10, 11, 23, 0), '06:30');
  assert.equal(d.getDate(), 12);
  assert.equal(d.getHours(), 6);
  assert.equal(d.getMinutes(), 30);
});

test('deadline 06:30 lúc 01:00 là cùng ngày', () => {
  assert.equal(deadlineFrom(new Date(2026, 10, 12, 1, 0), '06:30').getDate(), 12);
});

test('localDate dạng YYYY-MM-DD', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('sleepUntil không ngủ quá hạn chót; mặc định 30 phút khi không biết giờ reset', async () => {
  const slept = [];
  const sleep = async (ms) => { slept.push(ms); };
  await sleepUntil(5_000_000, new Date(2_000_000), () => 1_000_000, sleep);
  await sleepUntil(null, new Date(99_000_000), () => 1_000_000, sleep);
  assert.deepEqual(slept, [1_000_000, 30 * 60_000]);
});

test('lock chạy tuần tự, lỗi không làm kẹt khóa', async () => {
  const lock = createLock();
  const order = [];
  const a = lock(async () => { await new Promise((r) => setTimeout(r, 30)); order.push('a'); });
  const b = lock(async () => { throw new Error('x'); });
  const c = lock(async () => { order.push('c'); });
  await a;
  await assert.rejects(b);
  await c;
  assert.deepEqual(order, ['a', 'c']);
});
```

- [ ] **Step 2:** `npm test`. Kỳ vọng FAIL.

- [ ] **Step 3: `ops/runner/lib/time.mjs`**

```js
export function deadlineFrom(now, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

export function localDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sleepUntil(resetAtMs, deadline, now = Date.now, sleep = realSleep) {
  const target = Math.min(resetAtMs ?? now() + 30 * 60_000, deadline.getTime());
  await sleep(Math.max(0, target - now()));
}
```

- [ ] **Step 4: `ops/runner/lib/lock.mjs`**

```js
export function createLock() {
  let tail = Promise.resolve();
  return (fn) => {
    const run = tail.then(fn);
    tail = run.catch(() => {});
    return run;
  };
}
```

- [ ] **Step 5:** `npm test`. Kỳ vọng tất cả pass.
- [ ] **Step 6: Commit** `git add ops && git commit -m "feat(ops): hạn chót, ngủ chờ quota, khóa merge"`

---

### Task 4: Chạy tiến trình và git

**Files:** Create `ops/runner/lib/sh.mjs`, `ops/runner/lib/git.mjs`, `ops/runner/test/helpers.mjs`, `ops/runner/test/git.test.mjs`

- [ ] **Step 1: `ops/runner/lib/sh.mjs`**

```js
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const WIN = process.platform === 'win32';
// npm/npx trên Windows là file .cmd nên phải chạy qua shell
const NEEDS_SHELL = new Set(['npm', 'npx']);
const quote = (a) => (/[\s"&|<>^()%!]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);

export function run(cmd, args = [], { cwd, input, env, timeoutMs = 30 * 60_000, logFile } = {}) {
  return new Promise((resolve) => {
    const shell = WIN && NEEDS_SHELL.has(cmd);
    const options = { cwd, env: { ...process.env, ...env }, windowsHide: true };
    const child = shell
      ? spawn([cmd, ...args.map(quote)].join(' '), { ...options, shell: true })
      : spawn(cmd, args, options);
    let stdout = '';
    let stderr = '';
    const log = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
    log?.write(`\n$ ${cmd} ${args.join(' ')}\n`);
    child.stdout.on('data', (d) => { stdout += d; log?.write(d); });
    child.stderr.on('data', (d) => { stderr += d; log?.write(d); });
    const timer = setTimeout(() => {
      stderr += `\n[runner] quá thời gian ${timeoutMs}ms, dừng tiến trình`;
      if (WIN) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill('SIGTERM');
    }, timeoutMs);
    child.on('error', (e) => { stderr += String(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      log?.end();
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.stdin.end(input ?? '');
  });
}
```

- [ ] **Step 2: Helper test dùng chung `ops/runner/test/helpers.mjs`** (không có đuôi `.test` nên `node --test` không chạy riêng file này)

```js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function tempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  const g = (...a) => execFileSync('git', a, { cwd: root }).toString().trim();
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'runner@test');
  g('config', 'user.name', 'runner');
  fs.writeFileSync(path.join(root, '.gitignore'), 'wt/\n');
  fs.mkdirSync(path.join(root, 'app'));
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'a');
  g('add', '-A');
  g('commit', '-qm', 'init');
  return { root, g };
}
```

- [ ] **Step 3: Test tích hợp `ops/runner/test/git.test.mjs`** (git thật trên repo tạm)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo } from './helpers.mjs';
import { ensureWorktree, commitAll, changedFiles, rebaseOnMain, ffMerge, removeWorktree, head } from '../lib/git.mjs';

test('worktree → commit → diff → rebase → merge ff → dọn', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-001');
  assert.equal(await ensureWorktree(root, 'T-001'), wt, 'gọi lại thì dùng lại worktree cũ');
  fs.writeFileSync(path.join(wt, 'app', 'b.txt'), 'b');
  assert.equal(await commitAll(wt, 'thêm b'), true);
  assert.equal(await commitAll(wt, 'không có gì'), false);
  assert.deepEqual(await changedFiles(wt), ['app/b.txt']);

  fs.writeFileSync(path.join(root, 'app', 'c.txt'), 'c');
  g('add', '-A');
  g('commit', '-qm', 'main đi trước');
  const before = await head(wt);
  assert.equal(await rebaseOnMain(wt), true);
  assert.notEqual(await head(wt), before);

  await ffMerge(root, 'T-001');
  assert.ok(fs.existsSync(path.join(root, 'app', 'b.txt')));
  await removeWorktree(root, 'T-001');
  assert.ok(!fs.existsSync(wt));
});

test('rebase conflict thì hủy rebase và trả về false', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-002');
  fs.writeFileSync(path.join(wt, 'app', 'a.txt'), 'từ task');
  await commitAll(wt, 'sửa a');
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'từ main');
  g('commit', '-qam', 'main sửa a');
  assert.equal(await rebaseOnMain(wt), false);
  assert.equal(g('-C', wt, 'status', '--porcelain'), '', 'worktree sạch sau khi abort');
});
```

- [ ] **Step 4:** `npm test`. Kỳ vọng FAIL (không có `lib/git.mjs`).

- [ ] **Step 5: `ops/runner/lib/git.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { run } from './sh.mjs';

export async function git(cwd, ...args) {
  const r = await run('git', args, { cwd });
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} (${cwd}): ${r.stderr.trim()}`);
  return r.stdout.trim();
}

export const worktreeDir = (root, id) => path.join(root, 'wt', id);

export async function ensureWorktree(root, id) {
  const dir = worktreeDir(root, id);
  if (fs.existsSync(dir)) return dir;
  await git(root, 'worktree', 'add', '-B', `task/${id}`, dir, 'main');
  return dir;
}

export async function commitAll(dir, message) {
  if (!(await git(dir, 'status', '--porcelain'))) return false;
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-m', message);
  return true;
}

export async function changedFiles(dir) {
  const out = await git(dir, 'diff', '--name-only', 'main...HEAD');
  return out ? out.split(/\r?\n/) : [];
}

export async function head(dir) {
  return git(dir, 'rev-parse', 'HEAD');
}

export async function rebaseOnMain(dir) {
  const r = await run('git', ['rebase', 'main'], { cwd: dir });
  if (r.code === 0) return true;
  await run('git', ['rebase', '--abort'], { cwd: dir });
  return false;
}

export async function resetToMain(dir) {
  await git(dir, 'reset', '--hard', 'main');
}

export async function ffMerge(root, id) {
  await git(root, 'merge', '--ff-only', `task/${id}`);
}

export async function removeWorktree(root, id) {
  await run('git', ['worktree', 'remove', '--force', worktreeDir(root, id)], { cwd: root });
  await run('git', ['branch', '-D', `task/${id}`], { cwd: root });
}
```

- [ ] **Step 6:** `npm test`. Kỳ vọng tất cả pass.
- [ ] **Step 7: Commit** `git add ops && git commit -m "feat(ops): chạy tiến trình + thao tác git worktree"`

---

### Task 5: Gọi agent, quyền, prompt

**Files:** Create `ops/runner/lib/agent.mjs`, `ops/runner/test/agent.test.mjs`, `ops/runner/agent-settings.json`, `ops/runner/reviewer-settings.json`, `ops/runner/prompts/worker.md`, `ops/runner/prompts/asset.md`, `ops/runner/prompts/reviewer.md`

- [ ] **Step 1: Kiểm tra cờ CLI** (từ thư mục gốc)

```bash
echo "Trả lời đúng một chữ: OK" | claude -p --output-format json --permission-mode dontAsk --max-turns 2
```
Kỳ vọng: JSON có `"result"` chứa `OK` và `"is_error": false`. Nếu báo `unknown option '--max-turns'` thì bỏ hai phần tử `'--max-turns', '80'` khỏi `CLAUDE_ARGS` ở Step 4 (runner vẫn giới hạn 90 phút mỗi lượt).

- [ ] **Step 2: Test `ops/runner/test/agent.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleFor, buildPrompt, isRateLimited, resetAt, parseJson } from '../lib/agent.mjs';

const task = { id: 'T-008', title: 'Bò 3D nhảy', type: 'ui', scope: ['app/src/games/animals/**'], acceptance: ['npm run verify'], body: 'Chi tiết.' };

test('vai theo loại task', () => {
  assert.equal(roleFor('ui'), 'worker');
  assert.equal(roleFor('logic'), 'worker');
  assert.equal(roleFor('asset'), 'asset');
  assert.equal(roleFor('tts'), 'asset');
});

test('prompt có scope, acceptance, nội dung, và log lỗi lần trước (cắt bớt)', () => {
  const p = buildPrompt('VAI', task, 'x'.repeat(9000));
  assert.match(p, /^VAI/);
  assert.match(p, /T-008: Bò 3D nhảy/);
  assert.match(p, /app\/src\/games\/animals\/\*\*/);
  assert.match(p, /Chi tiết\./);
  assert.match(p, /Lần trước chưa đạt/);
  assert.ok(p.length < 9000);
});

test('nhận diện chạm giới hạn quota và giờ reset', () => {
  const hit = { code: 1, stdout: JSON.stringify({ is_error: true, result: 'Claude AI usage limit reached|1794300000' }), stderr: '' };
  assert.equal(isRateLimited(hit), true);
  assert.equal(resetAt(hit), 1794300000 * 1000);
  const ok = { code: 0, stdout: JSON.stringify({ is_error: false, result: 'Đã xong, có bàn về rate limit' }), stderr: '' };
  assert.equal(isRateLimited(ok), false);
  assert.equal(resetAt(ok), null);
});

test('parseJson an toàn với output hỏng', () => {
  assert.equal(parseJson('không phải json'), null);
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
});
```

- [ ] **Step 3:** `npm test`. Kỳ vọng FAIL.

- [ ] **Step 4: `ops/runner/lib/agent.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { run } from './sh.mjs';

const FEEDBACK_MAX = 6000;

export function roleFor(type) {
  return type === 'asset' || type === 'tts' ? 'asset' : 'worker';
}

export function buildPrompt(roleText, task, feedback) {
  const parts = [
    roleText.trim(),
    `# TASK ${task.id}: ${task.title}`,
    `Loại: ${task.type}`,
    `Scope (chỉ được sửa file khớp các glob này, tính từ gốc repo):\n${task.scope.map((s) => `- ${s}`).join('\n')}`,
    `Điều kiện xong:\n${task.acceptance.map((a) => `- ${a}`).join('\n')}`,
    task.body.trim(),
  ];
  if (feedback) parts.push(`# Lần trước chưa đạt. Log/lý do (phần cuối):\n${feedback.slice(-FEEDBACK_MAX)}`);
  return parts.join('\n\n');
}

export function parseJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

const LIMIT_RE = /usage limit|rate[ _-]?limit|\b429\b/i;

export function isRateLimited(r) {
  const j = parseJson(r.stdout);
  const failed = r.code !== 0 || j?.is_error === true;
  return failed && LIMIT_RE.test(`${j?.result ?? r.stdout}\n${r.stderr}`);
}

export function resetAt(r) {
  const m = `${r.stdout}\n${r.stderr}`.match(/limit reached\|(\d{9,})/i);
  return m ? Number(m[1]) * 1000 : null;
}

export const CLAUDE_ARGS = ['-p', '--output-format', 'json', '--permission-mode', 'dontAsk', '--max-turns', '80'];

export async function runAgent({ cwd, task, ops, feedback, logFile }) {
  const roleText = fs.readFileSync(path.join(ops, 'runner', 'prompts', `${roleFor(task.type)}.md`), 'utf8');
  const r = await run('claude', [...CLAUDE_ARGS, '--settings', path.join(ops, 'runner', 'agent-settings.json')], {
    cwd,
    input: buildPrompt(roleText, task, feedback),
    timeoutMs: 90 * 60_000,
    logFile,
  });
  return { ...r, json: parseJson(r.stdout), rateLimited: isRateLimited(r), resetAt: resetAt(r) };
}
```

- [ ] **Step 5:** `npm test`. Kỳ vọng tất cả pass.

- [ ] **Step 6: `ops/runner/agent-settings.json`**

```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Glob", "Grep", "TodoWrite",
      "Bash(npm run:*)", "Bash(npm test:*)",
      "Bash(npx vitest:*)", "Bash(npx playwright test:*)", "Bash(npx tsc:*)", "Bash(npx eslint:*)",
      "Bash(npx @gltf-transform/cli:*)",
      "Bash(node scripts/:*)", "Bash(uv run:*)",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git add:*)", "Bash(git commit:*)", "Bash(git log:*)",
      "Bash(git checkout main -- :*)",
      "Bash(ls:*)", "Bash(mkdir:*)", "Bash(cp ../../assets-src/:*)"
    ],
    "deny": [
      "Bash(git push:*)", "Bash(git reset:*)", "Bash(git rebase:*)", "Bash(git merge:*)",
      "Bash(git branch:*)", "Bash(git worktree:*)",
      "Bash(npm install:*)", "Bash(npm i:*)", "Bash(curl:*)", "Bash(rm -rf:*)",
      "WebFetch", "WebSearch",
      "Edit(ops/**)", "Write(ops/**)", "Edit(CLAUDE.md)", "Write(CLAUDE.md)"
    ]
  }
}
```

- [ ] **Step 7: `ops/runner/reviewer-settings.json`**

```json
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep", "Bash(git log:*)", "Bash(git diff:*)", "Bash(git show:*)"],
    "deny": ["Edit", "Write", "Bash(git push:*)", "WebFetch", "WebSearch"]
  }
}
```

- [ ] **Step 8: `ops/runner/prompts/worker.md`**

```markdown
Bạn là agent worker của dự án Bé Học (app PWA cho bé 2–5 tuổi trên iPad). Bạn đang làm MỘT task trong một git worktree riêng, ban đêm, không có người trông. Không ai trả lời câu hỏi của bạn cho đến sáng.

Trước khi làm: đọc `CLAUDE.md` ở gốc repo (luật UX trẻ em, lệnh, thư viện được phép), rồi đọc phần liên quan trong spec `docs/superpowers/specs/2026-11-10-be-hoc-design.md` và code sẵn có trong `app/src/core`, `app/src/ui`.

Quy trình bắt buộc:
1. Viết test trước: Vitest cho logic; Playwright `app/e2e/<id>.spec.ts` cho tương tác. Mỗi màn hình mới phải được chụp vào `test-results/shots/<task-id>-<tên>.png` để bố mẹ duyệt.
2. Viết code tối thiểu để test qua, dùng `ClayButton`, `Scene3D` và token màu sẵn có. Giao diện phải đẹp và cuốn hút như đồ chơi: bo tròn, bóng mềm, chuyển động nảy nhẹ khi chạm.
3. Chạy `npm run verify` trong `app/` đến khi xanh. Không được xóa, skip hay nới lỏng test để cho qua.
4. `git add` và `git commit` với message tiếng Việt.

Giới hạn: chỉ sửa file trong scope của task; không sửa `ops/`, `CLAUDE.md`, `.github/`; không push; không cài thư viện mới.

Nếu bị chặn vì thiếu thông tin, chọn phương án an toàn và hợp lý nhất, làm xong, rồi ghi rõ giả định.
Kết thúc bằng 2–4 câu tóm tắt đã làm gì. Mỗi câu hỏi cần bố mẹ quyết định ghi trên một dòng riêng, bắt đầu bằng `CÂU HỎI:`.
```

- [ ] **Step 9: `ops/runner/prompts/asset.md`**

```markdown
Bạn là agent asset của dự án Bé Học. Bạn đang làm MỘT task về tài nguyên (model 3D hoặc giọng đọc) trong một git worktree riêng, ban đêm, không có người trông. Đọc `CLAUDE.md` ở gốc repo trước.

Giọng đọc (task loại tts):
- Thêm hoặc sửa mục trong `app/src/content/<tên>.json`, mỗi mục `{ "key": "nhóm.tên", "vi": "...", "ja": "..." }`. Câu ngắn, ấm áp, hợp với bé 2 tuổi; tiếng Nhật dùng hiragana đơn giản.
- Sinh mp3 (chạy từ gốc worktree):
  `uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py`
- Chạy `npm run check:audio` trong `app/`.

Model 3D (task loại asset):
- Chỉ dùng file trong `../../assets-src/` (bố mẹ đã tải sẵn các gói CC0 của Kenney và Quaternius). Đọc file license trong gói để chắc chắn là CC0. Không tải gì từ mạng.
- Chép model cần dùng: `cp ../../assets-src/<đường-dẫn> app/public/models/<tên>.glb`. Nếu gói chỉ có .gltf thì dùng .gltf; không tự chuyển đổi định dạng khác.
- Nén: `npx @gltf-transform/cli optimize app/public/models/<tên>.glb app/public/models/<tên>.glb --compress meshopt`. Mỗi model không quá 1MB, mỗi scene tổng cộng không quá ~50k tam giác.
- Ghi vào `app/public/models/CREDITS.md`: tên file, gói nguồn, tác giả, license CC0.

Cuối cùng chạy `npm run verify` trong `app/`, rồi `git add` và `git commit`. Chỉ sửa file trong scope.
Kết thúc bằng 2–4 câu tóm tắt. Mỗi câu hỏi cho bố mẹ ghi trên một dòng riêng, bắt đầu bằng `CÂU HỎI:`.
```

- [ ] **Step 10: `ops/runner/prompts/reviewer.md`**

```markdown
Bạn là agent reviewer của dự án Bé Học. Đêm nay runner đã chạy các task (JSON bên dưới). Bạn chỉ có quyền đọc.

Việc cần làm:
1. Với mỗi task `done` hoặc `review`: xem lịch sử và diff (`git log --oneline --all -30`, `git show <commit>`; task review nằm ở nhánh `task/<id>`).
2. Với task `review` (có giao diện): mở các ảnh trong `ops/reports/` (đường dẫn ở trường `shots`) và đánh giá theo hướng hình ảnh của spec: đất sét 2.5D, 3D cho khoảnh khắc wow, pastel tươi, vùng chạm to, bé chưa biết đọc vẫn chơi được.
3. Tìm vi phạm luật UX trong `CLAUDE.md`, code lặp, test yếu.

Viết nhận xét tiếng Việt, ngắn gọn, cho bố mẹ đọc buổi sáng:
- Mỗi task một đoạn 1–3 câu; với task `review` thì nói rõ nên duyệt hay yêu cầu sửa gì.
- Cuối cùng: tối đa 3 việc nên ưu tiên cho đêm sau.
Không viết lời chào hay tóm tắt dài dòng.
```

- [ ] **Step 11: Commit** `git add ops && git commit -m "feat(ops): gọi agent claude -p, quyền và prompt theo vai"`

---

### Task 6: Report HTML

**Files:** Create `ops/runner/lib/report.mjs`, `ops/runner/test/report.test.mjs`

- [ ] **Step 1: Test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, extractQuestions, buildReport } from '../lib/report.mjs';

const records = [
  { id: 'T-007', title: 'Core audio', type: 'logic', status: 'done', minutes: 22, attempts: 0, note: 'Đã xong.' },
  { id: 'T-008', title: 'Bò <3D>', type: 'ui', status: 'review', minutes: 41, attempts: 0, shots: ['shots/2026-11-11/T-008/T-008-farm.png'], note: 'Xong.\nCÂU HỎI: Bò màu nâu hay đen trắng?' },
  { id: 'T-012', title: 'Kéo thả', type: 'ui', status: 'failed', minutes: 60, attempts: 1, reason: 'npm run verify thất bại' },
];

test('đếm theo trạng thái', () => {
  assert.deepEqual(summarize(records), { done: 1, review: 1, failed: 1, paused: 0 });
});

test('lấy câu hỏi cho bố mẹ', () => {
  assert.deepEqual(extractQuestions(records), [{ id: 'T-008', q: 'Bò màu nâu hay đen trắng?' }]);
});

test('report có ảnh, lệnh duyệt, lý do lỗi, và escape HTML', () => {
  const html = buildReport({ date: '2026-11-11', records, notes: 'Nên duyệt T-008.', minutes: 210 });
  assert.match(html, /<img src="shots\/2026-11-11\/T-008\/T-008-farm.png"/);
  assert.match(html, /node ops\/runner\/task.mjs approve T-008/);
  assert.match(html, /npm run verify thất bại/);
  assert.match(html, /Bò &lt;3D&gt;/);
  assert.match(html, /Nên duyệt T-008/);
});
```

- [ ] **Step 2:** `npm test`. Kỳ vọng FAIL.

- [ ] **Step 3: `ops/runner/lib/report.mjs`**

```js
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function summarize(records) {
  const c = { done: 0, review: 0, failed: 0, paused: 0 };
  for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
  return c;
}

export function extractQuestions(records) {
  return records.flatMap((r) =>
    String(r.note ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^CÂU HỎI:/i.test(l))
      .map((l) => ({ id: r.id, q: l.replace(/^CÂU HỎI:\s*/i, '') })),
  );
}

const card = (r, extra = '') => `
  <article class="card ${r.status}">
    <h3>${esc(r.id)} · ${esc(r.title)} <small>${esc(r.type)} · ${r.minutes ?? 0} phút</small></h3>
    ${r.note ? `<p class="note">${esc(r.note).replace(/\n/g, '<br>')}</p>` : ''}
    ${extra}
  </article>`;

export function buildReport({ date, records, notes = '', minutes = 0 }) {
  const c = summarize(records);
  const qs = extractQuestions(records);
  const review = records.filter((r) => r.status === 'review').map((r) => card(r, `
    <div class="shots">${(r.shots ?? []).map((s) => `<img src="${esc(s)}" alt="${esc(r.id)}">`).join('')}</div>
    <pre>node ops/runner/task.mjs approve ${esc(r.id)}
node ops/runner/task.mjs reject ${esc(r.id)} "cần sửa gì"</pre>`)).join('');
  const done = records.filter((r) => r.status === 'done').map((r) => card(r)).join('');
  const failed = records.filter((r) => r.status === 'failed' || r.status === 'paused').map((r) => card(r, `
    <p class="reason">${esc(r.reason)}</p><pre>node ops/runner/task.mjs retry ${esc(r.id)}</pre>`)).join('');
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đêm ${esc(date)}</title>
<style>
  :root{--bg:#f6f1ff;--ink:#3b2a6b;--card:#fff;--done:#9fe3b0;--review:#ffd76a;--failed:#ff9f8f;--line:#e4dcf7}
  @media (prefers-color-scheme:dark){:root{--bg:#1d1830;--ink:#efe9ff;--card:#2a2342;--line:#3c3358}}
  body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
  main{max-width:1100px;margin:0 auto;padding:24px 16px}
  .kpi{display:flex;flex-wrap:wrap;gap:12px}.kpi div{background:var(--card);border-radius:16px;padding:12px 18px;border:1px solid var(--line)}
  .card{background:var(--card);border-radius:16px;padding:14px 18px;margin:12px 0;border-left:8px solid var(--line)}
  .card.done{border-color:var(--done)}.card.review{border-color:var(--review)}.card.failed,.card.paused{border-color:var(--failed)}
  .shots{display:flex;gap:10px;overflow-x:auto}.shots img{height:260px;border-radius:12px;border:1px solid var(--line)}
  pre{background:var(--bg);padding:8px 12px;border-radius:10px;overflow-x:auto}
  small{opacity:.7;font-weight:400}
</style></head><body><main>
<h1>Báo cáo đêm ${esc(date)}</h1>
<div class="kpi"><div>✅ Xong: <b>${c.done}</b></div><div>👀 Chờ duyệt: <b>${c.review}</b></div><div>❌ Lỗi: <b>${c.failed}</b></div><div>⏸ Để đêm sau: <b>${c.paused}</b></div><div>⏱ ${Math.round(minutes)} phút</div></div>
${qs.length ? `<h2>❓ Câu hỏi cho bố mẹ</h2><ul>${qs.map((q) => `<li><b>${esc(q.id)}</b>: ${esc(q.q)}</li>`).join('')}</ul>` : ''}
${review ? `<h2>👀 Chờ duyệt giao diện</h2>${review}` : ''}
${failed ? `<h2>❌ Chưa xong</h2>${failed}` : ''}
${done ? `<h2>✅ Đã merge vào main</h2>${done}` : ''}
${notes ? `<h2>🧐 Nhận xét của reviewer</h2><pre style="white-space:pre-wrap">${esc(notes)}</pre>` : ''}
</main></body></html>`;
}
```

- [ ] **Step 4:** `npm test`. Kỳ vọng tất cả pass.
- [ ] **Step 5: Commit** `git add ops && git commit -m "feat(ops): report HTML buổi sáng"`

---

### Task 7: Pipeline một task

**Files:** Create `ops/runner/lib/pipeline.mjs`, `ops/runner/test/pipeline.test.mjs`

- [ ] **Step 1: Test** (git thật; agent và npm giả)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo } from './helpers.mjs';
import { processTask } from '../lib/pipeline.mjs';
import { createLock } from '../lib/lock.mjs';
import { parseTask, loadAll } from '../lib/tasks.mjs';

function env() {
  const { root } = tempRepo();
  const ops = fs.mkdtempSync(path.join(root, '..', 'ops-'));
  const tasksDir = path.join(ops, 'tasks');
  for (const s of ['todo', 'doing', 'review', 'done', 'failed']) fs.mkdirSync(path.join(tasksDir, s), { recursive: true });
  return { root, ops, tasksDir };
}

function addTask(tasksDir, id, type, scope) {
  const text = `---\nid: ${id}\ntitle: thử ${id}\ntype: ${type}\nscope: ${JSON.stringify(scope)}\nacceptance: ["npm run verify"]\n---\nmô tả\n`;
  const file = path.join(tasksDir, 'todo', `${id}.md`);
  fs.writeFileSync(file, text);
  return parseTask(text, file);
}

function ctx(e, agent, verifyCode = 0) {
  return {
    root: e.root, ops: e.ops, tasksDir: e.tasksDir, logsDir: e.ops,
    shotsRoot: path.join(e.ops, 'shots'), shotsRel: 'shots',
    deadline: new Date(Date.now() + 3_600_000),
    mergeLock: createLock(),
    exec: async (cmd, args) => ({ code: args.includes('verify') ? verifyCode : 0, stdout: 'verify log', stderr: '' }),
    agent,
  };
}

const writes = (rel) => async ({ cwd }) => {
  fs.mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
  fs.writeFileSync(path.join(cwd, rel), String(Math.random()));
  return { code: 0, rateLimited: false, json: { result: 'Đã xong.\nCÂU HỎI: thử?' } };
};

test('logic qua verify → merge vào main, vào done', async () => {
  const e = env();
  const rec = await processTask(addTask(e.tasksDir, 'T-100', 'logic', ['app/**']), 0, ctx(e, writes('app/b.txt')));
  assert.equal(rec.status, 'done');
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'b.txt')));
  assert.equal(loadAll(e.tasksDir)[0].state, 'done');
  assert.match(rec.note, /CÂU HỎI/);
});

test('ui qua verify → vào review, chưa merge', async () => {
  const e = env();
  const rec = await processTask(addTask(e.tasksDir, 'T-101', 'ui', ['app/**']), 1, ctx(e, writes('app/ui.txt')));
  assert.equal(rec.status, 'review');
  assert.ok(!fs.existsSync(path.join(e.root, 'app', 'ui.txt')));
});

test('sửa ngoài scope 2 lần → failed, main không đổi, agent nhận phản hồi', async () => {
  const e = env();
  const feedbacks = [];
  const agent = async (a) => { feedbacks.push(a.feedback); return writes('README.md')(a); };
  const rec = await processTask(addTask(e.tasksDir, 'T-102', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'failed');
  assert.match(rec.reason, /ngoài scope: README.md/);
  assert.equal(feedbacks[0], null);
  assert.match(feedbacks[1], /README.md/);
  assert.ok(!fs.existsSync(path.join(e.root, 'README.md')));
  assert.equal(loadAll(e.tasksDir)[0].state, 'failed');
});

test('verify trượt → thử lại với log lỗi, rồi failed', async () => {
  const e = env();
  const rec = await processTask(addTask(e.tasksDir, 'T-103', 'logic', ['app/**']), 0, ctx(e, writes('app/c.txt'), 1));
  assert.equal(rec.status, 'failed');
  assert.match(rec.reason, /verify/);
});

test('quá hạn chót → trả task về todo (paused)', async () => {
  const e = env();
  const c = ctx(e, writes('app/d.txt'));
  c.deadline = new Date(Date.now() - 1);
  const rec = await processTask(addTask(e.tasksDir, 'T-104', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'paused');
  assert.equal(loadAll(e.tasksDir)[0].state, 'todo');
});

test('chạm quota → ngủ rồi thử lại, không tính là một lần thử', async () => {
  const e = env();
  let calls = 0;
  const agent = async (a) => (++calls === 1 ? { code: 1, rateLimited: true, resetAt: Date.now() } : writes('app/e.txt')(a));
  const rec = await processTask(addTask(e.tasksDir, 'T-105', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'done');
  assert.equal(calls, 2);
});
```

- [ ] **Step 2:** `npm test`. Kỳ vọng FAIL.

- [ ] **Step 3: `ops/runner/lib/pipeline.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { moveTask } from './tasks.mjs';
import { outOfScope } from './scope.mjs';
import { ensureWorktree, commitAll, rebaseOnMain, resetToMain, changedFiles, head, ffMerge, removeWorktree } from './git.mjs';
import { sleepUntil } from './time.mjs';

const tail = (s, n = 6000) => (s.length > n ? s.slice(-n) : s);
const BASE_PORT = 4173;
const PAUSED = 'hết giờ chạy đêm, để lại cho đêm sau';

export function collectShots(wt, shotsRoot, shotsRel, id) {
  const src = path.join(wt, 'app', 'test-results', 'shots');
  if (!fs.existsSync(src)) return [];
  const dest = path.join(shotsRoot, id);
  fs.mkdirSync(dest, { recursive: true });
  return fs.readdirSync(src).filter((f) => f.endsWith('.png')).map((f) => {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    return `${shotsRel}/${id}/${f}`;
  });
}

export function verifyIn(ctx, wt, slot, logFile) {
  return ctx.exec('npm', ['run', 'verify'], {
    cwd: path.join(wt, 'app'),
    env: { E2E_PORT: String(BASE_PORT + slot) },
    logFile,
    timeoutMs: 30 * 60_000,
  });
}

// Merge lần lượt từng task: rebase lên main mới nhất; nếu main đã đổi thì verify lại; rồi fast-forward.
export function mergeVerified(ctx, wt, task, slot, logFile) {
  return ctx.mergeLock(async () => {
    const before = await head(wt);
    if (!(await rebaseOnMain(wt))) {
      return {
        ok: false, reset: true, reason: 'conflict khi rebase lên main',
        feedback: 'Main đã thay đổi và xung đột với task này. Branch đã được đặt lại về main; hãy làm lại task trên code mới nhất.',
      };
    }
    if ((await head(wt)) !== before) {
      const v = await verifyIn(ctx, wt, slot, logFile);
      if (v.code !== 0) return { ok: false, reason: 'verify thất bại sau khi rebase lên main mới', feedback: tail(v.stdout + v.stderr) };
    }
    await ffMerge(ctx.root, task.id);
    return { ok: true };
  });
}

export async function processTask(input, slot, ctx) {
  const t0 = Date.now();
  let task = moveTask(ctx.tasksDir, input, 'doing');
  const logFile = path.join(ctx.logsDir, `${task.id}.log`);
  const rec = (status, extra = {}) => ({
    id: task.id, title: task.title, type: task.type, status, attempts: task.attempts,
    minutes: Math.round((Date.now() - t0) / 60_000), ...extra,
  });
  const pastDeadline = () => Date.now() >= ctx.deadline.getTime();

  if (pastDeadline()) {
    moveTask(ctx.tasksDir, task, 'todo');
    return rec('paused', { reason: PAUSED });
  }

  const wt = await ensureWorktree(ctx.root, task.id);
  const appDir = path.join(wt, 'app');
  if (fs.existsSync(path.join(appDir, 'package.json')) && !fs.existsSync(path.join(appDir, 'node_modules'))) {
    await ctx.exec('npm', ['ci', '--no-audit', '--no-fund'], { cwd: appDir, logFile, timeoutMs: 15 * 60_000 });
  }

  let feedback = null;
  let reason = '';
  let note = '';
  let attempt = 0;
  while (attempt < 2) {
    if (pastDeadline()) {
      moveTask(ctx.tasksDir, task, 'todo');
      return rec('paused', { reason: PAUSED, note });
    }
    const a = await ctx.agent({ cwd: wt, task, ops: ctx.ops, feedback, logFile });
    if (a.rateLimited) {
      await sleepUntil(a.resetAt, ctx.deadline);
      continue;
    }
    attempt++;
    note = a.json?.result ?? '';
    await commitAll(wt, `feat(${task.id}): ${task.title}`);

    const bad = outOfScope(await changedFiles(wt), task.scope);
    if (bad.length) {
      reason = `sửa ngoài scope: ${bad.join(', ')}`;
      feedback = `Bạn đã sửa file ngoài scope: ${bad.join(', ')}. Khôi phục chúng (git checkout main -- <file>; file mới thì xóa) rồi commit; chỉ sửa trong scope.`;
      continue;
    }

    const v = await verifyIn(ctx, wt, slot, logFile);
    if (v.code !== 0) {
      reason = 'npm run verify thất bại';
      feedback = tail(v.stdout + v.stderr);
      continue;
    }

    const shots = collectShots(wt, ctx.shotsRoot, ctx.shotsRel, task.id);
    if (task.type === 'ui') {
      task = moveTask(ctx.tasksDir, task, 'review');
      return rec('review', { shots, note });
    }
    const m = await mergeVerified(ctx, wt, task, slot, logFile);
    if (m.ok) {
      task = moveTask(ctx.tasksDir, task, 'done');
      await removeWorktree(ctx.root, task.id);
      return rec('done', { shots, note });
    }
    if (m.reset) await resetToMain(wt);
    reason = m.reason;
    feedback = m.feedback;
  }

  task = moveTask(ctx.tasksDir, { ...task, attempts: task.attempts + 1, last_error: reason }, 'failed');
  return rec('failed', { reason, note });
}
```

- [ ] **Step 4:** `npm test`. Kỳ vọng tất cả pass.
- [ ] **Step 5: Commit** `git add ops && git commit -m "feat(ops): pipeline một task: agent, scope, verify, merge"`

---

### Task 8: `night-run.mjs` điều phối cả đêm

**Files:** Create `ops/runner/night-run.mjs`

- [ ] **Step 1: `ops/runner/night-run.mjs`**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadAll, eligible, moveTask } from './lib/tasks.mjs';
import { processTask } from './lib/pipeline.mjs';
import { createLock } from './lib/lock.mjs';
import { deadlineFrom, localDate } from './lib/time.mjs';
import { run } from './lib/sh.mjs';
import { git } from './lib/git.mjs';
import { runAgent, parseJson, CLAUDE_ARGS } from './lib/agent.mjs';
import { buildReport } from './lib/report.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OPS = path.join(ROOT, 'ops');
const TASKS = path.join(OPS, 'tasks');

const { values: opt } = parseArgs({
  options: {
    until: { type: 'string', default: '06:30' },
    parallel: { type: 'string', default: '3' },
    'dry-run': { type: 'boolean', default: false },
    'no-review': { type: 'boolean', default: false },
  },
});

const stamp = () => new Date().toLocaleTimeString();

async function preflight() {
  const branch = await git(ROOT, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== 'main') throw new Error(`Thư mục gốc đang ở nhánh ${branch}, cần ở main`);
  const dirty = await git(ROOT, 'status', '--porcelain', '--', '.', ':(exclude)ops');
  if (dirty) throw new Error(`Thư mục gốc còn thay đổi chưa commit (ngoài ops/):\n${dirty}`);
}

async function main() {
  const start = new Date();
  const date = localDate(start);
  const deadline = deadlineFrom(start, opt.until);
  const logsDir = path.join(OPS, 'logs', date);
  const shotsRel = `shots/${date}`;
  const shotsRoot = path.join(OPS, 'reports', shotsRel);
  fs.mkdirSync(logsDir, { recursive: true });

  if (opt['dry-run']) {
    const ready = eligible(loadAll(TASKS));
    console.log(`Hạn chót: ${deadline.toLocaleString()}\nTask sẵn sàng (${ready.length}):`);
    for (const t of ready) console.log(`  ${t.id} [${t.type}] ${t.title}`);
    return;
  }

  await preflight();
  // Máy tắt giữa đêm: task đang dở trả về todo; worktree còn nguyên nên agent làm tiếp được
  for (const t of loadAll(TASKS).filter((t) => t.state === 'doing')) moveTask(TASKS, t, 'todo');

  const ctx = {
    root: ROOT, ops: OPS, tasksDir: TASKS, logsDir, shotsRoot, shotsRel, deadline,
    mergeLock: createLock(), exec: run, agent: runAgent,
  };
  const records = [];
  const running = new Map();
  const freeSlots = [...Array(Number(opt.parallel)).keys()];

  for (;;) {
    if (Date.now() < deadline.getTime()) {
      const ready = eligible(loadAll(TASKS)).filter((t) => !running.has(t.id));
      while (freeSlots.length && ready.length) {
        const t = ready.shift();
        const slot = freeSlots.shift();
        console.log(`[${stamp()}] bắt đầu ${t.id} (slot ${slot})`);
        const p = processTask(t, slot, ctx)
          .catch((e) => ({ id: t.id, title: t.title, type: t.type, status: 'failed', reason: `lỗi runner: ${e.message}` }))
          .then((r) => { records.push(r); console.log(`[${stamp()}] ${t.id} → ${r.status}`); })
          .finally(() => { running.delete(t.id); freeSlots.push(slot); });
        running.set(t.id, p);
      }
    }
    if (!running.size) break;
    await Promise.race(running.values());
  }

  let notes = '';
  if (records.length && !opt['no-review']) {
    const prompt = `${fs.readFileSync(path.join(OPS, 'runner', 'prompts', 'reviewer.md'), 'utf8')}\n\n\`\`\`json\n${JSON.stringify(records, null, 1)}\n\`\`\``;
    const r = await run('claude', [...CLAUDE_ARGS, '--settings', path.join(OPS, 'runner', 'reviewer-settings.json')], {
      cwd: ROOT, input: prompt, timeoutMs: 20 * 60_000, logFile: path.join(logsDir, 'reviewer.log'),
    });
    notes = parseJson(r.stdout)?.result ?? '';
  }

  const minutes = (Date.now() - start.getTime()) / 60_000;
  fs.writeFileSync(path.join(OPS, 'reports', `${date}.json`), JSON.stringify(records, null, 1));
  fs.writeFileSync(path.join(OPS, 'reports', `${date}.html`), buildReport({ date, records, notes, minutes }));
  await git(ROOT, 'add', 'ops');
  await run('git', ['commit', '-m', `chore(ops): kết quả đêm ${date}`], { cwd: ROOT });
  console.log(`Xong. Report: ops/reports/${date}.html`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Chạy thử dry-run** (từ thư mục gốc): `node ops/runner/night-run.mjs --dry-run`. Kỳ vọng: in hạn chót và `Task sẵn sàng (0):`.
- [ ] **Step 3: Commit** `git add ops && git commit -m "feat(ops): night-run điều phối cả đêm"`

---

### Task 9: CLI `task.mjs` cho bố mẹ

**Files:** Create `ops/runner/task.mjs`, `ops/tasks/_template.md`

- [ ] **Step 1: `ops/tasks/_template.md`**

```markdown
---
id: T-000
title: Tiêu đề ngắn
type: ui
depends_on: []
scope:
  - app/src/games/<id>/**
  - app/e2e/<id>.spec.ts
acceptance:
  - npm run verify
---
## Mục tiêu
Bé thấy gì, chạm vào đâu, nghe gì.

## Chi tiết
- (liệt kê hành vi cụ thể, key content, ảnh cần chụp)

## Tham khảo
- Spec mục ...
```

(`type` nhận một trong: ui, logic, asset, tts, test. `loadAll` bỏ qua file này vì nó không nằm trong thư mục trạng thái nào.)

- [ ] **Step 2: `ops/runner/task.mjs`**

```js
#!/usr/bin/env node
// Dùng (từ thư mục gốc):
//   node ops/runner/task.mjs list
//   node ops/runner/task.mjs new "Tiêu đề" ui          → tạo trong backlog/
//   node ops/runner/task.mjs promote T-020             → backlog → todo
//   node ops/runner/task.mjs approve T-008             → review → merge → done
//   node ops/runner/task.mjs reject T-008 "Bò to hơn"  → review → todo kèm phản hồi
//   node ops/runner/task.mjs retry T-012               → failed → todo
import fs from 'node:fs';
import path from 'node:path';
import { loadAll, moveTask, STATES } from './lib/tasks.mjs';
import { mergeVerified } from './lib/pipeline.mjs';
import { removeWorktree, worktreeDir } from './lib/git.mjs';
import { createLock } from './lib/lock.mjs';
import { run } from './lib/sh.mjs';
import { localDate } from './lib/time.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const TASKS = path.join(ROOT, 'ops', 'tasks');
const [cmd, a1, a2] = process.argv.slice(2);

function find(id, state) {
  const t = loadAll(TASKS).find((x) => x.id === id && (!state || x.state === state));
  if (!t) throw new Error(`Không thấy ${id}${state ? ` trong ${state}/` : ''}`);
  return t;
}

const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const commands = {
  list() {
    const all = loadAll(TASKS);
    for (const s of STATES) {
      const ts = all.filter((t) => t.state === s);
      if (ts.length) console.log(`\n${s}/\n${ts.map((t) => `  ${t.id} [${t.type}] ${t.title}`).join('\n')}`);
    }
  },
  new() {
    if (!a1) throw new Error('Thiếu tiêu đề');
    const max = Math.max(0, ...loadAll(TASKS).map((t) => Number(t.id.slice(2)) || 0));
    const id = `T-${String(max + 1).padStart(3, '0')}`;
    const text = fs.readFileSync(path.join(TASKS, '_template.md'), 'utf8')
      .replace('id: T-000', `id: ${id}`)
      .replace('title: Tiêu đề ngắn', `title: ${a1}`)
      .replace('type: ui', `type: ${a2 ?? 'ui'}`);
    const file = path.join(TASKS, 'backlog', `${id}-${slug(a1)}.md`);
    fs.writeFileSync(file, text);
    console.log(`Đã tạo ${path.relative(ROOT, file)}. Sửa nội dung rồi chạy: node ops/runner/task.mjs promote ${id}`);
  },
  promote() {
    moveTask(TASKS, find(a1, 'backlog'), 'todo');
    console.log(`${a1} → todo`);
  },
  async approve() {
    const t = find(a1, 'review');
    const logFile = path.join(ROOT, 'ops', 'logs', `approve-${t.id}.log`);
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const m = await mergeVerified({ root: ROOT, mergeLock: createLock(), exec: run }, worktreeDir(ROOT, t.id), t, 0, logFile);
    if (!m.ok) throw new Error(`Chưa merge được: ${m.reason}. Xem ${logFile}`);
    moveTask(TASKS, t, 'done');
    await removeWorktree(ROOT, t.id);
    console.log(`${t.id} đã merge vào main → done`);
  },
  reject() {
    if (!a2) throw new Error('Thiếu nội dung cần sửa');
    const t = find(a1, 'review');
    const body = `${t.body.trimEnd()}\n\n## Phản hồi của bố mẹ (${localDate(new Date())})\n- ${a2}\n`;
    moveTask(TASKS, { ...t, body, attempts: 0 }, 'todo');
    console.log(`${t.id} → todo kèm phản hồi; đêm tới agent sửa tiếp trên branch cũ`);
  },
  retry() {
    const { last_error, ...t } = find(a1, 'failed');
    moveTask(TASKS, { ...t, attempts: 0 }, 'todo');
    console.log(`${t.id} → todo (lỗi lần trước: ${last_error ?? 'không rõ'})`);
  },
};

if (!commands[cmd]) {
  console.log('Lệnh: list | new "tiêu đề" [type] | promote ID | approve ID | reject ID "phản hồi" | retry ID');
  process.exit(1);
}
Promise.resolve()
  .then(() => commands[cmd]())
  .catch((e) => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 3: Thử**: `node ops/runner/task.mjs new "Tên địa điểm vi/ja" tts` → tạo `ops/tasks/backlog/T-001-ten-dia-diem-vi-ja.md`. Rồi `node ops/runner/task.mjs list` → thấy T-001 trong `backlog/`. Giữ file này cho Task 11.
- [ ] **Step 4: Commit** `git add ops && git commit -m "feat(ops): CLI task cho bố mẹ"`

---

### Task 10: Task Scheduler

**Files:** Create `ops/runner/night-run.ps1`, `ops/runner/register-task.ps1`

- [ ] **Step 1: `ops/runner/night-run.ps1`**

```powershell
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
# Task Scheduler không nạp PATH của shell tương tác: thêm chỗ cài claude và uv
$env:PATH = "$env:USERPROFILE\.local\bin;$env:LOCALAPPDATA\Programs\Python\Python312\Scripts;$env:PATH"
$date = Get-Date -Format 'yyyy-MM-dd'
New-Item -ItemType Directory -Force "$root\ops\logs" | Out-Null
node "$PSScriptRoot\night-run.mjs" --until 06:30 *>> "$root\ops\logs\$date-night.log"
```

- [ ] **Step 2: `ops/runner/register-task.ps1`**

```powershell
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\night-run.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 23:00
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 8)
Register-ScheduledTask -TaskName 'BeHoc-NightRun' -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Bé Học: agent chạy task qua đêm' -Force
```

- [ ] **Step 3: Commit** `git add ops && git commit -m "feat(ops): Task Scheduler cho runner"`

- [ ] **Step 4 (bố mẹ tự làm, vì đây là thay đổi hệ thống):**
  - Đăng ký task: `powershell -ExecutionPolicy Bypass -File ops\runner\register-task.ps1`. Task chạy dưới tài khoản của bạn khi đang đăng nhập; khóa màn hình vẫn chạy, nhưng không được đăng xuất.
  - Không cho máy ngủ khi cắm sạc: `powercfg /change standby-timeout-ac 0`.
  - Windows Update: đặt Active hours bao trùm 23:00–7:00 để máy không tự khởi động lại giữa đêm.
  - Tải các gói 3D CC0 vào `C:\Dieupham\Projects\be-hoc\assets-src\`: gói động vật của Quaternius (quaternius.com) và các gói 3D của Kenney (kenney.nl/assets). Giải nén mỗi gói vào một thư mục con, giữ nguyên file License.

---

### Task 11: Chạy thử thật với T-001 và T-002

- [ ] **Step 1:** Sửa `ops/tasks/backlog/T-001-*.md` thành:

```markdown
---
id: T-001
title: Tên 4 địa điểm vi/ja
type: tts
depends_on: []
scope:
  - app/src/content/places.json
  - app/public/audio/**
acceptance:
  - npm run verify
---
## Mục tiêu
Đậu Đậu đọc tên địa điểm khi bé chạm vào trên bản đồ.

## Chi tiết
Tạo `app/src/content/places.json` gồm 4 mục:
- `place.farm`: "Trang trại" / "まきば"
- `place.pond`: "Hồ nước" / "いけ"
- `place.orchard`: "Vườn quả" / "かじゅえん"
- `place.music`: "Nhà âm nhạc" / "おんがくのいえ"
Sinh mp3 bằng tools/tts/generate.py, chạy `npm run check:audio` và `npm run verify`.
```

- [ ] **Step 2:** `node ops/runner/task.mjs promote T-001`, rồi `git add ops && git commit -m "chore(ops): task thử T-001"` để thư mục gốc sạch.
- [ ] **Step 3: Chạy thật, có người theo dõi**, hạn chót khoảng 1 giờ sau giờ hiện tại, ví dụ `node ops/runner/night-run.mjs --until 15:30 --parallel 1`. Theo dõi `ops/logs/<ngày>/T-001.log`. Kỳ vọng sau 5–15 phút: `T-001 → done`; `git log --oneline -3` có commit `feat(T-001)` và `chore(ops): kết quả đêm`; mở được `ops/reports/<ngày>.html`.
- [ ] **Step 4:** Nếu fail: đọc log, sửa runner (không sửa task cho dễ qua), `node ops/runner/task.mjs retry T-001`, chạy lại. Ghi các lỗi gặp phải vào mục "Ghi chú vận hành" ở cuối plan này.
- [ ] **Step 5: Thử nhánh ui**: `node ops/runner/task.mjs new "Nút về nhà" ui` (sẽ là T-002). Sửa scope thành `app/src/ui/BackHome.tsx`, `app/src/ui/BackHome.test.tsx`, `app/e2e/backhome.spec.ts`; mô tả: "Nút `ClayButton` 🏠 màu lilac cố định góc trên trái, `onPointerDown` gọi `onExit`; test unit kiểm tra gọi onExit; e2e render một trang thử có nút này và chụp `test-results/shots/T-002-backhome.png`". Promote, commit, chạy lại runner. Kỳ vọng T-002 vào `review/`, report có ảnh và lệnh approve. Chạy `node ops/runner/task.mjs approve T-002`, kỳ vọng vào `done/`.

---

### Task 12: Backlog giai đoạn 1

Tạo từng task bằng `node ops/runner/task.mjs new "<tiêu đề>" <type>` **theo đúng thứ tự bảng** để ID tự sinh khớp với cột ID. Sau đó điền `depends_on`, `scope` và mô tả theo bảng. Mô tả chi tiết của mỗi task dựa trên spec mục 3, 4, 6.

| ID | Tiêu đề | type | depends_on | scope | Mô tả ngắn |
|---|---|---|---|---|---|
| T-003 | Model 3D CC0: 8 con vật + mèo | asset | [] | `app/public/models/**` | Bò, gà, vịt, heo, chó, cừu, ngựa, thỏ, cộng một mèo làm Đậu Đậu; nén meshopt; ghi CREDITS.md |
| T-004 | Nội dung con vật vi/ja | tts | [] | `app/src/content/animals.json`, `app/public/audio/**` | Mỗi con 2 key: `animal.<id>` (tên) và `animal.<id>-sound` (tiếng kêu đọc thành lời, ví dụ "Ùm bò!" / "モーモー") |
| T-005 | WorldMap 4 địa điểm | ui | [T-001, T-002] | `app/src/ui/WorldMap.tsx`, `app/src/ui/WorldMap.module.css`, `app/src/ui/Home.tsx`, `app/src/App.tsx`, `app/e2e/worldmap.spec.ts` | Thay Home bằng bản đồ "Thế giới nhỏ" như mockup: trời, mây trôi, 4 địa điểm đất sét, Đậu Đậu ở giữa nhảy về phía nơi được chạm, đọc `place.*` |
| T-006 | Đậu Đậu dùng model CC0 | ui | [T-003, T-005] | `app/src/ui/DauDau.tsx`, `app/e2e/daudau.spec.ts` | `useGLTF` model mèo; giữ animation nhảy và xoay |
| T-007 | Nội dung màu và hình vi/ja | tts | [] | `app/src/content/colors.json`, `app/src/content/shapes.json`, `app/public/audio/**` | 6 màu, 4 hình (tròn, vuông, tam giác, sao) |
| T-008 | Game Con vật (trang trại 3D) | ui | [T-003, T-004, T-005] | `app/src/games/animals/**`, `app/e2e/animals.spec.ts` | Chạm con vật → nhảy, nói tên rồi tiếng kêu; nút 🏠 về bản đồ |
| T-009 | Game Màu và hình: chạm khối 3D | ui | [T-005, T-007] | `app/src/games/shapes/**`, `app/e2e/shapes.spec.ts` | Khối 3D xoay chậm; chạm → nảy, nói màu và tên hình |
| T-010 | Nội dung số 1–10 vi/ja | tts | [] | `app/src/content/numbers.json`, `app/public/audio/**` | `number.1` … `number.10` |
| T-011 | Game Màu và hình: kéo vào bóng | ui | [T-009] | `app/src/games/shapes/**`, `app/e2e/shapes.spec.ts` | Kéo khối vào ô bóng cùng hình; đúng thì khen `ui.great`, sai thì khối trôi về nhẹ nhàng |
| T-012 | Âm thanh đàn và trống bằng WebAudio | logic | [] | `app/src/core/synth.ts`, `app/src/core/synth.test.ts` | `playNote(i)` 8 nốt đô–đô, `playDrum(kind)` 4 loại; không cần file âm thanh |
| T-013 | Game Đếm quả | ui | [T-005, T-010] | `app/src/games/counting/**`, `app/e2e/counting.spec.ts` | Chạm từng quả trên cây → quả rơi vào giỏ, đọc số đếm |
| T-014 | Game Vẽ và nhạc: phần vẽ | ui | [T-005] | `app/src/games/music/**`, `app/e2e/music.spec.ts` | Vẽ bằng ngón tay, 6 màu, nút xóa to |
| T-015 | Game Vẽ và nhạc: đàn và trống | ui | [T-012, T-014] | `app/src/games/music/**`, `app/e2e/music.spec.ts` | 8 phím đàn đất sét nhiều màu, 4 trống |
| T-016 | Kiểm tra hiệu năng và dung lượng | test | [T-008, T-011, T-013, T-015] | `app/e2e/perf.spec.ts`, `app/scripts/check-size.mjs`, `app/package.json` | Đo FPS ≥ 50 trên scene 3D, tổng `dist/` < 60MB; thêm check-size vào verify |

- [ ] **Step 1:** Tạo đủ các file task theo bảng (T-003 → T-016, theo thứ tự).
- [ ] **Step 2:** Promote những task đủ điều kiện cho đêm đầu: T-003, T-004, T-007, T-010, T-012. Các task còn lại để trong backlog và promote dần sau khi duyệt report mỗi sáng.
- [ ] **Step 3:** `node ops/runner/night-run.mjs --dry-run`. Kỳ vọng liệt kê đúng 5 task đó.
- [ ] **Step 4: Commit** `git add ops && git commit -m "chore(ops): backlog giai đoạn 1"`. Đêm nay Task Scheduler sẽ chạy.

---

## Hoàn tất plan B khi
- `cd ops/runner && npm test` xanh.
- T-001 (tts) tự vào `done` và đã merge; T-002 (ui) vào `review`, có ảnh trong report, approve được.
- Task Scheduler đã đăng ký, `--dry-run` liệt kê đúng các task cho đêm đầu.

## Ghi chú vận hành
(Điền khi chạy thử ở Task 11.)
