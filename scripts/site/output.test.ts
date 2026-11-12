import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';
import test from 'node:test';
import { load } from 'cheerio';
import { retiredBenches, retiredFreeWeight, retiredPaginationPaths, retainedFreeWeight, retainedVariants, retainedSmith } from '../../tests/fixtures/bench-selection';

const clientRoot = join(process.cwd(), 'dist', 'client');
const serverRoot = join(process.cwd(), 'dist', 'server');
type CatalogRecord = {
  publicSku: string;
  categoryId: string;
  lineId?: string;
  descriptor?: string;
  specifications?: Record<string, string>;
  imageNote?: { it: string; en: string };
  assets: Array<{ localPath?: string }>;
};
const publicProducts = (JSON.parse(await readFile(new URL('../../data/catalog-public/products.json', import.meta.url), 'utf8')) as { products: CatalogRecord[] }).products;
const importedProducts = (JSON.parse(await readFile(new URL('../../data/catalog-drafts/products.json', import.meta.url), 'utf8')) as { products: CatalogRecord[] }).products;
const editorialProducts = (JSON.parse(await readFile(new URL('../../data/catalog-editorial/products.json', import.meta.url), 'utf8')) as { products: CatalogRecord[] }).products;
const sourceProducts = [...importedProducts, ...editorialProducts];
const retiredRoutes = JSON.parse(await readFile(new URL('../../data/catalog-editorial/retired-product-routes.json', import.meta.url), 'utf8')) as Array<{ sku: string; it: string; en: string }>;
const selection = JSON.parse(await readFile(new URL('../../data/catalog-editorial/catalog-selection.json', import.meta.url), 'utf8')) as {
  strengthLineIds: string[];
  treadmillSkus: string[];
  categorySkus: Record<string, string[]>;
  retiredCategoryIds: string[];
  excludedSkus: string[];
  independentProducts: Record<string, { categoryId: string; slug: { it: string; en: string } }>;
};
const activeCount = publicProducts.length;
const retiredSkus = new Set(retiredRoutes.map((product) => product.sku));
const retiredLineIds = [...new Set(sourceProducts.filter((product) => retiredSkus.has(product.publicSku)).flatMap((product) => product.lineId ? [product.lineId] : []))];
const treadmillSkus = ['FM-9100A', 'FM-9100B', 'FM-9100C', 'FM-7100A', 'FM-7100B', 'FM-7100C', 'FM-3000B', 'FM-3000C'];
const selectedCardioSkus: Record<string, string[]> = {
  'exercise-bike': ['FM-7023', 'FM-2030A', 'FM-2030B', 'FM-7045A', 'FM-7045B', 'FM-7036'],
  'stair-climber': ['FM-2060', 'FM-2050', 'FM-L100B'],
  elliptical: ['FM-7043A', 'FM-7043B'],
};
const retiredCategoryIds = ['ab-coaster', 'surfing-machine'];
const retiredCategoryPaths = ['/it/catalogo/categorie/ab-trainer/', '/en/catalogue/categories/ab-trainers/', '/it/catalogo/categorie/surf-trainer/', '/en/catalogue/categories/surf-trainers/'];

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
  assert.equal(italian.length, activeCount);
  assert.equal(english.length, activeCount);
  assert.equal(new Set(italian.map((entry) => entry.name)).size, activeCount);
  assert.equal(new Set(english.map((entry) => entry.name)).size, activeCount);
});

