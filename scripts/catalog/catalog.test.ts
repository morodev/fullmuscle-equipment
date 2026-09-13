import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAssetReviewDecisions, createAssetManifest, selectPublishablePrimaryAssetIds } from './assets.js';
import { assertNoPublicSkuCollisions, containsSourceBrand, toPublicSeriesName, toPublicSku, toPublicText } from './brand.js';
import { compareInventories } from './diff.js';
import {
  categoryFromSitemapEntry,
  extractListing,
  parseProductPage,
  parseSitemapEntries,
} from './html.js';
import { normalizeInventory, toPublicProductRecord } from './normalize.js';
import { assertAllowedByRobots } from './robots.js';
import type { SourceInventory, SourceProduct } from './types.js';

test('rimappa SKU e nomi serie secondo le regole FullMuscle', () => {
  assert.equal(toPublicSku('TZ-5101'), 'FM-5101');
  assert.equal(toPublicSku('tz_x82-01'), 'FM-X82-01');
  assert.equal(toPublicSku('GS-5001'), 'FM-GS-5001');
  assert.equal(toPublicSku('GC 5001'), 'FM-GC-5001');
  assert.equal(toPublicSeriesName('TZ-N8 Series'), 'FM-N8 Series');
  assert.equal(toPublicSeriesName('GS Series'), 'FM GS Series');
  assert.equal(toPublicText('Compatible with TZ-Q1024 and TZFIT accessories'), 'Compatible with FM-Q1024 and FullMuscle accessories');
  assert.throws(() => assertNoPublicSkuCollisions(['TZ-100', '100']), /Collisione SKU pubblico FM-100/);
});

test('legge categorie e paginazione dalle pagine pubbliche', () => {
  const sitemap = `<?xml version="1.0"?><urlset><url><loc>https://tzfit.com/pin-loaded-machine/gs-series-pin-loaded-machine/</loc><lastmod>2026-08-01T00:00:00+00:00</lastmod></url><url><loc>https://tzfit.com/blog/</loc></url></urlset>`;
  const categories = parseSitemapEntries(sitemap).map(categoryFromSitemapEntry).filter(Boolean);
  assert.equal(categories.length, 1);
  assert.equal(categories[0]?.kind, 'series');
  assert.equal(categories[0]?.publicName, 'FM GS Series');

  const listing = extractListing(
    `<article class="post"><a href="https://tzfit.com/gs-5001-seated-leg-curl/">Prodotto</a></article><a class="next page-numbers" href="/pin-loaded-machine/page/2/">Next</a>`,
    'https://tzfit.com/pin-loaded-machine/',
  );
  assert.deepEqual(listing.productUrls, ['https://tzfit.com/gs-5001-seated-leg-curl/']);
  assert.equal(listing.nextUrl, 'https://tzfit.com/pin-loaded-machine/page/2/');
});

