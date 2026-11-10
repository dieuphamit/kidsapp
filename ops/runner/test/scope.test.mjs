import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outOfScope } from '../lib/scope.mjs';

test('trả về các file nằm ngoài scope', () => {
  const scope = ['app/src/games/animals/**', 'app/e2e/animals.spec.ts'];
  const files = ['app/src/games/animals/Game.tsx', 'app/e2e/animals.spec.ts', 'app/src/core/audio.ts', 'ops/runner/x.mjs'];
  assert.deepEqual(outOfScope(files, scope), ['app/src/core/audio.ts', 'ops/runner/x.mjs']);
});

test('ops/, CLAUDE.md, .github/ luôn bị cấm, kể cả khi scope cho phép', () => {
  assert.deepEqual(outOfScope(['ops/tasks/a.md', 'CLAUDE.md', '.github/x.yml'], ['**']), ['ops/tasks/a.md', 'CLAUDE.md', '.github/x.yml']);
});

test('danh sách cấm không phân biệt hoa thường (NTFS), có thêm .claude/, .gitignore, .gitattributes', () => {
  const files = ['OPS/runner/x.mjs', 'claude.md', '.GitHub/w.yml', '.claude/settings.json', '.Gitignore', '.gitattributes', 'app/ok.ts'];
  assert.deepEqual(outOfScope(files, ['**']), files.slice(0, 6));
});

test('scope cho phép cũng không phân biệt hoa thường', () => {
  assert.deepEqual(outOfScope(['App/Src/Games/Animals/Game.tsx'], ['app/src/games/animals/**']), []);
});

test('bỏ tiền tố ./ trong pattern scope', () => {
  assert.deepEqual(outOfScope(['app/src/a.ts', 'app/b.ts'], ['./app/src/**']), ['app/b.ts']);
});
