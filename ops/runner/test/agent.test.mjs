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