test('estrae una scheda prodotto Elementor senza includere immagini di navigazione', () => {
  const html = `<!doctype html><html><head>
    <title>GS-5001 Seated Leg Curl - TZFIT</title>
    <link rel="canonical" href="https://tzfit.com/gs-5001-seated-leg-curl/">
    <meta property="og:image" content="https://tzfit.com/wp-content/uploads/gs-5001-main-1200x1200.jpg">
  </head><body><header><img src="https://tzfit.com/logo.png"></header><main>
    <h1>GS-5001 Seated Leg Curl</h1>
    <p>This commercial seated leg curl isolates the hamstrings and offers an adjustable start position for different users.</p>
    <p>Item NO: GS-5001<br>Name: GS-5001 Seated Leg Curl<br>Product Dimensions: 1500 × 1000 × 1600 mm<br>Weight Stack: 100 kg</p>
    <div><h3>Features</h3></div><div><ul><li>Adjustable back pad</li><li>Stable steel frame</li></ul></div>
    <img alt="GS-5001 side view" src="https://tzfit.com/wp-content/uploads/gs-5001-side-300x300.jpg" srcset="https://tzfit.com/wp-content/uploads/gs-5001-side-300x300.jpg 300w, https://tzfit.com/wp-content/uploads/gs-5001-side-1200x1200.jpg 1200w">
  </main></body></html>`;
  const product = parseProductPage({
    url: 'https://tzfit.com/gs-5001-seated-leg-curl/',
    html,
    taxonomy: [
      { url: 'https://tzfit.com/pin-loaded-machine/', sourceId: 'pin-loaded-machine', sourceName: 'Pin Loaded Machine', publicId: 'pin-loaded-machine', publicName: 'Pin Loaded Machine', kind: 'category' },
      { url: 'https://tzfit.com/pin-loaded-machine/gs-series-pin-loaded-machine/', sourceId: 'gs-series-pin-loaded-machine', sourceName: 'GS Series', publicId: 'fm-gs-series', publicName: 'FM GS Series', kind: 'series', parentSourceId: 'pin-loaded-machine' },
    ],
    crawledAt: '2026-09-13T10:00:00.000Z',
  });
  assert.equal(product.sourceSku, 'GS-5001');
  assert.equal(product.sourceName, 'Seated Leg Curl');
  assert.equal(product.specifications['Weight Stack'], '100 kg');
  assert.deepEqual(product.sourceFeatures, ['Adjustable back pad', 'Stable steel frame']);
  assert.equal(product.assets[0]?.role, 'primary');
  assert.ok(product.assets.every((asset) => !asset.sourceUrl.endsWith('/logo.png')));
});

test('recupera lo SKU dal titolo quando la pagina non ha Item No', () => {
  const product = parseProductPage({
    url: 'https://tzfit.com/l600b-stair-climber/',
    html: `<html><head><title>L600B Stair Climber - TZFIT</title><meta name="description" content="A commercial stair climber with a durable step system and LED display."><meta property="og:image" content="https://tzfit.com/wp-content/uploads/l600b.jpg"></head><body><main><h1>L600B Stair Climber</h1></main></body></html>`,
    taxonomy: [],
    crawledAt: '2026-09-13T10:00:00.000Z',
  });
  assert.equal(product.sourceSku, 'L600B');
  assert.equal(product.sourceName, 'Stair Climber');
  assert.equal(product.sourceDescription, 'A commercial stair climber with a durable step system and LED display.');
});

test('ignora un Item No non valido e segnala un conflitto fra scheda e URL', () => {
  const invalidLabel = parseProductPage({
    url: 'https://tzfit.com/cardio-gym-exercise-climber-machine-tz-2050/',
    html: `<html><head><title>Climber TZ-2050 - TZFIT</title><meta property="og:image" content="https://tzfit.com/wp-content/uploads/tz-2050.jpg"></head><body><main><h1>Climber TZ-2050</h1><p>Item No: NO<br>Speed Range: 1-10</p><p>A commercial climber designed for sustained cardio training in professional facilities.</p></main></body></html>`,
    taxonomy: [],
    crawledAt: '2026-09-13T10:00:00.000Z',
  });
  assert.equal(invalidLabel.sourceSku, 'TZ-2050');

  const conflict = parseProductPage({
    url: 'https://tzfit.com/seated-row-machine-for-sale-gt-5004/',
    html: `<html><head><title>Seated Row GT-5004 - TZFIT</title><meta property="og:image" content="https://tzfit.com/wp-content/uploads/gt-5004.jpg"></head><body><main><h1>Seated Row GT-5004</h1><p>Item No: GT-5005<br>Machine Size: 1000 mm</p><p>A commercial seated row designed for controlled upper body strength training.</p></main></body></html>`,
    taxonomy: [],
    crawledAt: '2026-09-13T10:00:00.000Z',
  });
  assert.equal(conflict.sourceSku, 'GT-5005');
  assert.ok(conflict.warnings.includes('sku-conflict:title-or-url=GT-5004'));
});

