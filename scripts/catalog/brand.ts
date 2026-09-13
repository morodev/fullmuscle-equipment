const SOURCE_BRAND_PATTERN = /\btz\s*[-_]?\s*fit\b|\btzfit\b/gi;

export function normalizeSourceSku(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
}

export function toPublicSku(sourceSku: string): string {
  const normalized = normalizeSourceSku(sourceSku);
  if (!normalized) throw new Error('Lo SKU sorgente è vuoto.');
  if (normalized === 'TZ') return 'FM';
  if (normalized.startsWith('TZ-')) return `FM-${normalized.slice(3)}`;
  if (normalized === 'FM' || normalized.startsWith('FM-')) return normalized;
  return `FM-${normalized}`;
}

export function toPublicSeriesName(sourceName: string): string {
  const cleaned = sourceName.trim().replace(/^TZ(?=[-_\s])/i, 'FM');
  return /^FM(?=[-_\s])/i.test(cleaned) ? cleaned : `FM ${cleaned}`;
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function containsSourceBrand(value: unknown): boolean {
  SOURCE_BRAND_PATTERN.lastIndex = 0;
  return SOURCE_BRAND_PATTERN.test(JSON.stringify(value));
}

export function assertNoPublicSkuCollisions(sourceSkus: string[]): void {
  const owners = new Map<string, string>();
  for (const sourceSku of sourceSkus) {
    const publicSku = toPublicSku(sourceSku);
    const currentOwner = owners.get(publicSku);
    if (currentOwner && normalizeSourceSku(currentOwner) !== normalizeSourceSku(sourceSku)) {
      throw new Error(`Collisione SKU pubblico ${publicSku}: ${currentOwner} e ${sourceSku}`);
    }
    owners.set(publicSku, sourceSku);
  }
}

export function stripSourceBrand(value: string): string {
  SOURCE_BRAND_PATTERN.lastIndex = 0;
  return value.replace(SOURCE_BRAND_PATTERN, 'FullMuscle').replace(/\s{2,}/g, ' ').trim();
}

export function toPublicText(value: string): string {
  return stripSourceBrand(value)
    .replace(/\bTZ[-_\s]+(?=[A-Z0-9])/gi, 'FM-')
    .replace(/\bTZ(?=\d)/gi, 'FM-');
}
