import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS, SOURCE } from './config.js';
import {
  categoryFromSitemapEntry,
  extractCatalogDocuments,
  extractListing,
  parseProductPage,
  parseSitemapEntries,
  parseSitemapReferences,
  rootCategories,
} from './html.js';
import { hash, PoliteHttpClient } from './http.js';
import { assertAllowedByRobots } from './robots.js';
import { toPublicSku } from './brand.js';
import type { SourceCategory, SourceInventory, SourceProduct } from './types.js';

export interface CrawlOptions {
  limit?: number;
  concurrency?: number;
  delayMs?: number;
  downloadAssets?: boolean;
  onProgress?: (message: string) => void;
}

interface DiscoveredProduct {
  url: string;
  taxonomyIds: Set<string>;
}

export async function crawlCatalog(options: CrawlOptions = {}): Promise<SourceInventory> {
  const progress = options.onProgress ?? (() => undefined);
  const client = new PoliteHttpClient({ delayMs: options.delayMs ?? 350 });
  const crawledAt = new Date().toISOString();

  progress('Controllo robots.txt e sitemap…');
  const robotsText = await client.text(SOURCE.robotsUrl);
  assertAllowedByRobots(
    robotsText,
    [SOURCE.sitemapIndexUrl, SOURCE.categorySitemapUrl, SOURCE.downloadPageUrl],
    SOURCE.userAgent,
  );

  const [sitemapIndex, categorySitemap, downloadPage] = await Promise.all([
    client.text(SOURCE.sitemapIndexUrl),
    client.text(SOURCE.categorySitemapUrl),
    client.text(SOURCE.downloadPageUrl).catch(() => ''),
  ]);

  const categoryEntries = parseSitemapEntries(categorySitemap);
  const categoryMap = new Map<string, SourceCategory>();
  for (const category of [
    ...rootCategories(),
    ...categoryEntries.map(categoryFromSitemapEntry).filter((item): item is SourceCategory => Boolean(item)),
  ]) {
    categoryMap.set(category.url, category);
  }
  const categories = [...categoryMap.values()].sort((a, b) => a.url.localeCompare(b.url));
  progress(`Trovate ${categories.length} categorie e serie da esplorare.`);

  const modificationDates = await loadModificationDates(client, sitemapIndex, robotsText, progress);
  const discovered = await discoverProducts(client, categories, robotsText, progress);
  const selected = [...discovered.values()]
    .sort((a, b) => a.url.localeCompare(b.url))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY);

  progress(`Trovate ${discovered.size} schede prodotto; ne elaboro ${selected.length}.`);
  const rejected: SourceInventory['rejected'] = [];
  const products = await concurrentMap(selected, options.concurrency ?? 3, async (item, index) => {
    try {
      assertAllowedByRobots(robotsText, [item.url], SOURCE.userAgent);
      const html = await client.text(item.url);
      const taxonomy = [...item.taxonomyIds]
        .map((id) => categories.find((category) => category.sourceId === id))
        .filter((category): category is SourceCategory => Boolean(category));
      const lastModified = modificationDates.get(item.url);
      const product = parseProductPage({
        url: item.url,
        html,
        taxonomy,
        ...(lastModified ? { lastModified } : {}),
        crawledAt,
      });
      if (!product.sourceSku || !product.sourceName) {
        rejected.push({ url: item.url, reasons: product.warnings });
        return undefined;
      }
      if ((index + 1) % 25 === 0 || index + 1 === selected.length) {
        progress(`Elaborate ${index + 1}/${selected.length} schede.`);
      }
      return product;
    } catch (error) {
      rejected.push({ url: item.url, reasons: [errorMessage(error)] });
      return undefined;
    }
  });

  const validProducts = products.filter((product): product is SourceProduct => Boolean(product));
  if (options.downloadAssets) {
    progress('Scarico gli asset del campione nella libreria locale…');
    await downloadProductAssets(client, validProducts, options.concurrency ?? 2, progress);
  }

  return {
    schemaVersion: 1,
    source: 'tzfit',
    baseUrl: SOURCE.baseUrl,
    crawledAt,
    robotsUrl: SOURCE.robotsUrl,
    robotsHash: hash(robotsText),
    categories,
    catalogDocuments: extractCatalogDocuments(downloadPage, SOURCE.downloadPageUrl),
    products: validProducts.sort((a, b) => a.sourceSku.localeCompare(b.sourceSku)),
    rejected: rejected.sort((a, b) => a.url.localeCompare(b.url)),
  };
}

