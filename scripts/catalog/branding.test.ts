import assert from 'node:assert/strict';
import path from 'node:path';
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

function integratedQueue(): BrandingQueue {
  return { schemaVersion: 1, referenceGreen: '#356B35', jobs: ['one', 'two'].map(assetId => ({
    assetId, sku: `FM-${assetId}`, role: 'primary', sourceHash: `hash-${assetId}`,
    inputPath: 'src/assets/original.webp', originalPath: 'data/original.jpg', categoryId: 'test',
    outputPath: `data/catalog-branding/generated/${assetId}.png`, status: 'integrated',
    review: `Original visual approval for ${assetId}.`, stagedPath: `src/assets/catalog/${assetId}.webp`,
  })) };
}

test('an explicit integrated revision preserves provenance across repeated reviews and integrations', () => {
  const queue = integratedQueue();
  const job = queue.jobs[0]!;
  const original = structuredClone(job);
  const revision = {
    assetId: job.assetId, sku: job.sku, sourceHash: job.sourceHash, status: 'visually-reviewed',
    previousOutputPath: job.outputPath, outputPath: 'data/catalog-branding/generated/one-v2.png',
    review: 'Revised finish compared with the original machine and approved.',
  };
  assert.equal(importVisualReviews(queue, { items: [revision] }), 1);
  assert.equal(job.status, 'approved');
  assert.equal(job.outputPath, revision.outputPath);
  assert.equal(job.review, revision.review);
  assert.equal(job.sourceHash, original.sourceHash);
  assert.deepEqual(job.history, [{ outputPath: original.outputPath, review: original.review, stagedPath: original.stagedPath }]);
  // Repeating review before apply must not archive the same previous image twice.
  importVisualReviews(queue, { items: [revision] });
  assert.equal(job.history!.length, 1);
  job.status = 'integrated';
  job.stagedPath = 'src/assets/catalog/one-v2.webp';
  const integrated = structuredClone(queue);
  assert.equal(importVisualReviews(queue, { items: [revision] }), 0);
  assert.deepEqual(queue, integrated);

  const next = { ...revision, previousOutputPath: revision.outputPath, outputPath: 'data/catalog-branding/generated/one-v3.png', review: 'Third visual revision approved.' };
  assert.equal(importVisualReviews(queue, { items: [next] }), 1);
  assert.deepEqual(job.history, [
    { outputPath: original.outputPath, review: original.review, stagedPath: original.stagedPath },
    { outputPath: revision.outputPath, review: revision.review, stagedPath: 'src/assets/catalog/one-v2.webp' },
  ]);
});

test('missing or stale previous output, file aliases and outside-workspace revisions reject the entire batch', () => {
  const initial = integratedQueue();
  const [first, second] = initial.jobs;
  const valid = {
    ...first!, status: 'approved', previousOutputPath: first!.outputPath,
    outputPath: 'data/catalog-branding/generated/one-v2.png', review: 'Revised image approved.',
  };
  const secondRevision = {
    ...second!, status: 'approved', previousOutputPath: second!.outputPath,
    outputPath: 'data/catalog-branding/generated/two-v2.png', review: 'Revised image approved.',
  };
  for (const [invalid, error] of [
    [{ ...secondRevision, previousOutputPath: undefined }, /matching previousOutputPath/],
    [{ ...secondRevision, previousOutputPath: 'data/catalog-branding/generated/stale.png' }, /matching previousOutputPath/],
    [{ ...secondRevision, outputPath: path.resolve(second!.outputPath) }, /must differ/],
    [{ ...secondRevision, outputPath: '../outside-workspace.png' }, /outside workspace/],
  ] as const) {
    const queue = structuredClone(initial);
    assert.throws(() => importVisualReviews(queue, { items: [valid, invalid] }), error);
    assert.deepEqual(queue, initial);
  }
});
