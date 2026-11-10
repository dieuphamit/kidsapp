#!/usr/bin/env node
// Điều phối cả đêm (từ thư mục gốc):
//   node ops/runner/night-run.mjs [--until 06:30] [--parallel 3] [--dry-run] [--no-review]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadAllWithErrors, eligible, blockedReasons, moveTask } from './lib/tasks.mjs';
import { processTask as realProcessTask } from './lib/pipeline.mjs';
import { createLock } from './lib/lock.mjs';
import { deadlineFrom, localDate } from './lib/time.mjs';
import { run } from './lib/sh.mjs';
import { git as realGit } from './lib/git.mjs';
import { runAgent, parseJson, reviewerArgs } from './lib/agent.mjs';
import { buildReport } from './lib/report.mjs';
import { acquireRunLock, releaseRunLock } from './lib/runlock.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const MAX_HOURS = 14;
export const MAX_PARALLEL = 6;
// agent chạy được code (npx, npm run) nên có thể ghi ra ngoài worktree: những chỗ này phải luôn sạch
// KHÔNG đưa vào đây các đường dẫn runner tự ghi: ops/tasks, ops/reports, ops/logs, ops/.runner.lock
export const GUARDED = ['ops/runner', 'CLAUDE.md', '.github', '.claude'];
const REVIEWER_TIMEOUT_MS = 20 * 60_000;
const LOCK_NAME = '.runner.lock';

export function parseParallel(v) {
  const s = String(v ?? '').trim();
  const n = /^\d+$/.test(s) ? Number(s) : NaN;
  if (!(n >= 1 && n <= MAX_PARALLEL)) throw new Error(`--parallel phải là số nguyên 1–${MAX_PARALLEL}: ${JSON.stringify(v)}`);
  return n;
}

export function blockedText(b) {
  const parts = [];
  if (b.missing.length) parts.push(`chưa có task ${b.missing.join(', ')}`);
  if (b.failed.length) parts.push(`phụ thuộc đã lỗi ${b.failed.join(', ')}`);
  if (b.waiting.length) parts.push(`chờ ${b.waiting.join(', ')} xong`);
  return `${b.id}: ${parts.join('; ')}`;
}

async function guardChanges(root, git) {
  const out = await git(root, 'status', '--porcelain', '--untracked-files=all', '--', ...GUARDED);
  return out ? out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];
}

async function preflight(root, git) {
  const branch = await git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== 'main') throw new Error(`Thư mục gốc đang ở nhánh ${branch}, cần ở main`);
  const dirty = await git(root, 'status', '--porcelain', '--', '.', ':(exclude)ops');
  if (dirty) throw new Error(`Thư mục gốc còn thay đổi chưa commit (ngoài ops/):\n${dirty}`);
  const guarded = await guardChanges(root, git);
  if (guarded.length) {
    throw new Error(`${GUARDED.join(', ')} có thay đổi chưa commit; commit trước khi chạy đêm (integrity guard cần điểm xuất phát sạch):\n${guarded.join('\n')}`);
  }
}

// Reviewer chỉ đọc: cùng bộ cờ với agent (không nạp settings người dùng, không MCP) nhưng settings riêng
export async function defaultReviewer({ root, ops, records, logFile, exec = run }) {
  const role = fs.readFileSync(path.join(ops, 'runner', 'prompts', 'reviewer.md'), 'utf8');
  const prompt = `${role}\n\n\`\`\`json\n${JSON.stringify(records, null, 1)}\n\`\`\``;
  const r = await exec('claude', reviewerArgs(path.join(ops, 'runner', 'reviewer-settings.json')), {
    cwd: root, input: prompt, timeoutMs: REVIEWER_TIMEOUT_MS, logFile,
  });
  const j = parseJson(r.stdout ?? '');
  if (r.code !== 0 || !j || j.is_error) {
    const detail = String(j?.result || r.stderr || r.stdout || '').trim().slice(-300);
    throw new Error(`reviewer lỗi (exit ${r.code}): ${detail}`);
  }
  return j.result ?? '';
}

function dryRun({ tasksDir, deadline, tooLong, log }) {
  const { tasks, errors } = loadAllWithErrors(tasksDir);
  const ready = eligible(tasks);
  const blocked = blockedReasons(tasks);
  log(`Hạn chót: ${deadline.toLocaleString()}`);
  if (tooLong) log(`CẢNH BÁO: ${tooLong} (chạy thật sẽ bị từ chối)`);
  const doing = tasks.filter((t) => t.state === 'doing');
  if (doing.length) log(`Task kẹt ở doing/ sẽ được trả về todo/: ${doing.map((t) => t.id).join(', ')}`);
  log(`Task sẵn sàng (${ready.length}):`);
  for (const t of ready) log(`  ${t.id} [${t.type}] ${t.title}`);
  if (blocked.length) {
    log(`Task todo bị chặn (${blocked.length}):`);
    for (const b of blocked) log(`  ${blockedText(b)}`);
  }
  if (errors.length) {
    log(`File task lỗi (${errors.length}):`);
    for (const x of errors) log(`  ${x.message}`);
  }
  return { dryRun: true, deadline, ready, blocked, errors };
}

