import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempRepo } from './helpers.mjs';
import { ensureWorktree, commitAll, changedFiles, rebaseOnMain, ffMerge, removeWorktree, head } from '../lib/git.mjs';

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
