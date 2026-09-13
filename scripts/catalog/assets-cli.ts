import { readFile } from 'node:fs/promises';
import { applyAssetReviewDecisions, createAssetManifest, createContactSheets, downloadAssets, importOemAssets, selectPublishablePrimaryAssetIds, setAssetReview, stageApprovedAssets, validateAssets } from './assets.js';
import { PATHS } from './config.js';
import { readJsonIfExists, writeJsonAtomic } from './io.js';
import type { AssetReviewStatus, CatalogAssetManifest, CatalogAssetReviewDecisions, SourceInventory, SupplierMarkKind } from './types.js';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const options = parseOptions(args);
  const inventory = await requiredJson<SourceInventory>(PATHS.inventory, 'inventario catalogo');
  const currentManifest = await readJsonIfExists<CatalogAssetManifest>(PATHS.assetManifest);
  const manifest = createAssetManifest(inventory, currentManifest);
  await writeJsonAtomic(PATHS.assetManifest, manifest);

  if (command === 'download') {
    let lastPrinted = 0;
    await downloadAssets(manifest, {
      ...(options.limit ? { limit: options.limit } : {}),
      ...(options.concurrency ? { concurrency: options.concurrency } : {}),
      ...(options.delayMs ? { delayMs: options.delayMs } : {}),
      onProgress: (progress) => {
        if (progress.completed === progress.total || progress.completed - lastPrinted >= 25) {
          lastPrinted = progress.completed;
          console.log(
            `Asset ${progress.completed}/${progress.total}; scaricati ${progress.downloaded}, già presenti ${progress.skipped}, falliti ${progress.failed}.`,
          );
        }
      },
    });
    return;
  }

  if (command === 'contact-sheets') {
    const result = await createContactSheets(manifest);
    console.log(`${result.sheets} tavole create; indice: ${result.indexPath}`);
    return;
  }

  if (command === 'set') {
    if (!options.assetId || !options.status) throw new Error('set richiede --asset-id e --status.');
    await setAssetReview(manifest, {
      assetId: options.assetId,
      status: options.status,
      ...(options.note ? { note: options.note } : {}),
      ...(options.mark ? { mark: options.mark } : {}),
      ...(options.editedPath ? { editedPath: options.editedPath } : {}),
    });
    console.log(`${options.assetId}: stato aggiornato a ${options.status}.`);
    return;
  }

  if (command === 'apply-review') {
    if (!options.input) throw new Error('apply-review richiede --input <file-json>.');
    const decisions = await requiredJson<CatalogAssetReviewDecisions>(options.input, 'decisioni revisione immagini');
    const summary = applyAssetReviewDecisions(manifest, decisions);
    await writeJsonAtomic(PATHS.assetManifest, manifest);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const drafts = await requiredJson<{ products: Array<{ publicSku: string }> }>(PATHS.drafts, 'bozze catalogo');
  const publishableSkus = new Set(drafts.products.map((product) => product.publicSku));

  if (command === 'approve-primary') {
    const decisions = await requiredJson<CatalogAssetReviewDecisions>(PATHS.assetReviewDecisions, 'decisioni revisione immagini');
    if (decisions.sourceInventoryHash !== manifest.sourceInventoryHash) {
      throw new Error('Le decisioni immagini appartengono a un inventario diverso.');
    }
    const primaryAssetIds = selectPublishablePrimaryAssetIds(manifest, publishableSkus);
    const updatedDecisions: CatalogAssetReviewDecisions = {
      ...decisions,
      reviewedAt: new Date().toISOString(),
      approvedAssetIds: [...new Set([...decisions.approvedAssetIds, ...primaryAssetIds])].sort(),
    };
    const summary = applyAssetReviewDecisions(manifest, updatedDecisions);
    await writeJsonAtomic(PATHS.assetReviewDecisions, updatedDecisions);
    await writeJsonAtomic(PATHS.assetManifest, manifest);
    console.log(JSON.stringify({ selectedPrimaryImages: primaryAssetIds.length, ...summary }, null, 2));
    return;
  }

  if (command === 'stage') {
    let lastPrinted = 0;
    const count = await stageApprovedAssets(manifest, publishableSkus, (completed, total) => {
      if (completed === total || completed - lastPrinted >= 25) {
        lastPrinted = completed;
        console.log(`Staging ${completed}/${total}.`);
      }
    });
    console.log(`${count} asset approvati preparati per Astro.`);
    return;
  }

  if (command === 'validate' || command === 'summary') {
    const report = await validateAssets(manifest, publishableSkus);
    console.log(JSON.stringify(report, null, 2));
    if (command === 'validate' && report.errors.length) process.exitCode = 1;
    return;
  }

  if (command === 'import-oem') {
    if (!options.input) throw new Error('import-oem richiede --input <cartella>.');
    const result = await importOemAssets(manifest, options.input);
    console.log(`Importati ${result.imported} asset OEM; non associati ${result.unmatched.length}.`);
    if (result.unmatched.length) console.log(result.unmatched.join('\n'));
    return;
  }

  printHelp();
  if (command) process.exitCode = 1;
}

interface Options {
  limit?: number;
  concurrency?: number;
  delayMs?: number;
  assetId?: string;
  status?: AssetReviewStatus;
  mark?: SupplierMarkKind;
  note?: string;
  editedPath?: string;
  input?: string;
}

function parseOptions(args: string[]): Options {
  const result: Options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const [name, inlineValue] = arg.split('=', 2);
    const value = inlineValue ?? args[index + 1];
    const consumesNext = inlineValue === undefined;
    if (name === '--limit') result.limit = positiveInteger(value, name);
    else if (name === '--concurrency') result.concurrency = positiveInteger(value, name);
    else if (name === '--delay-ms') result.delayMs = positiveInteger(value, name);
    else if (name === '--asset-id') result.assetId = requiredValue(value, name);
    else if (name === '--status') result.status = requiredValue(value, name) as AssetReviewStatus;
    else if (name === '--mark') result.mark = requiredValue(value, name) as SupplierMarkKind;
    else if (name === '--note') result.note = requiredValue(value, name);
    else if (name === '--edited-path') result.editedPath = requiredValue(value, name);
    else if (name === '--input') result.input = requiredValue(value, name);
    else throw new Error(`Opzione sconosciuta: ${arg}`);
    if (consumesNext) index += 1;
  }
  return result;
}

function requiredValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} richiede un valore.`);
  return value;
}

function positiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} richiede un intero positivo.`);
  return parsed;
}

async function requiredJson<T>(filePath: string, label: string): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    throw new Error(`Impossibile leggere ${label}: ${filePath}`);
  }
}

function printHelp(): void {
  console.log(`Comandi:
  npm run catalog:assets -- download [--limit 10] [--concurrency 2] [--delay-ms 350]
  npm run catalog:assets -- contact-sheets
  npm run catalog:assets -- apply-review --input data/catalog-assets/review-decisions.json
  npm run catalog:assets -- approve-primary
  npm run catalog:assets -- set --asset-id <id> --status <stato> [--mark wordmark|logo|source-code] [--note <testo>] [--edited-path <file>]
  npm run catalog:assets -- stage
  npm run catalog:assets -- validate
  npm run catalog:assets -- summary
  npm run catalog:assets -- import-oem --input <cartella>`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
