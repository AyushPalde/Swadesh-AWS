/**
 * AWS Lambda Packaging Script
 *
 * 1. Bundles `src/index.mjs` into `dist/index.mjs` using esbuild:
 *    - Platform: 'node'
 *    - Target: 'node22'
 *    - Format: 'esm'
 *    - Bundle all dependencies: true
 *    - Sourcemap: false
 *    - Outfile: 'dist/index.mjs'
 * 2. Compresses ONLY `dist/index.mjs` into `dist/function.zip` with `index.mjs` at the root of the zip.
 * 3. Measures and prints the resulting zip file size.
 * 4. Lambda handler setting: "index.handler".
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const archiverModule = require('archiver');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(BACKEND_ROOT, 'dist');
const ENTRY_FILE = path.resolve(BACKEND_ROOT, 'src/index.mjs');
const OUT_FILE = path.resolve(DIST_DIR, 'index.mjs');
const ZIP_FILE = path.resolve(DIST_DIR, 'function.zip');

function createZipArchive(options = {}) {
  if (typeof archiverModule === 'function') {
    return archiverModule('zip', options);
  }
  if (archiverModule.ZipArchive) {
    return new archiverModule.ZipArchive(options);
  }
  throw new Error('Unsupported archiver export format');
}

async function packageLambda() {
  console.log('================================================================');
  console.log('📦 SWADESH AWS Lambda Packaging Utility');
  console.log('================================================================');

  const startTime = Date.now();

  // 1. Clean & prepare dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // 2. Bundle with esbuild
  console.log('\n[1/3] Bundling with esbuild (node22, esm, bundled dependencies)...');
  await esbuild.build({
    entryPoints: [ENTRY_FILE],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: OUT_FILE,
    sourcemap: false,
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    logLevel: 'info',
  });

  const bundledStats = fs.statSync(OUT_FILE);
  const bundledKb = (bundledStats.size / 1024).toFixed(2);
  console.log(`   ✔ Generated dist/index.mjs (${bundledKb} KB)`);

  // 3. Create zip archive containing ONLY index.mjs at root
  console.log('\n[2/3] Archiving into dist/function.zip...');
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(ZIP_FILE);
    const archive = createZipArchive({
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);

    // Append dist/index.mjs at the root of the zip archive as index.mjs
    archive.file(OUT_FILE, { name: 'index.mjs' });

    archive.finalize().catch(reject);
  });

  // 4. Verify & Print Zip Size
  const zipStats = fs.statSync(ZIP_FILE);
  const zipBytes = zipStats.size;
  const zipKb = (zipBytes / 1024).toFixed(2);
  const zipMb = (zipBytes / (1024 * 1024)).toFixed(2);
  const durationMs = Date.now() - startTime;

  console.log('\n[3/3] Package complete!');
  console.log(`   📁 Archive Path : ${ZIP_FILE}`);
  console.log(`   ⚖️  Archive Size : ${zipBytes.toLocaleString()} bytes (${zipKb} KB / ${zipMb} MB)`);
  console.log(`   ⚡ Lambda Handler: index.handler`);
  console.log(`   ⏱️  Build Duration: ${durationMs}ms`);
  console.log('================================================================\n');
}

packageLambda().catch((err) => {
  console.error('\n❌ Packaging failed:', err);
  process.exit(1);
});
