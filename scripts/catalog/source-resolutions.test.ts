import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { applyAssetReviewDecisions, createAssetManifest, selectPublishablePrimaryAssetIds } from './assets.js';
import { categoryFromSitemapEntry } from './html.js';
import { normalizeInventory } from './normalize.js';
import { SOURCE_RESOLUTIONS } from './source-resolutions.js';
import type { CatalogAssetManifest, CatalogAssetReviewDecisions, SourceInventory } from './types.js';

const inventory = JSON.parse(await readFile(new URL('../../data/catalog-source/tzfit/inventory.json', import.meta.url), 'utf8')) as SourceInventory;
const resolution = SOURCE_RESOLUTIONS[0];
const canonical = inventory.products.find((product) => product.sourceUrl === resolution.canonicalUrl)!;
const alias = inventory.products.find((product) => product.sourceUrl === resolution.aliasUrls[0])!;

test('la risoluzione GF pubblica cinque modelli, mantenendo le altre quarantene e la fonte canonica', () => {
  const normalized = normalizeInventory(inventory);
  assert.equal(normalized.products.length, 745);
  assert.equal(normalized.quarantined.length, 14);
  assert.deepEqual(normalized.products.filter((product) => product.lineId === 'fm-gf-series').map((product) => product.publicSku),
    ['FM-GF-001', 'FM-GF-002', 'FM-GF-003', 'FM-GF-004', 'FM-GF-005']);
  const gf005 = normalized.products.find((product) => product.publicSku === 'FM-GF-005')!;
  assert.equal(gf005.sourceReference.sourceUrl, resolution.canonicalUrl);
  assert.deepEqual(gf005.assets.map((asset) => asset.sourceUrl), canonical.assets.map((asset) => asset.sourceUrl));
  assert.equal(normalized.quarantined.some((product) => product.publicSku === 'FM-GC-5058'), true);
  assert.deepEqual(normalizeInventory({ ...inventory, products: [...inventory.products].reverse() }).products, normalized.products);
});

test('una fonte canonica mancante, duplicata o affiancata da pagine nuove resta in quarantena', () => {
  for (const products of [
    [alias],
    [canonical, canonical, alias],
    [canonical, alias, { ...alias, sourceUrl: 'https://tzfit.com/unreviewed-gf-005/' }],
  ]) {
    const normalized = normalizeInventory({ ...inventory, products });
    assert.equal(normalized.products.length, 0);
    assert.equal(normalized.quarantined[0]?.publicSku, 'FM-GF-005');
  }
  assert.equal(normalizeInventory({ ...inventory, products: [canonical] }).products[0]?.publicSku, 'FM-GF-005');
});

test('rigenerazione e vecchie approvazioni non riabilitano le immagini della pagina alias', async () => {
  const current = JSON.parse(await readFile(new URL('../../data/catalog-assets/manifest.json', import.meta.url), 'utf8')) as CatalogAssetManifest;
  const manifest = createAssetManifest(inventory, current);
  const gfItems = manifest.items.filter((item) => item.publicSku === 'FM-GF-005');
  const selected = gfItems.filter((item) => item.status !== 'excluded-source-alias');
  assert.deepEqual(new Set(selected.map((item) => item.sourceUrl)), new Set(canonical.assets.map((asset) => asset.sourceUrl)));
  assert.equal(selected.length, 2);
  assert.equal(selectPublishablePrimaryAssetIds(manifest, new Set(['FM-GF-005'])).length, 1);
  const decisions: CatalogAssetReviewDecisions = {
    schemaVersion: 1, sourceInventoryHash: manifest.sourceInventoryHash,
    reviewedAt: new Date().toISOString(), defaultStatus: 'needs-cleaning', defaultNote: 'test',
    approvedAssetIds: gfItems.map((item) => item.assetId), blockedSourceBasenames: [],
  };
  applyAssetReviewDecisions(manifest, decisions);
  assert.equal(gfItems.filter((item) => item.status === 'excluded-source-alias').length, 10);
});

test('riconosce le categorie con prefisso WordPress senza cambiare gli identificativi storici', () => {
  const legacy = categoryFromSitemapEntry({ url: 'https://tzfit.com/plate-loaded-machine/gf-series-plate-loaded-machine/' })!;
  const current = categoryFromSitemapEntry({ url: 'https://tzfit.com/category/plate-loaded-machine/gf-series-plate-loaded-machine/' })!;
  assert.equal(current.publicId, legacy.publicId);
  assert.equal(current.sourceId, legacy.sourceId);
  assert.equal(current.parentSourceId, legacy.parentSourceId);
  assert.equal(categoryFromSitemapEntry({ url: 'https://tzfit.com/category/blog/' }), undefined);
});
