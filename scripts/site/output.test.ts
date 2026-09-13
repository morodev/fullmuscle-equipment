import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

const clientRoot = join(process.cwd(), 'dist', 'client');
const serverRoot = join(process.cwd(), 'dist', 'server');

async function filesWithin(root: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) found.push(...await filesWithin(fullPath));
    else found.push(fullPath);
  }
  return found;
}

test('la build pubblica contiene tutte le schede prodotto localizzate', async () => {
  const italian = (await readdir(join(clientRoot, 'it', 'prodotti'), { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const english = (await readdir(join(clientRoot, 'en', 'products'), { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert.equal(italian.length, 744);
  assert.equal(english.length, 744);
  assert.equal(new Set(italian.map((entry) => entry.name)).size, 744);
  assert.equal(new Set(english.map((entry) => entry.name)).size, 744);
});

test('client e server non pubblicano riferimenti o URL del fornitore', async () => {
  const textExtensions = /\.(?:html|js|mjs|css|json|xml|txt|svg)$/i;
  const files = [...await filesWithin(clientRoot), ...await filesWithin(serverRoot)].filter((file) => textExtensions.test(file));
  const forbidden = /tz\s*[-_]?\s*fit|tzfit|tianzh|https?:\/\/tzfit\.com/i;
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    assert.doesNotMatch(content, forbidden, relative(process.cwd(), file));
    assert.doesNotMatch(content, /equipment-placeholder|immagine in preparazione|image being prepared/i, relative(process.cwd(), file));
  }
});

test('le schede prodotto espongono canonical, hreflang e nessun prezzo', async () => {
  const productFiles = (await filesWithin(join(clientRoot, 'it', 'prodotti'))).filter((file) => file.endsWith('.html'));
  assert.equal(productFiles.length, 744);
  for (const file of productFiles) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /<link rel="canonical" href="[^"]+">/);
    assert.match(html, /hreflang="it-IT"/);
    assert.match(html, /hreflang="en-GB"/);
    assert.doesNotMatch(html, /(?:€|\bEUR\b|a partire da|starting at)/i);
  }
});

test('sitemap e immagini locali referenziate esistono', async () => {
  assert.ok((await stat(join(clientRoot, 'sitemap-index.xml'))).isFile());
  const productFiles = (await filesWithin(join(clientRoot, 'it', 'prodotti'))).filter((file) => file.endsWith('.html'));
  const localSources = new Set<string>();
  for (const file of productFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+|\/images\/[^"?#]+|\/brand\/[^"?#]+)"/g)) {
      localSources.add(match[1]!);
    }
  }
  for (const source of localSources) {
    assert.ok((await stat(join(clientRoot, source.slice(1)))).isFile(), `Missing ${source}`);
  }
});