test('rispetta robots.txt e non usa il percorso REST vietato', () => {
  const robots = `User-agent: *\nDisallow: /wp-json/\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php`;
  assert.doesNotThrow(() => assertAllowedByRobots(robots, ['https://tzfit.com/pin-loaded-machine/'], 'FullMuscleCatalogImporter/1.0'));
  assert.throws(() => assertAllowedByRobots(robots, ['https://tzfit.com/wp-json/wp/v2/posts'], 'FullMuscleCatalogImporter/1.0'), /non consente/);
});

test('genera solo bozze e rimuove il riferimento al fornitore dalla vista pubblica', () => {
  const inventory = makeInventory([makeProduct()]);
  const normalized = normalizeInventory(inventory);
  const draft = normalized.products[0]!;
  assert.equal(draft.publicSku, 'FM-GS-5001');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.availableForQuote, false);
  assert.equal(draft.localization.it.description, '');
  draft.assets[0]!.reviewStatus = 'approved';
  draft.assets[0]!.localPath = 'assets/FM-GS-5001/main.jpg';
  const publicRecord = toPublicProductRecord(draft);
  assert.equal('sourceReference' in publicRecord, false);
  assert.equal('review' in publicRecord, false);
  assert.equal('sourceUrl' in publicRecord.assets[0]!, false);
  assert.equal(containsSourceBrand(publicRecord), false);
});

test('mette in quarantena le pagine che condividono lo stesso SKU', () => {
  const first = makeProduct();
  const second = { ...makeProduct(), sourceUrl: 'https://tzfit.com/another-gs-5001/', sourceName: 'Another product' };
  const normalized = normalizeInventory(makeInventory([first, second]));
  assert.equal(normalized.products.length, 0);
  assert.equal(normalized.quarantined[0]?.publicSku, 'FM-GS-5001');
  assert.equal(normalized.quarantined[0]?.sources.length, 2);
});

test('mantiene la revisione degli asset e pubblica soltanto file locali approvati', () => {
  const inventory = makeInventory([makeProduct()]);
  const firstManifest = createAssetManifest(inventory, undefined);
  const item = firstManifest.items[0]!;
  assert.equal(item.publicSku, 'FM-GS-5001');
  assert.equal(item.status, 'needs-review');
  item.status = 'approved-provisional';
  item.originalPath = 'data/catalog-assets/originals/aa/source.jpg';
  item.stagedPath = 'src/assets/catalog/FM-GS-5001/primary-01-test.webp';

  const preservedManifest = createAssetManifest(inventory, firstManifest);
  assert.equal(preservedManifest.items[0]?.status, 'approved-provisional');
  const normalized = normalizeInventory(inventory, preservedManifest);
  const publicRecord = toPublicProductRecord(normalized.products[0]!);
  assert.equal(publicRecord.assets.length, 1);
  assert.equal(publicRecord.assets[0]?.localPath, 'src/assets/catalog/FM-GS-5001/primary-01-test.webp');
  assert.equal('sourceUrl' in publicRecord.assets[0]!, false);
});

test('seleziona una sola immagine principale valida per ogni SKU pubblicabile', () => {
  const manifest = createAssetManifest(makeInventory([makeProduct()]), undefined);
  const item = manifest.items[0]!;
  item.originalPath = 'data/catalog-assets/originals/aa/source.jpg';
  item.width = 1000;
  item.height = 1000;
  assert.deepEqual(selectPublishablePrimaryAssetIds(manifest, new Set(['FM-GS-5001'])), [item.assetId]);
  item.width = 500;
  assert.throws(() => selectPublishablePrimaryAssetIds(manifest, new Set(['FM-GS-5001'])), /risoluzione minima/);
});