async function commitOps({ root, git, exec, date, log }) {
  await git(root, 'add', '--', 'ops');
  // lock nằm trong .gitignore; phòng khi .gitignore thiếu dòng đó thì gỡ khỏi index
  await git(root, 'rm', '--cached', '-q', '--ignore-unmatch', '--', `ops/${LOCK_NAME}`);
  const staged = await exec('git', ['diff', '--cached', '--quiet'], { cwd: root });
  if (staged.code === 0) {
    log('Không có thay đổi nào trong ops/ để commit');
    return false;
  }
  const r = await exec('git', ['commit', '-q', '-m', `chore(ops): kết quả đêm ${date}`], { cwd: root });
  if (r.code !== 0) {
    log(`Commit ops thất bại: ${(r.stderr || r.stdout || '').trim()}`);
    return false;
  }
  return true;
}

async function night({ root, ops, tasksDir, parallel, deadline, start, date, opts, deps }) {
  const { log, now, git, exec, processTask, runReviewer } = deps;
  const stamp = () => now().toLocaleTimeString();
  await preflight(root, git);

  const logsDir = path.join(ops, 'logs', date);
  const shotsRel = `shots/${date}`;
  const shotsRoot = path.join(ops, 'reports', shotsRel);
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(path.join(ops, 'reports'), { recursive: true });

  // Máy tắt giữa đêm: task đang dở trả về todo; worktree còn nguyên nên agent làm tiếp được.
  // Một file lỗi không được làm hỏng cả đêm.
  const runErrors = [];
  for (const t of loadAllWithErrors(tasksDir).tasks.filter((x) => x.state === 'doing')) {
    try {
      moveTask(tasksDir, t, 'todo');
      log(`[${stamp()}] khôi phục ${t.id}: doing → todo`);
    } catch (e) {
      const message = `không trả được ${t.id} từ doing/ về todo/: ${e.message}`;
      log(`[${stamp()}] ${message}`);
      runErrors.push({ file: t.file, message });
    }
  }

  const ctx = {
    root, ops, tasksDir, logsDir, shotsRoot, shotsRel, deadline,
    mergeLock: createLock(), exec, agent: deps.agent ?? runAgent,
  };
  const records = [];
  const fatal = [];
  const integrity = new Set();
  const running = new Map();
  const tried = new Set(); // task pause/failed trong đêm không được giao lại ngay
  const freeSlots = [...Array(parallel).keys()];
  const stopped = () => fatal.length > 0 || integrity.size > 0;

  const checkIntegrity = async () => {
    let changed;
    try {
      changed = await guardChanges(root, git);
    } catch (e) {
      changed = [`(không kiểm tra được git status: ${e.message})`];
    }
    for (const c of changed) integrity.add(c);
    return changed;
  };

  for (;;) {
    if (!stopped() && now() < deadline) {
      const ready = eligible(loadAllWithErrors(tasksDir).tasks).filter((t) => !running.has(t.id) && !tried.has(t.id));
      while (freeSlots.length && ready.length) {
        const t = ready.shift();
        const slot = freeSlots.shift();
        tried.add(t.id);
        log(`[${stamp()}] bắt đầu ${t.id} (slot ${slot})`);
        const p = Promise.resolve()
          .then(() => processTask(t, slot, ctx))
          .catch((e) => ({ id: t.id, title: t.title, type: t.type, status: 'failed', minutes: 0, reason: `lỗi runner: ${e.message}` }))
          .then(async (r) => {
            records.push(r);
            log(`[${stamp()}] ${r.id} → ${r.status}${r.reason ? ` (${r.reason})` : ''}`);
            if (r.fatal) {
              fatal.push(`${r.id}: ${r.reason ?? 'lỗi nghiêm trọng'}`);
              log(`[${stamp()}] LỖI NGHIÊM TRỌNG, ngừng giao task mới: ${r.reason}`);
            }
            const changed = await checkIntegrity();
            if (changed.length) log(`[${stamp()}] INTEGRITY GUARD sau ${r.id}, ngừng giao task mới:\n${changed.join('\n')}`);
          })
          .finally(() => { running.delete(t.id); freeSlots.push(slot); });
        running.set(t.id, p);
      }
    }
    if (!running.size) break;
    await Promise.race(running.values());
  }

  let notes = '';
  if (records.length && !opts.noReview) {
    if (fatal.length) {
      notes = '(bỏ qua reviewer vì runner gặp lỗi nghiêm trọng)';
    } else {
      try {
        notes = await runReviewer({ root, ops, records, logFile: path.join(logsDir, 'reviewer.log') });
      } catch (e) {
        notes = `(reviewer lỗi, bỏ qua: ${e.message})`;
        log(`[${stamp()}] ${notes}`);
      }
    }
  }
  await checkIntegrity();

  const alerts = [];
  if (fatal.length) alerts.push(`Runner đã dừng giao task mới vì lỗi nghiêm trọng (task đang chạy vẫn được làm xong):\n${fatal.join('\n')}`);
  if (integrity.size) {
    alerts.push(`Integrity guard: ${GUARDED.join(', ')} bị thay đổi trong đêm (agent có thể đã ghi ra ngoài worktree). Runner đã ngừng giao task mới và KHÔNG commit ops/. Kiểm tra bằng git status / git diff rồi tự xử lý:\n${[...integrity].join('\n')}`);
  }
  let canCommit = integrity.size === 0;
  if (canCommit) {
    const branch = await git(root, 'rev-parse', '--abbrev-ref', 'HEAD').catch(() => '?');
    if (branch !== 'main') {
      canCommit = false;
      alerts.push(`Thư mục gốc không còn ở main (đang ở ${branch}); runner không commit ops/.`);
    }
  }

  const final = loadAllWithErrors(tasksDir);
  const errors = [...runErrors, ...final.errors];
  const blocked = blockedReasons(final.tasks);
  const minutes = (now().getTime() - start.getTime()) / 60_000;
  const reportsDir = path.join(ops, 'reports');
  fs.writeFileSync(path.join(reportsDir, `${date}.json`), JSON.stringify({
    date, minutes: Math.round(minutes), deadline: deadline.toISOString(), records, errors, blocked, alerts,
  }, null, 1));
  const report = path.join(reportsDir, `${date}.html`);
  fs.writeFileSync(report, buildReport({ date, records, notes, minutes, errors, blocked, alerts }));

  let committed = false;
  if (canCommit) {
    try {
      committed = await commitOps({ root, git, exec, date, log });
    } catch (e) {
      log(`[${stamp()}] commit ops thất bại: ${e.message}`);
    }
  } else {
    log(`[${stamp()}] KHÔNG commit ops/: ${alerts.at(-1)}`);
  }

  return {
    date, records, errors, blocked, alerts, integrity: [...integrity],
    stoppedEarly: stopped(), committed, report,
  };
}

