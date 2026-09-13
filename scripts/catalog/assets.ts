import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { toPublicSku } from './brand.js';
import { PATHS } from './config.js';
import { PoliteHttpClient, hash } from './http.js';
import { fileExists, writeJsonAtomic } from './io.js';
import type {
  AssetReviewStatus,
  CatalogAssetManifest,
  CatalogAssetManifestItem,
  CatalogAssetReviewDecisions,
  SourceInventory,
  SupplierMarkKind,
} from './types.js';

const DOWNLOADABLE_MIME_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const REVIEW_STATUSES = new Set<AssetReviewStatus>([
  'pending-review',
  'needs-review',
  'needs-cleaning',
  'edited-review',
  'approved',
  'approved-provisional',
  'approved-oem',
  'missing',
  'blocked-branding',
]);

const PUBLIC_STATUSES = new Set<AssetReviewStatus>(['approved', 'approved-provisional', 'approved-oem']);

export interface AssetProgress {
  completed: number;
  total: number;
  downloaded: number;
  skipped: number;
  failed: number;
}

export interface AssetValidationReport {
  total: number;
  downloaded: number;
  needsReview: number;
  needsCleaning: number;
  blockedBranding: number;
  editedReview: number;
  approvedProvisional: number;
  approvedOem: number;
  missing: number;
  staged: number;
  publishableProductsWithImage: number;
  publishableProductsWithoutImage: string[];
  errors: string[];
}

export interface AppliedReviewSummary {
  approvedProvisional: number;
  blockedBranding: number;
  needsCleaning: number;
  preservedFinal: number;
}

export function selectPublishablePrimaryAssetIds(
  manifest: CatalogAssetManifest,
  publishableSkus: Set<string>,
): string[] {
  const selected: string[] = [];
  for (const publicSku of [...publishableSkus].sort()) {
    const candidates = manifest.items.filter((item) => item.publicSku === publicSku && item.role === 'primary');
    if (candidates.length !== 1) {
      throw new Error(`${publicSku}: attesa una sola immagine principale, trovate ${candidates.length}.`);
    }
    const item = candidates[0]!;
    if (!item.originalPath) throw new Error(`${publicSku}: immagine principale non scaricata.`);
    if (!item.width || !item.height || item.width < 600 || item.height < 600) {
      throw new Error(`${publicSku}: immagine principale sotto la risoluzione minima di 600x600 px.`);
    }
    if (item.status === 'blocked-branding' || item.status === 'missing') {
      throw new Error(`${publicSku}: immagine principale non utilizzabile (${item.status}).`);
    }
    if (item.supplierMarks.length && !item.editedPath) {
      throw new Error(`${publicSku}: immagine principale con marchio rilevato e senza copia ripulita.`);
    }
    selected.push(item.assetId);
  }
  return selected;
}

export function createAssetManifest(
  inventory: SourceInventory,
  previous: CatalogAssetManifest | undefined,
): CatalogAssetManifest {
  const previousById = new Map((previous?.items ?? []).map((item) => [item.assetId, item]));
  const seenIds = new Set<string>();
  const items: CatalogAssetManifestItem[] = [];

  for (const product of inventory.products) {
    const publicSku = toPublicSku(product.sourceSku);
    product.assets.forEach((asset, index) => {
      const assetId = buildAssetId(publicSku, asset.sourceUrl);
      if (seenIds.has(assetId)) return;
      seenIds.add(assetId);
      const old = previousById.get(assetId);
      items.push({
        assetId,
        publicSku,
        sourceSku: product.sourceSku,
        sourceUrl: asset.sourceUrl,
        role: asset.role,
        sortOrder: index,
        status: old?.status ?? 'needs-review',
        supplierMarks: old?.supplierMarks ?? [],
        ...(old?.originalPath ? { originalPath: old.originalPath } : {}),
        ...(old?.editedPath ? { editedPath: old.editedPath } : {}),
        ...(old?.stagedPath ? { stagedPath: old.stagedPath } : {}),
        ...(old?.sourceHash ? { sourceHash: old.sourceHash } : {}),
        ...(old?.outputHash ? { outputHash: old.outputHash } : {}),
        ...(old?.mimeType ? { mimeType: old.mimeType } : {}),
        ...(old?.bytes !== undefined ? { bytes: old.bytes } : {}),
        ...(old?.width !== undefined ? { width: old.width } : {}),
        ...(old?.height !== undefined ? { height: old.height } : {}),
        reviewNotes: old?.reviewNotes ?? [],
      });
    });
  }

  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    generatedAt: previous?.generatedAt ?? now,
    updatedAt: now,
    sourceInventoryHash: hash(JSON.stringify(inventory)),
    items: items.sort((a, b) => `${a.publicSku}:${a.sortOrder}:${a.assetId}`.localeCompare(`${b.publicSku}:${b.sortOrder}:${b.assetId}`)),
  };
}