test('applica una revisione immagini legata all’inventario e blocca i pannelli promozionali', () => {
  const product = makeProduct();
  product.assets.push(
    { sourceUrl: 'https://tzfit.com/wp-content/uploads/call-action-11.png', alt: 'Promo', role: 'gallery', reviewStatus: 'pending-review' },
    { sourceUrl: 'https://tzfit.com/wp-content/uploads/other.jpg', alt: 'Da pulire', role: 'gallery', reviewStatus: 'pending-review' },
  );
  const manifest = createAssetManifest(makeInventory([product]), undefined);
  const approvedId = manifest.items[0]!.assetId;
  const summary = applyAssetReviewDecisions(manifest, {
    schemaVersion: 1,
    sourceInventoryHash: manifest.sourceInventoryHash,
    reviewedAt: '2026-09-13T10:00:00.000Z',
    defaultStatus: 'needs-cleaning',
    defaultNote: 'controllo richiesto',
    approvedAssetIds: [approvedId],
    blockedSourceBasenames: ['call-action-11.png'],
  });

  assert.deepEqual(summary, { approvedProvisional: 1, blockedBranding: 1, needsCleaning: 1, preservedFinal: 0 });
  assert.equal(manifest.items.find((item) => item.assetId === approvedId)?.status, 'approved-provisional');
  assert.equal(manifest.items.find((item) => item.sourceUrl.endsWith('call-action-11.png'))?.status, 'blocked-branding');
  assert.equal(manifest.items.find((item) => item.sourceUrl.endsWith('other.jpg'))?.status, 'needs-cleaning');
  assert.throws(
    () => applyAssetReviewDecisions(manifest, {
      schemaVersion: 1,
      sourceInventoryHash: '0'.repeat(64),
      reviewedAt: '2026-09-13T10:00:00.000Z',
      defaultStatus: 'needs-cleaning',
      defaultNote: 'controllo richiesto',
      approvedAssetIds: [],
      blockedSourceBasenames: [],
    }),
    /inventario diverso/,
  );
});

test('il diff segnala modifiche e rimozioni per revisione senza cancellarle', () => {
  const first = makeProduct();
  const removed = { ...makeProduct(), sourceSku: 'TZ-9000', sourceUrl: 'https://tzfit.com/tz-9000/', contentHash: 'c'.repeat(64) };
  const current = { ...makeProduct(), contentHash: 'b'.repeat(64) };
  const report = compareInventories(makeInventory([first, removed]), makeInventory([current]));
  assert.equal(report.changed.length, 1);
  assert.equal(report.removed[0]?.sourceSku, 'TZ-9000');
  assert.equal(report.removed[0]?.action, 'manual-review');
});

function makeProduct(): SourceProduct {
  return {
    supplier: 'tzfit',
    sourceUrl: 'https://tzfit.com/gs-5001-seated-leg-curl/',
    sourceSlug: 'gs-5001-seated-leg-curl',
    sourceSku: 'GS-5001',
    sourceName: 'TZFIT Seated Leg Curl',
    sourceDescription: 'Source copy is private.',
    sourceFeatures: ['Feature'],
    specifications: { Material: 'TZFIT steel' },
    sourceCategoryIds: ['pin-loaded-machine'],
    sourceSeriesIds: ['gs-series-pin-loaded-machine'],
    assets: [{ sourceUrl: 'https://tzfit.com/wp-content/uploads/gs-5001.jpg', alt: 'TZFIT product', role: 'primary', reviewStatus: 'pending-review' }],
    crawledAt: '2026-09-13T10:00:00.000Z',
    contentHash: 'a'.repeat(64),
    warnings: [],
  };
}

function makeInventory(products: SourceProduct[]): SourceInventory {
  return {
    schemaVersion: 1,
    source: 'tzfit',
    baseUrl: 'https://tzfit.com',
    crawledAt: '2026-09-13T10:00:00.000Z',
    robotsUrl: 'https://tzfit.com/robots.txt',
    robotsHash: 'd'.repeat(64),
    categories: [
      { url: 'https://tzfit.com/pin-loaded-machine/', sourceId: 'pin-loaded-machine', sourceName: 'Pin Loaded Machine', publicId: 'pin-loaded-machine', publicName: 'Pin Loaded Machine', kind: 'category' },
      { url: 'https://tzfit.com/pin-loaded-machine/gs-series-pin-loaded-machine/', sourceId: 'gs-series-pin-loaded-machine', sourceName: 'GS Series', publicId: 'fm-gs-series', publicName: 'FM GS Series', kind: 'series', parentSourceId: 'pin-loaded-machine' },
    ],
    catalogDocuments: [],
    products,
    rejected: [],
  };
}