export async function runNight(opts = {}, deps = {}) {
  const root = path.resolve(opts.root ?? ROOT);
  const ops = path.join(root, 'ops');
  const tasksDir = path.join(ops, 'tasks');
  const d = {
    log: console.log,
    now: () => new Date(),
    git: realGit,
    exec: run,
    processTask: realProcessTask,
    runReviewer: defaultReviewer,
    ...deps,
  };
  const parallel = parseParallel(opts.parallel ?? '3');
  const start = d.now();
  const date = localDate(start);
  const deadline = deadlineFrom(start, opts.until ?? '06:30');
  const hours = (deadline.getTime() - start.getTime()) / 3_600_000;
  const tooLong = hours > MAX_HOURS
    ? `hạn chót ${deadline.toLocaleString()} còn ${hours.toFixed(1)} giờ nữa, quá ${MAX_HOURS} giờ (--until có nhầm không?)`
    : null;

  if (opts.dryRun) return dryRun({ tasksDir, deadline, tooLong, log: d.log });
  if (tooLong) throw new Error(`Từ chối chạy: ${tooLong}`);

  // lấy lock trước mọi await: hai lần gọi liền nhau thì lần sau chắc chắn thấy lock
  const lockFile = path.join(ops, LOCK_NAME);
  acquireRunLock(lockFile);
  const onSigint = () => {
    releaseRunLock(lockFile);
    process.exit(130);
  };
  process.once('SIGINT', onSigint);
  try {
    return await night({ root, ops, tasksDir, parallel, deadline, start, date, opts, deps: d });
  } finally {
    process.off('SIGINT', onSigint);
    releaseRunLock(lockFile);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      until: { type: 'string', default: '06:30' },
      parallel: { type: 'string', default: '3' },
      'dry-run': { type: 'boolean', default: false },
      'no-review': { type: 'boolean', default: false },
    },
  });
  const res = await runNight({
    root: ROOT, until: values.until, parallel: values.parallel,
    dryRun: values['dry-run'], noReview: values['no-review'],
  });
  if (res.dryRun) return;
  console.log(`Xong. Report: ${path.relative(ROOT, res.report)}${res.committed ? '' : ' (chưa commit ops/)'}`);
  if (res.integrity.length) process.exitCode = 2;
}

function isMain() {
  if (!process.argv[1]) return false;
  const norm = (p) => {
    let r = path.resolve(p);
    try { r = fs.realpathSync.native(r); } catch { /* giữ nguyên */ }
    return process.platform === 'win32' ? r.toLowerCase() : r;
  };
  return norm(process.argv[1]) === norm(fileURLToPath(import.meta.url));
}

if (isMain()) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  });
}
