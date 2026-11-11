import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'public', 'cards');

// Card definitions
const CARDS = {
  farm: ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit', 'cat'],
  wild: ['elephant', 'giraffe', 'lion', 'tiger', 'monkey', 'panda', 'penguin', 'koala', 'fox', 'bear', 'parrot', 'fish'],
  fruit: ['apple', 'banana', 'cherries', 'grapes', 'lemon', 'orange', 'pear', 'pineapple', 'strawberry', 'watermelon',
    'kiwi', 'papaya', 'avocado', 'coconut', 'blueberry', 'peach']
};

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Start Vite dev server - using scripts/cards as root to serve index.html
  const cardsDir = join(__dirname, 'cards');
  const server = await createServer({
    root: cardsDir,
    server: { port: 0 },
    logLevel: 'warn',
    resolve: {
      alias: {
        'three': join(ROOT, 'node_modules', 'three')
      }
    },
    // Serve models from app/public
    publicDir: join(ROOT, 'public')
  });
  await server.listen();
  const address = server.httpServer.address();
  const port = typeof address === 'object' ? address.port : 5173;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Vite server running at ${baseUrl}`);

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1
  });

  const results = [];

  // Render each card
  for (const [kind, ids] of Object.entries(CARDS)) {
    for (const id of ids) {
      console.log(`Rendering ${id}...`);

      const page = await context.newPage();
      const url = `${baseUrl}/index.html?model=${id}`;

      try {
        await page.goto(url);
        // Wait for render to complete
        await page.waitForSelector('body[data-done="1"]', { timeout: 30000 });

        // Get canvas element
        const canvas = await page.$('canvas');
        if (!canvas) {
          console.error(`No canvas found for ${id}`);
          await page.close();
          continue;
        }

        // Screenshot canvas with transparent background
        const outputPath = join(OUTPUT_DIR, `${id}.png`);
        await canvas.screenshot({
          path: outputPath,
          omitBackground: true
        });

        // Check file size
        const stats = statSync(outputPath);
        const sizeKB = stats.size / 1024;
        console.log(`  ${id}.png: ${sizeKB.toFixed(1)} KB`);

        if (sizeKB > 150) {
          console.warn(`  Warning: ${id}.png exceeds 150KB, consider reducing canvas size`);
        }

        results.push({ id, kind });
      } catch (err) {
        console.error(`Failed to render ${id}:`, err.message);
      }

      await page.close();
    }
  }

  // Write index.json
  const indexPath = join(OUTPUT_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(results, null, 2) + '\n');
  console.log(`\nWritten ${indexPath} with ${results.length} cards`);

  // Cleanup
  await browser.close();
  await server.close();

  console.log('\nDone!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
