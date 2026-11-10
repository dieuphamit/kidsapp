import fs from 'node:fs';
import path from 'node:path';
import { run } from './sh.mjs';

const FEEDBACK_MAX = 6000;

export function roleFor(type) {
  return type === 'asset' || type === 'tts' ? 'asset' : 'worker';
}

export function buildPrompt(roleText, task, feedback) {
  const parts = [
    roleText.trim(),
    `# TASK ${task.id}: ${task.title}`,
    `Loại: ${task.type}`,
    `Scope (chỉ được sửa file khớp các glob này, tính từ gốc repo):\n${task.scope.map((s) => `- ${s}`).join('\n')}`,
    `Điều kiện xong:\n${task.acceptance.map((a) => `- ${a}`).join('\n')}`,
    task.body.trim(),
  ];
  if (feedback) parts.push(`# Lần trước chưa đạt. Log/lý do (phần cuối):\n${feedback.slice(-FEEDBACK_MAX)}`);
  return parts.join('\n\n');
}

export function parseJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

const LIMIT_RE = /usage limit|rate[ _-]?limit|\b429\b/i;

export function isRateLimited(r) {
  const j = parseJson(r.stdout);
  const failed = r.code !== 0 || j?.is_error === true;
  return failed && LIMIT_RE.test(`${j?.result ?? r.stdout}\n${r.stderr}`);
}

export function resetAt(r) {
  const m = `${r.stdout}\n${r.stderr}`.match(/limit reached\|(\d{9,})/i);
  return m ? Number(m[1]) * 1000 : null;
}

export const CLAUDE_ARGS = ['-p', '--output-format', 'json', '--permission-mode', 'dontAsk', '--max-turns', '80'];

export async function runAgent({ cwd, task, ops, feedback, logFile }) {
  const roleText = fs.readFileSync(path.join(ops, 'runner', 'prompts', `${roleFor(task.type)}.md`), 'utf8');
  const r = await run('claude', [...CLAUDE_ARGS, '--settings', path.join(ops, 'runner', 'agent-settings.json')], {
    cwd,
    input: buildPrompt(roleText, task, feedback),
    timeoutMs: 90 * 60_000,
    logFile,
  });
  return { ...r, json: parseJson(r.stdout), rateLimited: isRateLimited(r), resetAt: resetAt(r) };
}
