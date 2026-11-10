import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo } from './helpers.mjs';
import { runNight, GUARDED, defaultReviewer } from '../night-run.mjs';
import { STATES, moveTask, loadAll } from '../lib/tasks.mjs';

const quiet = () => {};

function env() {
  const { root, g } = tempRepo();
  fs.appendFileSync(path.join(root, '.gitignore'), 'ops/logs/\nops/reports/shots/\nops/.runner.lock\n');
  const tasksDir = path.join(root, 'ops', 'tasks');
  for (const s of STATES) {
    fs.mkdirSync(path.join(tasksDir, s), { recursive: true });
    fs.writeFileSync(path.join(tasksDir, s, '.gitkeep'), '');
  }
  fs.mkdirSync(path.join(root, 'ops', 'runner'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ops', 'runner', 'x.mjs'), '// runner\n');
  fs.mkdirSync(path.join(root, 'ops', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ops', 'reports', '.gitkeep'), '');
  g('add', '-A');
  g('commit', '-qm', 'ops');
  return { root, g, tasksDir, lockFile: path.join(root, 'ops', '.runner.lock') };
}

function addTask(tasksDir, id, { state = 'todo', deps = [], type = 'logic', name = id } = {}) {
  const text = `---\nid: ${id}\ntitle: thử ${id}\ntype: ${type}\ndepends_on: ${JSON.stringify(deps)}\nscope: ["app/**"]\nacceptance: ["npm run verify"]\n---\nmô tả\n`;
  fs.writeFileSync(path.join(tasksDir, state, `${name}.md`), text);
}

// giờ HH:MM cách hiện tại `min` phút (deadlineFrom tự lùi sang ngày mai nếu cần)
function hhmm(min) {
  const d = new Date(Date.now() + min * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// processTask giả: chuyển doing → trạng thái kết quả sau một nhịp, ghi lại thứ tự và số task song song
function fakeProcess(behaviour = {}) {
  const s = { calls: [], finished: [], active: 0, maxActive: 0, seenStates: {}, doneBeforeStart: {} };
  s.fn = async (task, slot, ctx) => {
    s.seenStates[task.id] = task.state;
    s.doneBeforeStart[task.id] = [...s.finished];
    s.calls.push(task.id);
    s.active++;
    s.maxActive = Math.max(s.maxActive, s.active);
    const doing = moveTask(ctx.tasksDir, task, 'doing');
    await new Promise((r) => setTimeout(r, 30));
    const b = behaviour[task.id] ?? {};
    if (b.sideEffect) b.sideEffect(ctx);
    const status = b.status ?? 'done';
    moveTask(ctx.tasksDir, doing, status === 'paused' ? 'todo' : status);
    s.active--;
    s.finished.push(task.id);
    return { id: task.id, title: task.title, type: task.type, status, minutes: 0, ...(b.extra ?? {}) };
  };
  return s;
}

const opts = (e, extra = {}) => ({ root: e.root, until: hhmm(120), parallel: '2', noReview: true, ...extra });
const lastMsg = (e) => e.g('log', '-1', '--format=%s');

test('chạy song song tối đa --parallel, dependency xong thì task phụ thuộc chạy trong cùng đêm, rồi commit ops', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002', { deps: ['T-001'] });
  addTask(e.tasksDir, 'T-003');
  addTask(e.tasksDir, 'T-004');
  const p = fakeProcess();
  const res = await runNight(opts(e), { processTask: p.fn, log: quiet });
  assert.deepEqual([...p.calls].sort(), ['T-001', 'T-002', 'T-003', 'T-004']);
  assert.equal(p.maxActive, 2);
  // T-002 chỉ được bắt đầu sau khi T-001 đã xong (done)
  assert.equal(p.seenStates['T-002'], 'todo');
  assert.ok(p.doneBeforeStart['T-002'].includes('T-001'));
  assert.ok(loadAll(e.tasksDir).every((t) => t.state === 'done'));
  assert.equal(res.records.length, 4);
  assert.equal(res.committed, true);
  assert.match(lastMsg(e), /^chore\(ops\): kết quả đêm \d{4}-\d{2}-\d{2}$/);
  assert.ok(fs.existsSync(path.join(e.root, 'ops', 'reports', `${res.date}.html`)));
  const json = JSON.parse(fs.readFileSync(path.join(e.root, 'ops', 'reports', `${res.date}.json`), 'utf8'));
  assert.equal(json.records.length, 4);
  assert.ok(!fs.existsSync(e.lockFile), 'lock phải được xóa khi xong');
  assert.equal(e.g('status', '--porcelain'), '');
});

test('task bị pause không bị chạy lại trong cùng đêm', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  const p = fakeProcess({ 'T-001': { status: 'paused', extra: { reason: 'npm ci thất bại' } } });
  const res = await runNight(opts(e), { processTask: p.fn, log: quiet });
  assert.deepEqual(p.calls, ['T-001']);
  assert.equal(res.records[0].status, 'paused');
  assert.equal(loadAll(e.tasksDir)[0].state, 'todo');
});

test('record fatal → ngừng giao task mới, report có banner', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002');
  addTask(e.tasksDir, 'T-003');
  const p = fakeProcess({ 'T-001': { status: 'paused', extra: { fatal: true, reason: 'claude chưa đăng nhập/hết hạn: please run /login' } } });
  const res = await runNight(opts(e, { parallel: '1' }), { processTask: p.fn, log: quiet });
  assert.deepEqual(p.calls, ['T-001']);
  assert.equal(res.stoppedEarly, true);
  const html = fs.readFileSync(path.join(e.root, 'ops', 'reports', `${res.date}.html`), 'utf8');
  assert.match(html, /class="alert"/);
  assert.match(html, /please run \/login/);
  assert.equal(res.committed, true);
});

test('fatal khi đang chạy song song: task đang chạy vẫn được chạy xong', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002');
  addTask(e.tasksDir, 'T-003');
  const p = fakeProcess({ 'T-001': { status: 'paused', extra: { fatal: true, reason: 'auth' } } });
  const res = await runNight(opts(e, { parallel: '2' }), { processTask: p.fn, log: quiet });
  assert.deepEqual([...p.calls].sort(), ['T-001', 'T-002']);
  assert.equal(res.records.length, 2);
});

test('integrity guard: agent ghi vào ops/runner → ngừng giao task, không commit, report có banner', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002');
  const before = e.g('rev-parse', 'HEAD');
  const p = fakeProcess({
    'T-001': { sideEffect: (ctx) => fs.writeFileSync(path.join(ctx.root, 'ops', 'runner', 'evil.mjs'), 'x') },
  });
  const res = await runNight(opts(e, { parallel: '1' }), { processTask: p.fn, log: quiet });
  assert.deepEqual(p.calls, ['T-001']);
  assert.equal(res.committed, false);
  assert.equal(e.g('rev-parse', 'HEAD'), before);
  assert.match(res.integrity.join('\n'), /ops\/runner\/evil\.mjs/);
  const html = fs.readFileSync(path.join(e.root, 'ops', 'reports', `${res.date}.html`), 'utf8');
  assert.match(html, /class="alert"/);
  assert.match(html, /evil\.mjs/);
  assert.ok(!fs.existsSync(e.lockFile));
});

test('integrity guard: CLAUDE.md bị sửa cũng bị phát hiện', async () => {
  const e = env();
  fs.writeFileSync(path.join(e.root, 'CLAUDE.md'), 'luật\n');
  e.g('add', '-A');
  e.g('commit', '-qm', 'claude');
  addTask(e.tasksDir, 'T-001');
  const p = fakeProcess({ 'T-001': { sideEffect: (ctx) => fs.appendFileSync(path.join(ctx.root, 'CLAUDE.md'), 'thêm\n') } });
  const res = await runNight(opts(e), { processTask: p.fn, log: quiet });
  assert.equal(res.committed, false);
  assert.match(res.integrity.join('\n'), /CLAUDE\.md/);
});

test('integrity guard: .claude bị ghi cũng bị phát hiện; ops/tasks, reports, logs, lock không nằm trong danh sách', async () => {
  assert.ok(GUARDED.includes('.claude'));
  for (const p of ['ops/tasks', 'ops/reports', 'ops/logs', 'ops/.runner.lock']) assert.ok(!GUARDED.includes(p), p);
  const e = env();
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002');
  const p = fakeProcess({ 'T-001': { sideEffect: (ctx) => {
    fs.mkdirSync(path.join(ctx.root, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(ctx.root, '.claude', 'settings.json'), '{}');
  } } });
  const res = await runNight(opts(e, { parallel: '1' }), { processTask: p.fn, log: quiet });
  assert.deepEqual(p.calls, ['T-001']);
  assert.equal(res.committed, false);
  assert.match(res.integrity.join('\n'), /\.claude/);
});

test('defaultReviewer dùng reviewerArgs (30 lượt)', async () => {
  const e = env();
  fs.mkdirSync(path.join(e.root, 'ops', 'runner', 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(e.root, 'ops', 'runner', 'prompts', 'reviewer.md'), 'role');
  let seen = null;
  const exec = async (cmd, args) => { seen = args; return { code: 0, stdout: JSON.stringify({ result: 'ok' }), stderr: '' }; };
  await defaultReviewer({ root: e.root, ops: path.join(e.root, 'ops'), records: [], logFile: null, exec });
  assert.equal(seen[seen.indexOf('--max-turns') + 1], '30');
  assert.match(seen[seen.indexOf('--settings') + 1], /reviewer-settings\.json$/);
});

test('dry-run: liệt kê task sẵn sàng, bị chặn, file lỗi; không cần nhánh main, không tạo lock', async () => {
  const e = env();
  e.g('checkout', '-q', '-b', 'phase-0');
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002', { deps: ['T-009'] });
  addTask(e.tasksDir, 'T-003', { deps: ['T-001'] });
  fs.writeFileSync(path.join(e.tasksDir, 'todo', 'hong.md'), 'không có frontmatter');
  const lines = [];
  const p = fakeProcess();
  const res = await runNight(opts(e, { dryRun: true }), { processTask: p.fn, log: (s) => lines.push(s) });
  const out = lines.join('\n');
  assert.deepEqual(p.calls, []);
  assert.deepEqual(res.ready.map((t) => t.id), ['T-001']);
  assert.match(out, /T-001/);
  assert.match(out, /T-002.*T-009/);
  assert.match(out, /T-003.*T-001/);
  assert.match(out, /hong\.md/);
  assert.ok(!fs.existsSync(e.lockFile));
});

test('dry-run với hạn chót quá 14 giờ chỉ cảnh báo', async () => {
  const e = env();
  const lines = [];
  await runNight(opts(e, { dryRun: true, until: hhmm(-60) }), { log: (s) => lines.push(s) });
  assert.match(lines.join('\n'), /14 giờ/);
});

test('khôi phục task kẹt ở doing/ về todo/; file đích trùng không làm dừng cả đêm', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001', { state: 'doing' });
  addTask(e.tasksDir, 'T-002', { state: 'doing' });
  addTask(e.tasksDir, 'T-002', { state: 'todo' }); // cùng tên file → move doing→todo bị từ chối
  addTask(e.tasksDir, 'T-003');
  const p = fakeProcess();
  const res = await runNight(opts(e), { processTask: p.fn, log: quiet });
  assert.equal(p.seenStates['T-001'], 'todo');
  assert.ok(p.calls.includes('T-001'));
  assert.ok(p.calls.includes('T-003'));
  assert.ok(!p.calls.includes('T-002'));
  assert.ok(res.errors.some((x) => /T-002/.test(x.file) && /đã tồn tại/.test(x.message)));
  const html = fs.readFileSync(path.join(e.root, 'ops', 'reports', `${res.date}.html`), 'utf8');
  assert.match(html, /đã tồn tại/);
});

test('lock: night-run khác đang sống → từ chối chạy, không đụng lock', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  fs.writeFileSync(e.lockFile, JSON.stringify({ pid: process.pid, startedAt: 'x' }));
  const p = fakeProcess();
  await assert.rejects(runNight(opts(e), { processTask: p.fn, log: quiet }), /đang chạy/);
  assert.deepEqual(p.calls, []);
  assert.ok(fs.existsSync(e.lockFile));
});

test('lock: pid đã chết → coi là lock cũ, chạy bình thường', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  fs.writeFileSync(e.lockFile, JSON.stringify({ pid: 2147483646, startedAt: 'x' }));
  const p = fakeProcess();
  await runNight(opts(e), { processTask: p.fn, log: quiet });
  assert.deepEqual(p.calls, ['T-001']);
  assert.ok(!fs.existsSync(e.lockFile));
});

