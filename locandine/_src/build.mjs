import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(base, '..');
const root = path.resolve(output, '..');
const campaign = JSON.parse(await fs.readFile(path.join(base, 'campaign.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, campaign.catalog), 'utf8'));
const css = await fs.readFile(path.join(base, 'style.css'), 'utf8');
const brandPath = 'brochures/fullmuscle-g5/assets/brand/fullmuscle-wordmark-white.svg';
const logo = await fs.readFile(path.join(root, brandPath), 'utf8');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = cents => `${new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 2 }).format(cents / 100)} €`;
const pad = n => String(n).padStart(2, '0');
const expected = ['FM-GF-001', 'FM-GF-002', 'FM-GF-003', 'FM-GF-004', 'FM-GF-005'];
if (JSON.stringify(campaign.products.map(p => p.sku)) !== JSON.stringify(expected)) throw new Error('Expected the five GF models in order.');
if (catalog.pricing.currency !== 'EUR' || catalog.pricing.vatIncluded !== false) throw new Error('Review the VAT/currency before rebuilding.');
if (campaign.discountPercent !== 30) throw new Error('This campaign was approved with a 30% discount.');

const records = [];
for (const [i, entry] of campaign.products.entries()) {
  const matches = catalog.products.filter(p => p.sku === entry.sku);
  if (matches.length !== 1) throw new Error(`Expected one catalog entry: ${entry.sku}`);
  const product = matches[0];
  if (product.listPriceEur !== campaign.approvedListPriceEur) throw new Error(`List price changed: ${entry.sku}. Review the campaign before exporting.`);
  if (entry.titleLines.join(' ') !== product.name || !/^[a-z0-9-]+$/.test(entry.slug)) throw new Error(`Invalid title/slug: ${entry.sku}`);
  const bytes = await fs.readFile(path.join(root, product.brandedImage));
  const meta = await sharp(bytes).metadata();
  if (meta.width < 1000 || meta.height < 1000) throw new Error(`Image too small: ${entry.sku}`);
  const listCents = Math.round(product.listPriceEur * 100);
  const saleCents = Math.round(listCents * (100 - campaign.discountPercent) / 100);
  records.push({
    ...product, ...entry, listCents, saleCents, savingCents: listCents - saleCents,
    file: `${pad(i + 1)}-${product.sourceSku.toLowerCase()}-${entry.slug}.png`,
    asset: { path: product.brandedImage, sha256: hash(bytes), width: meta.width, height: meta.height },
  });
}

function story(p) {
  return `<article class="story" id="${p.sku}" aria-label="${esc(p.name)}, ${p.sourceSku}: sconto 30%, da ${money(p.listCents)} + IVA a ${money(p.saleCents)} + IVA.">
    <div class="edge" aria-hidden="true"></div>
    <header class="brand" data-block>
      <div class="logo" data-safe>${logo}</div>
      <p class="series" data-text><span>SERIE GF</span> · A DISCHI</p>
    </header>
    <div class="identity" data-block>
      <p class="model-code" data-text>${p.sourceSku}</p>
      <h1>${p.titleLines.map(line => `<span data-text>${esc(line)}</span>`).join('')}</h1>
    </div>
    <div class="discount" data-block>
      <strong data-text>−${campaign.discountPercent}%</strong>
      <span class="discount-label" data-text>SCONTO</span>
    </div>
    <figure class="product" data-block data-safe>
      <img src="../../${esc(p.brandedImage)}" alt="${esc(p.name)} ${p.sourceSku}, immagine illustrativa Full Muscle" data-sku="${p.sku}">
    </figure>
    <div class="price-panel" data-block>
      <div class="price-top">
        <p class="original" data-text>Da <del>${money(p.listCents)}</del> + IVA</p>
        <p class="saving" data-text>RISPARMI ${money(p.savingCents)}</p>
      </div>
      <p class="current"><strong class="amount" data-text>${money(p.saleCents)}</strong> <span class="vat" data-text>+ IVA</span></p>
    </div>
    <div class="contact" data-block>
      <p class="cta" data-text>${esc(campaign.cta)}</p>
      <div class="contact-bottom"><p class="handle" data-text>${esc(campaign.instagram)}</p><span class="contact-line" aria-hidden="true"></span><span class="contact-arrow" aria-hidden="true">↗</span></div>
    </div>
    <p class="disclosure" data-block data-text>${esc(campaign.disclosure)}</p>
  </article>`;
}

await fs.writeFile(path.join(base, 'preview.html'), `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(campaign.title)}</title><style>${css}</style></head><body><main>${records.map(story).join('\n')}</main></body></html>\n`);

const checks = [];
const browserErrors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 2040 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => browserErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(pathToFileURL(path.join(base, 'preview.html')).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode()));
  });
  for (const product of records) {
    const locator = page.locator(`#${product.sku}`);
    const layout = await locator.evaluate(el => {
      const issues = [];
      const bounds = el.getBoundingClientRect();
      const safe = { left: bounds.left + 64, right: bounds.right - 64, top: bounds.top + 250, bottom: bounds.bottom - 300 };
      for (const node of el.querySelectorAll('[data-text], [data-safe]')) {
        let rect = node.getBoundingClientRect();
        if (node.hasAttribute('data-text')) {
          const range = document.createRange();
          range.selectNodeContents(node);
          rect = range.getBoundingClientRect();
          const container = node.closest('[data-block]').getBoundingClientRect();
          if (rect.left < container.left - 1 || rect.right > container.right + 1 || rect.top < container.top - 1 || rect.bottom > container.bottom + 1) issues.push(`Content overflow: ${node.textContent}`);
          if (node.scrollWidth > node.clientWidth + 2) issues.push(`Horizontal overflow: ${node.textContent}`);
        }
        if (rect.left < safe.left - 1 || rect.right > safe.right + 1 || rect.top < safe.top - 1 || rect.bottom > safe.bottom + 1) issues.push(`Outside safe area: ${node.textContent.trim().slice(0, 70)}`);
      }
      const blocks = [...el.querySelectorAll('[data-block]')].map(node => ({ name: node.className, rect: node.getBoundingClientRect() }));
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const a = blocks[i].rect, b = blocks[j].rect;
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) issues.push(`Overlap: ${blocks[i].name} / ${blocks[j].name}`);
        }
      }
      const img = el.querySelector('.product img');
      if (!img.complete || !img.naturalWidth || getComputedStyle(img).objectFit !== 'contain') issues.push('Product image missing or cropped.');
      const fontsLoaded = ['700 94px FMDisplay', '700 35px FM', '23px FM'].every(font => document.fonts.check(font));
      if (!fontsLoaded) issues.push('Font not loaded.');
      return {
        issues, fontsLoaded, imageFit: getComputedStyle(img).objectFit,
        safeArea: { left: 64, right: 1016, top: 250, bottom: 1620 },
        displayed: {
          model: el.querySelector('.model-code').textContent,
          listPrice: el.querySelector('.original').textContent,
          salePrice: el.querySelector('.current').textContent,
          discount: el.querySelector('.discount strong').textContent,
        },
      };
    });
    if (layout.displayed.model !== product.sourceSku || layout.displayed.listPrice !== `Da ${money(product.listCents)} + IVA` || layout.displayed.salePrice !== `${money(product.saleCents)} + IVA` || layout.displayed.discount !== '−30%') layout.issues.push('Displayed product or prices mismatch.');
    const target = path.join(output, product.file);
    await locator.screenshot({ path: target, type: 'png', animations: 'disabled' });
    const bytes = await fs.readFile(target);
    const meta = await sharp(bytes).metadata();
    if (meta.width !== 1080 || meta.height !== 1920 || meta.format !== 'png') layout.issues.push('Invalid export dimensions/format.');
    checks.push({ sku: product.sku, file: product.file, listCents: product.listCents, saleCents: product.saleCents, ...layout, width: meta.width, height: meta.height, sha256: hash(bytes) });
    console.log(`Rendered ${product.file}`);
  }
} finally {
  await browser.close();
}

