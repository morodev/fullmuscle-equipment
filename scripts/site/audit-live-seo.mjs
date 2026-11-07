import { load } from 'cheerio';

// Read-only: checks public responses and never submits forms or changes hosting settings.
const origin = 'https://fullmuscle-equipment.com';
const samples = [
  '/it/', '/en/', '/it/catalogo/', '/it/soluzioni/apertura-nuova-palestra/',
  '/it/soluzioni/rinnovo-palestra/', '/it/prodotti/tapis-roulant-professionale-fm-2000b/',
  '/it/showroom/', '/it/privacy/', '/it/richiesta/', '/it/conferma/',
];
const request = (url, options = {}) => fetch(url, { signal: AbortSignal.timeout(20_000), ...options });
const pages = await Promise.all(samples.map(async (path) => {
  const response = await request(new URL(path, origin));
  const html = await response.text();
  const $ = load(html);
  const structuredData = $('script[type="application/ld+json"]').map((_, element) => {
    try { return JSON.parse($(element).text()); } catch { return { invalidJson: true }; }
  }).get();
  let turnstileConfigured;
  if (path === '/it/richiesta/') {
    const props = $('astro-island[component-url*="QuoteForm"]').attr('props');
    try { turnstileConfigured = Boolean(JSON.parse(props ?? '{}').turnstileSiteKey?.[1]); } catch { turnstileConfigured = false; }
  }
  return {
    path, status: response.status, finalUrl: response.url,
    title: $('title').text(), canonical: $('link[rel="canonical"]').attr('href'),
    robots: $('meta[name="robots"]').attr('content'), xRobotsTag: response.headers.get('x-robots-tag'),
    alternates: $('link[rel="alternate"][hreflang]').map((_, element) => ({ language: $(element).attr('hreflang'), href: $(element).attr('href') })).get(),
    structuredData,
    ...(path === '/it/privacy/' ? { draftPrivacyNotice: html.includes('Il testo definitivo') } : {}),
    ...(turnstileConfigured !== undefined ? { turnstileConfigured } : {}),
  };
}));
const robotsResponse = await request(`${origin}/robots.txt`);
const robots = { status: robotsResponse.status, body: await robotsResponse.text() };
const sitemapResponse = await request(`${origin}/sitemap.xml`);
const $sitemap = load(await sitemapResponse.text(), { xml: true });
const locations = $sitemap('url > loc').map((_, element) => $sitemap(element).text()).get();
const sitemap = {
  status: sitemapResponse.status, urls: locations.length, uniqueUrls: new Set(locations).size,
  italianProducts: locations.filter((url) => url.includes('/it/prodotti/')).length,
  englishProducts: locations.filter((url) => url.includes('/en/products/')).length,
  offDomain: locations.filter((url) => !url.startsWith(`${origin}/`)),
  privatePages: locations.filter((url) => /\/(?:richiesta|quote-request|conferma|confirmation|privacy)\//.test(url)),
};
const redirects = await Promise.all([
  'http://fullmuscle-equipment.com/it/?seo-check=1',
  'https://www.fullmuscle-equipment.com/it/?seo-check=1',
].map(async (url) => {
  const response = await request(url, { redirect: 'manual' });
  await response.body?.cancel();
  return { url, status: response.status, location: response.headers.get('location') };
}));
const missingResponse = await request(`${origin}/it/__seo-audit-missing-page__/`);
await missingResponse.body?.cancel();
const blockers = [];
if (/^Disallow:\s*\/\s*$/m.test(robots.body)) blockers.push('robots.txt blocca la scansione');
if (pages.filter((page) => !/\/(?:privacy|richiesta|conferma)\//.test(page.path)).some((page) => page.robots?.includes('noindex'))) blockers.push('Pagine commerciali ancora in noindex');
if (pages.some((page) => page.draftPrivacyNotice)) blockers.push('Privacy ancora in bozza');
if (pages.some((page) => page.turnstileConfigured === false)) blockers.push('Chiave pubblica Turnstile non configurata nella pagina richiesta');
if (redirects.some((redirect) => redirect.status !== 301 || redirect.location !== `${origin}/it/?seo-check=1`)) blockers.push('Redirect canonici da completare');
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), origin, pages, robots, sitemap, redirects, missingPageStatus: missingResponse.status, blockers, accountChecks: 'Search Console, ricezione SMTP, segreto Turnstile e scansione Hostinger richiedono verifica negli account.' }, null, 2));
