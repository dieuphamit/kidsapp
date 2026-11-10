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

test('thẻ review không có ảnh → ghi rõ "không có ảnh"', () => {
  const html = buildReport({ date: '2026-11-11', records: [{ id: 'T-020', title: 'Nút', type: 'ui', status: 'review', minutes: 5, shots: [] }] });
  assert.match(html, /không có ảnh/);
  assert.doesNotMatch(html, /<img /);
  const html2 = buildReport({ date: '2026-11-11', records: [{ id: 'T-021', title: 'Nút', type: 'ui', status: 'review', minutes: 5 }] });
  assert.match(html2, /không có ảnh/);
});

test('escape dấu nháy đơn, src ảnh được encodeURI, minutes là số', () => {
  const html = buildReport({ date: '2026-11-11', records: [
    { id: 'T-022', title: "Bé's <b>", type: 'ui', status: 'review', minutes: '<script>', shots: ['shots/T-022/màn hình 1.png'] },
  ] });
  assert.match(html, /Bé&#39;s &lt;b&gt;/);
  assert.match(html, /src="shots\/T-022\/m%C3%A0n%20h%C3%ACnh%201\.png"/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /0 phút/);
  assert.match(html, /overflow-wrap:anywhere/);
});

test('report có mục file task lỗi, task bị chặn và banner cảnh báo', () => {
  const html = buildReport({
    date: '2026-11-11',
    records: [],
    errors: [{ file: 'ops/tasks/todo/hong.md', message: 'hong.md: thiếu frontmatter <--->' }],
    blocked: [{ id: 'T-030', missing: ['T-099'], failed: ['T-012'], waiting: ['T-020'] }],
    alerts: ['Runner dừng sớm: claude chưa đăng nhập'],
  });
  assert.match(html, /class="alert"/);
  assert.match(html, /claude chưa đăng nhập/);
  assert.match(html, /thiếu frontmatter &lt;---&gt;/);
  assert.match(html, /T-030/);
  assert.match(html, /T-099/);
  assert.match(html, /T-012/);
  assert.match(html, /T-020/);
});

test('không có errors/blocked/alerts → không có các mục đó', () => {
  const html = buildReport({ date: '2026-11-11', records: [] });
  assert.doesNotMatch(html, /class="alert"/);
  assert.doesNotMatch(html, /File task lỗi/);
  assert.doesNotMatch(html, /bị chặn/);
});

test('src ảnh: mã hóa từng đoạn, # và dấu cách không làm hỏng URL', () => {
  const html = buildReport({ date: '2026-11-11', records: [
    { id: 'T-023', title: 'x', type: 'ui', status: 'review', minutes: 1, shots: ['shots/T-023/ảnh #1 a.png'] },
  ] });
  assert.match(html, /src="shots\/T-023\/%E1%BA%A3nh%20%231%20a\.png"/);
});
