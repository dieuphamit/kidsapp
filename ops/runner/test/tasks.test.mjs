import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as tasksLib from '../lib/tasks.mjs';

const { parseTask, serializeTask, loadAll, eligible, moveTask } = tasksLib;
// hàm mới: chưa tồn tại thì test phải fail rõ ràng thay vì lỗi import
const loadAllWithErrors = (...a) => tasksLib.loadAllWithErrors(...a);
const blockedReasons = (...a) => tasksLib.blockedReasons(...a);

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

const BASE = { id: 'id: T-001', title: 'title: Tên', type: 'type: ui', scope: 'scope: ["app/**"]', acceptance: 'acceptance: ["npm run verify"]' };
const mkText = (over = {}) => `---\n${Object.values({ ...BASE, ...over }).join('\n')}\n---\nMô tả.\n`;

test('parseTask: YAML hỏng thì lỗi có tên file', () => {
  assert.throws(() => parseTask('---\nid: [T-1\n---\nx', 'hong.md'), /hong\.md/);
});

test('parseTask: id phải dạng T-<số>, không ép kiểu số', () => {
  assert.throws(() => parseTask(mkText({ id: 'id: 5' }), 'a.md'), /a\.md.*id/);
  assert.throws(() => parseTask(mkText({ id: 'id: task-1' }), 'b.md'), /b\.md.*id/);
  assert.equal(parseTask(mkText({ id: 'id: T-1000' }), 'c.md').id, 'T-1000');
});

test('parseTask: depends_on chuỗi đơn được bọc thành mảng; id phụ thuộc sai thì lỗi', () => {
  assert.deepEqual(parseTask(mkText({ dep: 'depends_on: T-002' }), 'a.md').depends_on, ['T-002']);
  assert.throws(() => parseTask(mkText({ dep: 'depends_on: [T-002, xyz]' }), 'd.md'), /d\.md.*depends_on/);
  assert.throws(() => parseTask(mkText({ dep: 'depends_on: {a: 1}' }), 'e.md'), /e\.md.*depends_on/);
});

test('parseTask: scope/acceptance là mảng chuỗi không rỗng; chuỗi đơn được bọc', () => {
  const t = parseTask(mkText({ scope: 'scope: app/src/**', acceptance: 'acceptance: npm test' }), 'a.md');
  assert.deepEqual(t.scope, ['app/src/**']);
  assert.deepEqual(t.acceptance, ['npm test']);
  assert.throws(() => parseTask(mkText({ scope: 'scope: ["app/**", ""]' }), 's.md'), /s\.md.*scope/);
  assert.throws(() => parseTask(mkText({ scope: 'scope: []' }), 's2.md'), /s2\.md.*scope/);
  assert.throws(() => parseTask(mkText({ acceptance: 'acceptance: [1, 2]' }), 'ac.md'), /ac\.md.*acceptance/);
});

test('parseTask: type phải thuộc ui|logic|asset|tts|test', () => {
  for (const ty of ['ui', 'logic', 'asset', 'tts', 'test']) assert.equal(parseTask(mkText({ type: `type: ${ty}` }), 'a.md').type, ty);
  assert.throws(() => parseTask(mkText({ type: 'type: backend' }), 't.md'), /t\.md.*type/);
});

test('serializeTask không gập dòng dài', () => {
  const long = 'x'.repeat(200) + ' ' + 'y'.repeat(200);
  const t = parseTask(mkText({ title: `title: "${long}"` }), 'a.md');
  const out = serializeTask(t);
  assert.ok(out.split('\n').includes(`title: ${long}`), out);
  assert.equal(parseTask(out, 'a.md').title, long);
});

const tmpTasks = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-'));
const put = (dir, state, name, text) => {
  fs.mkdirSync(path.join(dir, state), { recursive: true });
  fs.writeFileSync(path.join(dir, state, name), text);
};