test('hai lần chạy đồng thời trong cùng tiến trình → lần thứ hai bị từ chối', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  const p = fakeProcess();
  const first = runNight(opts(e), { processTask: p.fn, log: quiet });
  await assert.rejects(runNight(opts(e), { processTask: p.fn, log: quiet }), /đang chạy/);
  await first;
  assert.deepEqual(p.calls, ['T-001']);
});

test('preflight: không ở main / gốc bẩn / ops/runner bẩn → từ chối và nhả lock', async () => {
  const e = env();
  e.g('checkout', '-q', '-b', 'phase-0');
  await assert.rejects(runNight(opts(e), { processTask: fakeProcess().fn, log: quiet }), /main/);
  assert.ok(!fs.existsSync(e.lockFile));
  e.g('checkout', '-q', 'main');
  fs.writeFileSync(path.join(e.root, 'app', 'a.txt'), 'bẩn');
  await assert.rejects(runNight(opts(e), { processTask: fakeProcess().fn, log: quiet }), /chưa commit/);
  e.g('checkout', '--', 'app/a.txt');
  fs.writeFileSync(path.join(e.root, 'ops', 'runner', 'x.mjs'), 'sửa tay');
  await assert.rejects(runNight(opts(e), { processTask: fakeProcess().fn, log: quiet }), /ops\/runner/);
});

