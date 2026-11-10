import picomatch from 'picomatch';

const ALWAYS_FORBIDDEN = picomatch(['ops/**', 'CLAUDE.md', '.github/**'], { dot: true });

export function outOfScope(files, scope) {
  const allowed = picomatch(scope, { dot: true });
  return files.filter((f) => ALWAYS_FORBIDDEN(f) || !allowed(f));
}