export async function downloadAssets(
  manifest: CatalogAssetManifest,
  options: {
    limit?: number;
    concurrency?: number;
    delayMs?: number;
    onProgress?: (progress: AssetProgress) => void;
  } = {},
): Promise<CatalogAssetManifest> {
  const candidates = manifest.items
    .filter((item) => item.status !== 'blocked-branding')
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY);
  const client = new PoliteHttpClient({ delayMs: options.delayMs ?? 350 });
  const progress: AssetProgress = { completed: 0, total: candidates.length, downloaded: 0, skipped: 0, failed: 0 };
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 2, 3));
  let lastPersisted = 0;

  for (let offset = 0; offset < candidates.length; offset += concurrency) {
    const batch = candidates.slice(offset, offset + concurrency);
    await Promise.all(
      batch.map(async (item) => {
        try {
          if (item.originalPath && item.sourceHash && await fileExists(path.resolve(item.originalPath))) {
            progress.skipped += 1;
            return;
          }
          const { bytes, contentType } = await client.bytes(item.sourceUrl);
          const extension = DOWNLOADABLE_MIME_TYPES.get(contentType);
          if (!extension) throw new Error(`MIME non supportato: ${contentType || 'assente'}`);
          if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('File oltre il limite di 25 MB');
          const metadata = await sharp(bytes, { failOn: 'error' }).metadata();
          if (!metadata.width || !metadata.height) throw new Error('Dimensioni immagine non leggibili');
          const sourceHash = hash(bytes);
          const relativePath = path.join('data/catalog-assets/originals', sourceHash.slice(0, 2), `${sourceHash}.${extension}`);
          const absolutePath = path.resolve(relativePath);
          await mkdir(path.dirname(absolutePath), { recursive: true });
          if (!await fileExists(absolutePath)) await writeFile(absolutePath, bytes);
          item.originalPath = toPortablePath(relativePath);
          item.sourceHash = sourceHash;
          item.mimeType = contentType;
          item.bytes = bytes.byteLength;
          item.width = metadata.width;
          item.height = metadata.height;
          if (item.status === 'missing' || item.status === 'pending-review') item.status = 'needs-review';
          item.reviewNotes = item.reviewNotes.filter((note) => !note.startsWith('Download fallito:'));
          progress.downloaded += 1;
        } catch (error) {
          item.status = 'missing';
          item.reviewNotes.push(`Download fallito: ${errorMessage(error)}`);
          progress.failed += 1;
        } finally {
          progress.completed += 1;
        }
      }),
    );
    if (progress.completed === progress.total || progress.completed - lastPersisted >= 25) {
      manifest.updatedAt = new Date().toISOString();
      await writeJsonAtomic(PATHS.assetManifest, manifest);
      lastPersisted = progress.completed;
    }
    options.onProgress?.(progress);
  }
  return manifest;
}

