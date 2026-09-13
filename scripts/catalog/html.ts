import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { PRODUCT_ROOT_SLUGS, SOURCE } from './config.js';
import { hash } from './http.js';
import { slugify, toPublicSeriesName } from './brand.js';
import type { CatalogDocument, SourceAsset, SourceCategory, SourceProduct } from './types.js';

interface SitemapEntry {
  url: string;
  lastModified?: string;
}

interface ParsedProductInput {
  url: string;
  html: string;
  taxonomy: SourceCategory[];
  lastModified?: string;
  crawledAt: string;
}

export function parseSitemapEntries(xml: string): SitemapEntry[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  return $('url')
    .map((_, element) => {
      const url = cleanText($(element).find('loc').first().text());
      const lastModified = cleanText($(element).find('lastmod').first().text());
      return url ? { url, ...(lastModified ? { lastModified } : {}) } : undefined;
    })
    .get()
    .filter((entry): entry is SitemapEntry => Boolean(entry));
}

export function parseSitemapReferences(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  return $('sitemap > loc')
    .map((_, element) => cleanText($(element).text()))
    .get()
    .filter(Boolean);
}

export function categoryFromSitemapEntry(entry: SitemapEntry): SourceCategory | undefined {
  const url = new URL(entry.url);
  const segments = url.pathname.split('/').filter(Boolean);
  if (!segments.length || !PRODUCT_ROOT_SLUGS.has(segments[0]!)) return undefined;

  const sourceId = segments.at(-1)!;
  const kind = segments.length > 1 ? 'series' : 'category';
  const sourceName = humanizeSlug(sourceId);
  const publicName = kind === 'series' ? toPublicSeriesName(sourceName) : sourceName;
  const parentSourceId = kind === 'series' ? segments[0] : undefined;

  return {
    url: normalizeUrl(entry.url),
    sourceId,
    sourceName,
    publicId: slugify(publicName),
    publicName,
    kind,
    ...(parentSourceId ? { parentSourceId } : {}),
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
  };
}

export function rootCategories(): SourceCategory[] {
  return [...PRODUCT_ROOT_SLUGS].map((slug) => ({
    url: `${SOURCE.baseUrl}/${slug}/`,
    sourceId: slug,
    sourceName: humanizeSlug(slug),
    publicId: slug,
    publicName: humanizeSlug(slug),
    kind: 'category',
  }));
}

export function extractListing(html: string, pageUrl: string): { productUrls: string[]; nextUrl?: string } {
  const $ = cheerio.load(html);
  const productUrls = new Set<string>();
  const selectors = [
    '.uael-post-wrapper a[href]',
    '.elementor-post a[href]',
    'article.post a[href]',
    'article.type-post a[href]',
  ];

  $(selectors.join(',')).each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    const candidate = toSourceUrl(href, pageUrl);
    if (candidate && isLikelyProductUrl(candidate)) productUrls.add(candidate);
  });

  const nextHref = $('a.next.page-numbers, a[rel="next"]').first().attr('href');
  const nextUrl = nextHref ? toSourceUrl(nextHref, pageUrl) : undefined;
  return { productUrls: [...productUrls], ...(nextUrl ? { nextUrl } : {}) };
}

export function extractCatalogDocuments(html: string, pageUrl: string): CatalogDocument[] {
  const $ = cheerio.load(html);
  const documents = new Map<string, CatalogDocument>();
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const url = href ? toSourceUrl(href, pageUrl) : undefined;
    if (!url || !/\.pdf(?:$|\?)/i.test(url)) return;
    const title = cleanText($(element).text()) || decodeURIComponent(new URL(url).pathname.split('/').at(-1) ?? 'Catalogo');
    documents.set(url, { title, url, kind: 'pdf' });
  });
  return [...documents.values()].sort((a, b) => a.url.localeCompare(b.url));
}

