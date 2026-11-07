import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { prepareCatalogImage } from './assets.js';
import { importVisualReviews, type BrandingQueue } from './branding.js';

test('le dimensioni del catalogo seguono il file finale anche dopo la rotazione EXIF', async () => {
  const original = await sharp({ create: { width: 40, height: 24, channels: 3, background: '#356b35' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const { data, info } = await prepareCatalogImage(original);
  const stored = await sharp(data).metadata();
  assert.equal(info.width, 24);
  assert.equal(info.height, 40);
  assert.equal(stored.width, info.width);
  assert.equal(stored.height, info.height);
  assert.equal(stored.format, 'webp');
});

test('a mismatched or unreviewed photo cannot partly approve a batch', () => {
  const queue: BrandingQueue = { schemaVersion: 1, referenceGreen: '#356B35', jobs: ['one', 'two'].map(assetId => ({
    assetId, sku: `FM-${assetId}`, role: 'primary', sourceHash: `hash-${assetId}`,
    inputPath: 'src/assets/original.webp', originalPath: 'data/original.jpg', categoryId: 'test',
    outputPath: 'data/catalog-branding/generated/output.png', status: 'pending',
  })) };
  const items = queue.jobs.map(job => ({ ...job, status: 'approved', review: 'Source and result visually compared.' }));
  assert.throws(() => importVisualReviews(queue, { items: [items[0], { ...items[1], sourceHash: 'wrong-source' }] }), /source mismatch/);
  assert.deepEqual(queue.jobs.map(job => job.status), ['pending', 'pending']);
  assert.throws(() => importVisualReviews(queue, { items: [{ ...items[0], status: 'pending' }] }), /approval missing/);
  assert.equal(importVisualReviews(queue, { items }), 2);
  queue.jobs.forEach(job => { job.status = 'integrated'; });
  assert.equal(importVisualReviews(queue, { items }), 0);
});
