import fs from 'node:fs';
import path from 'node:path';
import { moveTask } from './tasks.mjs';
import { outOfScope } from './scope.mjs';
import * as gitLib from './git.mjs';
import { sleepUntil as realSleepUntil } from './time.mjs';

const tail = (s, n = 6000) => (s.length > n ? s.slice(-n) : s);
const BASE_PORT = 4173;
const PAUSED = 'hết giờ chạy đêm, để lại cho đêm sau';
const DIRTY_ROOT = 'repo gốc đang bẩn, không merge được';

// ctx.git cho phép thay từng hàm git (test); mặc định dùng git.mjs
const gitOf = (ctx) => ({ ...gitLib, ...(ctx.git ?? {}) });
const shotsDir = (wt) => path.join(wt, 'app', 'test-results', 'shots');

function appendLog(logFile, text) {
  if (!logFile) return;
  try { fs.appendFileSync(logFile, `\n[runner] ${text}\n`); } catch { /* log chỉ để tham khảo */ }
}

export function collectShots(wt, shotsRoot, shotsRel, id) {
  const src = shotsDir(wt);
  if (!fs.existsSync(src)) return [];
  const dest = path.join(shotsRoot, id);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  return fs.readdirSync(src).filter((f) => f.endsWith('.png')).map((f) => {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    return `${shotsRel}/${id}/${f}`;
  });
}

// Xóa ảnh của lần chạy trước để report chỉ có ảnh của lần verify này
export function verifyIn(ctx, wt, slot, logFile) {
  fs.rmSync(shotsDir(wt), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  return ctx.exec('npm', ['run', 'verify'], {
    cwd: path.join(wt, 'app'),
    env: { E2E_PORT: String(BASE_PORT + slot) },
    logFile,
    timeoutMs: 30 * 60_000,
  });
}

// Merge lần lượt từng task: rebase lên main mới nhất; nếu main đã đổi thì verify lại; rồi fast-forward.
// park: lỗi không do agent gây ra (gốc bẩn) → cho thử lại cũng vô ích
export function mergeVerified(ctx, wt, task, slot, logFile) {
  const g = gitOf(ctx);
  return ctx.mergeLock(async () => {
    const before = await g.head(wt);
    if (!(await g.rebaseOnMain(wt))) {
      return {
        ok: false, reset: true, reason: 'conflict khi rebase lên main',
        feedback: 'Main đã thay đổi và xung đột với task này. Branch đã được đặt lại về main; hãy làm lại task trên code mới nhất.',
      };
    }
    if ((await g.head(wt)) !== before) {
      const v = await verifyIn(ctx, wt, slot, logFile);
      if (v.code !== 0) return { ok: false, reason: 'verify thất bại sau khi rebase lên main mới', feedback: tail(v.stdout + v.stderr) };
    }
    try {
      await g.ffMerge(ctx.root, task.id);
    } catch (e) {
      appendLog(logFile, e.message);
      const dirty = /thay đổi chưa commit/.test(e.message);
      return { ok: false, park: true, reason: dirty ? DIRTY_ROOT : `merge thất bại: ${e.message}`, feedback: null };
    }
    return { ok: true };
  });
}

export async function processTask(input, slot, ctx) {
  const t0 = Date.now();
  const g = gitOf(ctx);
  const sleepUntil = ctx.sleepUntil ?? realSleepUntil;
  let task = moveTask(ctx.tasksDir, input, 'doing');
  const logFile = path.join(ctx.logsDir, `${task.id}.log`);
  const rec = (status, extra = {}) => ({
    id: task.id, title: task.title, type: task.type, status, attempts: task.attempts,
    minutes: Math.round((Date.now() - t0) / 60_000), ...extra,
  });
  const pastDeadline = () => Date.now() >= ctx.deadline.getTime();
  const fail = (reason, note) => {
    task = moveTask(ctx.tasksDir, { ...task, attempts: task.attempts + 1, last_error: reason }, 'failed');
    return rec('failed', { reason, note });
  };

  let note = '';
  try {
    if (pastDeadline()) {
      task = moveTask(ctx.tasksDir, task, 'todo');
      return rec('paused', { reason: PAUSED });
    }

    const wt = await g.ensureWorktree(ctx.root, task.id);
    const appDir = path.join(wt, 'app');
    if (fs.existsSync(path.join(appDir, 'package.json')) && !fs.existsSync(path.join(appDir, 'node_modules'))) {
      await ctx.exec('npm', ['ci', '--no-audit', '--no-fund'], { cwd: appDir, logFile, timeoutMs: 15 * 60_000 });
    }

    let feedback = null;
    let reason = '';
    let attempt = 0;
    while (attempt < 2) {
      if (pastDeadline()) {
        task = moveTask(ctx.tasksDir, task, 'todo');
        return rec('paused', { reason: PAUSED, note });
      }
      const a = await ctx.agent({ cwd: wt, task, ops: ctx.ops, feedback, logFile });
      if (a.rateLimited) {
        await sleepUntil(a.resetAt, ctx.deadline);
        continue;
      }
      attempt++;
      note = a.json?.result ?? '';
      await g.commitAll(wt, `feat(${task.id}): ${task.title}`);

      const bad = outOfScope(await g.changedFiles(wt), task.scope);
      if (bad.length) {
        reason = `sửa ngoài scope: ${bad.join(', ')}`;
        feedback = `Bạn đã sửa file ngoài scope: ${bad.join(', ')}. Khôi phục chúng (git checkout main -- <file>; file mới thì xóa) rồi commit; chỉ sửa trong scope.`;
        continue;
      }

      const v = await verifyIn(ctx, wt, slot, logFile);
      if (v.code !== 0) {
        reason = 'npm run verify thất bại';
        feedback = tail(v.stdout + v.stderr);
        continue;
      }

      const shots = collectShots(wt, ctx.shotsRoot, ctx.shotsRel, task.id);
      if (task.type === 'ui') {
        task = moveTask(ctx.tasksDir, task, 'review');
        return rec('review', { shots, note });
      }
      const m = await mergeVerified(ctx, wt, task, slot, logFile);
      if (m.ok) {
        task = moveTask(ctx.tasksDir, task, 'done');
        // code đã vào main: dọn worktree lỗi chỉ là cảnh báo, không đổi kết quả
        try {
          await g.removeWorktree(ctx.root, task.id);
        } catch (e) {
          note = `${note}\n[cảnh báo dọn worktree: ${e.message}]`;
        }
        return rec('done', { shots, note });
      }
      reason = m.reason;
      if (m.park) break;
      if (m.reset) await g.resetToMain(wt);
      feedback = m.feedback;
    }

    return fail(reason, note);
  } catch (e) {
    // mọi lỗi bất ngờ (git, spawn, agent) → failed, không để task kẹt ở doing/
    const reason = `lỗi runner: ${e.message}`;
    appendLog(logFile, reason);
    if (task.state !== 'doing') throw e;
    return fail(reason, note);
  }
}
