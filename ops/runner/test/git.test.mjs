import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo } from './helpers.mjs';
import { ensureWorktree, commitAll, changedFiles, rebaseOnMain, ffMerge, removeWorktree, head, resetToMain, worktreeDir } from '../lib/git.mjs';

const norm = (p) => path.resolve(fs.realpathSync.native(p)).replace(/\\/g, '/').toLowerCase();
const worktrees = (g) => g('worktree', 'list', '--porcelain').split(/\r?\n/)
  .filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9).toLowerCase());
const branchExists = (g, b) => g('branch', '--list', b) !== '';

test('ensureWorktree: thư mục rác còn sót (không phải worktree) thì xóa rồi tạo worktree mới', async () => {
  const { root, g } = tempRepo();
  const dir = worktreeDir(root, 'T-010');
  fs.mkdirSync(path.join(dir, 'rac'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'rac', 'x.txt'), 'rác');
  const wt = await ensureWorktree(root, 'T-010');
  assert.equal(norm(g('-C', wt, 'rev-parse', '--show-toplevel')), norm(dir));
  assert.equal(g('-C', wt, 'rev-parse', '--abbrev-ref', 'HEAD'), 'task/T-010');
  assert.ok(!fs.existsSync(path.join(dir, 'rac')));
  assert.ok(fs.existsSync(path.join(wt, 'app', 'a.txt')));
});

test('ensureWorktree: thư mục worktree bị xóa tay thì tạo lại từ branch cũ, giữ commit chưa merge', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-011');
  fs.writeFileSync(path.join(wt, 'app', 'moi.txt'), 'việc dở');
  await commitAll(wt, 'việc dở');
  const sha = await head(wt);
  fs.rmSync(wt, { recursive: true, force: true });
  const again = await ensureWorktree(root, 'T-011');
  assert.equal(again, wt);
  assert.equal(await head(again), sha, 'commit trên task/T-011 còn nguyên');
  assert.equal(fs.readFileSync(path.join(again, 'app', 'moi.txt'), 'utf8'), 'việc dở');
});

test('removeWorktree: xóa thư mục, đăng ký worktree và branch', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-012');
  fs.writeFileSync(path.join(wt, 'app', 'chua-commit.txt'), 'x');
  await removeWorktree(root, 'T-012');
  assert.ok(!fs.existsSync(wt));
  assert.ok(!worktrees(g).some((w) => w.endsWith('/wt/t-012')));
  assert.ok(!branchExists(g, 'task/T-012'));
});

test('removeWorktree: thư mục đã bị xóa tay thì prune đăng ký cũ và xóa branch, không ném', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-013');
  fs.rmSync(wt, { recursive: true, force: true });
  await removeWorktree(root, 'T-013');
  assert.ok(!worktrees(g).some((w) => w.endsWith('/wt/t-013')));
  assert.ok(!branchExists(g, 'task/T-013'));
});

test('changedFiles: tên file tiếng Việt và file đổi tên (liệt kê cả đường dẫn cũ lẫn mới)', async () => {
  const { root } = tempRepo();
  const wt = await ensureWorktree(root, 'T-014');
  fs.writeFileSync(path.join(wt, 'app', 'bài học.txt'), 'xin chào');
  fs.renameSync(path.join(wt, 'app', 'a.txt'), path.join(wt, 'app', 'đổi-tên.txt'));
  await commitAll(wt, 'đổi tên');
  assert.deepEqual((await changedFiles(wt)).sort(), ['app/a.txt', 'app/bài học.txt', 'app/đổi-tên.txt'].sort());
});

