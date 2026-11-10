import fs from 'node:fs';
import path from 'node:path';
import { run } from './sh.mjs';

const WIN = process.platform === 'win32';

async function gitRaw(cwd, args) {
  const r = await run('git', args, { cwd });
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} (${cwd}): ${r.stderr.trim()}`);
  return r.stdout;
}

export async function git(cwd, ...args) {
  return (await gitRaw(cwd, args)).trim();
}

export const worktreeDir = (root, id) => path.join(root, 'wt', id);

// So sánh đường dẫn: git trả "C:/x/y", Node dùng "C:\x\y"; NTFS không phân biệt hoa thường
function normPath(p) {
  let abs = path.resolve(p);
  try { abs = fs.realpathSync.native(abs); } catch { /* chưa tồn tại */ }
  abs = abs.replace(/\\/g, '/').replace(/\/+$/, '');
  return WIN ? abs.toLowerCase() : abs;
}
const samePath = (a, b) => normPath(a) === normPath(b);

// git worktree remove --force (Git for Windows 2.51) xóa XUYÊN junction: nội dung assets-src gốc sẽ mất.
// Luôn gỡ mọi symlink/junction ở cấp đầu của worktree trước khi để git hay fs xóa thư mục.
export function detachLinks(dir) {
  let names;
  try { names = fs.readdirSync(dir); } catch { return; }
  for (const name of names) {
    const p = path.join(dir, name);
    try {
      if (fs.lstatSync(p).isSymbolicLink()) fs.unlinkSync(p);
    } catch { /* không gỡ được thì để nơi gọi phát hiện */ }
  }
}

function removeDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch { /* kiểm tra lại bằng existsSync ở nơi gọi */ }
}

async function registeredWorktrees(root) {
  const out = await git(root, 'worktree', 'list', '--porcelain');
  return out.split(/\r?\n/).filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length));
}

async function branchExists(root, branch) {
  const r = await run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: root });
  return r.code === 0;
}

// dir là một worktree hợp lệ: đã đăng ký và show-toplevel trỏ đúng về dir (không phải repo gốc chứa nó)
async function isValidWorktree(root, dir) {
  if (!(await registeredWorktrees(root)).some((w) => samePath(w, dir))) return false;
  const r = await run('git', ['rev-parse', '--show-toplevel'], { cwd: dir });
  return r.code === 0 && samePath(r.stdout.trim(), dir);
}

// Chặn mọi thao tác phá hủy (reset, add -A, rebase) chạy nhầm vào repo gốc
export async function assertTaskWorktree(dir) {
  const fail = (why) => { throw new Error(`${dir} không phải worktree task dưới <root>/wt/: ${why}`); };
  if (path.basename(path.dirname(path.resolve(dir))).toLowerCase() !== 'wt') fail('không nằm trong thư mục wt/');
  if (!fs.existsSync(dir)) fail('thư mục không tồn tại');
  const top = await run('git', ['rev-parse', '--show-toplevel'], { cwd: dir });
  if (top.code !== 0) fail(top.stderr.trim());
  if (!samePath(top.stdout.trim(), dir)) fail(`show-toplevel là ${top.stdout.trim()}`);
  const [gitDir, commonDir] = (await git(dir, 'rev-parse', '--git-dir', '--git-common-dir')).split(/\r?\n/);
  if (samePath(path.resolve(dir, gitDir), path.resolve(dir, commonDir))) fail('đây là worktree chính, không phải worktree phụ');
}

export async function ensureWorktree(root, id) {
  const dir = worktreeDir(root, id);
  const branch = `task/${id}`;
  await git(root, 'worktree', 'prune');
  if (fs.existsSync(dir)) {
    if (await isValidWorktree(root, dir)) return dir;
    // rác còn sót (thư mục thường, worktree hỏng) → dọn rồi tạo lại
    detachLinks(dir);
    await run('git', ['worktree', 'remove', '--force', dir], { cwd: root });
    removeDir(dir);
    if (fs.existsSync(dir)) throw new Error(`không xóa được thư mục worktree cũ: ${dir}`);
    await git(root, 'worktree', 'prune');
  }
  if (await branchExists(root, branch)) {
    // giữ nguyên commit đã có trên branch, không dùng -B
    await git(root, 'worktree', 'add', dir, branch);
  } else {
    await git(root, 'worktree', 'add', '-b', branch, dir, 'main');
  }
  return dir;
}

export async function commitAll(dir, message) {
  await assertTaskWorktree(dir);
  if (!(await git(dir, 'status', '--porcelain'))) return false;
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-m', message);
  return true;
}

// -z + quotepath=false: tên file tiếng Việt/có dấu cách không bị quote;
// --no-renames: file đổi tên liệt kê cả đường dẫn cũ lẫn mới để kiểm tra scope
export async function changedFiles(dir) {
  const out = await gitRaw(dir, ['-c', 'core.quotepath=false', 'diff', '--name-only', '--no-renames', '-z', 'main...HEAD']);
  return out.split('\0').filter(Boolean);
}

export async function head(dir) {
  return git(dir, 'rev-parse', 'HEAD');
}

async function rebaseInProgress(dir) {
  for (const p of ['rebase-merge', 'rebase-apply']) {
    const rel = await git(dir, 'rev-parse', '--git-path', p);
    if (fs.existsSync(path.resolve(dir, rel))) return true;
  }
  return false;
}

export async function rebaseOnMain(dir) {
  await assertTaskWorktree(dir);
  const r = await run('git', ['rebase', 'main'], { cwd: dir });
  if (r.code === 0) return true;
  if (await rebaseInProgress(dir)) await git(dir, 'rebase', '--abort');
  return false;
}

export async function resetToMain(dir) {
  await assertTaskWorktree(dir);
  await git(dir, 'reset', '--hard', 'main');
}

// Gốc phải sạch ngoài ops/ (ops/tasks thay đổi suốt đêm); bẩn thì ném để caller park task
export async function ffMerge(root, id) {
  const cur = await run('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: root });
  const branch = cur.code === 0 ? cur.stdout.trim() : '';
  if (branch !== 'main') throw new Error(`repo gốc không ở nhánh main (đang ở ${branch || 'HEAD rời'}), không merge task/${id}`);
  const dirty = await git(root, 'status', '--porcelain', '--', '.', ':(exclude)ops');
  if (dirty) throw new Error(`không merge task/${id}: thư mục gốc còn thay đổi chưa commit (ngoài ops/):\n${dirty}`);
  await git(root, 'merge', '--ff-only', `task/${id}`);
}

export async function removeWorktree(root, id) {
  const dir = worktreeDir(root, id);
  const branch = `task/${id}`;
  detachLinks(dir);
  await run('git', ['worktree', 'remove', '--force', dir], { cwd: root });
  if (fs.existsSync(dir)) removeDir(dir);
  await git(root, 'worktree', 'prune');
  let branchError = null;
  if (await branchExists(root, branch)) {
    try { await git(root, 'branch', '-D', branch); } catch (e) { branchError = e; }
  }
  if (fs.existsSync(dir)) throw new Error(`không xóa được thư mục worktree ${dir} (có thể đang bị khóa)`);
  if (branchError) throw branchError;
}

// Hoàn tác file ngoài scope về trạng thái ở merge-base với main: có ở base thì checkout, không có thì xóa
export async function revertPaths(dir, files, message = 'chore: runner hoàn tác file ngoài scope') {
  await assertTaskWorktree(dir);
  if (!files.length) return false;
  const base = await git(dir, 'merge-base', 'main', 'HEAD');
  for (const f of files) {
    const atBase = await run('git', ['cat-file', '-e', `${base}:${f}`], { cwd: dir });
    if (atBase.code === 0) await git(dir, '--literal-pathspecs', 'checkout', base, '--', f);
    else await git(dir, '--literal-pathspecs', 'rm', '-f', '-q', '--ignore-unmatch', '--', f);
  }
  if (!(await git(dir, 'status', '--porcelain'))) return false;
  await git(dir, 'commit', '-q', '-m', message);
  return true;
}

export const ASSETS_DIR = 'assets-src';

// Cho agent thấy <root>/assets-src thành <wt>/assets-src (junction; không tạo được thì ném, không chép dự phòng).
// assets-src/ có trong .gitignore gốc nên không bao giờ bị commit. Không có thư mục nguồn → bỏ qua.
export async function linkAssetsSrc(root, wt, { symlink = fs.symlinkSync } = {}) {
  await assertTaskWorktree(wt);
  const target = path.join(root, ASSETS_DIR);
  if (!fs.existsSync(target)) return false;
  const link = path.join(wt, ASSETS_DIR);
  let st = null;
  try { st = fs.lstatSync(link); } catch { /* chưa có */ }
  if (st) {
    if (!st.isSymbolicLink() || fs.existsSync(link)) return true;
    fs.unlinkSync(link); // junction hỏng
  }
  symlink(target, link, 'junction');
  return true;
}
