import fs from 'node:fs';
import path from 'node:path';

const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60MB
const MAX_MODEL_SIZE = 1 * 1024 * 1024; // 1MB

// Lấy thư mục từ đối số hoặc dùng dist/ mặc định
const targetDir = process.argv[2] || path.join(import.meta.dirname, '..', 'dist');

if (!fs.existsSync(targetDir)) {
  console.error(`Thư mục "${targetDir}" không tồn tại.\nChạy npm run build trước.`);
  process.exit(1);
}

// Thu thập tất cả file và kích thước
const files = [];

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      files.push({ path: fullPath, size: stat.size });
    }
  }
}

walkDir(targetDir);

// Tính tổng dung lượng
const totalSize = files.reduce((sum, f) => sum + f.size, 0);

// Kiểm tra các file model .glb trong thư mục models
const modelsDir = path.join(targetDir, 'models');
const oversizedModels = [];
if (fs.existsSync(modelsDir)) {
  for (const f of files) {
    if (f.path.startsWith(modelsDir) && f.path.endsWith('.glb') && f.size > MAX_MODEL_SIZE) {
      oversizedModels.push({ path: path.relative(targetDir, f.path), size: f.size });
    }
  }
}

let exitCode = 0;

// Kiểm tra model quá lớn
if (oversizedModels.length > 0) {
  console.error('Model .glb vượt quá 1MB:');
  for (const m of oversizedModels) {
    console.error(`  ${m.path}: ${(m.size / 1024 / 1024).toFixed(2)} MB`);
  }
  exitCode = 1;
}

// Kiểm tra tổng dung lượng
if (totalSize >= MAX_TOTAL_SIZE) {
  console.error(`Tổng dung lượng ${(totalSize / 1024 / 1024).toFixed(2)} MB vượt quá 60MB.`);
  console.error('10 file lớn nhất:');
  files.sort((a, b) => b.size - a.size);
  for (let i = 0; i < Math.min(10, files.length); i++) {
    const f = files[i];
    console.error(`  ${path.relative(targetDir, f.path)}: ${(f.size / 1024 / 1024).toFixed(2)} MB`);
  }
  exitCode = 1;
}

if (exitCode === 0) {
  // Tìm file lớn nhất
  files.sort((a, b) => b.size - a.size);
  const largest = files[0];
  const largestPath = largest ? path.relative(targetDir, largest.path) : '(không có file)';
  const largestSize = largest ? (largest.size / 1024 / 1024).toFixed(2) : 0;
  console.log(`check-size: ${(totalSize / 1024 / 1024).toFixed(2)} MB, ${files.length} file, lớn nhất: ${largestPath} (${largestSize} MB)`);
}

process.exit(exitCode);