export function parseProductPage(input: ParsedProductInput): SourceProduct {
  const $ = cheerio.load(input.html);
  $('script, style, noscript, nav, footer, header, form').remove();

  const metaTitle = cleanText($('meta[property="og:title"]').attr('content') ?? $('title').text());
  const main = $('main').first().length ? $('main').first() : $('body');
  removeNonProductSections($, main);
  const mainText = cleanText(main.text());
  const skuEvidence = extractSku($, main, mainText, metaTitle, input.url);
  const sourceSku = skuEvidence.value;
  const sourceName = extractName($, metaTitle, sourceSku);
  const sourceDescription = extractDescription($, main, sourceName);
  const { specifications, features } = extractTechnicalContent($, main);
  const assets = extractAssets($, main, input.url, sourceSku);
  const warnings: string[] = [];
  if (!sourceSku) warnings.push('missing-source-sku');
  if (!sourceName) warnings.push('missing-source-name');
  if (!sourceDescription) warnings.push('missing-source-description');
  if (!Object.keys(specifications).length) warnings.push('missing-specifications');
  if (!assets.length) warnings.push('missing-images');
  if (skuEvidence.alternative && skuEvidence.alternative !== sourceSku) {
    warnings.push(`sku-conflict:title-or-url=${skuEvidence.alternative}`);
  }

  const sourceCategoryIds = unique(
    input.taxonomy.filter((item) => item.kind === 'category').map((item) => item.sourceId),
  );
  const sourceSeriesIds = unique(input.taxonomy.filter((item) => item.kind === 'series').map((item) => item.sourceId));
  const canonical = normalizeUrl($('link[rel="canonical"]').attr('href') || input.url);
  const contentHash = hash(
    JSON.stringify({
      sourceSku,
      sourceName,
      sourceDescription,
      features,
      specifications,
      sourceCategoryIds,
      sourceSeriesIds,
      assets: assets.map((asset) => asset.sourceUrl),
    }),
  );

  return {
    supplier: 'tzfit',
    sourceUrl: canonical,
    sourceSlug: new URL(canonical).pathname.split('/').filter(Boolean).at(-1) ?? '',
    sourceSku,
    sourceName,
    sourceDescription,
    sourceFeatures: features,
    specifications,
    sourceCategoryIds,
    sourceSeriesIds,
    assets,
    ...(input.lastModified ? { lastModified: input.lastModified } : {}),
    crawledAt: input.crawledAt,
    contentHash,
    warnings,
  };
}

function extractSku(
  $: cheerio.CheerioAPI,
  main: cheerio.Cheerio<AnyNode>,
  mainText: string,
  metaTitle: string,
  pageUrl: string,
): { value: string; alternative?: string } {
  const labelledElements: string[] = [];
  main.find('li, p, h2, h3, h4, h5, h6').each((_, element) => {
    labelledElements.push(...textLines($(element)));
  });
  const labelled = labelledElements
    .map((text) => skuAfterLabel(text))
    .find(Boolean)
    ?? skuAfterLabel(mainText);
  const headings = main.find('h1, h2, h3, h4').map((_, element) => cleanText($(element).text())).get().join(' ');
  const combined = `${metaTitle} ${headings} ${decodeURIComponent(new URL(pageUrl).pathname)}`;
  const coded = combined.match(/\b([A-Z]{1,5}(?:-[A-Z]{1,5})?[-_]?\d[A-Z0-9]*(?:-[A-Z0-9]+)*)\b/i)?.[1];
  const labelledSku = labelled ? cleanSkuCandidate(labelled) : '';
  const fallbackSku = coded ? cleanSkuCandidate(coded) : '';
  if (isValidSourceSku(labelledSku)) {
    return { value: labelledSku, ...(isValidSourceSku(fallbackSku) && fallbackSku !== labelledSku ? { alternative: fallbackSku } : {}) };
  }
  return { value: isValidSourceSku(fallbackSku) ? fallbackSku : '' };
}

