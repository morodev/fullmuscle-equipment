import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { generatePublicCatalog } from './generate-public-catalog';
import { validateReleaseConfig } from './release-config';

try {
  loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const privacyTemplate = await readFile(new URL('../../src/pages/[lang]/[page].astro', import.meta.url), 'utf8');
const missing = validateReleaseConfig(process.env, privacyTemplate);

if (missing.length) {
  console.error(`Configurazione di pubblicazione incompleta:\n- ${[...new Set(missing)].join('\n- ')}`);
  process.exitCode = 1;
} else {
  await generatePublicCatalog();
  console.log('Configurazione di pubblicazione completa.');
}
