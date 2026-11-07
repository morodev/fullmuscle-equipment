import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { extractListing } from '../../../scripts/catalog/html.js';
import { PoliteHttpClient } from '../../../scripts/catalog/http.js';
import { assertAllowedByRobots } from '../../../scripts/catalog/robots.js';
import { SOURCE } from '../../../scripts/catalog/config.js';

// Read-only census: category pages only, never updates the site's source inventory.
const contentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(contentDir, '../../..');
const client = new PoliteHttpClient({delayMs:1000,retries:1,timeoutMs:20000});
const robots = await client.text(SOURCE.robotsUrl);
const pages: Array<{url:string;sha256:string;productUrls:string[];nextUrl?:string}> = [];
const urls = new Set<string>();
let next: string | undefined = 'https://tzfit.com/category/pin-loaded-machine/g5-series-pin-loaded-machine/';
while (next) {
  if (pages.length >= 20 || pages.some(page => page.url === next)) throw new Error('Paginazione inattesa: controllo interrotto.');
  if (!next.startsWith('https://tzfit.com/') || !new URL(next).pathname.includes('g5-series-pin-loaded-machine')) throw new Error('Pagina fuori ambito G5.');
  assertAllowedByRobots(robots,[next],SOURCE.userAgent);
  const html = await client.text(next);
  const listing = extractListing(html,next);
  pages.push({url:next,sha256:createHash('sha256').update(html).digest('hex'),...listing});
  for (const url of listing.productUrls) urls.add(url);
  console.log(`Pagina ${pages.length}: ${listing.productUrls.length} URL prodotto; totale ${urls.size}`);
  next = listing.nextUrl;
}
const inventory = JSON.parse(await readFile(resolve(root,'data/catalog-source/tzfit/inventory.json'),'utf8'));
const baseline = inventory.products.filter((p:any) => p.sourceSeriesIds.includes('g5-series-pin-loaded-machine'));
const missingFromLive = baseline.filter((p:any) => !urls.has(p.sourceUrl)).map((p:any) => ({sourceSku:p.sourceSku,url:p.sourceUrl}));
const addedToLive = [...urls].filter(url => !baseline.some((p:any) => p.sourceUrl === url));
const result = {
  checkedAt:new Date().toISOString(),method:'Live HTTPS GET, sole pagine categoria e paginazione; intervallo minimo 1000 ms',
  discovery:{homepage:'https://tzfit.com/',currentCategory:'https://tzfit.com/category/pin-loaded-machine/g5-series-pin-loaded-machine/',previousPathsReturning404:['https://tzfit.com/g5-series-pin-loaded-machine/','https://tzfit.com/pin-loaded-machine/g5-series-pin-loaded-machine/']},
  robots:{url:SOURCE.robotsUrl,text:robots,sha256:createHash('sha256').update(robots).digest('hex'),categoryAllowed:true},
  completePagination:true,pages,baselineCount:baseline.length,liveUrlCount:urls.size,missingFromLive,addedToLive,
};
await writeFile(resolve(contentDir,'live-category-census.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({baselineCount:baseline.length,liveUrlCount:urls.size,pages:pages.length,missingFromLive,addedToLive},null,2));
