import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type SourceAsset = {
  role?: string;
  reviewStatus?: string;
  localPath?: string;
};

type SourceProduct = {
  publicSku?: string;
  categoryId?: string;
  lineId?: string;
  specifications?: Record<string, unknown>;
  assets?: SourceAsset[];
  localization?: { it?: { name?: string }; en?: { name?: string } };
  sourceReference?: { sourceSku?: string; sourceUrl?: string };
};

type SourceDocument = { products?: SourceProduct[] };
type InventoryProduct = { sourceSku?: string; sourceUrl?: string; sourceDescription?: string };
type InventoryDocument = { products?: InventoryProduct[] };
type AssetManifestItem = { stagedPath?: string; width?: number; height?: number };
type AssetManifest = { items?: AssetManifestItem[] };

const workspace = process.cwd();
const sourcePath = resolve(workspace, 'data/catalog-drafts/products.json');
const inventoryPath = resolve(workspace, 'data/catalog-source/tzfit/inventory.json');
const assetManifestPath = resolve(workspace, 'data/catalog-assets/manifest.json');
const editorialPath = resolve(workspace, 'data/catalog-editorial/descriptions.json');
const outputPath = resolve(workspace, 'data/catalog-public/products.json');
const unsafeContent = /tz\s*[-_]?\s*fit|tzfit|tianzh|factory|manufacturer|oem|odm|warranty|guarantee|certificat|patent|brand|logo|customer|production line/i;
const supplierReference = /\b(?:tz\s*fitness|tzfit|tianzh\w*)\b|\bTZ[-\s]?[A-Z0-9-]+\b/gi;
const supplierReferenceCheck = /\b(?:tz\s*fitness|tzfit|tianzh\w*)\b|\bTZ[-\s]?[A-Z0-9-]+\b/i;

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(supplierReference, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTechnicalDescription(value: unknown, sourceSku: string, publicSku: string): string {
  const sourceText = String(value ?? '');
  const withPublicSku = sourceSku ? sourceText.replaceAll(sourceSku, publicSku) : sourceText;
  const sentences = withPublicSku
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence && !unsafeContent.test(sentence));
  return sentences.join(' ');
}

export async function generatePublicCatalog(): Promise<void> {
  const [document, inventory, assetManifest, editorial] = await Promise.all([
    readFile(sourcePath, 'utf8').then((value) => JSON.parse(value) as SourceDocument),
    readFile(inventoryPath, 'utf8').then((value) => JSON.parse(value) as InventoryDocument),
    readFile(assetManifestPath, 'utf8').then((value) => JSON.parse(value) as AssetManifest),
    readFile(editorialPath, 'utf8').then((value) => JSON.parse(value) as Record<string, { technicalDescription: string }>),
  ]);
  const inventoryBySource = new Map((inventory.products ?? []).map((product) => [`${cleanText(product.sourceSku).toUpperCase()}\u0000${product.sourceUrl}`, product]));
  const dimensionsByPath = new Map((assetManifest.items ?? []).filter((item) => item.stagedPath).map((item) => [cleanText(item.stagedPath).replaceAll('\\', '/'), { width: item.width ?? 900, height: item.height ?? 900 }]));
  const products = (document.products ?? []).map((product) => {
    const publicSku = cleanText(product.publicSku).toUpperCase();
    const categoryId = cleanText(product.categoryId);
    const sourceSku = cleanText(product.sourceReference?.sourceSku).toUpperCase();
    if (!publicSku || !categoryId) throw new Error('Catalog draft contains a product without publicSku or categoryId.');

    const specifications = Object.fromEntries(
      Object.entries(product.specifications ?? {})
        .filter(([label, value]) => !unsafeContent.test(`${label} ${String(value ?? '')}`))
        .map(([label, value]) => [cleanText(label), cleanText(value)])
        .filter(([label, value]) => label && value && value.length <= 180),
    );
    const assets = (product.assets ?? [])
      .filter((asset) => asset.localPath && asset.role && ['approved', 'approved-provisional', 'approved-oem'].includes(asset.reviewStatus ?? ''))
      .map((asset) => {
        const localPath = cleanText(asset.localPath).replaceAll('\\', '/');
        const dimensions = dimensionsByPath.get(localPath) ?? { width: 900, height: 900 };
        return { role: asset.role, reviewStatus: asset.reviewStatus, localPath, ...dimensions };
      });
    const descriptor = cleanText(product.localization?.en?.name || product.localization?.it?.name || '');
    const sourceProduct = inventoryBySource.get(`${sourceSku}\u0000${product.sourceReference?.sourceUrl}`);
    if (!sourceProduct) throw new Error(`Catalog source missing for ${publicSku}: the reviewed source URL must match the inventory.`);
    const technicalDescription = cleanTechnicalDescription(editorial[publicSku]?.technicalDescription ?? sourceProduct?.sourceDescription, sourceSku, publicSku);

    return {
      publicSku,
      categoryId,
      ...(product.lineId ? { lineId: cleanText(product.lineId) } : {}),
      descriptor,
      technicalDescription,
      specifications,
      assets,
    };
  });

  if (products.length !== 745 || new Set(products.map((product) => product.publicSku)).size !== 745) {
    throw new Error(`Expected 745 unique public products, found ${products.length}.`);
  }
  const serialized = `${JSON.stringify({ schemaVersion: 2, products }, null, 2)}\n`;
  if (supplierReferenceCheck.test(serialized) || /https?:\/\//i.test(serialized)) {
    throw new Error('The generated public catalog still contains a supplier reference or remote URL.');
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, 'utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await generatePublicCatalog();
}
