import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const STATES = ['backlog', 'todo', 'doing', 'review', 'done', 'failed'];
const REQUIRED = ['id', 'title', 'type', 'scope', 'acceptance'];
const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseTask(text, file) {
  const m = text.match(FM);
  if (!m) throw new Error(`${file}: thiếu frontmatter ---`);
  const meta = YAML.parse(m[1]) ?? {};
  for (const k of REQUIRED) if (meta[k] == null) throw new Error(`${file}: thiếu ${k}`);
  return { ...meta, depends_on: meta.depends_on ?? [], attempts: meta.attempts ?? 0, body: m[2].replace(/\r\n/g, '\n'), file };
}

export function serializeTask(task) {
  const { body, file, state, ...meta } = task;
  return `---\n${YAML.stringify(meta)}---\n${body}`;
}

export function loadAll(tasksDir) {
  const out = [];
  for (const state of STATES) {
    const dir = path.join(tasksDir, state);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const file = path.join(dir, f);
      out.push({ ...parseTask(fs.readFileSync(file, 'utf8'), file), state });
    }
  }
  return out;
}

export function eligible(tasks) {
  const done = new Set(tasks.filter((t) => t.state === 'done').map((t) => t.id));
  return tasks
    .filter((t) => t.state === 'todo' && t.depends_on.every((d) => done.has(d)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function moveTask(tasksDir, task, to) {
  const dest = path.join(tasksDir, to, path.basename(task.file));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, serializeTask(task));
  if (path.resolve(dest) !== path.resolve(task.file) && fs.existsSync(task.file)) fs.rmSync(task.file);
  return { ...task, state: to, file: dest };
}
