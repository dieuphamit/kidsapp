#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, '..');
const modelsDir = join(appDir, 'public', 'models');
const assetsDir = join(appDir, '..', 'assets-src');

// Ensure models directory exists
if (!existsSync(modelsDir)) {
  mkdirSync(modelsDir, { recursive: true });
}

const models = [
  { src: 'kenney-cube-pets/Models/GLB format/animal-cow.glb', dest: 'cow.glb' },
  { src: 'kenney-cube-pets/Models/GLB format/animal-chick.glb', dest: 'chicken.glb' },
  { src: 'kenney-cube-pets/Models/GLB format/animal-pig.glb', dest: 'pig.glb' },
  { src: 'kenney-cube-pets/Models/GLB format/animal-dog.glb', dest: 'dog.glb' },
  { src: 'kenney-cube-pets/Models/GLB format/animal-bunny.glb', dest: 'rabbit.glb' },
  { src: 'kenney-cube-pets/Models/GLB format/animal-cat.glb', dest: 'cat.glb' },
  { src: 'polypizza-cc0/ducky-IsaLousberg.glb', dest: 'duck.glb' },
  { src: 'polypizza-cc0/sheep-Quaternius-2.glb', dest: 'sheep.glb' },
  { src: 'quaternius-ultimate-animated-animals/glTF/Horse.gltf', dest: 'horse.glb' },
];

async function optimizeModel(src, dest) {
  const srcPath = join(assetsDir, src);
  const destPath = join(modelsDir, dest);

  if (!existsSync(srcPath)) {
    console.error(`Source not found: ${srcPath}`);
    return false;
  }

  console.log(`Optimizing ${src} -> ${dest}`);
  try {
    const { stdout, stderr } = await execAsync(
      `npx gltf-transform optimize "${srcPath}" "${destPath}" --compress meshopt`,
      { cwd: appDir }
    );
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`Done: ${dest}`);
    return true;
  } catch (error) {
    console.error(`Failed ${dest}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Starting model optimization...');
  console.log('Assets dir:', assetsDir);
  console.log('Models dir:', modelsDir);

  let success = 0;
  for (const model of models) {
    if (await optimizeModel(model.src, model.dest)) {
      success++;
    }
  }
  console.log(`\nCompleted: ${success}/${models.length} models`);
}

main().catch(console.error);
