import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'https://fullmuscle-equipment.com/cataloghi/fullmuscle-g5.pdf';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const local = await fs.readFile(path.join(base, 'exports/catalogo-completo.pdf'));
const result = {checkedAt: new Date().toISOString(), url, expectedSha256: sha256(local), passed: false};
try {
  const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(30000)});
  result.status = response.status;
  result.contentType = response.headers.get('content-type');
  result.finalUrl = response.url;
  if (response.ok && result.contentType?.includes('application/pdf')) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    result.bytes = bytes.length;
    result.sha256 = sha256(bytes);
    result.passed = result.sha256 === result.expectedSha256;
  }
} catch (error) {
  result.error = error.message;
}
await fs.writeFile(path.join(base, 'exports/publication-check.json'), JSON.stringify(result, null, 2));
const preflightPath = path.join(base, 'exports/preflight.json');
const preflight = JSON.parse(await fs.readFile(preflightPath, 'utf8'));
preflight.qr.publicHttpStatus = result.status ?? 'unreachable';
preflight.qr.publicFileMatchesExport = result.passed;
preflight.qr.publicCheckedAt = result.checkedAt;
await fs.writeFile(preflightPath, JSON.stringify(preflight, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.passed ? 0 : 1;
