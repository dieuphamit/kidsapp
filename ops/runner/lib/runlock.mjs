import fs from 'node:fs';

// Khóa liên tiến trình ops/.runner.lock = {pid, startedAt}: chỉ một night-run tại một thời điểm,
// và task.mjs approve không merge khi night-run đang chạy.

// Windows có thể tái dùng pid sau khi mất điện: lock quá cũ là lock cũ dù pid "còn sống"
export const STALE_LOCK_MS = 15 * 3_600_000;
export const LOCK_HINT = 'nếu chắc không có night-run nào đang chạy, xóa ops/.runner.lock';

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // tồn tại nhưng không có quyền gửi tín hiệu
  }
}

export function readRunLock(file) {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

// lock còn hiệu lực (pid còn sống) hoặc null
export function liveRunLock(file, now = Date.now()) {
  const l = readRunLock(file);
  if (!l || !pidAlive(l.pid)) return null;
  const started = Date.parse(l.startedAt);
  if (Number.isFinite(started) && now - started > STALE_LOCK_MS) return null;
  return l;
}

export function acquireRunLock(file, pid = process.pid, now = new Date()) {
  for (let i = 0; i < 2; i++) {
    try {
      // wx: tạo mới nguyên tử, đã có thì EEXIST
      fs.writeFileSync(file, JSON.stringify({ pid, startedAt: now.toISOString() }), { flag: 'wx' });
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    const held = liveRunLock(file);
    if (held) throw new Error(`night-run khác đang chạy (pid ${held.pid}, từ ${held.startedAt}). Lock: ${file}; ${LOCK_HINT}`);
    fs.rmSync(file, { force: true }); // lock cũ của tiến trình đã chết
  }
  throw new Error(`không lấy được lock ${file}`);
}

// chỉ xóa lock của chính mình
export function releaseRunLock(file, pid = process.pid) {
  if (readRunLock(file)?.pid === pid) fs.rmSync(file, { force: true });
}
