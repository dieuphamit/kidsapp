const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mins = (m) => { const n = Number(m); return Number.isFinite(n) ? Math.round(n) : 0; };
const shotsHtml = (r) => (r.shots?.length
  ? `<div class="shots">${r.shots.map((s) => `<img src="${esc(encodeURI(s))}" alt="${esc(r.id)}">`).join('')}</div>`
  : '<p class="noshot">không có ảnh</p>');

export function summarize(records) {
  const c = { done: 0, review: 0, failed: 0, paused: 0 };
  for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
  return c;
}

export function extractQuestions(records) {
  return records.flatMap((r) =>
    String(r.note ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^CÂU HỎI:/i.test(l))
      .map((l) => ({ id: r.id, q: l.replace(/^CÂU HỎI:\s*/i, '') })),
  );
}

const card = (r, extra = '') => `
  <article class="card ${r.status}">
    <h3>${esc(r.id)} · ${esc(r.title)} <small>${esc(r.type)} · ${mins(r.minutes)} phút</small></h3>
    ${r.note ? `<p class="note">${esc(r.note).replace(/\n/g, '<br>')}</p>` : ''}
    ${extra}
  </article>`;

export function buildReport({ date, records, notes = '', minutes = 0 }) {
  const c = summarize(records);
  const qs = extractQuestions(records);
  const review = records.filter((r) => r.status === 'review').map((r) => card(r, `
    ${shotsHtml(r)}
    <pre>node ops/runner/task.mjs approve ${esc(r.id)}
node ops/runner/task.mjs reject ${esc(r.id)} "cần sửa gì"</pre>`)).join('');
  const done = records.filter((r) => r.status === 'done').map((r) => card(r)).join('');
  const failed = records.filter((r) => r.status === 'failed' || r.status === 'paused').map((r) => card(r, `
    <p class="reason">${esc(r.reason)}</p><pre>node ops/runner/task.mjs retry ${esc(r.id)}</pre>`)).join('');
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Đêm ${esc(date)}</title>
<style>
  :root{--bg:#f6f1ff;--ink:#3b2a6b;--card:#fff;--done:#9fe3b0;--review:#ffd76a;--failed:#ff9f8f;--line:#e4dcf7}
  @media (prefers-color-scheme:dark){:root{--bg:#1d1830;--ink:#efe9ff;--card:#2a2342;--line:#3c3358}}
  body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
  main{max-width:1100px;margin:0 auto;padding:24px 16px}
  .kpi{display:flex;flex-wrap:wrap;gap:12px}.kpi div{background:var(--card);border-radius:16px;padding:12px 18px;border:1px solid var(--line)}
  .card{background:var(--card);border-radius:16px;padding:14px 18px;margin:12px 0;border-left:8px solid var(--line)}
  .card.done{border-color:var(--done)}.card.review{border-color:var(--review)}.card.failed,.card.paused{border-color:var(--failed)}
  .shots{display:flex;gap:10px;overflow-x:auto}.shots img{height:260px;border-radius:12px;border:1px solid var(--line)}
  pre{background:var(--bg);padding:8px 12px;border-radius:10px;overflow-x:auto}
  small{opacity:.7;font-weight:400}
  h3,.note,.reason{overflow-wrap:anywhere}.noshot{opacity:.7;font-style:italic}
</style></head><body><main>
<h1>Báo cáo đêm ${esc(date)}</h1>
<div class="kpi"><div>✅ Xong: <b>${c.done}</b></div><div>👀 Chờ duyệt: <b>${c.review}</b></div><div>❌ Lỗi: <b>${c.failed}</b></div><div>⏸ Để đêm sau: <b>${c.paused}</b></div><div>⏱ ${Math.round(minutes)} phút</div></div>
${qs.length ? `<h2>❓ Câu hỏi cho bố mẹ</h2><ul>${qs.map((q) => `<li><b>${esc(q.id)}</b>: ${esc(q.q)}</li>`).join('')}</ul>` : ''}
${review ? `<h2>👀 Chờ duyệt giao diện</h2>${review}` : ''}
${failed ? `<h2>❌ Chưa xong</h2>${failed}` : ''}
${done ? `<h2>✅ Đã merge vào main</h2>${done}` : ''}
${notes ? `<h2>🧐 Nhận xét của reviewer</h2><pre style="white-space:pre-wrap">${esc(notes)}</pre>` : ''}
</main></body></html>`;
}
