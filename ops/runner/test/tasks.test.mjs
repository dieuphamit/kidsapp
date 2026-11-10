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
