import fs from 'node:fs';
import path from 'node:path';
import { run } from './sh.mjs';

export async function git(cwd, ...args) {
  const r = await run('git', args, { cwd });
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} (${cwd}): ${r.stderr.trim()}`);
  return r.stdout.trim();
}

export const worktreeDir = (root, id) => path.join(root, 'wt', id);

export async function ensureWorktree(root, id) {
  const dir = worktreeDir(root, id);
  if (fs.existsSync(dir)) return dir;
  await git(root, 'worktree', 'add', '-B', `task/${id}`, dir, 'main');
  return dir;
}

export async function commitAll(dir, message) {
  if (!(await git(dir, 'status', '--porcelain'))) return false;
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-m', message);
  return true;
}

export async function changedFiles(dir) {
  const out = await git(dir, 'diff', '--name-only', 'main...HEAD');
  return out ? out.split(/\r?\n/) : [];
}

export async function head(dir) {
  return git(dir, 'rev-parse', 'HEAD');
}

export async function rebaseOnMain(dir) {
  const r = await run('git', ['rebase', 'main'], { cwd: dir });
  if (r.code === 0) return true;
  await run('git', ['rebase', '--abort'], { cwd: dir });
  return false;
}

export async function resetToMain(dir) {
  await git(dir, 'reset', '--hard', 'main');
}

export async function ffMerge(root, id) {
  await git(root, 'merge', '--ff-only', `task/${id}`);
}

export async function removeWorktree(root, id) {
  await run('git', ['worktree', 'remove', '--force', worktreeDir(root, id)], { cwd: root });
  await run('git', ['branch', '-D', `task/${id}`], { cwd: root });
}