const issues = [...browserErrors, ...checks.flatMap(check => check.issues.map(issue => `${check.sku}: ${issue}`))];
const inputPaths = ['locandine/_src/campaign.json', 'locandine/_src/style.css', 'locandine/_src/build.mjs', campaign.catalog, brandPath,
  ...['regular', 'bold', 'display'].map(name => `brochures/fullmuscle-g5/assets/fonts/${name}.ttf`)];
const inputs = Object.fromEntries(await Promise.all(inputPaths.map(async file => [file, hash(await fs.readFile(path.join(root, file)))])));
await fs.writeFile(path.join(base, 'preflight.json'), JSON.stringify({ generatedAt: new Date().toISOString(), status: issues.length ? 'failed' : 'passed', stories: checks.length, issues, inputs, assets: records.map(p => ({ sku: p.sku, ...p.asset })), checks }, null, 2) + '\n');
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  const tiles = await Promise.all(records.map(p => sharp(path.join(output, p.file)).resize(360, 640).png().toBuffer()));
  await sharp({ create: { width: 1880, height: 688, channels: 3, background: '#25352a' } })
    .composite(tiles.map((input, i) => ({ input, left: 24 + i * 368, top: 24 })))
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toFile(path.join(output, 'anteprima.jpg'));
  console.log('PASS: 5 stories at 1080 x 1920; prices, images, fonts and safe areas verified.');
}
