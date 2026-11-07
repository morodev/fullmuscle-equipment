import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';
import { load } from 'cheerio';

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
  assert.equal(italian.length, 745);
  assert.equal(english.length, 745);
  assert.equal(new Set(italian.map((entry) => entry.name)).size, 745);
  assert.equal(new Set(english.map((entry) => entry.name)).size, 745);
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

test('la linea GF collega i cinque modelli e usa la descrizione della GF-005 canonica', async () => {
  for (const [locale, productsDirectory, catalogueDirectory] of [['it', 'prodotti', 'catalogo'], ['en', 'products', 'catalogue']]) {
    const files = (await filesWithin(join(clientRoot, locale!, productsDirectory!))).filter((file) => /fm-gf-00[1-5]/.test(file) && file.endsWith('.html'));
    assert.equal(files.length, 5);
    const catalogueFiles = (await filesWithin(join(clientRoot, locale!, catalogueDirectory!))).filter((file) => file.includes('fm-gf') && file.endsWith('.html'));
    assert.ok(catalogueFiles.length);
    const catalogueHtml = (await Promise.all(catalogueFiles.map((file) => readFile(file, 'utf8')))).join('\n');
    for (let id = 1; id <= 5; id += 1) assert.match(catalogueHtml, new RegExp(`fm-gf-00${id}`));
    if (locale === 'en') {
      const gf005 = await readFile(files.find((file) => file.includes('fm-gf-005'))!, 'utf8');
      assert.match(gf005, /independent converging arm movement/i);
      assert.doesNotMatch(gf005, /Q235/);
    }
  }
});

test('la descrizione cardio appartiene al modello e non eredita il testo di un altro SKU sorgente', async () => {
  const html = await readFile(join(clientRoot, 'en', 'products', 'recumbent-bike-fm-2020a', 'index.html'), 'utf8');
  const $ = load(html);
  const overview = $('.product-details .prose').text();
  assert.match(overview, /Commercial Recumbent Bike with a Touch Screen/i);
  assert.match(overview, /low-impact cardio/i);
  assert.doesNotMatch(overview, /biceps|triceps|upper arm training/i);
  assert.doesNotMatch($('meta[name="description"]').attr('content') ?? '', /biceps|triceps/i);
});

test('le schede prodotto espongono canonical, hreflang e nessun prezzo', async () => {
  const productFiles = (await filesWithin(join(clientRoot, 'it', 'prodotti'))).filter((file) => file.endsWith('.html'));
  assert.equal(productFiles.length, 745);
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
  assert.equal(titles.size, 745);
  assert.equal(descriptions.size, 745);
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
  assert.equal(titles.size, 745);
  assert.equal(descriptions.size, 745);
});

test('il catalogo statico collega ogni prodotto senza un payload monolitico', async () => {
  const catalogRoot = join(clientRoot, 'it', 'catalogo');
  const listingFiles = (await filesWithin(catalogRoot)).filter((file) => file.endsWith('.html'));
  const productLinks = new Set<string>();
  for (const file of listingFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/href="(\/it\/prodotti\/[^"?#]+\/)"/g)) productLinks.add(match[1]!);
  }
  assert.equal(productLinks.size, 745);
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

test('le landing delle tipologie strength sono indicizzabili e complete', async () => {
  const pages = [
    { slug: 'back-extension-machine', title: 'Back Extension Machine', count: 14, cards: 14 },
    { slug: 'leg-press-machine', title: 'Leg Press Machine', count: 25, cards: 24 },
    { slug: 'chest-press-machine', title: 'Chest Press Machine', count: 52, cards: 24 },
  ];
  const sitemap = await readFile(join(clientRoot, 'sitemap.xml'), 'utf8');
  for (const page of pages) {
    const html = await readFile(join(clientRoot, 'it', 'catalogo', 'tipologie', page.slug, 'index.html'), 'utf8');
    assert.match(html, new RegExp(`<h1>${page.title}</h1>`));
    assert.match(html, new RegExp(`${page.count} modelli disponibili`));
    assert.equal([...html.matchAll(/class="product-card"/g)].length, page.cards);
    assert.match(html, /<link rel="canonical" href="[^"]+">/);
    assert.match(html, /hreflang="it-IT"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /"@type":"CollectionPage"/);
    assert.match(html, /"@type":"ItemList"/);
    assert.match(sitemap, new RegExp(`/it/catalogo/tipologie/${page.slug}/`));
  }
});

test('hub e landing delle soluzioni business sono completi e indicizzabili', async () => {
  const italianSlugs = ['apertura-nuova-palestra', 'rinnovo-palestra', 'hotel-resort', 'personal-trainer-fisioterapia', 'navi-da-crociera', 'centri-medicali-riabilitazione', 'circoli-privati', 'wellness-aziendale', 'scuole-universita'];
  const englishSlugs = ['new-gym-opening', 'gym-renovation', 'hotels-resorts', 'personal-training-physiotherapy', 'cruise-ships', 'medical-rehabilitation-centres', 'private-clubs', 'corporate-wellness', 'schools-universities'];
  const sitemap = await readFile(join(clientRoot, 'sitemap.xml'), 'utf8');
  const italianHub = await readFile(join(clientRoot, 'it', 'soluzioni', 'index.html'), 'utf8');
  const englishHub = await readFile(join(clientRoot, 'en', 'solutions', 'index.html'), 'utf8');
  assert.match(italianHub, /"@type":"CollectionPage"/);
  assert.match(italianHub, /"numberOfItems":9/);
  assert.match(englishHub, /hreflang="it-IT"/);
  for (const slug of italianSlugs) {
    const html = await readFile(join(clientRoot, 'it', 'soluzioni', slug, 'index.html'), 'utf8');
    assert.match(html, /<link rel="canonical" href="[^"]+">/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /"@type":"Service"/);
    assert.match(html, /<img[^>]+width="\d+"[^>]+height="\d+"/);
    assert.match(sitemap, new RegExp(`/it/soluzioni/${slug}/`));
  }
  for (const slug of englishSlugs) assert.ok((await stat(join(clientRoot, 'en', 'solutions', slug, 'index.html'))).isFile());

  const imageRoot = join(process.cwd(), 'src', 'assets', 'solutions');
  const images = (await readdir(imageRoot)).filter((name) => name.endsWith('.webp'));
  assert.equal(images.length, 9);
  for (const image of images) assert.ok((await stat(join(imageRoot, image))).size < 350 * 1024, `${image} supera 350 KB`);
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