function skuAfterLabel(value: string): string | undefined {
  const remainder = value.match(/^(?:item\s*(?:no\.?|number)|model|sku)\s*[:：#]?\s*(.+)$/i)?.[1]?.trim();
  if (!remainder) return undefined;
  return remainder.match(/^([A-Z]{1,5}(?:-[A-Z]{1,5})?[-_]?\d[A-Z0-9]*(?:-[A-Z0-9]+)*)/)?.[1];
}

function cleanSkuCandidate(value: string): string {
  return value
    .trim()
    .split(/\s{2,}|\n|\r|\||,/)[0]!
    .replace(/[.:;]+$/g, '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function isValidSourceSku(value: string): boolean {
  return value.length >= 2 && value.length <= 30 && /[A-Z]/.test(value) && /\d/.test(value) && /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value);
}

function extractName($: cheerio.CheerioAPI, metaTitle: string, sourceSku: string): string {
  const candidates = [
    $('main h1').first().text(),
    $('main h2').first().text(),
    $('h1.entry-title').first().text(),
    metaTitle.replace(/\s*[-|]\s*TZFIT.*$/i, ''),
  ]
    .map(cleanText)
    .map((candidate) => cleanText(candidate.replace(new RegExp(escapeRegExp(sourceSku), 'ig'), '').replace(/^[\s:–—|-]+|[\s:–—|-]+$/g, '')))
    .filter((candidate) => candidate.length > 3 && !/^(?:products?|specs?|specifications?|features?)$/i.test(candidate));
  return candidates[0] ?? '';
}

function extractDescription(
  $: cheerio.CheerioAPI,
    main: cheerio.Cheerio<AnyNode>,
  sourceName: string,
): string {
  const paragraphs = main
    .find('.elementor-widget-text-editor p, .entry-content p, p')
    .map((_, element) => cleanText($(element).text()))
    .get()
    .filter((text) => text.length >= 60)
    .filter((text) => !/cookie|copyright|subscribe|contact us|related products/i.test(text));
  const pageDescription = cleanText($('meta[name="description"]').attr('content') ?? '');
  return paragraphs.find((text) => !sourceName || !text.toLowerCase().startsWith(sourceName.toLowerCase()))
    ?? paragraphs[0]
    ?? (pageDescription.length >= 30 ? pageDescription : '');
}

function extractTechnicalContent(
  $: cheerio.CheerioAPI,
  main: cheerio.Cheerio<AnyNode>,
): { specifications: Record<string, string>; features: string[] } {
  const specifications: Record<string, string> = {};
  const features: string[] = [];

  const specificationHeadings = main
    .find('h2, h3, h4, h5, h6')
    .filter((_, heading) => /^(?:specs?|specifications?)$/i.test(cleanText($(heading).text())));
  const specificationScopes = specificationHeadings.length
    ? specificationHeadings.toArray().flatMap((heading) => contentAfterHeading($, $(heading)))
    : [main];
  for (const scope of specificationScopes) {
    for (const text of linesFromScope($, scope)) {
      if (!text || text.length > 400) continue;
      const match = text.match(/^([^:：]{2,60})\s*[:：]\s*(.{1,250})$/);
      if (!match) continue;
      const key = cleanText(match[1]!);
      const value = cleanText(match[2]!);
      if (/^(?:item\s*(?:no\.?|number)|sku|name)$/i.test(key)) continue;
      if (!specifications[key]) specifications[key] = value;
    }
  }

  main.find('h2, h3, h4, h5, h6').each((_, heading) => {
    if (!/^features?$/i.test(cleanText($(heading).text()))) return;
    for (const scope of contentAfterHeading($, $(heading))) {
      for (const line of linesFromScope($, scope)) {
        const value = cleanText(line.replace(/^\d+[.)]\s*/, ''));
        if (value && value.length >= 8 && value.length <= 400 && !features.includes(value)) features.push(value);
      }
    }
  });

  return { specifications, features: unique(features) };
}

function extractAssets(
  $: cheerio.CheerioAPI,
  main: cheerio.Cheerio<AnyNode>,
  pageUrl: string,
  sourceSku: string,
): SourceAsset[] {
  const found = new Map<string, { alt: string; score: number }>();
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) addImage(found, ogImage, '', pageUrl, 100);

  main.find('img').each((_, element) => {
    const image = $(element);
    const alt = cleanText(image.attr('alt') ?? '');
    const candidates = [
      largestSrcsetUrl(image.attr('srcset')),
      largestSrcsetUrl(image.attr('data-srcset')),
      image.attr('data-lazy-src'),
      image.attr('data-src'),
      image.attr('src'),
    ];
    for (const candidate of candidates) {
      if (candidate) addImage(found, candidate, alt, pageUrl, alt.toUpperCase().includes(sourceSku) ? 80 : 30);
    }
  });

  main.find('[style*="background-image"]').each((_, element) => {
    const style = $(element).attr('style') ?? '';
    const candidate = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i)?.[1];
    if (candidate) addImage(found, candidate, cleanText($(element).attr('aria-label') ?? ''), pageUrl, 50);
  });

  const sorted = [...found.entries()].sort((a, b) => b[1].score - a[1].score);
  return sorted.map(([sourceUrl, details], index) => {
    const path = new URL(sourceUrl).pathname.toLowerCase();
    const blocked = /(?:logo|watermark|tzfit-logo)/i.test(`${path} ${details.alt}`);
    return {
      sourceUrl,
      alt: details.alt,
      role: index === 0 ? 'primary' : 'gallery',
      reviewStatus: blocked ? 'blocked-branding' : 'pending-review',
    };
  });
}

