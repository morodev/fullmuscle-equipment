import type { APIRoute } from 'astro';
import { CATEGORIES, FEATURED_TYPES, LINES, PRODUCTS, productsForCategory, productsForLine, productsForType, taxonomyUrl } from '../lib/catalog';
import { GUIDES } from '../lib/guides';
import { guideUrl, paginatedUrl, productUrl, route, SITE } from '../lib/site';
import { SOLUTIONS, solutionUrl, solutionsHubUrl } from '../lib/solutions';

export const prerender = true;
const pageSize = 24;

type Pair = { it: string; en: string; imageIt?: string; imageEn?: string; imageTitleIt?: string; imageTitleEn?: string };

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function absolute(path: string): string {
  return new URL(path, SITE.url).toString();
}

function entry(path: string, pair: Pair, locale: 'it' | 'en'): string {
  const image = locale === 'it' ? pair.imageIt : pair.imageEn;
  const imageTitle = locale === 'it' ? pair.imageTitleIt : pair.imageTitleEn;
  return `<url><loc>${escapeXml(absolute(path))}</loc><xhtml:link rel="alternate" hreflang="it-IT" href="${escapeXml(absolute(pair.it))}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeXml(absolute(pair.en))}"/>${image ? `<image:image><image:loc>${escapeXml(absolute(image))}</image:loc>${imageTitle ? `<image:title>${escapeXml(imageTitle)}</image:title>` : ''}</image:image>` : ''}</url>`;
}

function pagePairs(itBase: string, enBase: string, count: number): Pair[] {
  return Array.from({ length: Math.ceil(count / pageSize) }, (_, index) => ({
    it: paginatedUrl(itBase, 'it', index + 1),
    en: paginatedUrl(enBase, 'en', index + 1),
  }));
}

export const GET: APIRoute = () => {
  const it = route('it');
  const en = route('en');
  const pairs: Pair[] = [
    { it: it.home, en: en.home },
    ...pagePairs(it.catalog, en.catalog, PRODUCTS.length),
    { it: it.company, en: en.company },
    { it: it.contact, en: en.contact },
    { it: it.showroom, en: en.showroom },
    { it: `${it.guides}/`, en: `${en.guides}/` },
    ...GUIDES.map((guide) => ({ it: guideUrl('it', guide.slug.it), en: guideUrl('en', guide.slug.en) })),
    { it: solutionsHubUrl('it'), en: solutionsHubUrl('en'), imageIt: SOLUTIONS[0]!.image.src, imageEn: SOLUTIONS[0]!.image.src, imageTitleIt: SOLUTIONS[0]!.imageAlt.it, imageTitleEn: SOLUTIONS[0]!.imageAlt.en },
    ...SOLUTIONS.map((solution) => ({ it: solutionUrl('it', solution), en: solutionUrl('en', solution), imageIt: solution.image.src, imageEn: solution.image.src, imageTitleIt: solution.imageAlt.it, imageTitleEn: solution.imageAlt.en })),
    ...CATEGORIES.flatMap((category) => pagePairs(taxonomyUrl('it', category, 'category'), taxonomyUrl('en', category, 'category'), productsForCategory(category.id).length)),
    ...LINES.flatMap((line) => pagePairs(taxonomyUrl('it', line, 'line'), taxonomyUrl('en', line, 'line'), productsForLine(line.id).length)),
    ...FEATURED_TYPES.flatMap((type) => pagePairs(taxonomyUrl('it', type, 'type'), taxonomyUrl('en', type, 'type'), productsForType(type.id).length)),
    ...PRODUCTS.map((product) => ({ it: productUrl('it', product.slug.it), en: productUrl('en', product.slug.en), imageIt: product.primaryImage, imageEn: product.primaryImage, imageTitleIt: product.imageAlt.it, imageTitleEn: product.imageAlt.en })),
  ];
  const root = absolute('/');
  const rootEntry = `<url><loc>${escapeXml(root)}</loc><xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(root)}"/><xhtml:link rel="alternate" hreflang="it-IT" href="${escapeXml(absolute(it.home))}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeXml(absolute(en.home))}"/></url>`;
  const entries = pairs.flatMap((pair) => [entry(pair.it, pair, 'it'), entry(pair.en, pair, 'en')]);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${rootEntry}${entries.join('')}</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