test('il catalogo conserva le sei serie approvate e le 10 attrezzature indipendenti', async () => {
  assert.equal(activeCount, 343);
  assert.equal(retiredRoutes.length, 404);
  assert.equal(retiredSkus.size, retiredRoutes.length);
  assert.equal(retiredLineIds.length, 15);
  const activeBySku = new Map(publicProducts.map((product) => [product.publicSku, product]));
  assert.equal(activeBySku.size, activeCount);
  assert.deepEqual([...selection.strengthLineIds].sort(), [
    'fm-g5-series', 'fm-gf-series', 'fm-gs-series', 'fm-52-series', 'fm-83-series', 'fm-mp-series',
  ].sort());
  assert.deepEqual([...selection.treadmillSkus].sort(), [...treadmillSkus].sort());
  assert.deepEqual([...selection.retiredCategoryIds].sort(), [...retiredCategoryIds].sort());
  assert.equal(new Set(publicProducts.map((product) => product.categoryId)).size, 11);
  assert.deepEqual(Object.keys(selection.categorySkus).sort(), Object.keys(selectedCardioSkus).sort());
  for (const [category, skus] of Object.entries(selectedCardioSkus)) {
    assert.deepEqual([...selection.categorySkus[category]!].sort(), [...skus].sort());
  }
  assert.deepEqual(Object.keys(selection.independentProducts).sort(), [...retainedFreeWeight, ...retainedSmith].sort());
  assert.deepEqual([...selection.excludedSkus].sort(), [...retiredFreeWeight].sort());
  for (const source of sourceProducts) {
    const protectedCategory = !['pin-loaded-machine', 'plate-loaded-machine', 'treadmill', ...Object.keys(selectedCardioSkus), ...retiredCategoryIds].includes(source.categoryId);
    const protectedTreadmill = source.categoryId === 'treadmill' && treadmillSkus.includes(source.publicSku);
    const protectedCardio = selectedCardioSkus[source.categoryId]?.includes(source.publicSku);
    const protectedLine = selection.strengthLineIds.includes(source.lineId ?? '');
    const independent = selection.independentProducts[source.publicSku];
    const product = activeBySku.get(source.publicSku);
    if (!retiredFreeWeight.includes(source.publicSku) && (protectedCategory || protectedTreadmill || protectedCardio || protectedLine || independent)) {
      assert.ok(product, `Prodotto da conservare assente: ${source.publicSku}`);
      assert.ok(!retiredSkus.has(source.publicSku));
      if (!independent) {
        assert.equal(product.categoryId, source.categoryId);
        assert.equal(product.lineId, source.lineId);
      }
    } else {
      assert.ok(!product, `Prodotto ritirato ancora attivo: ${source.publicSku}`);
      assert.ok(retiredSkus.has(source.publicSku), `URL storico non censito: ${source.publicSku}`);
    }
  }
  for (const [sku, expected] of Object.entries(selection.independentProducts)) {
    const product = activeBySku.get(sku)!;
    assert.equal(product.categoryId, expected.categoryId, sku);
    assert.equal(product.lineId, undefined, sku);
    for (const [locale, directory] of [['it', 'prodotti'], ['en', 'products']] as const) {
      const html = await readFile(join(clientRoot, locale, directory, expected.slug[locale], 'index.html'), 'utf8');
      assert.ok(html.includes(sku), `URL conservato non disponibile: ${sku} ${locale}`);
    }
  }
  const activeSkus = JSON.parse(await readFile(new URL('../../data/catalog-public/active-skus.json', import.meta.url), 'utf8')) as string[];
  assert.deepEqual([...activeSkus].sort(), [...activeBySku.keys()].sort());
});

test('la selezione pesi liberi rimuove solo gli articoli richiesti e conserva le varianti approvate', () => {
  const activeBySku = new Map(publicProducts.map((product) => [product.publicSku, product]));
  assert.equal(publicProducts.filter((product) => product.categoryId === 'free-weight').length, 27);
  for (const sku of [...retiredBenches, ...retiredFreeWeight]) {
    assert.ok(importedProducts.some((product) => product.publicSku === sku), `Prodotto sorgente rimosso: ${sku}`);
    assert.ok(retiredSkus.has(sku), `URL storico non censito: ${sku}`);
    assert.ok(!activeBySku.has(sku), `Prodotto ritirato ancora attivo: ${sku}`);
  }
  for (const sku of [...retainedFreeWeight, ...retainedVariants]) assert.equal(activeBySku.get(sku)?.categoryId, 'free-weight', sku);
  for (const sku of retainedSmith) assert.equal(activeBySku.get(sku)?.categoryId, 'multi-functional-smith-machine-trainer', sku);
  for (const product of importedProducts.filter((product) => product.categoryId === 'free-weight' && !retiredFreeWeight.includes(product.publicSku))) {
    assert.ok(activeBySku.has(product.publicSku), `Accessorio rimosso fuori dalla selezione: ${product.publicSku}`);
  }
});