function addImage(
  found: Map<string, { alt: string; score: number }>,
  candidate: string,
  alt: string,
  pageUrl: string,
  score: number,
): void {
  const url = toSourceUrl(candidate, pageUrl);
  if (!url || !/\.(?:avif|webp|png|jpe?g)(?:$|\?)/i.test(url)) return;
  if (/logo|avatar|icon|flag|placeholder|payment/i.test(new URL(url).pathname)) return;
  const normalized = withoutImageSize(url);
  const previous = found.get(normalized);
  if (!previous || previous.score < score) found.set(normalized, { alt, score });
}

function largestSrcsetUrl(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  return srcset
    .split(',')
    .map((part) => {
      const [url, descriptor] = part.trim().split(/\s+/);
      const width = Number.parseInt(descriptor ?? '0', 10) || 0;
      return { url, width };
    })
    .filter((item): item is { url: string; width: number } => Boolean(item.url))
    .sort((a, b) => b.width - a.width)[0]?.url;
}

function withoutImageSize(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = parsed.pathname.replace(/-\d+x\d+(?=\.(?:avif|webp|png|jpe?g)$)/i, '');
  parsed.search = '';
  return parsed.href;
}

function isLikelyProductUrl(value: string): boolean {
  const url = new URL(value);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return false;
  const slug = segments[0]!;
  if (PRODUCT_ROOT_SLUGS.has(slug)) return false;
  return !['about-us', 'contact-us', 'download', 'blog', 'client-case', 'product'].includes(slug);
}

function toSourceUrl(value: string, baseUrl: string): string | undefined {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'https:' || url.hostname !== new URL(SOURCE.baseUrl).hostname) return undefined;
    url.hash = '';
    return normalizeUrl(url.href);
  } catch {
    return undefined;
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  if (!url.pathname.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) url.pathname += '/';
  return url.href;
}

function humanizeSlug(value: string): string {
  return value
    .replace(/-(?:pin|plate)-loaded-machine$/i, '')
    .split('-')
    .map((word) => (/^(?:tz|fm|gs|gm|gt|gb|gf|mp|g\d|x\d+|n\d+|\d+x?p)$/i.test(word) ? word.toUpperCase() : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`))
    .join(' ');
}

function removeNonProductSections($: cheerio.CheerioAPI, main: cheerio.Cheerio<AnyNode>): void {
  main.find('.related.products, .uael-posts, .elementor-widget-uael-posts').remove();
  main.find('h2, h3, h4, h5, h6').each((_, heading) => {
    if (!/^related products$/i.test(cleanText($(heading).text()))) return;
    const widget = $(heading).closest('.elementor-element');
    if (widget.length) {
      widget.nextAll().remove();
      widget.remove();
    }
  });
}

function textLines(element: cheerio.Cheerio<AnyNode>): string[] {
  const html = element.html();
  if (!html) return [cleanText(element.text())].filter(Boolean);
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|div)>/gi, '\n');
  const fragment = cheerio.load(`<div>${withBreaks}</div>`);
  return fragment('div').first().text().split(/\r?\n/).map(cleanText).filter(Boolean);
}

function contentAfterHeading(
  $: cheerio.CheerioAPI,
  heading: cheerio.Cheerio<AnyNode>,
): Array<cheerio.Cheerio<AnyNode>> {
  const local = heading.nextUntil('h1, h2, h3, h4, h5, h6');
  if (local.length) return local.toArray().map((node) => $(node));

  const widget = heading.closest('.elementor-element');
  let cursor = (widget.length ? widget : heading.parent()).next();
  const scopes: Array<cheerio.Cheerio<AnyNode>> = [];
  let steps = 0;
  while (cursor.length && steps < 5) {
    if (cursor.find('h1, h2, h3, h4, h5, h6').length) break;
    scopes.push(cursor);
    cursor = cursor.next();
    steps += 1;
  }
  return scopes;
}

function linesFromScope($: cheerio.CheerioAPI, scope: cheerio.Cheerio<AnyNode>): string[] {
  const elements = scope.is('li, p') ? scope : scope.find('li, p');
  if (!elements.length) return textLines(scope);
  const lines: string[] = [];
  elements.each((_, element) => {
    lines.push(...textLines($(element)));
  });
  return lines;
}

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
