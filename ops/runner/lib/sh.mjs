import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const WIN = process.platform === 'win32';
// npm/npx trên Windows là file .cmd nên phải chạy qua shell
const NEEDS_SHELL = new Set(['npm', 'npx']);
const MAX_BUFFER = 20 * 1024 * 1024;
const KILL_GRACE_MS = 10_000;

// Quote cho cmd.exe + bộ tách tham số MSVCRT: " → "", dấu \ đứng trước " hoặc trước nháy đóng phải nhân đôi
export function quoteArg(a) {
  if (!/[\s"&|<>^()%!]/.test(a)) return a;
  return `"${a.replace(/(\\*)"/g, '$1$1""').replace(/(\\+)$/, '$1$1')}"`;
}

// cmd mở rộng %VAR% kể cả trong dấu nháy, và cắt lệnh ở xuống dòng → không có cách quote an toàn
function unsafeShellArg(args) {
  return args.find((a) => /[%\r\n]/.test(a));
}

function defaultKill(child) {
  if (WIN) {
    const k = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    k.on('error', () => { try { child.kill(); } catch { /* bỏ qua */ } });
  } else {
    child.kill('SIGTERM');
  }
}

// Tail buffer: chỉ giữ ~max ký tự cuối, cắt theo lô để không copy mỗi chunk
function tailBuffer(max) {
  let s = '';
  let truncated = false;
  return {
    add(d) {
      s += d;
      if (s.length > 2 * max) { s = s.slice(-max); truncated = true; }
    },
    get value() { return s.length > max ? s.slice(-max) : s; },
    get truncated() { return truncated || s.length > max; },
  };
}

export function run(cmd, args = [], {
  cwd, input, env, timeoutMs = 30 * 60_000, logFile,
  maxBuffer = MAX_BUFFER, killGraceMs = KILL_GRACE_MS, killFn = defaultKill,
} = {}) {
  return new Promise((resolve) => {
    const out = tailBuffer(maxBuffer);
    const err = tailBuffer(maxBuffer);
    let log = null;
    let done = false;
    let timer = null;
    let graceTimer = null;
    let child = null;
    const writeLog = (d) => { if (log && !done) log.write(d); };
    const finish = (code) => {
      if (done) return;
      clearTimeout(timer);
      clearTimeout(graceTimer);
      done = true;
      const result = {
        code, stdout: out.value, stderr: err.value, pid: child?.pid,
        stdoutTruncated: out.truncated, stderrTruncated: err.truncated,
      };
      if (!log) return resolve(result);
      // chờ log ghi xong (tối đa 1 s) để caller đọc được log đầy đủ
      const cap = setTimeout(() => resolve(result), 1000);
      const settle = () => { clearTimeout(cap); resolve(result); };
      log.once('error', settle);
      log.end(settle);
    };
    try {
      const shell = WIN && NEEDS_SHELL.has(cmd);
      if (shell) {
        const bad = unsafeShellArg(args);
        if (bad !== undefined) throw new Error(`[runner] từ chối chạy ${cmd} qua cmd.exe: tham số chứa % hoặc xuống dòng: ${JSON.stringify(bad)}`);
      }
      if (logFile) {
        try {
          fs.mkdirSync(path.dirname(logFile), { recursive: true });
        } catch { /* createWriteStream sẽ báo lỗi, đã có handler */ }
        log = fs.createWriteStream(logFile, { flags: 'a' });
        log.on('error', () => { log = null; });
        log.write(`\n$ ${cmd} ${args.join(' ')}\n`);
      }
      const options = { cwd, env: { ...process.env, ...env }, windowsHide: true };
      child = shell
        ? spawn([cmd, ...args.map(quoteArg)].join(' '), { ...options, shell: true })
        : spawn(cmd, args, options);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (d) => { out.add(d); writeLog(d); });
      child.stderr.on('data', (d) => { err.add(d); writeLog(d); });
      child.stdout.on('error', () => {});
      child.stderr.on('error', () => {});
      timer = setTimeout(() => {
        const msg = `\n[runner] quá thời gian ${timeoutMs}ms, dừng tiến trình`;
        err.add(msg);
        writeLog(msg);
        try { killFn(child); } catch { /* bỏ qua */ }
        // close có thể không bao giờ tới (tiến trình cháu giữ pipe) → vẫn resolve
        graceTimer = setTimeout(() => {
          err.add(`\n[runner] không nhận được close sau ${killGraceMs}ms, bỏ qua tiến trình`);
          finish(1);
        }, killGraceMs);
      }, timeoutMs);
      child.on('error', (e) => { err.add(String(e)); });
      child.on('close', (code) => finish(code ?? 1));
      // tiến trình thoát sớm → ghi stdin gặp EPIPE/EOF; không được làm sập runner
      child.stdin.on('error', () => {});
      child.stdin.end(input ?? '');
    } catch (e) {
      err.add(e?.message ?? String(e));
      if (child && child.pid) { try { killFn(child); } catch { /* bỏ qua */ } }
      finish(1);
    }
  });
}
