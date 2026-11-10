import picomatch from 'picomatch';

// NTFS không phân biệt hoa thường: "Ops/x" hay "claude.md" cũng phải bị chặn
const OPTS = { dot: true, nocase: true };
export const FORBIDDEN = ['ops/**', 'CLAUDE.md', '.github/**', '.claude/**', '.gitignore', '.gitattributes'];
const ALWAYS_FORBIDDEN = picomatch(FORBIDDEN, OPTS);

const cleanPattern = (p) => String(p).replace(/^(\.\/)+/, '');

export function outOfScope(files, scope) {
  const allowed = picomatch(scope.map(cleanPattern), OPTS);
  return files.filter((f) => ALWAYS_FORBIDDEN(f) || !allowed(f));
}
