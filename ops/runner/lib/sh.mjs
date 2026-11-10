import { spawn } from 'node:child_process';
import fs from 'node:fs';

const WIN = process.platform === 'win32';
// npm/npx trên Windows là file .cmd nên phải chạy qua shell
const NEEDS_SHELL = new Set(['npm', 'npx']);
const quote = (a) => (/[\s"&|<>^()%!]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);

export function run(cmd, args = [], { cwd, input, env, timeoutMs = 30 * 60_000, logFile } = {}) {
  return new Promise((resolve) => {
    const shell = WIN && NEEDS_SHELL.has(cmd);
    const options = { cwd, env: { ...process.env, ...env }, windowsHide: true };
    const child = shell
      ? spawn([cmd, ...args.map(quote)].join(' '), { ...options, shell: true })
      : spawn(cmd, args, options);
    let stdout = '';
    let stderr = '';
    const log = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
    log?.write(`\n$ ${cmd} ${args.join(' ')}\n`);
    child.stdout.on('data', (d) => { stdout += d; log?.write(d); });
    child.stderr.on('data', (d) => { stderr += d; log?.write(d); });
    const timer = setTimeout(() => {
      stderr += `\n[runner] quá thời gian ${timeoutMs}ms, dừng tiến trình`;
      if (WIN) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill('SIGTERM');
    }, timeoutMs);
    child.on('error', (e) => { stderr += String(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      log?.end();
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.stdin.end(input ?? '');
  });
}
