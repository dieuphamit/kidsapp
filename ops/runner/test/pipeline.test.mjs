import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo } from './helpers.mjs';
import { processTask, mergeVerified } from '../lib/pipeline.mjs';
import { createLock } from '../lib/lock.mjs';
import { parseTask, loadAll } from '../lib/tasks.mjs';
import { ensureWorktree, commitAll, worktreeDir } from '../lib/git.mjs';

function env() {
  const { root, g } = tempRepo();
  const ops = fs.mkdtempSync(path.join(root, '..', 'ops-'));
  const tasksDir = path.join(ops, 'tasks');
  for (const s of ['todo', 'doing', 'review', 'done', 'failed']) fs.mkdirSync(path.join(tasksDir, s), { recursive: true });
  return { root, ops, tasksDir, g };
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
    sleepUntil: async () => {},
  };
}

const writes = (rel) => async ({ cwd }) => {
  fs.mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
  fs.writeFileSync(path.join(cwd, rel), String(Math.random()));
  return { code: 0, rateLimited: false, json: { result: 'Đã xong.\nCÂU HỎI: thử?' } };
};

const stateDirEmpty = (e, s) => fs.readdirSync(path.join(e.tasksDir, s)).filter((f) => f.endsWith('.md')).length === 0;

test('logic qua verify → merge vào main, vào done', async () => {
  const e = env();
  const rec = await processTask(addTask(e.tasksDir, 'T-100', 'logic', ['app/**']), 0, ctx(e, writes('app/b.txt')));
  assert.equal(rec.status, 'done');
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'b.txt')));
  assert.equal(loadAll(e.tasksDir)[0].state, 'done');
  assert.match(rec.note, /CÂU HỎI/);
  assert.ok(!fs.existsSync(worktreeDir(e.root, 'T-100')));
});

test('ui qua verify → vào review, chưa merge', async () => {
  const e = env();
  const rec = await processTask(addTask(e.tasksDir, 'T-101', 'ui', ['app/**']), 1, ctx(e, writes('app/ui.txt')));
  assert.equal(rec.status, 'review');
  assert.ok(!fs.existsSync(path.join(e.root, 'app', 'ui.txt')));
});

test('chỉ sửa ngoài scope 2 lần → runner hoàn tác, coi như không làm gì → failed, main không đổi', async () => {
  const e = env();
  const feedbacks = [];
  const agent = async (a) => { feedbacks.push(a.feedback); return writes('README.md')(a); };
  const rec = await processTask(addTask(e.tasksDir, 'T-102', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'failed');
  assert.match(rec.reason, /không thay đổi gì/);
  assert.match(rec.note, /hoàn tác.*README\.md/);
  assert.equal(feedbacks[0], null);
  assert.match(feedbacks[1], /README\.md/);
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
  let slept = 0;
  const agent = async (a) => (++calls === 1 ? { code: 1, rateLimited: true, resetAt: Date.now() } : writes('app/e.txt')(a));
  const c = ctx(e, agent);
  c.sleepUntil = async () => { slept++; };
  const rec = await processTask(addTask(e.tasksDir, 'T-105', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'done');
  assert.equal(calls, 2);
  assert.equal(slept, 1);
});

test('dọn worktree lỗi sau merge → vẫn done, note có cảnh báo', async () => {
  const e = env();
  const c = ctx(e, writes('app/f.txt'));
  c.git = { removeWorktree: async () => { throw new Error('thư mục bị khóa'); } };
  const rec = await processTask(addTask(e.tasksDir, 'T-106', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'done');
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'f.txt')));
  assert.match(rec.note, /CÂU HỎI/);
  assert.match(rec.note, /\n\[cảnh báo dọn worktree: thư mục bị khóa\]/);
  assert.equal(loadAll(e.tasksDir)[0].state, 'done');
});

