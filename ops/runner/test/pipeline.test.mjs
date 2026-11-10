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
