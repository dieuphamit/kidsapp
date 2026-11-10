import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCli } from '../task.mjs';
import { STATES, loadAll, parseTask } from '../lib/tasks.mjs';

const TEMPLATE = path.resolve(import.meta.dirname, '..', '..', 'tasks', '_template.md');

function env() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-'));
  const tasksDir = path.join(root, 'ops', 'tasks');
  for (const s of STATES) fs.mkdirSync(path.join(tasksDir, s), { recursive: true });
  fs.copyFileSync(TEMPLATE, path.join(tasksDir, '_template.md'));
  const lines = [];
  return { root, tasksDir, lines, log: (s) => lines.push(s) };
}

function addTask(tasksDir, state, id, extra = '') {
  const file = path.join(tasksDir, state, `${id}-x.md`);
  fs.writeFileSync(file, `---\nid: ${id}\ntitle: thử ${id}\ntype: ui\nscope: ["app/**"]\nacceptance: ["npm run verify"]\n${extra}---\nmô tả gốc\n`);
  return file;
}

const only = (e) => loadAll(e.tasksDir)[0];

test('template hợp lệ khi đã điền id', () => {
  const t = parseTask(fs.readFileSync(TEMPLATE, 'utf8'), '_template.md');
  assert.equal(t.id, 'T-000');
  assert.equal(t.type, 'ui');
});

test('new: id = số lớn nhất + 1 (tính cả file hỏng), tiêu đề có dấu hai chấm vẫn là YAML hợp lệ', async () => {
  const e = env();
  addTask(e.tasksDir, 'done', 'T-007');
  fs.writeFileSync(path.join(e.tasksDir, 'todo', 'T-012-hong.md'), 'không có frontmatter');
  const cli = createCli({ root: e.root, log: e.log });
  await cli.run(['new', 'Tên: địa điểm vi/ja', 'tts']);
  const file = path.join(e.tasksDir, 'backlog', 'T-013-ten-dia-diem-vi-ja.md');
  assert.ok(fs.existsSync(file), e.lines.join('\n'));
  const t = parseTask(fs.readFileSync(file, 'utf8'), file);
  assert.equal(t.id, 'T-013');
  assert.equal(t.title, 'Tên: địa điểm vi/ja');
  assert.equal(t.type, 'tts');
  assert.match(e.lines.join('\n'), /promote T-013/);
});

test('new: thư mục rỗng → T-001; type mặc định ui; type sai hoặc thiếu tiêu đề → lỗi', async () => {
  const e = env();
  const cli = createCli({ root: e.root, log: e.log });
  await cli.run(['new', 'Đầu tiên']);
  assert.equal(only(e).id, 'T-001');
  assert.equal(only(e).type, 'ui');
  await assert.rejects(cli.run(['new', 'X', 'video']), /type/);
  await assert.rejects(cli.run(['new']), /Thiếu tiêu đề/);
});

test('promote: backlog → todo; không có trong backlog → lỗi', async () => {
  const e = env();
  addTask(e.tasksDir, 'backlog', 'T-020');
  const cli = createCli({ root: e.root, log: e.log });
  await cli.run(['promote', 'T-020']);
  assert.equal(only(e).state, 'todo');
  await assert.rejects(cli.run(['promote', 'T-020']), /Không thấy T-020 trong backlog/);
});

test('reject: review → todo, nối phản hồi vào body, reset attempts, bỏ last_error cũ', async () => {
  const e = env();
  addTask(e.tasksDir, 'review', 'T-008', 'attempts: 1\nlast_error: lỗi cũ\n');
  const cli = createCli({ root: e.root, log: e.log, today: () => '2026-11-11' });
  await assert.rejects(cli.run(['reject', 'T-008']), /Thiếu nội dung/);
  await cli.run(['reject', 'T-008', 'Bò to hơn']);
  const t = only(e);
  assert.equal(t.state, 'todo');
  assert.equal(t.attempts, 0);
  assert.equal(t.last_error, undefined);
  assert.match(t.body, /mô tả gốc/);
  assert.match(t.body, /## Phản hồi của bố mẹ \(2026-11-11\)\n- Bò to hơn/);
});

test('retry: failed → todo, attempts về 0, GIỮ last_error để pipeline làm feedback', async () => {
  const e = env();
  addTask(e.tasksDir, 'failed', 'T-012', 'attempts: 2\nlast_error: npm run verify thất bại\n');
  const cli = createCli({ root: e.root, log: e.log });
  await cli.run(['retry', 'T-012']);
  const t = only(e);
  assert.equal(t.state, 'todo');
  assert.equal(t.attempts, 0);
  assert.equal(t.last_error, 'npm run verify thất bại');
  assert.match(e.lines.join('\n'), /npm run verify thất bại/);
});

test('approve: night-run đang chạy (lock pid sống) → từ chối, không merge', async () => {
  const e = env();
  addTask(e.tasksDir, 'review', 'T-008');
  fs.writeFileSync(path.join(e.root, 'ops', '.runner.lock'), JSON.stringify({ pid: process.pid, startedAt: 'x' }));
  let merged = false;
  const cli = createCli({ root: e.root, log: e.log, merge: async () => { merged = true; return { ok: true }; } });
  await assert.rejects(cli.run(['approve', 'T-008']), /đang chạy/);
  assert.equal(merged, false);
  assert.equal(only(e).state, 'review');
});

test('approve: merge xong → done; dọn worktree lỗi chỉ cảnh báo', async () => {
  const e = env();
  addTask(e.tasksDir, 'review', 'T-008');
  const cli = createCli({
    root: e.root, log: e.log,
    merge: async () => ({ ok: true }),
    removeWorktree: async () => { throw new Error('thư mục bị khóa'); },
  });
  await cli.run(['approve', 'T-008']);
  assert.equal(only(e).state, 'done');
  const out = e.lines.join('\n');
  assert.match(out, /thư mục bị khóa/);
  assert.match(out, /đã merge vào main/);
});

test('approve: conflict khi rebase → báo dùng reject, task vẫn ở review', async () => {
  const e = env();
  addTask(e.tasksDir, 'review', 'T-008');
  const cli = createCli({
    root: e.root, log: e.log,
    merge: async () => ({ ok: false, reset: true, reason: 'conflict khi rebase lên main' }),
  });
  await assert.rejects(cli.run(['approve', 'T-008']), /reject T-008/);
  assert.equal(only(e).state, 'review');
});

test('list: in theo trạng thái, kèm task bị chặn và file lỗi', async () => {
  const e = env();
  addTask(e.tasksDir, 'todo', 'T-001', 'depends_on: ["T-050"]\n');
  addTask(e.tasksDir, 'done', 'T-002');
  fs.writeFileSync(path.join(e.tasksDir, 'todo', 'hong.md'), 'x');
  const cli = createCli({ root: e.root, log: e.log });
  await cli.run(['list']);
  const out = e.lines.join('\n');
  assert.match(out, /todo\/\n {2}T-001/);
  assert.match(out, /done\/\n {2}T-002/);
  assert.match(out, /T-001: chưa có task T-050/);
  assert.match(out, /hong\.md/);
});

test('lệnh không biết → lỗi kèm hướng dẫn', async () => {
  const e = env();
  await assert.rejects(createCli({ root: e.root, log: e.log }).run(['xoa']), /Lệnh: list/);
});
