import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function tempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
  const g = (...a) => execFileSync('git', a, { cwd: root }).toString().trim();
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'runner@test');
  g('config', 'user.name', 'runner');
  fs.writeFileSync(path.join(root, '.gitignore'), 'wt/\n');
  fs.mkdirSync(path.join(root, 'app'));
  fs.writeFileSync(path.join(root, 'app', 'a.txt'), 'a');
  g('add', '-A');
  g('commit', '-qm', 'init');
  return { root, g };
}
