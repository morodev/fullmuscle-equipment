import { normalizeSourceSku } from './brand.js';
import type { SourceProduct } from './types.js';

/** Reviewed duplicate pages, retained in the raw inventory for provenance. */
export const SOURCE_RESOLUTIONS = [{
  sourceSku: 'GF-005',
  canonicalUrl: 'https://tzfit.com/fitness-equipment-strength-incline-chest-press-gf005/',
  aliasUrls: ['https://tzfit.com/strength-training-incline-chest-press-machine-gf005/'],
  reviewedAt: '2026-11-07',
  note: 'Both pages show the same incline chest press, 1985*1140*1135 mm and 104 kg. The April page supplies the clearer primary image and only the two relevant product views.',
}] as const;

export function sourceResolution(sourceSku: string) {
  return SOURCE_RESOLUTIONS.find((resolution) => resolution.sourceSku === normalizeSourceSku(sourceSku));
}

export function selectReviewedSource(products: SourceProduct[]): SourceProduct | undefined {
  const resolution = sourceResolution(products[0]?.sourceSku ?? '');
  if (!resolution) return products.length === 1 ? products[0] : undefined;
  const knownUrls: readonly string[] = [resolution.canonicalUrl, ...resolution.aliasUrls];
  if (products.some((product) => !knownUrls.includes(product.sourceUrl))) return undefined;
  const canonical = products.filter((product) => product.sourceUrl === resolution.canonicalUrl);
  return canonical.length === 1 ? canonical[0] : undefined;
}