async function loadModificationDates(
  client: PoliteHttpClient,
  sitemapIndex: string,
  robotsText: string,
  progress: (message: string) => void,
): Promise<Map<string, string>> {
  const sitemapUrls = parseSitemapReferences(sitemapIndex).filter((url) => /\/post-sitemap\d*\.xml(?:$|\?)/i.test(url));
  assertAllowedByRobots(robotsText, sitemapUrls, SOURCE.userAgent);
  const dates = new Map<string, string>();
  for (const sitemapUrl of sitemapUrls) {
    const xml = await client.text(sitemapUrl);
    for (const entry of parseSitemapEntries(xml)) {
      if (entry.lastModified) dates.set(normalizeUrl(entry.url), entry.lastModified);
    }
  }
  progress(`Indicizzate ${dates.size} date di modifica dalle sitemap pubbliche.`);
  return dates;
}

async function discoverProducts(
  client: PoliteHttpClient,
  categories: SourceCategory[],
  robotsText: string,
  progress: (message: string) => void,
): Promise<Map<string, DiscoveredProduct>> {
  const products = new Map<string, DiscoveredProduct>();
  let listingCount = 0;

  for (const category of categories) {
    let pageUrl: string | undefined = category.url;
    const visited = new Set<string>();
    while (pageUrl && !visited.has(pageUrl) && visited.size < 100) {
      assertAllowedByRobots(robotsText, [pageUrl], SOURCE.userAgent);
      visited.add(pageUrl);
      const html = await client.text(pageUrl);
      const listing = extractListing(html, pageUrl);
      for (const productUrl of listing.productUrls) {
        const normalized = normalizeUrl(productUrl);
        const product = products.get(normalized) ?? { url: normalized, taxonomyIds: new Set<string>() };
        product.taxonomyIds.add(category.sourceId);
        if (category.parentSourceId) product.taxonomyIds.add(category.parentSourceId);
        products.set(normalized, product);
      }
      pageUrl = listing.nextUrl;
      listingCount += 1;
      if (listingCount % 10 === 0) progress(`Esplorate ${listingCount} pagine elenco; ${products.size} prodotti unici.`);
    }
  }
  return products;
}

async function downloadProductAssets(
  client: PoliteHttpClient,
  products: SourceProduct[],
  concurrency: number,
  progress: (message: string) => void,
): Promise<void> {
  const jobs = products.flatMap((product) =>
    product.assets
      .filter((asset) => asset.reviewStatus !== 'blocked-branding')
      .map((asset, index) => ({ product, asset, index })),
  );
  await concurrentMap(jobs, Math.min(concurrency, 2), async ({ product, asset, index }, jobIndex) => {
    try {
      const { bytes, contentType } = await client.bytes(asset.sourceUrl);
      if (!contentType.startsWith('image/')) throw new Error(`Asset non immagine: ${asset.sourceUrl}`);
      if (bytes.byteLength > 25 * 1024 * 1024) throw new Error(`Asset oltre 25 MB: ${asset.sourceUrl}`);
      const extension = extensionFor(contentType, asset.sourceUrl);
      const directory = path.join(PATHS.assets, toPublicSku(product.sourceSku));
      const filename = `${String(index + 1).padStart(2, '0')}-${hash(bytes).slice(0, 12)}.${extension}`;
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), bytes);
      asset.localPath = path.relative(process.cwd(), path.join(directory, filename)).replaceAll('\\', '/');
    } catch (error) {
      asset.reviewStatus = 'missing';
      product.warnings.push(`asset-download-failed:${errorMessage(error)}`);
    }
    if ((jobIndex + 1) % 25 === 0 || jobIndex + 1 === jobs.length) {
      progress(`Scaricati ${jobIndex + 1}/${jobs.length} asset.`);
    }
  });
}

async function concurrentMap<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

function extensionFor(contentType: string, url: string): string {
  const known: Record<string, string> = {
    'image/avif': 'avif',
    'image/webp': 'webp',
    'image/png': 'png',
    'image/jpeg': 'jpg',
  };
  return known[contentType] ?? new URL(url).pathname.split('.').at(-1)?.toLowerCase() ?? 'bin';
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  if (!url.pathname.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) url.pathname += '/';
  return url.href;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
