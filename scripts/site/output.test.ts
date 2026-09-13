import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

const clientRoot = join(process.cwd(), 'dist', 'client');
const serverRoot = join(process.cwd(), 'dist', 'server');

function decodeHtml(value: string): string {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

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
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const file of productFiles) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /<link rel="canonical" href="[^"]+">/);
    assert.match(html, /hreflang="it-IT"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /"@type":"Product"/);
    assert.match(html, /"additionalProperty":\[/);
    assert.match(html, /<img src="[^"]+" alt="[^"]+" width="\d+" height="\d+" fetchpriority="high"/);
    assert.doesNotMatch(html, /(?:€|\bEUR\b|a partire da|starting at)/i);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const rawDescription = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    const description = rawDescription ? decodeHtml(rawDescription) : undefined;
    assert.ok(title, `Title assente in ${relative(process.cwd(), file)}`);
    assert.ok(description, `Meta description assente in ${relative(process.cwd(), file)}`);
    assert.ok(description.length <= 160, `Meta description troppo lunga in ${relative(process.cwd(), file)}`);
    titles.add(title);
    descriptions.add(description);
  }
  assert.equal(titles.size, 744);
  assert.equal(descriptions.size, 744);
});

test('anche title e description inglesi sono unici', async () => {
  const productFiles = (await filesWithin(join(clientRoot, 'en', 'products'))).filter((file) => file.endsWith('.html'));
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const file of productFiles) {
    const html = await readFile(file, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const rawDescription = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    const description = rawDescription ? decodeHtml(rawDescription) : undefined;
    assert.ok(title, `Title assente in ${relative(process.cwd(), file)}`);
    assert.ok(description, `Meta description assente in ${relative(process.cwd(), file)}`);
    assert.ok(description.length <= 160, `Meta description troppo lunga in ${relative(process.cwd(), file)}`);
    assert.doesNotMatch(html, /(?:€|\bEUR\b|a partire da|starting at)/i);
    titles.add(title);
    descriptions.add(description);
  }
  assert.equal(titles.size, 744);
  assert.equal(descriptions.size, 744);
});

test('il catalogo statico collega ogni prodotto senza un payload monolitico', async () => {
  const catalogRoot = join(clientRoot, 'it', 'catalogo');
  const listingFiles = (await filesWithin(catalogRoot)).filter((file) => file.endsWith('.html'));
  const productLinks = new Set<string>();
  for (const file of listingFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/href="(\/it\/prodotti\/[^"?#]+\/)"/g)) productLinks.add(match[1]!);
  }
  assert.equal(productLinks.size, 744);
  assert.ok((await stat(join(catalogRoot, 'index.html'))).size < 120 * 1024);
});

test('sitemap e immagini locali referenziate esistono', async () => {
  assert.ok((await stat(join(clientRoot, 'sitemap-index.xml'))).isFile());
  const sitemap = await readFile(join(clientRoot, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);
  assert.equal(new Set(locations).size, locations.length);
  assert.match(sitemap, /hreflang="it-IT"/);
  assert.match(sitemap, /hreflang="en"/);
  assert.match(sitemap, /<image:image>/);
  assert.doesNotMatch(sitemap, /\/(?:richiesta|quote-request|conferma|confirmation|privacy)\//);
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

test('la radice è una pagina lingua x-default e non esegue meta refresh', async () => {
  const html = await readFile(join(clientRoot, 'index.html'), 'utf8');
  assert.match(html, /hreflang="x-default"/);
  assert.match(html, /href="\/it\/"/);
  assert.match(html, /href="\/en\/"/);
  assert.doesNotMatch(html, /http-equiv="refresh"/i);
});

test('robots e meta robots seguono lo stato di pubblicazione', async () => {
  const homepage = await readFile(join(clientRoot, 'it', 'index.html'), 'utf8');
  const privacy = await readFile(join(clientRoot, 'it', 'privacy', 'index.html'), 'utf8');
  const robots = await readFile(join(clientRoot, 'robots.txt'), 'utf8');
  if (process.env.PUBLIC_SITE_READY === 'true') {
    assert.match(homepage, /<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.match(privacy, /<meta name="robots" content="noindex,follow">/);
    assert.match(robots, /Allow: \//);
    assert.match(robots, /https:\/\/fullmuscle-equipment\.com\/sitemap-index\.xml/);
  } else {
    assert.match(homepage, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(robots, /Disallow: \//);
  }
});
