#!/usr/bin/env node
// Dùng (từ thư mục gốc):
//   node ops/runner/task.mjs list
//   node ops/runner/task.mjs new "Tiêu đề" ui          → tạo trong backlog/ (type: ui|logic|asset|tts|test)
//   node ops/runner/task.mjs promote T-020             → backlog → todo
//   node ops/runner/task.mjs approve T-008             → review → merge vào main → done
//   node ops/runner/task.mjs reject T-008 "Bò to hơn"  → review → todo kèm phản hồi
//   node ops/runner/task.mjs retry T-012               → failed → todo
import fs from 'node:fs';
import path from 'node:path';
import { loadAllWithErrors, blockedReasons, moveTask, parseTask, STATES, TYPES } from './lib/tasks.mjs';
import { mergeVerified } from './lib/pipeline.mjs';
import { removeWorktree as realRemoveWorktree, worktreeDir } from './lib/git.mjs';
import { createLock } from './lib/lock.mjs';
import { run } from './lib/sh.mjs';
import { localDate } from './lib/time.mjs';
import { liveRunLock, LOCK_HINT } from './lib/runlock.mjs';
import { blockedText, isMain } from './lib/cli-util.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const USAGE = 'Lệnh: list | new "tiêu đề" [type] | promote ID | approve ID | reject ID "phản hồi" | retry ID';

export const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export function createCli({
  root = ROOT,
  log = console.log,
  merge = mergeVerified,
  removeWorktree = realRemoveWorktree,
  exec = run,
  today = () => localDate(new Date()),
} = {}) {
  const tasksDir = path.join(root, 'ops', 'tasks');
  const lockFile = path.join(root, 'ops', '.runner.lock');

  function find(id, state) {
    if (!id) throw new Error('Thiếu ID task (vd T-008)');
    const t = loadAllWithErrors(tasksDir).tasks.find((x) => x.id === id && (!state || x.state === state));
    if (!t) throw new Error(`Không thấy ${id}${state ? ` trong ${state}/` : ''}`);
    return t;
  }

  // id lớn nhất trong mọi file (kể cả file hỏng không parse được) để không cấp trùng
  function nextId() {
    let max = 0;
    for (const t of loadAllWithErrors(tasksDir).tasks) max = Math.max(max, Number(t.id.slice(2)));
    for (const s of STATES) {
      const dir = path.join(tasksDir, s);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const m = f.match(/^T-(\d+)/);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    return `T-${String(max + 1).padStart(3, '0')}`;
  }

  const commands = {
    list() {
      const { tasks, errors } = loadAllWithErrors(tasksDir);
      for (const s of STATES) {
        const ts = tasks.filter((t) => t.state === s);
        if (ts.length) log(`\n${s}/\n${ts.map((t) => `  ${t.id} [${t.type}] ${t.title}`).join('\n')}`);
      }
      if (!tasks.length) log('(chưa có task nào)');
      const blocked = blockedReasons(tasks);
      if (blocked.length) log(`\nTask todo bị chặn:\n${blocked.map((b) => `  ${blockedText(b)}`).join('\n')}`);
      if (errors.length) log(`\nFile task lỗi:\n${errors.map((x) => `  ${x.message}`).join('\n')}`);
    },

    new(title, type = 'ui') {
      if (!title?.trim()) throw new Error('Thiếu tiêu đề');
      if (!TYPES.includes(type)) throw new Error(`type phải là một trong ${TYPES.join('|')}: ${type}`);
      const id = nextId();
      // JSON string là YAML hợp lệ: tiêu đề có ":" hay "#" không làm hỏng frontmatter
      const text = fs.readFileSync(path.join(tasksDir, '_template.md'), 'utf8')
        .replace(/^id: T-000$/m, `id: ${id}`)
        .replace(/^title: .*$/m, `title: ${JSON.stringify(title.trim())}`)
        .replace(/^type: .*$/m, `type: ${type}`);
      const file = path.join(tasksDir, 'backlog', `${id}-${slug(title) || 'task'}.md`);
      parseTask(text, file); // template hỏng thì báo ngay, không ghi file
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text, { flag: 'wx' });
      log(`Đã tạo ${path.relative(root, file)}. Sửa nội dung rồi chạy: node ops/runner/task.mjs promote ${id}`);
    },

    promote(id) {
      const t = find(id, 'backlog');
      const todo = t.scope.filter((x) => x.includes('<'));
      if (todo.length) throw new Error(`${id}: scope còn placeholder chưa điền: ${todo.join(', ')}`);
      moveTask(tasksDir, t, 'todo');
      log(`${id} → todo`);
    },

    async approve(id) {
      const t = find(id, 'review');
      const held = liveRunLock(lockFile);
      if (held) throw new Error(`night-run đang chạy (pid ${held.pid}, từ ${held.startedAt}); đợi nó xong rồi hãy approve (${LOCK_HINT})`);
      const logFile = path.join(root, 'ops', 'logs', `approve-${t.id}.log`);
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      const m = await merge({ root, mergeLock: createLock(), exec }, worktreeDir(root, t.id), t, 0, logFile);
      if (!m.ok) {
        if (m.reset) {
          throw new Error(`${t.id} xung đột với main mới (${m.reason}), chưa merge được. `
            + `Hãy chạy: node ops/runner/task.mjs reject ${t.id} "làm lại trên main mới nhất" `
            + '— đêm tới agent sẽ làm lại task này trên code mới.');
        }
        throw new Error(`Chưa merge được ${t.id}: ${m.reason}. Xem ${logFile}`);
      }
      moveTask(tasksDir, t, 'done');
      try {
        await removeWorktree(root, t.id);
      } catch (e) {
        // code đã vào main; worktree sót lại chỉ cần dọn tay
        log(`Cảnh báo: chưa dọn được worktree của ${t.id}: ${e.message}`);
      }
      log(`${t.id} đã merge vào main → done`);
    },

    reject(id, feedback) {
      if (!feedback?.trim()) throw new Error('Thiếu nội dung cần sửa');
      // last_error cũ không còn đúng: phản hồi của bố mẹ (trong body) là thứ agent cần đọc
      const { last_error, ...t } = find(id, 'review');
      const body = `${t.body.trimEnd()}\n\n## Phản hồi của bố mẹ (${today()})\n- ${feedback.trim()}\n`;
      moveTask(tasksDir, { ...t, body, attempts: 0 }, 'todo');
      log(`${t.id} → todo kèm phản hồi; đêm tới agent sửa tiếp trên branch cũ`);
    },

    // giữ last_error: pipeline dùng nó làm feedback cho lần chạy lại
    retry(id) {
      const t = find(id, 'failed');
      moveTask(tasksDir, { ...t, attempts: 0 }, 'todo');
      log(`${t.id} → todo (lỗi lần trước: ${t.last_error ?? 'không rõ'})`);
    },
  };

  return {
    commands,
    async run([cmd, ...args]) {
      if (!Object.hasOwn(commands, cmd ?? '')) throw new Error(USAGE);
      await commands[cmd](...args);
    },
  };
}

if (isMain(import.meta.url)) {
  createCli().run(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