test('il cardio conserva i modelli approvati e la 7045A usa una foto illustrativa senza specifiche ereditate', async () => {
  const retiredCardioSkus = ['FM-2020A', 'FM-2020B', 'FM-7010A', 'FM-7020', 'FM-7038', 'FM-7041A', 'FM-7041B', 'FM-7042', 'FM-L600B', 'FM-L600C', 'FM-N2040A', 'FM-N2040B', 'FM-7015', 'FM-7026', 'FM-SP-20'];
  assert.equal(importedProducts.length, 745, 'Il catalogo sorgente resta disponibile come archivio');
  for (const sku of retiredCardioSkus) {
    assert.ok(importedProducts.some((product) => product.publicSku === sku), `Prodotto sorgente rimosso: ${sku}`);
    assert.ok(retiredSkus.has(sku), `URL storico non censito: ${sku}`);
  }
  assert.ok(!importedProducts.some((product) => product.publicSku === 'FM-7045A'));
  for (const [category, skus] of Object.entries(selectedCardioSkus)) {
    assert.deepEqual(publicProducts.filter((product) => product.categoryId === category).map((product) => product.publicSku).sort(), [...skus].sort());
  }
  for (const [category, sku] of [['rowing-machine', 'FM-7027'], ['ski-machine', 'FM-7029']] as const) {
    assert.deepEqual(publicProducts.filter((product) => product.categoryId === category).map((product) => product.publicSku), [sku]);
  }
  assert.ok(publicProducts.every((product) => !retiredCategoryIds.includes(product.categoryId)));
  const model = publicProducts.find((product) => product.publicSku === 'FM-7045A')!;
  const reference = publicProducts.find((product) => product.publicSku === 'FM-7045B')!;
  assert.deepEqual(model.specifications, {});
  assert.equal(model.assets[0]?.localPath, reference.assets[0]?.localPath);
  assert.ok(model.imageNote?.it && model.imageNote.en);
  assert.notEqual(model.imageNote.it, model.imageNote.en);
  for (const [locale, directory, slug] of [
    ['it', 'prodotti', 'bike-reclinata-fm-7045a'],
    ['en', 'products', 'recumbent-bike-fm-7045a'],
  ] as const) {
    const note: string = model.imageNote[locale];
    assert.match(note, /illustrativ/i);
    assert.match(note, /conferm|confirm/i);
    const $ = load(await readFile(join(clientRoot, locale, directory, slug, 'index.html'), 'utf8'));
    assert.equal($('#product-image-note').text(), note);
    assert.equal($('.primary-image img').attr('aria-describedby'), 'product-image-note');
    assert.equal($('.specs').length, 0);
    const graphs = $('script[type="application/ld+json"]').map((_, element) => JSON.parse($(element).text())).get();
    const structuredProduct = graphs.flatMap((graph) => graph['@graph'] ?? [graph]).find((item) => item['@type'] === 'Product');
    assert.equal(structuredProduct?.sku, 'FM-7045A');
    assert.deepEqual(structuredProduct.additionalProperty, []);
  }
  for (const [locale, directory, slug] of [
    ['it', 'prodotti', 'ab-trainer-professionale-fm-7043a'],
    ['en', 'products', 'professional-ab-trainer-fm-7043a'],
  ] as const) {
    const $ = load(await readFile(join(clientRoot, locale, directory, slug, 'index.html'), 'utf8'));
    assert.match($('h1').text(), /FM-7043A/);
    assert.match($('.product-copy .eyebrow').text(), /Ellittiche|Ellipticals/);
  }
});