test('agent ném lỗi → task vào failed kèm last_error, không kẹt ở doing', async () => {
  const e = env();
  const agent = async () => { throw new Error('claude không chạy được'); };
  const rec = await processTask(addTask(e.tasksDir, 'T-107', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'failed');
  assert.match(rec.reason, /claude không chạy được/);
  const [t] = loadAll(e.tasksDir);
  assert.equal(t.state, 'failed');
  assert.match(t.last_error, /claude không chạy được/);
  assert.equal(t.attempts, 1);
  assert.ok(stateDirEmpty(e, 'doing'));
});

test('verify không chạy được (exec ném) → failed, không kẹt ở doing', async () => {
  const e = env();
  const c = ctx(e, writes('app/g.txt'));
  c.exec = async () => { throw new Error('spawn npm ENOENT'); };
  const rec = await processTask(addTask(e.tasksDir, 'T-108', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'failed');
  assert.match(rec.reason, /ENOENT/);
  assert.equal(loadAll(e.tasksDir)[0].state, 'failed');
  assert.ok(stateDirEmpty(e, 'doing'));
});

test('repo gốc bẩn khi merge → failed ngay, không thử lần hai, main không đổi', async () => {
  const e = env();
  fs.writeFileSync(path.join(e.root, 'dirty.txt'), 'chưa commit');
  let calls = 0;
  const agent = async (a) => { calls++; return writes('app/h.txt')(a); };
  const rec = await processTask(addTask(e.tasksDir, 'T-109', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'failed');
  assert.match(rec.reason, /repo gốc đang bẩn, không merge được/);
  assert.equal(calls, 1);
  assert.ok(!fs.existsSync(path.join(e.root, 'app', 'h.txt')));
  const [t] = loadAll(e.tasksDir);
  assert.equal(t.state, 'failed');
  assert.match(t.last_error, /repo gốc đang bẩn/);
});

test('ảnh chụp cũ của lần thử trước bị xóa trước khi verify', async () => {
  const e = env();
  fs.appendFileSync(path.join(e.root, '.gitignore'), 'app/test-results/\n');
  e.g('commit', '-qam', 'ignore test-results');
  let verifies = 0;
  const c = ctx(e, writes('app/i.txt'));
  c.exec = async (cmd, args, opts) => {
    if (!args.includes('verify')) return { code: 0, stdout: '', stderr: '' };
    verifies++;
    const shots = path.join(opts.cwd, 'test-results', 'shots');
    fs.mkdirSync(shots, { recursive: true });
    fs.writeFileSync(path.join(shots, verifies === 1 ? 'cu.png' : 'moi.png'), 'png');
    return { code: verifies === 1 ? 1 : 0, stdout: 'log', stderr: '' };
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-110', 'ui', ['app/**']), 0, c);
  assert.equal(rec.status, 'review');
  assert.deepEqual(rec.shots, ['shots/T-110/moi.png']);
  assert.deepEqual(fs.readdirSync(path.join(e.ops, 'shots', 'T-110')), ['moi.png']);
});

test('mergeVerified chạy được với ctx tối giản {root, mergeLock, exec} (approve)', async () => {
  const e = env();
  const task = addTask(e.tasksDir, 'T-111', 'ui', ['app/**']);
  const wt = await ensureWorktree(e.root, task.id);
  fs.writeFileSync(path.join(wt, 'app', 'j.txt'), 'j');
  await commitAll(wt, 'feat(T-111): thử');
  const m = await mergeVerified({ root: e.root, mergeLock: createLock(), exec: async () => ({ code: 0, stdout: '', stderr: '' }) },
    wt, task, 0, path.join(e.ops, 'approve.log'));
  assert.equal(m.ok, true);
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'j.txt')));
});

const verifyCounter = (c) => {
  const n = { verify: 0, ci: 0 };
  const inner = c.exec;
  c.exec = async (cmd, args, opts) => {
    if (args.includes('verify')) n.verify++;
    if (args.includes('ci')) n.ci++;
    return inner(cmd, args, opts);
  };
  return n;
};

test('agent không thay đổi gì → tính là một lần thử, không verify, không merge → failed', async () => {
  const e = env();
  let calls = 0;
  const feedbacks = [];
  const agent = async (a) => { calls++; feedbacks.push(a.feedback); return { code: 0, rateLimited: false, json: { result: 'Không cần làm gì.' } }; };
  const c = ctx(e, agent);
  const n = verifyCounter(c);
  const rec = await processTask(addTask(e.tasksDir, 'T-120', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'failed');
  assert.equal(rec.reason, 'agent không thay đổi gì');
  assert.equal(calls, 2);
  assert.equal(n.verify, 0);
  assert.match(feedbacks[1], /không thay đổi/);
  assert.equal(loadAll(e.tasksDir)[0].state, 'failed');
});

test('sửa cả trong lẫn ngoài scope → runner tự hoàn tác phần ngoài scope rồi verify, merge; không tốn lần thử', async () => {
  const e = env();
  let calls = 0;
  const agent = async (a) => {
    calls++;
    fs.writeFileSync(path.join(a.cwd, 'README.md'), 'ngoài scope');
    fs.writeFileSync(path.join(a.cwd, '.gitignore'), 'bị sửa\n');
    return writes('app/k.txt')(a);
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-121', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'done');
  assert.equal(calls, 1);
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'k.txt')));
  assert.ok(!fs.existsSync(path.join(e.root, 'README.md')));
  assert.equal(e.g('diff', '--quiet', 'HEAD~2', 'HEAD', '--', '.gitignore'), '');
  assert.match(rec.note, /hoàn tác file ngoài scope: (README\.md, \.gitignore|\.gitignore, README\.md)/);
  assert.match(e.g('log', '--format=%s', '-3'), /chore\(T-121\): runner hoàn tác file ngoài scope/);
});

test('npm ci thất bại → xóa node_modules, trả task về todo (paused), không gọi agent', async () => {
  const e = env();
  fs.writeFileSync(path.join(e.root, 'app', 'package.json'), '{}');
  e.g('add', '-A');
  e.g('commit', '-qm', 'app package');
  let calls = 0;
  const c = ctx(e, async (a) => { calls++; return writes('app/l.txt')(a); });
  c.exec = async (cmd, args, opts) => {
    if (args.includes('ci')) {
      fs.mkdirSync(path.join(opts.cwd, 'node_modules', 'nua-voi'), { recursive: true });
      return { code: 1, stdout: '', stderr: 'npm ERR! network ETIMEDOUT' };
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-122', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'paused');
  assert.match(rec.reason, /^npm ci thất bại: .*ETIMEDOUT/);
  assert.equal(calls, 0);
  assert.ok(!fs.existsSync(path.join(worktreeDir(e.root, 'T-122'), 'app', 'node_modules')));
  const [t] = loadAll(e.tasksDir);
  assert.equal(t.state, 'todo');
  assert.equal(t.attempts, 0);
});

test('còn dưới 20 phút tới hạn chót → paused trước khi gọi agent', async () => {
  const e = env();
  let calls = 0;
  const c = ctx(e, async (a) => { calls++; return writes('app/m.txt')(a); });
  c.deadline = new Date(Date.now() + 15 * 60_000);
  const rec = await processTask(addTask(e.tasksDir, 'T-123', 'logic', ['app/**']), 0, c);
  assert.equal(rec.status, 'paused');
  assert.equal(calls, 0);
  assert.equal(loadAll(e.tasksDir)[0].state, 'todo');
});

test('timeout của agent = min(90 phút, hạn chót − 10 phút); agent nhận slot', async () => {
  const e = env();
  const seen = [];
  const c = ctx(e, async (a) => { seen.push(a); return writes('app/n.txt')(a); });
  c.deadline = new Date(Date.now() + 60 * 60_000);
  await processTask(addTask(e.tasksDir, 'T-124', 'logic', ['app/**']), 3, c);
  assert.equal(seen[0].slot, 3);
  assert.ok(seen[0].timeoutMs <= 50 * 60_000 && seen[0].timeoutMs > 49 * 60_000, String(seen[0].timeoutMs));
  const e2 = env();
  const seen2 = [];
  const c2 = ctx(e2, async (a) => { seen2.push(a); return writes('app/n.txt')(a); });
  c2.deadline = new Date(Date.now() + 5 * 3_600_000);
  await processTask(addTask(e2.tasksDir, 'T-125', 'logic', ['app/**']), 0, c2);
  assert.equal(seen2[0].timeoutMs, 90 * 60_000);
});

test('claude chưa đăng nhập → paused, fatal, task về todo, không tính lần thử', async () => {
  const e = env();
  let calls = 0;
  const agent = async () => {
    calls++;
    return { code: 1, rateLimited: false, authError: true, stdout: '', stderr: '', json: { is_error: true, result: 'Invalid API key · Please run /login' } };
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-126', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'paused');
  assert.equal(rec.fatal, true);
  assert.match(rec.reason, /^claude chưa đăng nhập\/hết hạn: .*\/login/);
  assert.equal(calls, 1);
  const [t] = loadAll(e.tasksDir);
  assert.equal(t.state, 'todo');
  assert.equal(t.attempts, 0);
});

test('agent lỗi và không để lại thay đổi → lý do có exit/subtype/đuôi log', async () => {
  const e = env();
  const agent = async () => ({ code: 1, rateLimited: false, stdout: '', stderr: '', json: { is_error: true, subtype: 'error_during_execution', result: 'boom' } });
  const rec = await processTask(addTask(e.tasksDir, 'T-127', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'failed');
  assert.equal(rec.reason, 'agent lỗi (exit 1, error_during_execution): boom');
  assert.match(loadAll(e.tasksDir)[0].last_error, /error_during_execution/);
});

test('agent hết lượt nhưng đã để lại thay đổi → vẫn kiểm tra như thường và merge', async () => {
  const e = env();
  const agent = async (a) => {
    await writes('app/o.txt')(a);
    return { code: 1, rateLimited: false, stdout: '', stderr: '', json: { is_error: true, subtype: 'error_max_turns', num_turns: 101 } };
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-128', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'done');
  assert.match(rec.note, /error_max_turns/);
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'o.txt')));
});

test('permission_denials được tóm tắt vào note', async () => {
  const e = env();
  const agent = async (a) => {
    await writes('app/p.txt')(a);
    return { code: 0, rateLimited: false, json: { result: 'Xong.', permission_denials: [{ tool_name: 'Write', tool_input: { file_path: '../../ops/x.txt', content: 'x' } }] } };
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-129', 'logic', ['app/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'done');
  assert.match(rec.note, /^Xong\./);
  assert.match(rec.note, /quyền bị từ chối \(1\): Write: \.\.\/\.\.\/ops\/x\.txt/);
});

test('task có last_error → lần gọi đầu đã có phản hồi về lỗi trước', async () => {
  const e = env();
  const t = addTask(e.tasksDir, 'T-130', 'logic', ['app/**']);
  const feedbacks = [];
  const agent = async (a) => { feedbacks.push(a.feedback); return writes('app/q.txt')(a); };
  await processTask({ ...t, last_error: 'npm run verify thất bại' }, 0, ctx(e, agent));
  assert.match(feedbacks[0], /npm run verify thất bại/);
});

test('task asset: assets-src gốc hiện trong worktree, không bị commit, còn nguyên sau khi dọn', async () => {
  const e = env();
  fs.appendFileSync(path.join(e.root, '.gitignore'), 'assets-src/\n');
  e.g('commit', '-qam', 'ignore assets-src');
  fs.mkdirSync(path.join(e.root, 'assets-src', 'kenney'), { recursive: true });
  fs.writeFileSync(path.join(e.root, 'assets-src', 'kenney', 'bo.glb'), 'glTF');
  let seen = null;
  const agent = async (a) => {
    seen = fs.readFileSync(path.join(a.cwd, 'assets-src', 'kenney', 'bo.glb'), 'utf8');
    fs.mkdirSync(path.join(a.cwd, 'app', 'public', 'models'), { recursive: true });
    fs.copyFileSync(path.join(a.cwd, 'assets-src', 'kenney', 'bo.glb'), path.join(a.cwd, 'app', 'public', 'models', 'bo.glb'));
    return { code: 0, rateLimited: false, json: { result: 'Đã chép bò.' } };
  };
  const rec = await processTask(addTask(e.tasksDir, 'T-131', 'asset', ['app/public/models/**']), 0, ctx(e, agent));
  assert.equal(rec.status, 'done');
  assert.equal(seen, 'glTF');
  assert.ok(fs.existsSync(path.join(e.root, 'app', 'public', 'models', 'bo.glb')));
  assert.equal(e.g('ls-files', 'assets-src'), '');
  assert.equal(fs.readFileSync(path.join(e.root, 'assets-src', 'kenney', 'bo.glb'), 'utf8'), 'glTF');
  assert.ok(!fs.existsSync(worktreeDir(e.root, 'T-131')));
});
