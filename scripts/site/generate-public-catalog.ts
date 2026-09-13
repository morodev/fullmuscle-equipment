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
  sourceReference?: { sourceSku?: string };
};

type SourceDocument = { products?: SourceProduct[] };
type InventoryProduct = { sourceSku?: string; sourceDescription?: string };
type InventoryDocument = { products?: InventoryProduct[] };

const workspace = process.cwd();
const sourcePath = resolve(workspace, 'data/catalog-drafts/products.json');
const inventoryPath = resolve(workspace, 'data/catalog-source/tzfit/inventory.json');
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
  const withPublicSku = String(value ?? '').replaceAll(sourceSku, publicSku);
  const sentences = withPublicSku
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence && !unsafeContent.test(sentence));
  return sentences.join(' ');
}

export async function generatePublicCatalog(): Promise<void> {
  const [document, inventory] = await Promise.all([
    readFile(sourcePath, 'utf8').then((value) => JSON.parse(value) as SourceDocument),
    readFile(inventoryPath, 'utf8').then((value) => JSON.parse(value) as InventoryDocument),
  ]);
  const inventoryBySku = new Map((inventory.products ?? []).map((product) => [cleanText(product.sourceSku).toUpperCase(), product]));
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
      .filter((asset) => asset.localPath && asset.role && asset.reviewStatus)
      .map((asset) => ({
        role: asset.role,
        reviewStatus: asset.reviewStatus,
        localPath: cleanText(asset.localPath),
      }));
    const descriptor = cleanText(product.localization?.en?.name || product.localization?.it?.name || '');
    const sourceProduct = inventoryBySku.get(sourceSku);
    const technicalDescription = cleanTechnicalDescription(sourceProduct?.sourceDescription, sourceSku, publicSku);

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

  if (products.length !== 744) {
    throw new Error(`Expected 744 unique public products, found ${products.length}.`);
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
