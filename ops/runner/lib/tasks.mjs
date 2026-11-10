import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const STATES = ['backlog', 'todo', 'doing', 'review', 'done', 'failed'];
export const TYPES = ['ui', 'logic', 'asset', 'tts', 'test'];
// khi một id nằm ở nhiều trạng thái, giữ bản ở trạng thái "tiến xa" nhất
const PRIORITY = ['done', 'review', 'failed', 'doing', 'todo', 'backlog'];
const REQUIRED = ['id', 'title', 'type', 'scope', 'acceptance'];
const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const ID = /^T-\d+$/;

const idNum = (id) => (typeof id === 'string' && ID.test(id) ? Number(id.slice(2)) : Number.MAX_SAFE_INTEGER);
export const compareIds = (a, b) => idNum(a) - idNum(b) || String(a).localeCompare(String(b));
const byId = (a, b) => compareIds(a.id, b.id);

// chuỗi đơn → [chuỗi]; còn lại phải là mảng chuỗi không rỗng
function stringList(value, key, file, { allowEmpty = false } = {}) {
  const list = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(list)) throw new Error(`${file}: ${key} phải là mảng chuỗi`);
  if (!allowEmpty && list.length === 0) throw new Error(`${file}: ${key} không được rỗng`);
  for (const v of list) {
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${file}: ${key} chứa phần tử không hợp lệ: ${JSON.stringify(v)}`);
  }
  return list;
}

export function parseTask(text, file) {
  const m = text.match(FM);
  if (!m) throw new Error(`${file}: thiếu frontmatter ---`);
  let meta;
  try {
    meta = YAML.parse(m[1]) ?? {};
  } catch (e) {
    throw new Error(`${file}: YAML lỗi: ${e.message}`);
  }
  if (typeof meta !== 'object' || Array.isArray(meta)) throw new Error(`${file}: frontmatter phải là object`);
  for (const k of REQUIRED) if (meta[k] == null) throw new Error(`${file}: thiếu ${k}`);
  if (typeof meta.id !== 'string' || !ID.test(meta.id)) throw new Error(`${file}: id không hợp lệ (cần dạng T-<số>): ${JSON.stringify(meta.id)}`);
  if (!TYPES.includes(meta.type)) throw new Error(`${file}: type phải là một trong ${TYPES.join('|')}: ${JSON.stringify(meta.type)}`);
  const depends_on = stringList(meta.depends_on ?? [], 'depends_on', file, { allowEmpty: true });
  for (const d of depends_on) if (!ID.test(d)) throw new Error(`${file}: depends_on chứa id không hợp lệ: ${JSON.stringify(d)}`);
  return {
    ...meta,
    scope: stringList(meta.scope, 'scope', file),
    acceptance: stringList(meta.acceptance, 'acceptance', file),
    depends_on,
    attempts: meta.attempts ?? 0,
    body: m[2].replace(/\r\n/g, '\n'),
    file,
  };
}

export function serializeTask(task) {
  const { body, file, state, ...meta } = task;
  return `---\n${YAML.stringify(meta, { lineWidth: 0 })}---\n${body}`;
}

// Không bao giờ ném vì một file hỏng: file lỗi và id trùng được trả về trong errors
export function loadAllWithErrors(tasksDir) {
  const parsed = [];
  const errors = [];
  for (const state of STATES) {
    const dir = path.join(tasksDir, state);
    let names;
    try {
      if (!fs.existsSync(dir)) continue;
      names = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    } catch (e) {
      errors.push({ file: dir, message: `không đọc được thư mục: ${e.message}` });
      continue;
    }
    const inState = [];
    for (const f of names) {
      const file = path.join(dir, f);
      try {
        inState.push({ ...parseTask(fs.readFileSync(file, 'utf8'), file), state });
      } catch (e) {
        errors.push({ file, message: e.message });
      }
    }
    parsed.push(...inState.sort((a, b) => byId(a, b) || a.file.localeCompare(b.file)));
  }
  const rank = (t) => PRIORITY.indexOf(t.state);
  const winner = new Map();
  for (const t of parsed) {
    const cur = winner.get(t.id);
    if (!cur || rank(t) < rank(cur)) winner.set(t.id, t);
  }
  const tasks = [];
  for (const t of parsed) {
    const w = winner.get(t.id);
    if (w === t) tasks.push(t);
    else errors.push({ file: t.file, message: `${t.file}: id ${t.id} bị trùng với ${w.file} (giữ bản ở ${w.state}, bỏ qua bản này)` });
  }
  return { tasks, errors };
}

export function loadAll(tasksDir) {
  return loadAllWithErrors(tasksDir).tasks;
}

export function eligible(tasks) {
  const done = new Set(tasks.filter((t) => t.state === 'done').map((t) => t.id));
  return tasks
    .filter((t) => t.state === 'todo' && t.depends_on.every((d) => done.has(d)))
    .sort(byId);
}

// Lý do các task todo chưa chạy được: phụ thuộc không tồn tại, đã failed, hoặc chưa done
export function blockedReasons(tasks) {
  const stateOf = new Map(tasks.map((t) => [t.id, t.state]));
  const out = [];
  for (const t of [...tasks].filter((x) => x.state === 'todo').sort(byId)) {
    const missing = [];
    const failed = [];
    const waiting = [];
    for (const d of t.depends_on) {
      const s = stateOf.get(d);
      if (s === undefined) missing.push(d);
      else if (s === 'failed') failed.push(d);
      else if (s !== 'done') waiting.push(d);
    }
    if (missing.length || failed.length || waiting.length) out.push({ id: t.id, missing, failed, waiting });
  }
  return out;
}

const samePath = (a, b) => {
  const n = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
  return n(a) === n(b);
};

// Ghi nguyên tử: ghi .tmp rồi rename, sau đó mới xóa file nguồn
export function moveTask(tasksDir, task, to) {
  if (!STATES.includes(to)) throw new Error(`trạng thái không hợp lệ: ${to}`);
  const dest = path.join(tasksDir, to, path.basename(task.file));
  const same = samePath(dest, task.file);
  if (!same && fs.existsSync(dest)) throw new Error(`${dest}: file đích đã tồn tại, không ghi đè`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  try {
    fs.writeFileSync(tmp, serializeTask(task));
    fs.renameSync(tmp, dest);
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* bỏ qua */ }
    throw e;
  }
  if (!same && fs.existsSync(task.file)) fs.rmSync(task.file);
  return { ...task, state: to, file: dest };
}
