import { PATHS } from './config.js';
import { crawlCatalog } from './crawler.js';
import { compareInventories } from './diff.js';
import { readJsonIfExists, writeJsonAtomic } from './io.js';
import { normalizeInventory } from './normalize.js';
import type { CatalogAssetManifest, SourceInventory } from './types.js';

interface CliOptions {
  dryRun: boolean;
  downloadAssets: boolean;
  limit?: number;
  concurrency?: number;
  delayMs?: number;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const options = parseOptions(args);

  if (command === 'crawl') {
    if (options.dryRun && options.downloadAssets) {
      throw new Error('--download-assets scrive file e non può essere usato insieme a --dry-run.');
    }
    if (options.limit && !options.dryRun) {
      throw new Error('Un crawl limitato non può sostituire l’inventario: aggiungere --dry-run.');
    }
    const inventory = await crawlCatalog({
      ...(options.limit ? { limit: options.limit } : {}),
      ...(options.concurrency ? { concurrency: options.concurrency } : {}),
      ...(options.delayMs ? { delayMs: options.delayMs } : {}),
      downloadAssets: options.downloadAssets,
      onProgress: console.log,
    });
    printInventorySummary(inventory);
    if (options.dryRun) {
      console.table(
        inventory.products.map((product) => ({
          sku: product.sourceSku,
          name: product.sourceName,
          specifications: Object.keys(product.specifications).length,
          images: product.assets.length,
          category: product.sourceCategoryIds.join(', '),
          series: product.sourceSeriesIds.join(', '),
        })),
      );
      console.log('Dry run completato: nessun inventario o asset modificato.');
      return;
    }
    if (!inventory.products.length) throw new Error('Il crawl non ha prodotto schede valide; inventario precedente conservato.');
    const previous = await readJsonIfExists<SourceInventory>(PATHS.inventory);
    if (previous) await writeJsonAtomic(PATHS.previousInventory, previous);
    await writeJsonAtomic(PATHS.inventory, inventory);
    console.log(`Inventario scritto in ${PATHS.inventory}`);
    return;
  }

  if (command === 'normalize') {
    const inventory = await requiredInventory(PATHS.inventory);
    const assetManifest = await readJsonIfExists<CatalogAssetManifest>(PATHS.assetManifest);
    const normalized = normalizeInventory(inventory, assetManifest);
    await writeJsonAtomic(PATHS.drafts, normalized);
    console.log(
      `${normalized.products.length} bozze interne scritte in ${PATHS.drafts}; ${normalized.quarantined.length} SKU duplicati in quarantena.`,
    );
    return;
  }

  if (command === 'diff') {
    const current = await requiredInventory(PATHS.inventory);
    const previous = await readJsonIfExists<SourceInventory>(PATHS.previousInventory);
    const report = compareInventories(previous, current);
    await writeJsonAtomic(PATHS.diff, report);
    console.log(
      `Nuovi: ${report.new.length}; modificati: ${report.changed.length}; rimossi da verificare: ${report.removed.length}; invariati: ${report.unchanged}.`,
    );
    console.log(`Report scritto in ${PATHS.diff}`);
    return;
  }

  printHelp();
  if (command) process.exitCode = 1;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, downloadAssets: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--download-assets') options.downloadAssets = true;
    else if (arg === '--limit') options.limit = positiveInteger(args[++index], '--limit');
    else if (arg.startsWith('--limit=')) options.limit = positiveInteger(arg.split('=')[1], '--limit');
    else if (arg === '--concurrency') options.concurrency = positiveInteger(args[++index], '--concurrency');
    else if (arg.startsWith('--concurrency=')) options.concurrency = positiveInteger(arg.split('=')[1], '--concurrency');
    else if (arg === '--delay-ms') options.delayMs = positiveInteger(args[++index], '--delay-ms');
    else if (arg.startsWith('--delay-ms=')) options.delayMs = positiveInteger(arg.split('=')[1], '--delay-ms');
    else throw new Error(`Opzione sconosciuta: ${arg}`);
  }
  return options;
}

function positiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} richiede un intero positivo.`);
  return parsed;
}

async function requiredInventory(filePath: string): Promise<SourceInventory> {
  const inventory = await readJsonIfExists<SourceInventory>(filePath);
  if (!inventory) throw new Error(`Inventario assente: eseguire prima npm run catalog:crawl (${filePath}).`);
  return inventory;
}

function printInventorySummary(inventory: SourceInventory): void {
  const missingImages = inventory.products.filter((product) => !product.assets.length).length;
  const withWarnings = inventory.products.filter((product) => product.warnings.length).length;
  console.log(
    `Risultato: ${inventory.products.length} prodotti validi, ${inventory.rejected.length} pagine scartate, ${missingImages} senza immagini, ${withWarnings} con avvisi.`,
  );
}

function printHelp(): void {
  console.log(`Comandi:
  npm run catalog:crawl -- --dry-run [--limit 10] [--concurrency 3] [--delay-ms 350]
  npm run catalog:crawl -- [--download-assets]
  npm run catalog:normalize
  npm run catalog:diff`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