test('rimangono solo gli otto tapis roulant approvati e la 7100A distingue immagine e dati verificati', async () => {
  const treadmills = publicProducts.filter((product) => product.categoryId === 'treadmill');
  assert.deepEqual(treadmills.map((product) => product.publicSku).sort(), [...treadmillSkus].sort());
  const retiredTreadmills = sourceProducts.filter((product) => product.categoryId === 'treadmill' && retiredSkus.has(product.publicSku));
  assert.equal(retiredTreadmills.length, 16);
  const model = treadmills.find((product) => product.publicSku === 'FM-7100A')!;
  assert.deepEqual(model.specifications, {}, 'La 7100A non deve ereditare dati tecnici dalle varianti B/C');
  assert.ok(model.imageNote?.it && model.imageNote.en);
  assert.notEqual(model.imageNote.it, model.imageNote.en);
  for (const [locale, directory, slug] of [
    ['it', 'prodotti', 'tapis-roulant-professionale-fm-7100a'],
    ['en', 'products', 'professional-treadmill-fm-7100a'],
  ] as const) {
    const note: string = model.imageNote[locale];
    assert.match(note, /illustrativ/i);
    assert.match(note, /Android/i);
    assert.match(note, /conferm|confirm/i);
    const $ = load(await readFile(join(clientRoot, locale, directory, slug, 'index.html'), 'utf8'));
    assert.ok($('.product-gallery').text().includes(note), `Nota immagine non visibile in ${locale}`);
    assert.equal($('.specs').length, 0, 'Non pubblicare una tabella con specifiche mutuate da altre varianti');
    const graphs = $('script[type="application/ld+json"]').map((_, element) => JSON.parse($(element).text())).get();
    const structuredProduct = graphs.flatMap((graph) => graph['@graph'] ?? [graph]).find((item) => item['@type'] === 'Product');
    assert.equal(structuredProduct?.sku, 'FM-7100A');
    assert.deepEqual(structuredProduct.additionalProperty, []);
  }
});