export async function createContactSheets(
  manifest: CatalogAssetManifest,
  options: { columns?: number; rows?: number; tileSize?: number } = {},
): Promise<{ sheets: number; indexPath: string }> {
  const columns = options.columns ?? 4;
  const rows = options.rows ?? 4;
  const tileSize = options.tileSize ?? 320;
  const labelHeight = 46;
  const perSheet = columns * rows;
  const candidates = manifest.items.filter((item) => item.originalPath && item.status !== 'missing');
  const outputDirectory = path.join(PATHS.assetReview, 'contact-sheets');
  await mkdir(outputDirectory, { recursive: true });
  const index: Array<{ sheet: string; assets: string[] }> = [];

  for (let offset = 0; offset < candidates.length; offset += perSheet) {
    const batch = candidates.slice(offset, offset + perSheet);
    const sheetNumber = Math.floor(offset / perSheet) + 1;
    const sheetName = `sheet-${String(sheetNumber).padStart(3, '0')}.jpg`;
    const composites: OverlayOptions[] = [];

    for (const [indexInSheet, item] of batch.entries()) {
      const left = (indexInSheet % columns) * tileSize;
      const top = Math.floor(indexInSheet / columns) * (tileSize + labelHeight);
      const thumbnail = await sharp(path.resolve(item.originalPath!))
        .rotate()
        .resize(tileSize, tileSize, { fit: 'contain', background: '#ffffff' })
        .jpeg({ quality: 84 })
        .toBuffer();
      composites.push({ input: thumbnail, left, top });
      composites.push({
        input: Buffer.from(labelSvg(tileSize, labelHeight, `${item.publicSku} · ${item.assetId.slice(-8)}`)),
        left,
        top: top + tileSize,
      });
    }

    await sharp({
      create: {
        width: columns * tileSize,
        height: rows * (tileSize + labelHeight),
        channels: 3,
        background: '#e5e7eb',
      },
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(path.join(outputDirectory, sheetName));
    index.push({ sheet: sheetName, assets: batch.map((item) => item.assetId) });
  }

  const indexPath = path.join(PATHS.assetReview, 'contact-sheet-index.json');
  await writeJsonAtomic(indexPath, { generatedAt: new Date().toISOString(), columns, rows, tileSize, sheets: index });
  return { sheets: index.length, indexPath };
}

export async function setAssetReview(
  manifest: CatalogAssetManifest,
  input: {
    assetId: string;
    status: AssetReviewStatus;
    note?: string;
    mark?: SupplierMarkKind;
    editedPath?: string;
  },
): Promise<void> {
  if (!REVIEW_STATUSES.has(input.status)) throw new Error(`Stato asset non valido: ${input.status}`);
  const item = manifest.items.find((candidate) => candidate.assetId === input.assetId);
  if (!item) throw new Error(`Asset non trovato: ${input.assetId}`);
  if (input.editedPath) {
    const checkedPath = await checkedWorkspaceImagePath(input.editedPath);
    item.editedPath = toPortablePath(path.relative(process.cwd(), checkedPath));
  }
  if (input.mark) {
    const note = input.note?.trim() || `Rilevato ${input.mark}`;
    if (!item.supplierMarks.some((mark) => mark.kind === input.mark && mark.note === note)) {
      item.supplierMarks.push({ kind: input.mark, note });
    }
  } else if (input.status === 'approved-provisional' && !item.editedPath) {
    item.supplierMarks = [];
  }
  if (input.status === 'edited-review' && !item.editedPath) {
    throw new Error('edited-review richiede --edited-path.');
  }
  if (input.status === 'approved-provisional' && item.supplierMarks.length && !item.editedPath) {
    throw new Error('Un asset con marchi rilevati richiede una copia modificata prima dell’approvazione.');
  }
  if (input.status === 'approved-oem' && !item.editedPath) {
    throw new Error('approved-oem richiede il percorso del file OEM in --edited-path.');
  }
  if (input.note && !item.reviewNotes.includes(input.note)) item.reviewNotes.push(input.note);
  item.status = input.status;
  manifest.updatedAt = new Date().toISOString();
  await writeJsonAtomic(PATHS.assetManifest, manifest);
}

export function applyAssetReviewDecisions(
  manifest: CatalogAssetManifest,
  decisions: CatalogAssetReviewDecisions,
): AppliedReviewSummary {
  if (decisions.schemaVersion !== 1) throw new Error(`Versione decisioni non supportata: ${decisions.schemaVersion}`);
  if (decisions.sourceInventoryHash !== manifest.sourceInventoryHash) {
    throw new Error('Le decisioni immagini appartengono a un inventario diverso. Rigenerare e riesaminare le tavole.');
  }

  const approved = new Set(decisions.approvedAssetIds);
  if (approved.size !== decisions.approvedAssetIds.length) throw new Error('Le decisioni contengono asset approvati duplicati.');
  const manifestIds = new Set(manifest.items.map((item) => item.assetId));
  const unknown = [...approved].filter((assetId) => !manifestIds.has(assetId));
  if (unknown.length) throw new Error(`Asset approvati non presenti nel manifest: ${unknown.join(', ')}`);

  const blockedBasenames = new Set(decisions.blockedSourceBasenames.map((value) => value.toLowerCase()));
  const summary: AppliedReviewSummary = {
    approvedProvisional: 0,
    blockedBranding: 0,
    needsCleaning: 0,
    preservedFinal: 0,
  };

  for (const item of manifest.items) {
    if (item.status === 'approved-oem' || item.status === 'edited-review' || (item.editedPath && item.status === 'approved-provisional')) {
      summary.preservedFinal += 1;
      continue;
    }

    item.reviewNotes = item.reviewNotes.filter((note) => !note.startsWith('Revisione provvisoria:'));
    const basename = sourceBasename(item.sourceUrl);
    if (blockedBasenames.has(basename)) {
      item.status = 'blocked-branding';
      item.supplierMarks = [];
      item.reviewNotes.push('Revisione provvisoria: pannello promozionale del fornitore escluso dalla pubblicazione.');
      summary.blockedBranding += 1;
      continue;
    }

    if (approved.has(item.assetId)) {
      item.status = 'approved-provisional';
      item.supplierMarks = [];
      item.reviewNotes.push('Revisione provvisoria: nessun nome del fornitore visibile nella tavola e nel controllo del file.');
      summary.approvedProvisional += 1;
      continue;
    }

    item.status = decisions.defaultStatus;
    item.reviewNotes.push(`Revisione provvisoria: ${decisions.defaultNote}`);
    summary.needsCleaning += 1;
  }

  manifest.updatedAt = new Date().toISOString();
  return summary;
}

export async function stageApprovedAssets(
  manifest: CatalogAssetManifest,
  publishableSkus: Set<string>,
  onProgress: (completed: number, total: number) => void = () => undefined,
): Promise<number> {
  const approved = manifest.items.filter((item) => publishableSkus.has(item.publicSku) && PUBLIC_STATUSES.has(item.status));
  let completed = 0;
  for (const item of approved) {
    const sourcePath = item.editedPath ?? item.originalPath;
    if (!sourcePath) throw new Error(`Asset approvato senza file locale: ${item.assetId}`);
    const checkedPath = await checkedWorkspaceImagePath(sourcePath);
    const buffer = await sharp(checkedPath, { failOn: 'error' })
      .rotate()
      .webp({ quality: 90, effort: 4 })
      .toBuffer();
    const outputHash = hash(buffer);
    const filename = `${item.role}-${String(item.sortOrder + 1).padStart(2, '0')}-${outputHash.slice(0, 12)}.webp`;
    const outputPath = path.join(PATHS.stagedAssets, item.publicSku, filename);
    await mkdir(path.dirname(outputPath), { recursive: true });
    if (!await fileExists(outputPath)) await writeFile(outputPath, buffer);
    item.stagedPath = toPortablePath(path.relative(process.cwd(), outputPath));
    item.outputHash = outputHash;
    completed += 1;
    onProgress(completed, approved.length);
  }
  manifest.updatedAt = new Date().toISOString();
  await writeJsonAtomic(PATHS.assetManifest, manifest);
  return approved.length;
}

export async function validateAssets(
  manifest: CatalogAssetManifest,
  publishableSkus: Set<string>,
): Promise<AssetValidationReport> {
  const errors: string[] = [];
  const approvedProducts = new Set<string>();
  let downloaded = 0;
  let staged = 0;

  for (const item of manifest.items) {
    if (!REVIEW_STATUSES.has(item.status)) errors.push(`${item.assetId}: stato sconosciuto ${item.status}`);
    if (item.originalPath) {
      downloaded += 1;
      if (!await fileExists(path.resolve(item.originalPath))) errors.push(`${item.assetId}: originale locale assente`);
    }
    if (PUBLIC_STATUSES.has(item.status) && publishableSkus.has(item.publicSku)) {
      if (!item.stagedPath) errors.push(`${item.assetId}: approvato ma non staged`);
      if (item.supplierMarks.length && !item.editedPath) errors.push(`${item.assetId}: marchio rilevato senza immagine modificata`);
      if (item.stagedPath) {
        staged += 1;
        if (!await fileExists(path.resolve(item.stagedPath))) errors.push(`${item.assetId}: file staged assente`);
      }
      if (publishableSkus.has(item.publicSku) && item.role === 'primary') approvedProducts.add(item.publicSku);
    }
  }

  return {
    total: manifest.items.length,
    downloaded,
    needsReview: countStatus(manifest, 'needs-review') + countStatus(manifest, 'pending-review'),
    needsCleaning: countStatus(manifest, 'needs-cleaning'),
    blockedBranding: countStatus(manifest, 'blocked-branding'),
    editedReview: countStatus(manifest, 'edited-review'),
    approvedProvisional: countStatus(manifest, 'approved-provisional') + countStatus(manifest, 'approved'),
    approvedOem: countStatus(manifest, 'approved-oem'),
    missing: countStatus(manifest, 'missing'),
    staged,
    publishableProductsWithImage: approvedProducts.size,
    publishableProductsWithoutImage: [...publishableSkus].filter((sku) => !approvedProducts.has(sku)).sort(),
    errors,
  };
}

export async function importOemAssets(
  manifest: CatalogAssetManifest,
  inputDirectory: string,
): Promise<{ imported: number; unmatched: string[] }> {
  const root = path.resolve(inputDirectory);
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) throw new Error(`Il percorso OEM non è una cartella: ${inputDirectory}`);
  const files = await listImages(root);
  const unmatched: string[] = [];
  let imported = 0;

  for (const file of files) {
    const parsed = parseOemFilename(path.basename(file));
    if (!parsed) {
      unmatched.push(file);
      continue;
    }
    const publicSku = toPublicSku(parsed.sku);
    const item = manifest.items.find(
      (candidate) => candidate.publicSku === publicSku && candidate.role === parsed.role && candidate.sortOrder === parsed.order - 1,
    );
    if (!item) {
      unmatched.push(file);
      continue;
    }
    const metadata = await sharp(file, { failOn: 'error' }).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`File OEM non valido: ${file}`);
    const bytes = await readFile(file);
    const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    if (!extension || !['jpg', 'png', 'webp', 'avif'].includes(extension)) throw new Error(`Formato OEM non supportato: ${file}`);
    const fileHash = hash(bytes);
    const destination = path.join('data/catalog-assets/edited/oem', fileHash.slice(0, 2), `${fileHash}.${extension}`);
    await mkdir(path.dirname(path.resolve(destination)), { recursive: true });
    if (!await fileExists(path.resolve(destination))) await copyFile(file, path.resolve(destination));
    item.editedPath = toPortablePath(destination);
    item.status = 'approved-oem';
    item.supplierMarks = [];
    item.reviewNotes.push(`Asset OEM importato da ${path.basename(file)}`);
    imported += 1;
  }
  manifest.updatedAt = new Date().toISOString();
  await writeJsonAtomic(PATHS.assetManifest, manifest);
  return { imported, unmatched };
}

