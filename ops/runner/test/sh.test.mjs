import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as sh from '../lib/sh.mjs';

const { run } = sh;
const WIN = process.platform === 'win32';

test('tiến trình thoát sớm khi còn 200 KB stdin: resolve, không làm sập runner', async () => {
  const r = await run('node', ['-e', 'process.exit(3)'], { input: 'x'.repeat(200 * 1024) });
  assert.equal(r.code, 3);
});

test('logFile nằm trong thư mục chưa có thì tự tạo, ghi đủ log', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-'));
  const logFile = path.join(dir, 'a', 'b', 'run.log');
  const r = await run('node', ['-e', 'console.log("xin chào log")'], { logFile });
  assert.equal(r.code, 0);
  assert.match(fs.readFileSync(logFile, 'utf8'), /xin chào log/);
});

test('logFile không mở được thì vẫn chạy và resolve', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-'));
  const blocker = path.join(dir, 'la-file');
  fs.writeFileSync(blocker, 'x');
  const r = await run('node', ['-e', 'console.log(1)'], { logFile: path.join(blocker, 'run.log') });
  assert.equal(r.code, 0);
  assert.equal(r.stdout.trim(), '1');
});

test('sau khi kill do timeout mà close không tới thì vẫn resolve với code 1', async () => {
  const t0 = Date.now();
  const r = await run('node', ['-e', 'setTimeout(()=>{},8000)'], { timeoutMs: 200, killGraceMs: 300, killFn: () => {} });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /quá thời gian/);
  assert.ok(Date.now() - t0 < 3000, `mất ${Date.now() - t0}ms`);
  assert.ok(r.pid, 'trả về pid');
  // tiến trình vẫn sống (killFn giả không làm gì) → chứng tỏ resolve không cần chờ close
  assert.doesNotThrow(() => process.kill(r.pid, 0));
  process.kill(r.pid);
});

test('stdout giữ phần đuôi khi vượt maxBuffer, log file vẫn giữ toàn bộ', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-'));
  const logFile = path.join(dir, 'run.log');
  const r = await run('node', ['-e', 'process.stdout.write("a".repeat(50000) + "END")'], { maxBuffer: 1000, logFile });
  assert.equal(r.code, 0);
  assert.ok(r.stdout.length <= 1000, `dài ${r.stdout.length}`);
  assert.ok(r.stdout.endsWith('END'));
  assert.equal(r.stdoutTruncated, true);
  assert.ok(fs.readFileSync(logFile, 'utf8').includes('a'.repeat(50000) + 'END'));
});

test('quoteArg nhân đôi dấu \\ cuối trước dấu nháy đóng', () => {
  assert.equal(sh.quoteArg('C:\\a b\\'), '"C:\\a b\\\\"');
  assert.equal(sh.quoteArg('x y\\"z'), '"x y\\\\""z"');
  assert.equal(sh.quoteArg('plain'), 'plain');
});

test('đường shell trên Windows từ chối tham số chứa % (cmd mở rộng %VAR% cả trong nháy)', { skip: !WIN }, async () => {
  const r = await run('npm', ['--version', '%PATH%']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /%/);
  assert.equal(r.stdout, '');
});

test('git và npm (.cmd qua shell) đều chạy được', async () => {
  const g = await run('git', ['--version']);
  assert.equal(g.code, 0);
  assert.match(g.stdout, /git version/);
  const n = await run('npm', ['--version']);
  assert.equal(n.code, 0);
  assert.match(n.stdout.trim(), /^\d+\.\d+\.\d+/);
});

test('stdin được chuyển vào tiến trình (UTF-8)', async () => {
  const r = await run('node', ['-e', 'process.stdin.pipe(process.stdout)'], { input: 'xin chào' });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, 'xin chào');
});

test('quá timeout thì dừng và ghi dấu vào stderr', async () => {
  const t0 = Date.now();
  const r = await run('node', ['-e', 'setTimeout(()=>{},10000)'], { timeoutMs: 300 });
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /quá thời gian/);
  assert.ok(Date.now() - t0 < 3000);
});