test('la build e la sitemap non contengono schede o riferimenti alle linee ritirate', async () => {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A retained SKU may extend a retired one: match complete identifiers, not prefixes.
  const skuPattern = new RegExp(`(?<![a-z0-9-])(?:${[...retiredSkus].map(escape).join('|')})(?![a-z0-9-])`, 'i');
  const lineNames = retiredLineIds.flatMap((id) => {
    const name = id.replace(/^fm-/, '').replace(/-series$/, '').replaceAll('-', ' ').toUpperCase();
    return [id, `Serie FM ${name}`, `FM ${name} Series`, `${name} Strength Series`];
  });
  const linePattern = new RegExp(`\\b(?:${lineNames.map(escape).join('|')})\\b`, 'i');
  const files = [...await filesWithin(clientRoot), ...await filesWithin(serverRoot)];
  for (const file of files.filter((path) => /\.(?:html|js|mjs|css|json|xml|txt|svg)$/i.test(path))) {
    const content = await readFile(file, 'utf8');
    assert.doesNotMatch(content, skuPattern, relative(process.cwd(), file));
    assert.doesNotMatch(content, linePattern, relative(process.cwd(), file));
    for (const path of retiredCategoryPaths) assert.ok(!content.includes(path), `Categoria ritirata ancora collegata: ${path} in ${relative(process.cwd(), file)}`);
  }
  for (const product of retiredRoutes) {
    for (const locale of ['it', 'en'] as const) {
      await assert.rejects(stat(join(clientRoot, product[locale].slice(1), 'index.html')), { code: 'ENOENT' });
    }
  }
  for (const id of retiredLineIds) {
    await assert.rejects(stat(join(clientRoot, 'it', 'catalogo', 'linee', id)), { code: 'ENOENT' });
    await assert.rejects(stat(join(clientRoot, 'en', 'catalogue', 'lines', id)), { code: 'ENOENT' });
  }
  for (const path of retiredCategoryPaths) await assert.rejects(stat(join(clientRoot, path.slice(1))), { code: 'ENOENT' });
  for (const path of retiredPaginationPaths) await assert.rejects(stat(join(clientRoot, path.slice(1))), { code: 'ENOENT' });
  const $ = load(await readFile(join(clientRoot, 'sitemap.xml'), 'utf8'), { xml: true });
  const sitemapPaths = $('url > loc').map((_, element) => new URL($(element).text()).pathname).get();
  for (const path of retiredPaginationPaths) assert.ok(!sitemapPaths.includes(path), `Paginazione ritirata nella sitemap: ${path}`);
  const sitemapProducts = $('url > loc').map((_, element) => new URL($(element).text()).pathname).get()
    .filter((path) => /^\/(?:it\/prodotti|en\/products)\//.test(path));
  const productFiles = files.filter((file) => /[\\/](?:it[\\/]prodotti|en[\\/]products)[\\/].*[\\/]index\.html$/.test(file));
  const publishedPaths = productFiles.map((file) => `/${relative(clientRoot, file).replaceAll('\\', '/').replace(/index\.html$/, '')}`);
  assert.deepEqual(sitemapProducts.sort(), publishedPaths.sort());
});

test('le immagini esclusive dei prodotti ritirati non vengono distribuite', async () => {
  const stem = (path: string) => basename(path.replaceAll('\\', '/'), extname(path));
  const activeImageStems = new Set(publicProducts.flatMap((product) => product.assets.flatMap((asset) => asset.localPath ? [stem(asset.localPath)] : [])));
  const retiredImageStems = new Set(sourceProducts.filter((product) => retiredSkus.has(product.publicSku))
    .flatMap((product) => product.assets.flatMap((asset) => asset.localPath ? [stem(asset.localPath)] : []))
    .filter((name) => !activeImageStems.has(name)));
  assert.ok(retiredImageStems.size > 300, 'Il controllo deve coprire le immagini del catalogo ritirato');
  for (const file of await filesWithin(clientRoot)) {
    const name = basename(file);
    const originalStem = name.split('.')[0]!;
    assert.ok(!retiredImageStems.has(originalStem), `Immagine ritirata pubblicata: ${relative(clientRoot, file)}`);
    assert.ok(!retiredSkus.has(originalStem), `Immagine hero ritirata pubblicata: ${relative(clientRoot, file)}`);
  }
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
  const html = await readFile(join(clientRoot, 'en', 'products', 'upright-bike-fm-2030a', 'index.html'), 'utf8');
  const $ = load(html);
  const overview = $('.product-details .prose').text();
  assert.match(overview, /Commercial Upright Bike with Touch Screen/i);
  assert.match(overview, /smooth, low-impact workout/i);
  assert.doesNotMatch(overview, /biceps|triceps|upper arm training/i);
  assert.doesNotMatch($('meta[name="description"]').attr('content') ?? '', /biceps|triceps/i);
  const elliptical = load(await readFile(join(clientRoot, 'en', 'products', 'professional-elliptical-fm-7043b', 'index.html'), 'utf8'));
  assert.match(elliptical('.product-details .prose').text(), /elliptical cross trainer/i);
  assert.doesNotMatch(elliptical('.product-details .prose').text(), /GC-5001|leg curl|hamstring|Q235/i);
});

test('le schede prodotto espongono canonical, hreflang e nessun prezzo', async () => {
  const productFiles = (await filesWithin(join(clientRoot, 'it', 'prodotti'))).filter((file) => file.endsWith('.html'));
  assert.equal(productFiles.length, activeCount);
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const file of productFiles) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /<link rel="canonical" href="[^"]+">/);
    assert.match(html, /hreflang="it-IT"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /"@type":"Product"/);
    assert.match(html, /"additionalProperty":\[/);
    const primaryImage = load(html)('.primary-image img');
    assert.equal(primaryImage.length, 1, file);
    assert.ok(primaryImage.attr('src'), file);
    assert.ok(primaryImage.attr('alt'), file);
    assert.ok(Number(primaryImage.attr('width')) > 0, file);
    assert.ok(Number(primaryImage.attr('height')) > 0, file);
    assert.equal(primaryImage.attr('fetchpriority'), 'high', file);
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
  assert.equal(titles.size, activeCount);
  assert.equal(descriptions.size, activeCount);
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
  assert.equal(titles.size, activeCount);
  assert.equal(descriptions.size, activeCount);
});

