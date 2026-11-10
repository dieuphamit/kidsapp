import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, extractQuestions, buildReport } from '../lib/report.mjs';

const records = [
  { id: 'T-007', title: 'Core audio', type: 'logic', status: 'done', minutes: 22, attempts: 0, note: 'Đã xong.' },
  { id: 'T-008', title: 'Bò <3D>', type: 'ui', status: 'review', minutes: 41, attempts: 0, shots: ['shots/2026-11-11/T-008/T-008-farm.png'], note: 'Xong.\nCÂU HỎI: Bò màu nâu hay đen trắng?' },
  { id: 'T-012', title: 'Kéo thả', type: 'ui', status: 'failed', minutes: 60, attempts: 1, reason: 'npm run verify thất bại' },
];

test('đếm theo trạng thái', () => {
  assert.deepEqual(summarize(records), { done: 1, review: 1, failed: 1, paused: 0 });
});

test('lấy câu hỏi cho bố mẹ', () => {
  assert.deepEqual(extractQuestions(records), [{ id: 'T-008', q: 'Bò màu nâu hay đen trắng?' }]);
});

test('report có ảnh, lệnh duyệt, lý do lỗi, và escape HTML', () => {
  const html = buildReport({ date: '2026-11-11', records, notes: 'Nên duyệt T-008.', minutes: 210 });
  assert.match(html, /<img src="shots\/2026-11-11\/T-008\/T-008-farm.png"/);
  assert.match(html, /node ops\/runner\/task.mjs approve T-008/);
  assert.match(html, /npm run verify thất bại/);
  assert.match(html, /Bò &lt;3D&gt;/);
  assert.match(html, /Nên duyệt T-008/);
});