test('loadAll không ném lỗi vì một file hỏng; loadAllWithErrors báo lỗi kèm file', () => {
  const dir = tmpTasks();
  put(dir, 'todo', 'T-001-a.md', mkText());
  put(dir, 'todo', 'T-002-hong.md', '---\nid: [\n---\n');
  put(dir, 'todo', 'T-003-thieu.md', '---\nid: T-003\n---\n');
  assert.deepEqual(loadAll(dir).map((t) => t.id), ['T-001']);
  const { tasks, errors } = loadAllWithErrors(dir);
  assert.deepEqual(tasks.map((t) => t.id), ['T-001']);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((e) => e.file && e.message));
  assert.ok(errors.some((e) => e.file.endsWith('T-002-hong.md')));
});

test('loadAll: id trùng giữa các trạng thái → giữ bản ở trạng thái tiến xa nhất, báo lỗi', () => {
  const dir = tmpTasks();
  put(dir, 'todo', 'T-001-a.md', mkText());
  put(dir, 'done', 'T-001-a.md', mkText());
  put(dir, 'failed', 'T-001-b.md', mkText());
  const { tasks, errors } = loadAllWithErrors(dir);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].state, 'done');
  assert.equal(errors.length, 2);
  assert.ok(errors.every((e) => /trùng/.test(e.message) && /T-001/.test(e.message)));
});

test('thứ tự id theo số: T-999 trước T-1000 (eligible và loadAll)', () => {
  const dir = tmpTasks();
  put(dir, 'todo', 'T-1000-a.md', mkText({ id: 'id: T-1000' }));
  put(dir, 'todo', 'T-999-b.md', mkText({ id: 'id: T-999' }));
  put(dir, 'todo', 'T-20-c.md', mkText({ id: 'id: T-20' }));
  const all = loadAll(dir);
  assert.deepEqual(all.map((t) => t.id), ['T-20', 'T-999', 'T-1000']);
  assert.deepEqual(eligible([...all].reverse()).map((t) => t.id), ['T-20', 'T-999', 'T-1000']);
});

test('moveTask ghi nguyên tử, không để lại .tmp, từ chối ghi đè file khác', () => {
  const dir = tmpTasks();
  put(dir, 'todo', 'T-001-a.md', mkText());
  put(dir, 'failed', 'T-001-a.md', 'cũ');
  const src = path.join(dir, 'todo', 'T-001-a.md');
  const t = { ...parseTask(fs.readFileSync(src, 'utf8'), src), state: 'todo' };
  assert.throws(() => moveTask(dir, t, 'failed'), /tồn tại/);
  assert.ok(fs.existsSync(t.file), 'nguồn còn nguyên');
  assert.equal(fs.readFileSync(path.join(dir, 'failed', 'T-001-a.md'), 'utf8'), 'cũ');
  const moved = moveTask(dir, t, 'doing');
  assert.ok(!fs.existsSync(t.file));
  assert.deepEqual(fs.readdirSync(path.join(dir, 'doing')), ['T-001-a.md']);
  const again = moveTask(dir, { ...moved, attempts: 3 }, 'doing');
  assert.equal(parseTask(fs.readFileSync(again.file, 'utf8'), 'x').attempts, 3);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'doing')), ['T-001-a.md']);
});

test('blockedReasons liệt kê lý do task todo chưa chạy được', () => {
  const t = (id, state, deps = []) => ({ id, state, depends_on: deps });
  const list = [t('T-1', 'done'), t('T-2', 'failed'), t('T-3', 'review'), t('T-4', 'todo', ['T-1']),
    t('T-5', 'todo', ['T-1', 'T-2', 'T-3', 'T-99']), t('T-6', 'todo', ['T-5'])];
  assert.deepEqual(blockedReasons(list), [
    { id: 'T-5', missing: ['T-99'], failed: ['T-2'], waiting: ['T-3'] },
    { id: 'T-6', missing: [], failed: [], waiting: ['T-5'] },
  ]);
});
