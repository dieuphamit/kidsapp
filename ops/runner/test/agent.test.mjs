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

import { CLAUDE_ARGS, claudeArgs, reviewerArgs, BASE_PORT, MAX_TURNS, isAuthError, agentFailure, denialSummary, runAgent } from '../lib/agent.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const jsonOut = (o) => JSON.stringify(o);

test('CLAUDE_ARGS tách khỏi cấu hình/hook/MCP của người dùng', () => {
  const i = CLAUDE_ARGS.indexOf('--setting-sources');
  assert.ok(i >= 0);
  assert.equal(CLAUDE_ARGS[i + 1], 'project');
  assert.ok(CLAUDE_ARGS.includes('--strict-mcp-config'));
  assert.equal(CLAUDE_ARGS[CLAUDE_ARGS.indexOf('--permission-mode') + 1], 'dontAsk');
});

test('--max-turns theo loại task', () => {
  const turns = (type) => { const a = claudeArgs(type, 's.json'); return a[a.indexOf('--max-turns') + 1]; };
  assert.equal(turns('ui'), '150');
  assert.equal(turns('logic'), '100');
  assert.equal(turns('test'), '100');
  assert.equal(turns('asset'), '60');
  assert.equal(turns('tts'), '60');
  assert.equal(MAX_TURNS.ui, 150);
  const a = claudeArgs('ui', 's.json');
  assert.equal(a[a.indexOf('--settings') + 1], 's.json');
  assert.equal(a.filter((x) => x === '--max-turns').length, 1);
});

test('quota: nhiều dạng thông báo; chỉ dùng stdout thô khi JSON hỏng', () => {
  for (const msg of ['5-hour limit reached ∙ resets 3pm', 'Weekly limit reached', 'API Error: 429', 'Overloaded', 'Session limit reached', 'rate_limit_error']) {
    assert.equal(isRateLimited({ code: 1, stdout: jsonOut({ is_error: true, result: msg }), stderr: '' }), true, msg);
  }
  // JSON hợp lệ: không quét stdout thô (ví dụ log tool có chữ 429) nữa
  const j = { code: 1, stdout: jsonOut({ is_error: true, result: 'TypeError: x is undefined', log: 'rate limit' }), stderr: '' };
  assert.equal(isRateLimited(j), false);
  assert.equal(isRateLimited({ code: 1, stdout: 'Claude usage limit reached', stderr: '' }), true);
  assert.equal(isRateLimited({ code: 0, stdout: jsonOut({ is_error: false, result: 'weekly limit reached?' }), stderr: '' }), false);
});

test('resetAt: giờ địa phương "resets 3pm", "3:30pm", "15:00"; qua rồi thì sang ngày sau', () => {
  const now = new Date(2026, 10, 10, 14, 0, 0);
  const at = (msg) => resetAt({ code: 1, stdout: jsonOut({ is_error: true, result: msg }), stderr: '' }, now);
  assert.equal(at('5-hour limit reached ∙ resets 3pm'), new Date(2026, 10, 10, 15, 0, 0).getTime());
  assert.equal(at('limit reached, resets 3:30pm (Asia/Tokyo)'), new Date(2026, 10, 10, 15, 30, 0).getTime());
  assert.equal(at('resets 15:00'), new Date(2026, 10, 10, 15, 0, 0).getTime());
  assert.equal(at('resets 1pm'), new Date(2026, 10, 11, 13, 0, 0).getTime());
  assert.equal(at('resets 12am'), new Date(2026, 10, 11, 0, 0, 0).getTime());
  assert.equal(at('Claude AI usage limit reached|1794300000'), 1794300000 * 1000);
  assert.equal(at('không có giờ'), null);
});

