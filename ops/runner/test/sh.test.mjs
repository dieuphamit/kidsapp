import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../lib/sh.mjs';

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
