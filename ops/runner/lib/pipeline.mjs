import fs from 'node:fs';
import path from 'node:path';
import { moveTask } from './tasks.mjs';
import { outOfScope } from './scope.mjs';
import * as gitLib from './git.mjs';
import { sleepUntil as realSleepUntil } from './time.mjs';
import { agentFailure, denialSummary, BASE_PORT } from './agent.mjs';

const tail = (s, n = 6000) => (s.length > n ? s.slice(-n) : s);
const PAUSED = 'hết giờ chạy đêm, để lại cho đêm sau';
const NO_CHANGES = 'agent không thay đổi gì';
const AGENT_MAX_MS = 90 * 60_000;
// chừa 10 phút cho verify/merge sau agent; còn dưới 20 phút thì không bắt đầu lần thử mới
const DEADLINE_MARGIN_MS = 10 * 60_000;
export const MIN_ATTEMPT_MS = 20 * 60_000;
const DIRTY_ROOT = 'repo gốc đang bẩn, không merge được';
const withoutError = ({ last_error, ...rest }) => rest;

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
      const notMain = /không ở nhánh main/.test(e.message);
      // gốc không ở main/bẩn là lỗi môi trường, không phải lỗi của task
      return { ok: false, park: true, env: dirty || notMain, reason: dirty ? DIRTY_ROOT : `merge thất bại: ${e.message}`, feedback: null };
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
  const remainingMs = () => ctx.deadline.getTime() - Date.now();
  const fail = (reason, note) => {
    task = moveTask(ctx.tasksDir, { ...task, attempts: task.attempts + 1, last_error: reason }, 'failed');
    return rec('failed', { reason, note });
  };
  // không phải lỗi của agent: trả về todo, không tính lần thử.
  // Đã chạy ít nhất một lần thì giữ lý do thất bại gần nhất làm phản hồi cho lần sau.
  let attempt = 0;
  let reason = '';
  const pause = (why, extra = {}) => {
    const keep = attempt > 0 ? (reason || task.last_error) : task.last_error;
    task = moveTask(ctx.tasksDir, keep ? { ...task, last_error: keep } : task, 'todo');
    return rec('paused', { reason: why, note, ...extra });
  };

  let note = '';
  try {
    if (remainingMs() < MIN_ATTEMPT_MS) return pause(PAUSED);

    const wt = await g.ensureWorktree(ctx.root, task.id);
    if (task.type === 'asset' || task.type === 'tts') await g.linkAssetsSrc(ctx.root, wt);
    const appDir = path.join(wt, 'app');
    if (fs.existsSync(path.join(appDir, 'package.json')) && !fs.existsSync(path.join(appDir, 'node_modules'))) {
      const ci = await ctx.exec('npm', ['ci', '--no-audit', '--no-fund'], { cwd: appDir, logFile, timeoutMs: 15 * 60_000 });
      if (ci.code !== 0) {
        // node_modules dở dang sẽ làm lần sau bỏ qua npm ci
        fs.rmSync(path.join(appDir, 'node_modules'), { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
        return pause(`npm ci thất bại: ${tail(`${ci.stdout ?? ''}\n${ci.stderr ?? ''}`.trim(), 500)}`, { fatal: true });
      }
    }

    // task chạy lại (retry/đêm sau) biết lần trước hỏng vì sao
    let feedback = task.last_error ? `Lần chạy trước thất bại: ${task.last_error}` : null;
    while (attempt < 2) {
      const left = remainingMs();
      if (left < MIN_ATTEMPT_MS) return pause(PAUSED);
      const timeoutMs = Math.min(AGENT_MAX_MS, left - DEADLINE_MARGIN_MS);
      const a = await ctx.agent({ cwd: wt, task, ops: ctx.ops, feedback, logFile, slot, timeoutMs });
      if (a.authError) {
        const msg = tail(String(a.json?.result || a.stderr || a.stdout || '').trim(), 300);
        return pause(`claude chưa đăng nhập/hết hạn: ${msg}`, { fatal: true });
      }
      if (a.rateLimited) {
        await sleepUntil(a.resetAt, ctx.deadline);
        continue;
      }
      attempt++;
      const failure = agentFailure(a);
      const denials = denialSummary(a.json);
      note = [a.json?.result ?? '', failure && `[${failure}]`, denials && `[${denials}]`].filter(Boolean).join('\n');
      if (failure || denials) appendLog(logFile, [failure, denials].filter(Boolean).join('\n'));
      await g.commitAll(wt, `feat(${task.id}): ${task.title}`);

      let files = await g.changedFiles(wt);
      const bad = outOfScope(files, task.scope);
      if (bad.length) {
        // runner tự hoàn tác, không tốn một lần thử của agent
        await g.revertPaths(wt, bad, `chore(${task.id}): runner hoàn tác file ngoài scope`);
        note = `${note}\n[runner đã hoàn tác file ngoài scope: ${bad.join(', ')}]`;
        files = await g.changedFiles(wt);
      }
      if (!files.length) {
        // agent lỗi/hết lượt mà không để lại gì → lý do là lỗi của agent; ngược lại là không làm gì
        reason = failure ?? NO_CHANGES;
        const outside = bad.length ? ` File ngoài scope đã bị runner hoàn tác: ${bad.join(', ')}.` : '';
        feedback = `${failure ? `${failure}\n` : ''}Lần trước agent không thay đổi gì trong scope.${outside} Hãy sửa đúng các file trong scope rồi git add, git commit.`;
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
        task = moveTask(ctx.tasksDir, withoutError(task), 'review');
        return rec('review', { shots, note });
      }
      const m = await mergeVerified(ctx, wt, task, slot, logFile);
      if (m.ok) {
        task = moveTask(ctx.tasksDir, withoutError(task), 'done');
        // code đã vào main: dọn worktree lỗi chỉ là cảnh báo, không đổi kết quả
        try {
          await g.removeWorktree(ctx.root, task.id);
        } catch (e) {
          note = `${note}\n[cảnh báo dọn worktree: ${e.message}]`;
        }
        return rec('done', { shots, note });
      }
      reason = m.reason;
      if (m.env) return pause(m.reason, { fatal: true });
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