test('preflight: hạn chót quá 14 giờ, --parallel sai → từ chối', async () => {
  const e = env();
  const p = fakeProcess();
  await assert.rejects(runNight(opts(e, { until: hhmm(-60) }), { processTask: p.fn, log: quiet }), /14 giờ/);
  for (const parallel of ['0', '7', 'abc', '2.5']) {
    await assert.rejects(runNight(opts(e, { parallel }), { processTask: p.fn, log: quiet }), /--parallel/);
  }
  await assert.rejects(runNight(opts(e, { until: '25:00' }), { processTask: p.fn, log: quiet }), /giờ dừng/);
  assert.deepEqual(p.calls, []);
});

test('reviewer: nhận records, nhận xét vào report; reviewer lỗi vẫn ghi report', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  let got = null;
  const res = await runNight(opts(e, { noReview: false }), {
    processTask: fakeProcess().fn, log: quiet,
    runReviewer: async ({ records }) => { got = records; return 'Nên duyệt hết.'; },
  });
  assert.equal(got.length, 1);
  assert.match(fs.readFileSync(path.join(e.root, 'ops', 'reports', `${res.date}.html`), 'utf8'), /Nên duyệt hết/);

  addTask(e.tasksDir, 'T-002');
  const res2 = await runNight(opts(e, { noReview: false }), {
    processTask: fakeProcess().fn, log: quiet,
    runReviewer: async () => { throw new Error('claude sập'); },
  });
  const html = fs.readFileSync(path.join(e.root, 'ops', 'reports', `${res2.date}.html`), 'utf8');
  assert.match(html, /claude sập/);
  assert.equal(res2.committed, true);
});

test('--no-review: không gọi reviewer', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  let called = false;
  await runNight(opts(e), { processTask: fakeProcess().fn, log: quiet, runReviewer: async () => { called = true; return ''; } });
  assert.equal(called, false);
});

test('processTask ném lỗi → ghi record failed, các task khác vẫn chạy', async () => {
  const e = env();
  addTask(e.tasksDir, 'T-001');
  addTask(e.tasksDir, 'T-002');
  const p = fakeProcess();
  const fn = async (t, slot, ctx) => {
    if (t.id === 'T-001') throw new Error('nổ');
    return p.fn(t, slot, ctx);
  };
  const res = await runNight(opts(e, { parallel: '1' }), { processTask: fn, log: quiet });
  const r1 = res.records.find((r) => r.id === 'T-001');
  assert.equal(r1.status, 'failed');
  assert.match(r1.reason, /nổ/);
  assert.deepEqual(p.calls, ['T-002']);
});