function buildAssetId(publicSku: string, sourceUrl: string): string {
  return `${publicSku.toLowerCase()}-${createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16)}`;
}

function sourceBasename(sourceUrl: string): string {
  try {
    const pathname = new URL(sourceUrl).pathname;
    return decodeURIComponent(pathname.slice(pathname.lastIndexOf('/') + 1)).toLowerCase();
  } catch {
    return '';
  }
}

function countStatus(manifest: CatalogAssetManifest, status: AssetReviewStatus): number {
  return manifest.items.filter((item) => item.status === status).length;
}

async function checkedWorkspaceImagePath(value: string): Promise<string> {
  const resolved = path.resolve(value);
  const workspace = `${path.resolve(process.cwd())}${path.sep}`.toLowerCase();
  if (!`${resolved}${path.sep}`.toLowerCase().startsWith(workspace)) {
    throw new Error(`Il file deve trovarsi nel workspace: ${value}`);
  }
  const metadata = await sharp(resolved, { failOn: 'error' }).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Immagine non valida: ${value}`);
  return resolved;
}

async function listImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listImages(fullPath));
    else if (/\.(?:avif|webp|png|jpe?g)$/i.test(entry.name)) files.push(fullPath);
  }
  return files.sort();
}

function parseOemFilename(filename: string): { sku: string; role: 'primary' | 'gallery'; order: number } | undefined {
  const match = filename.match(/^(.+?)__(primary|gallery)__(\d+)\.(?:avif|webp|png|jpe?g)$/i);
  if (!match) return undefined;
  return { sku: match[1]!, role: match[2]!.toLowerCase() as 'primary' | 'gallery', order: Number(match[3]) };
}

function labelSvg(width: number, height: number, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#111827"/><text x="12" y="30" font-family="Arial, sans-serif" font-size="18" fill="#fff">${escapeXml(label)}</text></svg>`;
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function toPortablePath(value: string): string {
  return value.replaceAll('\\', '/');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