test('il catalogo statico collega ogni prodotto senza un payload monolitico', async () => {
  const catalogRoot = join(clientRoot, 'it', 'catalogo');
  const listingFiles = (await filesWithin(catalogRoot)).filter((file) => file.endsWith('.html'));
  const productLinks = new Set<string>();
  for (const file of listingFiles) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/href="(\/it\/prodotti\/[^"?#]+\/)"/g)) productLinks.add(match[1]!);
  }
  assert.equal(productLinks.size, activeCount);
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
    { slug: 'back-extension-machine', title: 'Back Extension Machine', pattern: /back extension|dual 45 hip extension/i },
    { slug: 'leg-press-machine', title: 'Leg Press Machine', pattern: /leg press/i },
    { slug: 'chest-press-machine', title: 'Chest Press Machine', pattern: /chest press|bench press|incline press|decline press/i },
  ];
  const sitemap = await readFile(join(clientRoot, 'sitemap.xml'), 'utf8');
  for (const page of pages) {
    const html = await readFile(join(clientRoot, 'it', 'catalogo', 'tipologie', page.slug, 'index.html'), 'utf8');
    assert.equal(load(html)('h1').text(), page.title);
    const count = publicProducts.filter((product) => page.pattern.test(product.descriptor ?? '')).length;
    assert.ok(count > 0);
    assert.match(html, new RegExp(`${count} modelli disponibili`));
    assert.equal([...html.matchAll(/class="product-card"/g)].length, Math.min(count, 24));
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

test('le homepage italiane e inglesi hanno contenuti e metadati reciproci', async () => {
  for (const [locale, path, file] of [
    ['it', '/', join(clientRoot, 'index.html')],
    ['en', '/en/', join(clientRoot, 'en', 'index.html')],
  ] as const) {
    const html = await readFile(file, 'utf8');
    const $ = load(html);
    const canonical = $('link[rel="canonical"]').attr('href');
    assert.ok(canonical);
    const origin = new URL(canonical).origin;
    assert.equal(canonical, `${origin}${path}`);
    assert.equal($('html').attr('lang'), locale);
    assert.match($('h1').text(), locale === 'it' ? /fornitura completa/ : /complete equipment supply/);
    assert.match($('title').text(), locale === 'it' ? /Attrezzature professionali per palestre/ : /Professional gym equipment/);
    assert.match($('meta[name="description"]').attr('content') ?? '', locale === 'it' ? /Forniture complete/ : /Complete equipment supplies/);
    assert.ok($('.product-card').length > 0);
    assert.equal($('link[hreflang="it-IT"]').attr('href'), `${origin}/`);
    assert.equal($('link[hreflang="en"]').attr('href'), `${origin}/en/`);
    assert.equal($('link[hreflang="x-default"]').attr('href'), `${origin}/`);
    assert.equal($('meta[property="og:url"]').attr('content'), canonical);
    assert.equal($('.logo-link').attr('href'), path);
    assert.equal($('.language').attr('href'), locale === 'it' ? '/en/' : '/');
    assert.equal($('a[href="/it/"]').length, 0);
    assert.equal($('nav[aria-label="Choose language"]').length, 0);
    assert.doesNotMatch(html, /http-equiv="refresh"/i);
  }
  await assert.rejects(readFile(join(clientRoot, 'it', 'index.html')), { code: 'ENOENT' });
});

test('la sitemap include le due homepage canoniche e non la vecchia home italiana', async () => {
  const $ = load(await readFile(join(clientRoot, 'sitemap.xml'), 'utf8'), { xml: true });
  const locations = $('url > loc').map((_, element) => $(element).text()).get();
  assert.equal(new Set(locations).size, locations.length);
  assert.equal(locations.filter((url) => new URL(url).pathname === '/it/').length, 0);
  for (const path of ['/', '/en/']) {
    const entries = $('url').filter((_, element) => new URL($(element).children('loc').text()).pathname === path);
    assert.equal(entries.length, 1);
    const origin = new URL(entries.children('loc').text()).origin;
    assert.equal(entries.find('[hreflang="it-IT"]').attr('href'), `${origin}/`);
    assert.equal(entries.find('[hreflang="en"]').attr('href'), `${origin}/en/`);
    assert.equal(entries.find('[hreflang="x-default"]').attr('href'), `${origin}/`);
  }
  assert.ok(locations.some((url) => new URL(url).pathname === '/it/catalogo/'));
});

test('robots e meta robots seguono lo stato di pubblicazione', async () => {
  const homepage = await readFile(join(clientRoot, 'index.html'), 'utf8');
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

test('la presentazione GF è localizzata, accessibile nell’HTML e mantiene i cinque modelli', async () => {
  const paths = {
    it: '/it/catalogo/linee/fm-gf-series/',
    en: '/en/catalogue/lines/fm-gf-series/',
  };
  for (const locale of ['it', 'en'] as const) {
    const html = await readFile(join(clientRoot, paths[locale].slice(1), 'index.html'), 'utf8');
    const $ = load(html);
    assert.equal($('[data-gf-presentation]').length, 1);
    assert.equal($('h1').length, 1);
    assert.match($('h1').text(), /FM-GF/);
    assert.equal($('html').attr('lang'), locale);
    assert.match($('main').text(), /FM-GF-001/);
    assert.doesNotMatch($('main').text(), /€|\bEUR\b|1[.,]870/);
    assert.equal($('.product-card').length, 5);
    for (let model = 1; model <= 5; model += 1) {
      assert.equal($('.product-card').filter((_, element) => $(element).text().includes(`FM-GF-00${model}`)).length, 1);
    }

    const canonical = $('link[rel="canonical"]').attr('href');
    assert.ok(canonical);
    const origin = new URL(canonical).origin;
    assert.equal(canonical, `${origin}${paths[locale]}`);
    assert.equal($('link[hreflang="it-IT"]').attr('href'), `${origin}${paths.it}`);
    assert.equal($('link[hreflang="en"]').attr('href'), `${origin}${paths.en}`);
    const graphs = $('script[type="application/ld+json"]').map((_, element) => JSON.parse($(element).text())).get();
    const itemList = graphs.flatMap((graph) => graph['@graph'] ?? [graph]).find((item) => item['@type'] === 'ItemList');
    assert.equal(itemList?.numberOfItems, 5);

    const assembly = $('[data-gf-assembly]');
    assert.equal(assembly.attr('data-motion'), 'static');
    assert.equal(assembly.find('[data-gf-part]').length, 5);
    const poster = assembly.find('img[data-gf-poster]');
    assert.equal(poster.length, 1);
    assert.ok(poster.attr('alt'));
    assert.ok(Number(poster.attr('width')) > 0);
    assert.ok(Number(poster.attr('height')) > 0);
    const assetPaths = new Set<string>();
    assembly.find('img').each((_, element) => {
      const asset = $(element).attr('src') ?? $(element).attr('data-src');
      if (asset?.startsWith('/images/animations/gf/')) assetPaths.add(asset);
      const candidates = ($(element).attr('srcset') ?? $(element).attr('data-srcset') ?? '').split(',');
      for (const candidate of candidates) {
        const path = candidate.trim().split(/\s+/)[0];
        if (path?.startsWith('/images/animations/gf/')) assetPaths.add(path);
      }
    });
    assert.ok(assetPaths.size >= 12, 'Poster e componenti devono avere varianti desktop e mobile');
    for (const path of assetPaths) assert.ok((await stat(join(clientRoot, path.slice(1)))).isFile(), `Missing GF image ${path}`);
    if (locale === 'en') assert.equal($('a[href^="/cataloghi/"]').length, 0);
    else assert.equal($('.page-hero a[download][href="/cataloghi/fullmuscle-gf.pdf"]').length, 1);
  }

  for (const path of [
    '/it/catalogo/linee/fm-g5-series/',
    '/it/catalogo/linee/fm-g5-series/pagina/2/',
    '/it/catalogo/',
  ]) {
    const $ = load(await readFile(join(clientRoot, path.slice(1), 'index.html'), 'utf8'));
    assert.equal($('[data-gf-presentation]').length, 0, path);
    assert.equal($('img[src*="/images/animations/gf/"], img[data-src*="/images/animations/gf/"]').length, 0, path);
  }
});
