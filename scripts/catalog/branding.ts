import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stageApprovedAssets } from './assets.js';
import { PATHS } from './config.js';
import { writeJsonAtomic } from './io.js';
import { normalizeInventory } from './normalize.js';
import { generatePublicCatalog } from '../site/generate-public-catalog.js';
import type { CatalogAssetManifest, SourceInventory } from './types.js';

export type BrandingJob = {
  assetId: string; sku: string; role: string; sourceHash: string;
  inputPath: string; originalPath: string; categoryId: string; lineId?: string;
  outputPath: string; status: 'pending' | 'ready-for-review' | 'approved' | 'integrated';
  review?: string; stagedPath?: string;
};
export type BrandingQueue = { schemaVersion: 1; referenceGreen: string; jobs: BrandingJob[] };
const queuePath = path.resolve('data/catalog-branding/jobs.json');
const readJson = async <T>(filename: string): Promise<T> => JSON.parse(await readFile(filename, 'utf8')) as T;

/** Import an explicit visual review, never an unreviewed generator result. */
export function importVisualReviews(queue: BrandingQueue, report: unknown): number {
  const document = report as { jobs?: unknown; items?: unknown };
  const entries = Array.isArray(report) ? report : document?.jobs ?? document?.items;
  if (!Array.isArray(entries) || !entries.length) throw new Error('Visual review report is empty or invalid.');
  const changes: Array<{ job: BrandingJob; outputPath: string; review: string }> = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const job = queue.jobs.find(candidate => candidate.assetId === entry.assetId);
    if (!job || job.sku !== entry.sku || job.sourceHash !== entry.sourceHash) throw new Error(`Review source mismatch: ${entry.assetId}`);
    if (seen.has(job.assetId)) throw new Error(`Duplicate review: ${job.assetId}`);
    seen.add(job.assetId);
    const review = entry.review ?? entry.QA;
    if (!['approved', 'visually-reviewed'].includes(entry.status) || typeof review !== 'string' || !review.trim()) {
      throw new Error(`Visual approval missing: ${job.assetId}`);
    }
    if (typeof entry.outputPath !== 'string' || !entry.outputPath.trim()) throw new Error(`Output missing: ${job.assetId}`);
    const relative = path.relative(process.cwd(), path.resolve(entry.outputPath));
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Output outside workspace: ${job.assetId}`);
    if (job.status === 'integrated') {
      if (job.outputPath !== entry.outputPath) throw new Error(`Integrated image differs: ${job.assetId}`);
      continue;
    }
    changes.push({ job, outputPath: entry.outputPath, review });
  }
  // Validate the whole report before changing any queue entry.
  for (const { job, outputPath, review } of changes) Object.assign(job, { outputPath, review, status: 'approved' });
  return changes.length;
}

async function main() {
  const command = process.argv[2];
  const manifest = await readJson<CatalogAssetManifest>(PATHS.assetManifest);
  if (command === 'init') {
    // A queue is an audit trail: never overwrite existing reviews or progress.
    try { await readFile(queuePath); throw new Error('Branding queue already exists; use status or apply.'); }
    catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
    const catalogue = await readJson<{ products: Array<{ publicSku: string; categoryId: string; lineId?: string; assets: Array<{ localPath: string }> }> }>('data/catalog-public/products.json');
    const brochure = await readJson<Array<{ sku: string; output: string; sourceImage: string }>>('brochures/fullmuscle-g5/image-jobs.json');
    const featured = new Set(['FM-X6053', 'FM-X8202', 'FM-X6005', 'FM-X8204', 'FM-2000B', 'FM-3000A']);
    const jobs: BrandingJob[] = catalogue.products.flatMap(product => product.assets.map(asset => {
      const source = manifest.items.find(item => item.publicSku === product.publicSku && item.stagedPath === asset.localPath);
      if (!source?.sourceHash || !source.originalPath) throw new Error(`Missing source: ${product.publicSku} ${asset.localPath}`);
      const reuse = source.role === 'primary' && brochure.find(item => item.sku === product.publicSku && item.sourceImage === source.sourceUrl);
      return {
        assetId: source.assetId, sku: product.publicSku, role: source.role, sourceHash: source.sourceHash,
        inputPath: asset.localPath, originalPath: source.originalPath,
        categoryId: product.categoryId, ...(product.lineId ? { lineId: product.lineId } : {}),
        outputPath: reuse ? reuse.output : `data/catalog-branding/generated/catalog/${source.assetId}.png`,
        status: reuse ? 'ready-for-review' as const : 'pending' as const,
      };
    }));
    if (jobs.length !== 754 || new Set(jobs.map(job => job.assetId)).size !== 754) throw new Error('Expected 754 unique published views.');
    const priority = (job: BrandingJob) => featured.has(job.sku) ? 0 : job.status === 'ready-for-review' ? 1 : 2;
    jobs.sort((a, b) => priority(a) - priority(b) || (a.lineId ?? a.categoryId).localeCompare(b.lineId ?? b.categoryId) || a.sku.localeCompare(b.sku) || a.assetId.localeCompare(b.assetId));
    await writeJsonAtomic(queuePath, { schemaVersion: 1, referenceGreen: '#356B35', jobs } satisfies BrandingQueue);
    console.log(`Created ${jobs.length} jobs; ${jobs.filter(job => job.status === 'ready-for-review').length} brochure candidates.`);
    return;
  }
  const queue = await readJson<BrandingQueue>(queuePath);
  if (command === 'status') {
    const counts = Object.fromEntries(['pending', 'ready-for-review', 'approved', 'integrated'].map(status => [status, queue.jobs.filter(job => job.status === status).length]));
    console.log(JSON.stringify({ total: queue.jobs.length, ...counts }, null, 2));
    return;
  }
  if (command === 'review') {
    if (!process.argv[3]) throw new Error('Supply the visual review report path.');
    const count = importVisualReviews(queue, await readJson<unknown>(process.argv[3]));
    for (const job of queue.jobs.filter(job => job.status === 'approved')) await readFile(job.outputPath);
    await writeJsonAtomic(queuePath, queue);
    console.log(`Imported ${count} visual approvals. Run apply to stage the reviewed images.`);
    return;
  }
  if (command !== 'apply') throw new Error('Usage: tsx scripts/catalog/branding.ts init|status|review <report.json>|apply');
  const approved = queue.jobs.filter(job => job.status === 'approved');
  if (!approved.length) { console.log('No reviewed replacements pending publication.'); return; }
  for (const job of approved) {
    const source = manifest.items.find(item => item.assetId === job.assetId);
    if (!source || source.sourceHash !== job.sourceHash || source.publicSku !== job.sku) throw new Error(`Source changed: ${job.assetId}`);
    if (!job.review?.trim()) throw new Error(`Visual review missing: ${job.assetId}`);
    const relative = path.relative(process.cwd(), path.resolve(job.outputPath));
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Output outside workspace: ${job.assetId}`);
    await readFile(job.outputPath);
    source.editedPath = job.outputPath;
    source.status = 'approved-provisional';
    const note = `Full Muscle branding: ${job.review}`;
    if (!source.reviewNotes.includes(note)) source.reviewNotes.push(note);
  }
  const inventory = await readJson<SourceInventory>(PATHS.inventory);
  const drafts = normalizeInventory(inventory, manifest);
  const selected = new Set(approved.map(job => job.assetId));
  await stageApprovedAssets(manifest, new Set(drafts.products.map(product => product.publicSku)), undefined, selected);
  await writeJsonAtomic(PATHS.drafts, normalizeInventory(inventory, manifest));
  await generatePublicCatalog();
  for (const job of approved) {
    job.status = 'integrated';
    job.stagedPath = manifest.items.find(item => item.assetId === job.assetId)!.stagedPath!;
  }
  await writeJsonAtomic(queuePath, queue);
  console.log(`Staged and linked ${approved.length} reviewed images. Deploy verification remains separate.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
