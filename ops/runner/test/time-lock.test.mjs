import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deadlineFrom, localDate, sleepUntil } from '../lib/time.mjs';
import { createLock } from '../lib/lock.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { acquireRunLock, liveRunLock, readRunLock, STALE_LOCK_MS } from '../lib/runlock.mjs';

test('deadline 06:30 lúc 23:00 là sáng hôm sau', () => {
  const d = deadlineFrom(new Date(2026, 10, 11, 23, 0), '06:30');
  assert.equal(d.getDate(), 12);
  assert.equal(d.getHours(), 6);
  assert.equal(d.getMinutes(), 30);
});

test('deadline 06:30 lúc 01:00 là cùng ngày', () => {
  assert.equal(deadlineFrom(new Date(2026, 10, 12, 1, 0), '06:30').getDate(), 12);
});

test('localDate dạng YYYY-MM-DD', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('sleepUntil không ngủ quá hạn chót; mặc định 30 phút khi không biết giờ reset', async () => {
  const slept = [];
  const sleep = async (ms) => { slept.push(ms); };
  await sleepUntil(5_000_000, new Date(2_000_000), () => 1_000_000, sleep);
  await sleepUntil(null, new Date(99_000_000), () => 1_000_000, sleep);
  assert.deepEqual(slept, [1_000_000, 30 * 60_000]);
});

test('deadlineFrom từ chối giờ sai định dạng HH:MM bằng thông báo tiếng Việt', () => {
  const now = new Date(2026, 10, 11, 23, 0);
  for (const bad of ['24:00', '06:60', '6:30', '0630', 'abc', '', ' 06:30', null]) {
    assert.throws(() => deadlineFrom(now, bad), /giờ dừng không hợp lệ/, String(bad));
  }
  assert.equal(deadlineFrom(now, '00:00').getHours(), 0);
  assert.equal(deadlineFrom(now, '23:59').getMinutes(), 59);
});

test('sleepUntil: giờ reset đã qua thì vẫn ngủ tối thiểu 60 s, nhưng không quá hạn chót', async () => {
  const slept = [];
  const sleep = async (ms) => { slept.push(ms); };
  const now = () => 1_000_000;
  await sleepUntil(500_000, new Date(99_000_000), now, sleep);
  await sleepUntil(1_000_000, new Date(99_000_000), now, sleep);
  await sleepUntil(500_000, new Date(1_020_000), now, sleep);
  await sleepUntil(500_000, new Date(900_000), now, sleep);
  await sleepUntil(null, new Date(900_000), now, sleep);
  assert.deepEqual(slept, [60_000, 60_000, 20_000, 0, 0]);
});

test('lock chạy tuần tự, lỗi không làm kẹt khóa', async () => {
  const lock = createLock();
  const order = [];
  const a = lock(async () => { await new Promise((r) => setTimeout(r, 30)); order.push('a'); });
  const b = lock(async () => { throw new Error('x'); });
  const c = lock(async () => { order.push('c'); });
  await a;
  await assert.rejects(b);
  await c;
  assert.deepEqual(order, ['a', 'c']);
});

test('runlock: lock quá 15 giờ coi là cũ dù pid còn sống (Windows tái dùng pid)', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rl-')), 'lock');
  const old = new Date(Date.now() - STALE_LOCK_MS - 60_000).toISOString();
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, startedAt: old }));
  assert.equal(liveRunLock(file), null);
  acquireRunLock(file);
  assert.equal(readRunLock(file).pid, process.pid);
  // lock mới + pid sống → từ chối, thông báo có gợi ý xóa tay
  const file2 = path.join(path.dirname(file), 'lock2');
  fs.writeFileSync(file2, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  assert.throws(() => acquireRunLock(file2), /xóa ops\/\.runner\.lock/);
  assert.equal(STALE_LOCK_MS, 15 * 3_600_000);
});