test('resetToMain từ chối chạy ngoài worktree task và không đụng tới repo gốc', async () => {
  const { root, g } = tempRepo();
  // reset --hard main ở gốc sẽ xóa thay đổi chưa commit này
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'sửa dở ở gốc');
  const rootHead = g('rev-parse', 'HEAD');
  await assert.rejects(resetToMain(path.join(root, 'app')), /worktree/);
  await assert.rejects(resetToMain(root), /worktree/);
  fs.mkdirSync(path.join(root, 'wt', 'T-099'), { recursive: true });
  await assert.rejects(resetToMain(path.join(root, 'wt', 'T-099')), /worktree/);
  assert.equal(g('rev-parse', 'HEAD'), rootHead);
  assert.equal(fs.readFileSync(path.join(root, 'app', 'a.txt'), 'utf8'), 'sửa dở ở gốc');
});

test('resetToMain đưa worktree task về main', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-015');
  fs.writeFileSync(path.join(wt, 'app', 'x.txt'), 'x');
  await commitAll(wt, 'x');
  await resetToMain(wt);
  assert.equal(await head(wt), g('rev-parse', 'main'));
});

test('ffMerge ném lỗi khi repo gốc bẩn và không đụng tới repo gốc', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-016');
  fs.writeFileSync(path.join(wt, 'app', 'a.txt'), 'từ task');
  await commitAll(wt, 'task sửa a');
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'sửa dở ở gốc');
  const rootHead = g('rev-parse', 'HEAD');
  await assert.rejects(ffMerge(root, 'T-016'));
  assert.equal(g('rev-parse', 'HEAD'), rootHead);
  assert.equal(fs.readFileSync(path.join(root, 'app', 'a.txt'), 'utf8'), 'sửa dở ở gốc');
});

test('ffMerge ném lỗi khi gốc bẩn ngoài ops/ dù file bẩn không bị merge đụng tới', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-017');
  fs.writeFileSync(path.join(wt, 'app', 'moi.txt'), 'từ task');
  await commitAll(wt, 'task thêm file');
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'sửa dở ở gốc');
  const rootHead = g('rev-parse', 'HEAD');
  await assert.rejects(ffMerge(root, 'T-017'), /chưa commit/);
  assert.equal(g('rev-parse', 'HEAD'), rootHead);
  // thay đổi trong ops/ (task chuyển trạng thái ban đêm) không chặn merge
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'a');
  fs.mkdirSync(path.join(root, 'ops', 'tasks', 'doing'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ops', 'tasks', 'doing', 'T-017.md'), 'x');
  await ffMerge(root, 'T-017');
  assert.ok(fs.existsSync(path.join(root, 'app', 'moi.txt')));
});

test('worktree → commit → diff → rebase → merge ff → dọn', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-001');
  assert.equal(await ensureWorktree(root, 'T-001'), wt, 'gọi lại thì dùng lại worktree cũ');
  fs.writeFileSync(path.join(wt, 'app', 'b.txt'), 'b');
  assert.equal(await commitAll(wt, 'thêm b'), true);
  assert.equal(await commitAll(wt, 'không có gì'), false);
  assert.deepEqual(await changedFiles(wt), ['app/b.txt']);

  fs.writeFileSync(path.join(root, 'app', 'c.txt'), 'c');
  g('add', '-A');
  g('commit', '-qm', 'main đi trước');
  const before = await head(wt);
  assert.equal(await rebaseOnMain(wt), true);
  assert.notEqual(await head(wt), before);

  await ffMerge(root, 'T-001');
  assert.ok(fs.existsSync(path.join(root, 'app', 'b.txt')));
  await removeWorktree(root, 'T-001');
  assert.ok(!fs.existsSync(wt));
});

test('rebase conflict thì hủy rebase và trả về false', async () => {
  const { root, g } = tempRepo();
  const wt = await ensureWorktree(root, 'T-002');
  fs.writeFileSync(path.join(wt, 'app', 'a.txt'), 'từ task');
  await commitAll(wt, 'sửa a');
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'từ main');
  g('commit', '-qam', 'main sửa a');
  assert.equal(await rebaseOnMain(wt), false);
  assert.equal(g('-C', wt, 'status', '--porcelain'), '', 'worktree sạch sau khi abort');
});
