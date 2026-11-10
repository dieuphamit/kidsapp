import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Một dòng mô tả vì sao task todo bị chặn (kết quả blockedReasons)
export function blockedText(b) {
  const parts = [];
  if (b.missing.length) parts.push(`chưa có task ${b.missing.join(', ')}`);
  if (b.failed.length) parts.push(`phụ thuộc đã lỗi ${b.failed.join(', ')}`);
  if (b.waiting.length) parts.push(`chờ ${b.waiting.join(', ')} xong`);
  return `${b.id}: ${parts.join('; ')}`;
}

// true khi file đang chạy chính là entry point của tiến trình (importMetaUrl = import.meta.url)
export function isMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  const norm = (p) => {
    let r = path.resolve(p);
    try { r = fs.realpathSync.native(r); } catch { /* giữ nguyên */ }
    return process.platform === 'win32' ? r.toLowerCase() : r;
  };
  return norm(process.argv[1]) === norm(fileURLToPath(importMetaUrl));
}
