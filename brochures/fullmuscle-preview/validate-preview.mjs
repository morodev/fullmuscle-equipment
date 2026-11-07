import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const allowPending = process.argv.includes('--allow-pending');
const manifest = JSON.parse(await fs.readFile(path.join(directory, 'sources.json'), 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const failures = [];
const warnings = [];
const sourceResults = [];
const outputResults = [];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

if (manifest.sources.length !== 14 || manifest.outputs.length !== 9) {
  failures.push('Expected 14 originals and 9 distinct output views.');
}
if (new Set(manifest.outputs.map(output => output.outputFile)).size !== 9) {
  failures.push('Output filenames are not unique.');
}
if (new Set(manifest.outputs.map(output => output.publicSku)).size !== 7) {
  failures.push('Expected 7 distinct catalog models.');
}

for (const source of manifest.sources) {
  try {
    const buffer = await fs.readFile(path.join(root, source.path));
    const unchanged = digest(buffer) === source.sha256;
    sourceResults.push({ file: source.fileName, unchanged });
    if (!unchanged) failures.push(`Original changed: ${source.fileName}`);
    if (source.role === 'duplicate') {
      const canonical = manifest.sources.find(item => item.fileName === source.canonicalSource);
      if (!canonical || canonical.sha256 !== source.sha256) {
        failures.push(`Duplicate does not match its canonical source: ${source.fileName}`);
      }
    }
  } catch (error) {
    failures.push(`Cannot read original ${source.fileName}: ${error.message}`);
  }
}

for (const output of manifest.outputs) {
  try {
    const buffer = await fs.readFile(path.join(directory, output.outputFile));
    const metadata = await sharp(buffer).metadata();
    const source = manifest.sources.find(item => item.fileName === output.canonicalSource);
    const validPng = buffer.subarray(0, 8).equals(pngSignature) && metadata.format === 'png';
    const ratioDelta = Math.abs((metadata.width / metadata.height) / (source.width / source.height) - 1) * 100;
    outputResults.push({
      file: output.outputFile,
      status: 'present',
      validPng,
      width: metadata.width,
      height: metadata.height,
      sourceWidth: source.width,
      sourceHeight: source.height,
      aspectRatioDifferencePercent: Number(ratioDelta.toFixed(2)),
      bytes: buffer.length,
      sha256: digest(buffer),
    });
    if (!validPng || !metadata.width || !metadata.height) failures.push(`Invalid PNG: ${output.outputFile}`);
    if (ratioDelta > 3) warnings.push(`Check framing/aspect ratio manually: ${output.outputFile} (${ratioDelta.toFixed(2)}% difference).`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      outputResults.push({ file: output.outputFile, status: 'pending' });
      if (!allowPending) failures.push(`Missing output: ${output.outputFile}`);
    } else {
      failures.push(`Cannot inspect output ${output.outputFile}: ${error.message}`);
    }
  }
}

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  originalsUnchanged: sourceResults.filter(source => source.unchanged).length,
  expectedOriginals: 14,
  presentOutputs: outputResults.filter(output => output.status === 'present').length,
  expectedOutputs: 9,
  pendingAllowed: allowPending,
  failures,
  warnings,
  outputs: outputResults,
  visualReviewRequired: 'Verify machine geometry, green zones, legibility, logos, occlusions and instruction labels against the originals.',
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
