import fs from 'node:fs';
import path from 'node:path';
import { run as realRun } from './sh.mjs';

const FEEDBACK_MAX = 6000;
export const BASE_PORT = 4173;
const DEFAULT_TIMEOUT_MS = 90 * 60_000;

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

const tailText = (s, n) => (s.length > n ? s.slice(-n) : s);
const jsonOf = (r) => (r.json !== undefined ? r.json : parseJson(r.stdout ?? ''));
const failed = (r, j) => r.code !== 0 || j?.is_error === true;
// JSON hợp lệ thì chỉ xét result (stdout còn chứa log tool, dễ khớp nhầm); stdout thô chỉ dùng khi JSON hỏng
const messageOf = (r, j) => `${j ? (j.result ?? '') : (r.stdout ?? '')}\n${r.stderr ?? ''}`;

const LIMIT_RE = /usage limit|rate[ _-]?limit|limit reached|(5|five)-hour limit|weekly limit|session limit|\b429\b|overloaded/i;
const AUTH_RE = /invalid api key|please run \/login|\b401\b|not logged in|authentication/i;

export function isRateLimited(r) {
  const j = jsonOf(r);
  return failed(r, j) && LIMIT_RE.test(messageOf(r, j));
}

export function isAuthError(r) {
  const j = jsonOf(r);
  return failed(r, j) && AUTH_RE.test(messageOf(r, j));
}

// "…|1794300000" (epoch giây) hoặc "resets 3pm" / "resets 3:30pm" / "resets 15:00" theo giờ máy; đã qua thì là ngày mai
export function resetAt(r, now = new Date()) {
  const text = `${r.stdout ?? ''}\n${r.stderr ?? ''}\n${jsonOf(r)?.result ?? ''}`;
  const epoch = text.match(/limit reached\|(\d{9,})/i);
  if (epoch) return Number(epoch[1]) * 1000;
  const m = text.match(/resets\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m || (!m[2] && !m[3])) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === 'pm' ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// null nếu agent chạy xong bình thường; ngược lại là lý do ngắn gọn để ghi vào task/report
export function agentFailure(r) {
  const j = jsonOf(r);
  const subtype = j?.subtype && j.subtype !== 'success' ? j.subtype : null;
  if (!failed(r, j) && !subtype) return null;
  const head = `agent lỗi (exit ${r.code}${subtype ? `, ${subtype}` : ''})`;
  if (subtype === 'error_max_turns') {
    const turns = j.num_turns ? ` sau ${j.num_turns} lượt` : '';
    return `${head}: hết số lượt cho phép${turns}`;
  }
  const detail = String(j?.result || r.stderr || r.stdout || '').trim();
  return `${head}: ${tailText(detail, 500)}`;
}

export function denialSummary(json) {
  const list = Array.isArray(json?.permission_denials) ? json.permission_denials : [];
  if (!list.length) return '';
  const show = (d) => {
    const i = d.tool_input ?? {};
    const what = i.command ?? i.file_path ?? i.path ?? i.url ?? JSON.stringify(i);
    return `${d.tool_name}: ${String(what).replace(/\s+/g, ' ').slice(0, 100)}`;
  };
  const more = list.length > 5 ? ` (+${list.length - 5} nữa)` : '';
  return `quyền bị từ chối (${list.length}): ${list.slice(0, 5).map(show).join('; ')}${more}`;
}

// --setting-sources project: không nạp ~/.claude/settings.json (hook, plugin, quyền allow của người dùng);
// --strict-mcp-config: không nạp MCP server nào (kể cả connector claude.ai)
export const CLAUDE_ARGS = [
  '-p', '--output-format', 'json', '--permission-mode', 'dontAsk',
  '--setting-sources', 'project', '--strict-mcp-config',
];

export const MAX_TURNS = { ui: 150, logic: 100, test: 100, asset: 60, tts: 60, review: 30 };

export function claudeArgs(type, settingsPath) {
  return [...CLAUDE_ARGS, '--max-turns', String(MAX_TURNS[type] ?? 100), '--settings', settingsPath];
}

// Reviewer chỉ đọc: cùng bộ cờ nhưng ít lượt hơn
export function reviewerArgs(settingsPath) {
  return [...CLAUDE_ARGS, '--max-turns', String(MAX_TURNS.review), '--settings', settingsPath];
}

export async function runAgent({ cwd, task, ops, feedback, logFile, slot = 0, timeoutMs = DEFAULT_TIMEOUT_MS, run = realRun }) {
  const roleText = fs.readFileSync(path.join(ops, 'runner', 'prompts', `${roleFor(task.type)}.md`), 'utf8');
  const r = await run('claude', claudeArgs(task.type, path.join(ops, 'runner', 'agent-settings.json')), {
    cwd,
    input: buildPrompt(roleText, task, feedback),
    env: { E2E_PORT: String(BASE_PORT + slot) },
    timeoutMs,
    logFile,
  });
  const withJson = { ...r, json: parseJson(r.stdout) };
  return { ...withJson, rateLimited: isRateLimited(withJson), authError: isAuthError(withJson), resetAt: resetAt(withJson) };
}