test('isAuthError: chưa đăng nhập / key sai, chỉ khi chạy thất bại', () => {
  assert.equal(isAuthError({ code: 1, stdout: jsonOut({ is_error: true, result: 'Invalid API key · Please run /login' }), stderr: '' }), true);
  assert.equal(isAuthError({ code: 1, stdout: '', stderr: 'Error: 401 authentication_error' }), true);
  assert.equal(isAuthError({ code: 0, stdout: jsonOut({ is_error: false, result: 'Đã sửa màn hình authentication' }), stderr: '' }), false);
});

test('agentFailure: exit≠0 hoặc is_error → lý do có exit, subtype, đuôi 500 ký tự', () => {
  assert.equal(agentFailure({ code: 0, json: { is_error: false, subtype: 'success', result: 'ok' } }), null);
  const r = agentFailure({ code: 1, json: { is_error: true, subtype: 'error_during_execution', result: 'x'.repeat(600) + 'CUỐI' }, stdout: '', stderr: '' });
  assert.match(r, /^agent lỗi \(exit 1, error_during_execution\): x+CUỐI$/);
  assert.ok(r.length < 560);
  assert.match(agentFailure({ code: 1, json: null, stdout: 'out', stderr: 'spawn lỗi' }), /^agent lỗi \(exit 1\): spawn lỗi$/);
  const mt = agentFailure({ code: 0, json: { is_error: true, subtype: 'error_max_turns', num_turns: 151 }, stdout: '', stderr: '' });
  assert.match(mt, /error_max_turns/);
  assert.match(mt, /hết số lượt/);
});

test('denialSummary: tool + 100 ký tự đầu của input, tối đa 5', () => {
  assert.equal(denialSummary(null), '');
  assert.equal(denialSummary({ permission_denials: [] }), '');
  const d = Array.from({ length: 7 }, (_, i) => ({ tool_name: 'Bash', tool_input: { command: `cp a${i} ${'z'.repeat(150)}` } }));
  d[0] = { tool_name: 'Write', tool_input: { file_path: '../../ops/x.txt', content: 'bí mật' } };
  const s = denialSummary({ permission_denials: d });
  assert.match(s, /^quyền bị từ chối \(7\): Write: \.\.\/\.\.\/ops\/x\.txt; Bash: cp a1 z+/);
  assert.ok(!s.includes('bí mật'));
  assert.ok(!s.includes('cp a5'));
  assert.match(s, /\(\+2 nữa\)$/);
  assert.ok(!/z{101}/.test(s));
});

test('runAgent: truyền E2E_PORT theo slot, timeout, settings và max-turns theo loại', async () => {
  const ops = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-'));
  fs.mkdirSync(path.join(ops, 'runner', 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(ops, 'runner', 'prompts', 'worker.md'), 'VAI');
  const calls = [];
  const fakeRun = async (cmd, args, opts) => { calls.push({ cmd, args, opts }); return { code: 0, stdout: jsonOut({ is_error: false, result: 'xong' }), stderr: '' }; };
  const r = await runAgent({ cwd: ops, task, ops, feedback: null, logFile: null, slot: 2, timeoutMs: 1234, run: fakeRun });
  assert.equal(calls[0].cmd, 'claude');
  assert.equal(calls[0].opts.env.E2E_PORT, '4175');
  assert.equal(calls[0].opts.timeoutMs, 1234);
  assert.equal(calls[0].args[calls[0].args.indexOf('--max-turns') + 1], '150');
  assert.equal(calls[0].args[calls[0].args.indexOf('--settings') + 1], path.join(ops, 'runner', 'agent-settings.json'));
  assert.equal(r.json.result, 'xong');
  assert.equal(r.rateLimited, false);
  assert.equal(r.authError, false);
});

test('reviewerArgs: --max-turns 30 và settings riêng của reviewer', () => {
  assert.equal(MAX_TURNS.review, 30);
  const a = reviewerArgs('r.json');
  assert.equal(a[a.indexOf('--max-turns') + 1], '30');
  assert.equal(a[a.indexOf('--settings') + 1], 'r.json');
  assert.ok(a.includes('--strict-mcp-config'));
  assert.equal(BASE_PORT, 4173);
});
