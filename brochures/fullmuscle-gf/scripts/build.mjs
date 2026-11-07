import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { validateCatalog, priceLabel, retailCsv, sha256, expectedScenes, sceneAssetIssues, sceneUsageIssues } from './validation.mjs';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(base, '../..');
const g5 = path.join(root, 'brochures/fullmuscle-g5');
const read = relative => fs.readFile(path.join(base, relative));
const catalog = JSON.parse(await read('content/catalog.json'));
validateCatalog(catalog);
const catalogHash = sha256(await read('content/catalog.json'));
// All three approved scenes are mandatory; fail before replacing existing exports.
const sceneInputs = await Promise.all(expectedScenes.map(async scene => ({scene, input: await read(scene.source)})));
const output = path.join(base, 'exports');
const prepared = path.join(base, 'layout/prepared');
for (const folder of ['exports', 'proofs', 'assets/products', 'assets/fonts', 'assets/brand', 'layout/prepared']) await fs.mkdir(path.join(base, folder), {recursive: true});
// Reuse the approved G5 visual system without running or changing its build.
for (const file of ['regular.ttf', 'bold.ttf', 'display.ttf']) await fs.copyFile(path.join(g5, 'assets/fonts', file), path.join(base, 'assets/fonts', file));
for (const file of ['fullmuscle-wordmark.svg', 'fullmuscle-wordmark-white.svg']) await fs.copyFile(path.join(g5, 'assets/brand', file), path.join(base, 'assets/brand', file));
await fs.copyFile(path.join(g5, 'layout/editorial.css'), path.join(base, 'layout/editorial.css'));
await fs.writeFile(path.join(base, 'assets/brand/qr-catalogo.svg'), await QRCode.toString(catalog.publicPdfUrl, {type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: {dark: '#141b17', light: '#ffffff'}}));
const css = (await read('layout/editorial.css')).toString();
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pt = mm => mm * 72 / 25.4;
const assets = [];
const media = new Map();
for (const product of catalog.products) {
  const source = path.join(root, product.brandedImage);
  const input = await fs.readFile(source); // No factory-image fallback in customer PDFs.
  await fs.writeFile(path.join(base, 'assets/products', `${product.sku}.png`), input);
  const {data, info} = await sharp(input).rotate().flatten({background: '#ffffff'}).toColourspace('srgb').trim({background: '#ffffff', threshold: 28}).jpeg({quality: 96, chromaSubsampling: '4:4:4'}).toBuffer({resolveWithObject: true});
  await fs.writeFile(path.join(prepared, `${product.sku}.jpg`), data);
  const asset = {sku: product.sku, source: product.brandedImage, sourceHash: sha256(input), prepared: `layout/prepared/${product.sku}.jpg`, preparedHash: sha256(data), width: info.width, height: info.height};
  assets.push(asset); media.set(product.sku, asset);
}
const scenes = [];
for (const {scene, input} of sceneInputs) {
  // Preserve the complete scene: no trimming, extraction or crop of people/machines.
  const {data, info} = await sharp(input).rotate().flatten({background: '#ffffff'}).toColourspace('srgb').jpeg({quality: 96, chromaSubsampling: '4:4:4'}).toBuffer({resolveWithObject: true});
  await fs.writeFile(path.join(base, scene.prepared), data);
  scenes.push({id: scene.id, source: scene.source, sourceHash: sha256(input), prepared: scene.prepared, preparedHash: sha256(data), width: info.width, height: info.height});
}
const invalidScenes = sceneAssetIssues(scenes);
if (invalidScenes.length) throw new Error(invalidScenes.join('\n'));
const brand = {dark: (await read('assets/brand/fullmuscle-wordmark-white.svg')).toString(), light: (await read('assets/brand/fullmuscle-wordmark.svg')).toString()};
const logo = (dark = false, cls = 'mini-logo') => `<div class="${cls}" aria-label="Full Muscle Equipment">${dark ? brand.dark : brand.light}</div>`;
const photo = (sku, width = 105, height = 132) => {
  const asset = media.get(sku);
  const scale = Math.min(width / asset.width, height / asset.height, 25.4 / 240);
  return `<img class="product-photo" src="prepared/${sku}.jpg" data-asset="${sku}" alt="${esc(catalog.products.find(p => p.sku === sku).name)} Full Muscle" width="${asset.width}" height="${asset.height}" style="width:${(asset.width * scale).toFixed(3)}mm;height:${(asset.height * scale).toFixed(3)}mm">`;
};
const scenePhoto = id => {
  const scene = expectedScenes.find(scene => scene.id === id);
  const asset = scenes.find(asset => asset.id === id);
  return `<img class="scene gf-scene" src="${scene.prepared.replace('layout/', '')}" data-scene="${id}" alt="${esc(scene.alt)}" width="${asset.width}" height="${asset.height}" style="width:${scene.widthMm}mm;height:${scene.heightMm}mm;object-fit:contain"><p class="render-caption">${scene.caption}</p>`;
};
const top = () => `<div class="topline">${logo()}<span>Serie GF · Full Muscle</span></div>`;
const page = (body, number, digital, cls = '', dark = false) => `<section class="page ${digital ? 'digital' : ''} ${dark ? 'dark' : ''} ${cls}" id="page-${number}" data-page="${number}"><div class="trim">${body}<footer class="page-footer"><span>FULL MUSCLE EQUIPMENT / GF</span><span>CATALOGO COMPLETO <b>${String(number).padStart(2, '0')}</b></span></footer></div></section>`;
function cover(digital) {
  return page(`<div class="inner">${logo(true, 'cover-logo')}<div class="edition">Catalogo completo<br>Edizione italiana</div><p class="eyebrow cover-kicker">Attrezzature a dischi per la tua area forza</p><h1 class="display cover-title">GF</h1><h2 class="cover-subtitle">La forza prende forma.</h2><div class="cover-image-wrap scene-block">${scenePhoto('gym')}</div><div class="cover-bottom"><p>Cinque macchine a dischi per petto, spalle e schiena. Un'identità comune, modello per modello.</p><div class="badge">05<small>modelli in catalogo</small></div></div></div>`, 1, digital, 'cover', true);
}
function introduction(digital) {
  return page(`<div class="inner">${top()}<p class="eyebrow" style="margin-top:11mm">La linea Full Muscle GF</p><h1 class="display intro-title">Cinque macchine.<br>La tua area forza.</h1><p class="intro-copy">La serie GF riunisce cinque macchine a dischi per allenare petto, spalle e schiena. Ogni scheda presenta un modello, con immagine, caratteristiche, dati tecnici e prezzo di listino.</p><div class="intro-band gf-intro-band"><div><b>Petto</b><span>Spinta da seduti<br>e spinta inclinata</span></div><div><b>Spalle</b><span>Spinta con<br>schienale inclinato</span></div><div><b>Schiena</b><span>Remata e<br>trazione verticale</span></div></div><div class="contents"><h2>La serie, in dettaglio.</h2>${catalog.products.map((p, i) => `<a class="contents-row" href="#page-${i + 3}"><span class="code">${p.sku}</span><span>${esc(p.name)}</span><span class="num">${String(i + 3).padStart(2, '0')}</span></a>`).join('')}</div><div class="gf-reading-note"><p>Dimensioni in millimetri: lunghezza × profondità × altezza. Il peso indicato è quello della macchina. Tutti i prezzi sono IVA esclusa.</p><p>Le immagini mostrano una proposta di personalizzazione Full Muscle. Colori, finiture, accessori e dischi eventualmente raffigurati vanno verificati nella configurazione richiesta.</p></div></div>`, 2, digital, 'introduction');
}
function featured(product, number, digital) {
  const rows = [{label: 'Dimensioni (L × P × H)', value: product.dimensions}, {label: 'Peso macchina', value: product.weight}, {label: 'Carico', value: product.load}];
  const trainingScene = expectedScenes.find(scene => scene.productSku === product.sku);
  return page(`<div class="inner"><div data-product-sku="${product.sku}">${top()}<header class="product-heading"><p class="product-code">${product.sku}</p><h1 class="product-title">${esc(product.name)}</h1><p class="product-category">${esc(product.category)} / Serie GF</p></header><div class="product-stage"><div class="product-image-area">${photo(product.sku)}</div><aside><div class="spec-panel"><h2 class="panel-title">Dati tecnici</h2>${rows.map(row => `<div class="spec-row"><span class="spec-label">${esc(row.label)}</span><strong class="spec-value ${row.value.length > 22 ? 'long' : ''}">${esc(row.value)}</strong></div>`).join('')}</div><p class="product-price" data-price-sku="${product.sku}" data-price-eur="${product.listPriceEur}"><span>Prezzo di listino</span> <strong>1.870 € + IVA</strong></p>${trainingScene ? `<div class="training-scene scene-block">${scenePhoto(trainingScene.id)}</div>` : ''}</aside></div><p class="product-description">${esc(product.description)}</p><div class="feature-grid">${product.features.map((feature, i) => `<div><b>${['Movimento', 'Configurazione', 'Allenamento'][i]}</b>${esc(feature)}</div>`).join('')}</div></div></div>`, number, digital, 'featured');
}
function contact(digital) {
  const person = catalog.contact;
  return page(`<div class="green-stripe"></div><div class="inner">${logo(false, 'cover-logo')}<p class="eyebrow" style="margin-top:18mm">Full Muscle Equipment</p><h1 class="display contact-title">Parliamo della tua<br>prossima palestra.</h1><p class="contact-intro">Per informazioni sui modelli, sulle configurazioni e per una richiesta di preventivo, contatta il nostro riferimento commerciale.</p><div class="contact-person"><h2>${esc(person.name)}</h2><a class="contact-phone" href="tel:${person.phoneLink}">${esc(person.phone)}</a><a class="contact-email" href="mailto:${person.email}">${esc(person.email)}</a><a class="contact-web" href="${person.website}">${esc(person.website.replace('https://', ''))}</a></div><div class="qr-area"><a href="${catalog.publicPdfUrl}"><img class="qr" src="../assets/brand/qr-catalogo.svg" alt="QR catalogo completo GF"></a><div><h3>Tutta la linea GF,<br>sempre con te.</h3><p>Scansiona il QR e apri il catalogo completo in PDF.</p></div></div><p class="contact-bottom">Catalogo B2B · Prezzi IVA esclusa.<br>Comunica il codice Full Muscle e la quantità desiderata.</p></div>`, 8, digital, 'contact');
}
const documents = [];
const browser = await chromium.launch({executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files']});
try {
  for (const digital of [false, true]) {
    const key = digital ? 'catalogo' : 'brochure';
    const filename = digital ? 'catalogo-completo.pdf' : 'brochure-stampa.pdf';
    const pages = [cover(digital), introduction(digital), ...catalog.products.map((p, i) => featured(p, i + 3, digital)), contact(digital)];
    const title = `Full Muscle GF · ${digital ? 'Catalogo completo' : 'Catalogo per la stampa'}`;
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${title}</title><style>@page{size:${digital ? '210mm 297mm' : '216mm 303mm'};margin:0}${css}\n.mini-logo svg,.cover-logo svg{width:100%;height:100%;display:block}.scene.gf-scene{object-fit:contain}.gf-intro-band{grid-template-columns:repeat(3,1fr);margin-top:8mm;padding:6mm 0}.introduction .contents{margin-top:9mm}.gf-reading-note{font-size:8pt;line-height:1.5;color:var(--muted);margin-top:7mm}.gf-reading-note p+p{margin-top:2mm}.featured .spec-panel{min-height:62mm}</style></head><body>${pages.join('\n')}</body></html>`;
    const htmlPath = path.join(base, 'layout', `${key}.html`);
    await fs.writeFile(htmlPath, html);
    const tab = await browser.newPage({viewport: {width: 1200, height: 1500}, deviceScaleFactor: 1});
    await tab.goto(pathToFileURL(htmlPath).href, {waitUntil: 'networkidle'});
    await tab.evaluate(async () => {await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode()));});
    await tab.emulateMedia({media: 'print'});
    await tab.evaluate(async () => {void document.body.offsetHeight; await document.fonts.ready;});
    const inspected = await tab.evaluate(() => {
      const issues = [];
      const images = [...document.querySelectorAll('img[data-asset]')].map(img => {
        const rect = img.getBoundingClientRect();
        const ppi = Math.min(img.naturalWidth / rect.width, img.naturalHeight / rect.height) * 96;
        return {sku: img.dataset.asset, page: Number(img.closest('.page').dataset.page), loaded: img.complete && img.naturalWidth > 0, ppi: Math.round(ppi * 100) / 100};
      });
      const scenes = [...document.querySelectorAll('img[data-scene]')].map(img => {
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        const scale = (style.objectFit === 'contain' ? Math.min : Math.max)(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
        const block = img.closest('.scene-block');
        const price = img.closest('aside')?.querySelector('.product-price')?.getBoundingClientRect();
        return {
          id: img.dataset.scene, page: Number(img.closest('.page').dataset.page),
          productSku: img.closest('[data-product-sku]')?.dataset.productSku ?? null,
          placement: block?.classList.contains('cover-image-wrap') ? 'cover' : block?.classList.contains('training-scene') ? 'training' : 'unknown',
          src: img.getAttribute('src'), caption: block?.querySelector('.render-caption')?.textContent.trim(),
          widthMm: rect.width * 25.4 / 96, heightMm: rect.height * 25.4 / 96,
          objectFit: style.objectFit, belowPrice: Boolean(price && rect.top >= price.bottom),
          loaded: img.complete && img.naturalWidth > 0 && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          ppi: Math.round(96 / scale * 100) / 100,
        };
      });
      for (const p of document.querySelectorAll('.page')) {
        const trim = p.querySelector('.trim').getBoundingClientRect();
        for (const el of p.querySelectorAll('.inner p,.inner h1,.inner h2,.inner h3,.contents,.feature-grid,.qr-area,img[data-scene],.scene-block')) {
          const rect = el.getBoundingClientRect();
          if (rect.top < trim.top + 10 * 96 / 25.4 || rect.bottom > trim.bottom - 12 * 96 / 25.4 || rect.left < trim.left + 10 * 96 / 25.4 || rect.right > trim.right - 10 * 96 / 25.4) issues.push(`Page ${p.dataset.page}: element outside safety area (${el.className || el.tagName}).`);
        }
      }
      for (const p of document.querySelectorAll('.featured')) {
        const aside = p.querySelector('aside').getBoundingClientRect();
        const description = p.querySelector('.product-description').getBoundingClientRect();
        if (aside.bottom > description.top - 5) issues.push(`Page ${p.dataset.page}: technical panel overlaps description.`);
        const price = p.querySelector('.product-price');
        const strong = price.querySelector('strong').getBoundingClientRect();
        const area = price.getBoundingClientRect();
        if (price.scrollWidth > price.clientWidth + 1 || strong.right > area.right + 1 || !area.width || !area.height) issues.push(`Page ${p.dataset.page}: price overflow or invisible price.`);
      }
      const prices = [...document.querySelectorAll('[data-price-sku]')].map(el => ({sku: el.dataset.priceSku, productSku: el.closest('[data-product-sku]').dataset.productSku, amountEur: Number(el.dataset.priceEur), text: el.textContent.replace(/\s+/g, ' ').trim()}));
      return {pages: document.querySelectorAll('.page').length, productSkus: [...document.querySelectorAll('[data-product-sku]')].map(el => el.dataset.productSku), images, scenes, prices, issues, fontStatus: document.fonts.status, text: document.body.textContent};
    });
    const sceneUsages = inspected.scenes.map(usage => {
      const asset = scenes.find(asset => asset.id === usage.id);
      return {...usage, sourceHash: asset?.sourceHash, preparedHash: asset?.preparedHash};
    });
    inspected.issues.push(...sceneUsageIssues(sceneUsages, scenes));
    for (const product of catalog.products) {
      const entries = inspected.prices.filter(p => p.sku === product.sku);
      if (entries.length !== 1 || entries[0].productSku !== product.sku || entries[0].amountEur !== 1870 || entries[0].text !== priceLabel(1870)) inspected.issues.push(`Missing, duplicated or incorrect price: ${product.sku}`);
    }
    if (inspected.prices.length !== 5 || JSON.stringify(inspected.productSkus) !== JSON.stringify(catalog.products.map(p => p.sku))) inspected.issues.push('Incorrect product or price coverage.');
    if (inspected.fontStatus !== 'loaded') inspected.issues.push('Fonts not loaded.');
    if (/tzfit|tianzhan|\bTZ\s?FIT(?:NESS)?\b/i.test(inspected.text)) inspected.issues.push('Supplier identity in customer text.');
    if (/\bscont\w*\b|\bdiscount\b|35\s*%/i.test(inspected.text)) inspected.issues.push('Unrequested discount in customer text.');
    for (const image of inspected.images) if (!image.loaded || image.ppi < 239.9) inspected.issues.push(`Invalid image resolution: ${image.sku} page ${image.page}.`);
    const pdf = await PDFDocument.load(await tab.pdf({preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: true, outline: true}));
    pdf.setTitle(title); pdf.setAuthor('Full Muscle Equipment'); pdf.setSubject('Macchine a dischi · Serie GF'); pdf.setLanguage('it-IT');
    for (const p of pdf.getPages()) {
      // Chromium rounds CSS paper dimensions; retain exact physical PDF boxes.
      p.setMediaBox(0, 0, pt(digital ? 210 : 216), pt(digital ? 297 : 303));
      p.setTrimBox(pt(digital ? 0 : 3), pt(digital ? 0 : 3), pt(210), pt(297));
      p.setBleedBox(0, 0, pt(digital ? 210 : 216), pt(digital ? 297 : 303));
    }
    addOutlines(pdf, [{title: 'Indice', page: 1}, ...catalog.products.map((p, i) => ({title: `${p.sku} · ${p.name}`, page: i + 2})), {title: 'Contatti', page: 7}]);
    const fonts = [];
    for (const [, obj] of pdf.context.enumerateIndirectObjects()) if (obj instanceof PDFDict && obj.get(PDFName.of('Type'))?.toString() === '/FontDescriptor') fonts.push({name: obj.get(PDFName.of('FontName'))?.toString(), embedded: ['FontFile', 'FontFile2', 'FontFile3'].some(k => obj.has(PDFName.of(k)))});
    if (!fonts.length || fonts.some(f => !f.embedded)) inspected.issues.push('Missing or unembedded fonts.');
    if (pdf.getPageCount() !== 8 || inspected.pages !== 8) inspected.issues.push('Expected exactly eight pages.');
    const bytes = await pdf.save();
    await fs.writeFile(path.join(output, filename), bytes);
    const proofs = path.join(base, 'proofs', key); await fs.mkdir(proofs, {recursive: true});
    for (let i = 0; i < pages.length; i++) await tab.locator('.page').nth(i).screenshot({path: path.join(proofs, `${String(i + 1).padStart(2, '0')}.png`), animations: 'disabled'});
    await makeContactSheet(proofs, path.join(base, 'proofs', `${key}-contact-sheet.jpg`));
    documents.push({filename, pages: pdf.getPageCount(), format: digital ? 'A4 210 × 297 mm' : 'A4 210 × 297 mm / 3 mm bleed', sha256: sha256(bytes), bytes: bytes.length, embeddedFonts: fonts, images: inspected.images, scenes: sceneUsages, productSkus: inspected.productSkus, priceChecks: inspected.prices, issues: inspected.issues});
    await tab.close();
  }
} finally {await browser.close();}
await fs.writeFile(path.join(output, 'listino-rivendita.csv'), retailCsv(catalog));
const protectedFiles = ['content/catalog.json', 'scripts/build.mjs', 'scripts/validation.mjs', 'layout/editorial.css', 'assets/brand/fullmuscle-wordmark.svg', 'assets/brand/fullmuscle-wordmark-white.svg', 'assets/brand/qr-catalogo.svg', 'assets/fonts/regular.ttf', 'assets/fonts/bold.ttf', 'assets/fonts/display.ttf'];
const inputs = Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file, sha256(await read(file))])));
if (inputs['content/catalog.json'] !== catalogHash) throw new Error('Catalog changed during build.');
const report = {generatedAt: new Date().toISOString(), mode: 'final-export', catalogModels: 5, inputs, assets, scenes, documents, pricing: {currency: 'EUR', vatIncluded: false, listPriceEur: 1870, mode: 'fixed-user-price'}, qr: {destination: catalog.publicPdfUrl, encoded: true, publicHttpStatus: 'not-verified', physicalPrintScan: 'not-performed'}, print: {trimMm: [210, 297], bleedMm: 3, safeMarginMm: 12, minimumImagePpi: 240, colorSpace: 'sRGB; not certified PDF/X', imposition: 'single pages in reading order'}, issues: documents.flatMap(doc => doc.issues.map(issue => `${doc.filename}: ${issue}`))};
await fs.writeFile(path.join(output, 'preflight.json'), JSON.stringify(report, null, 2) + '\n');
if (!report.issues.length) {
  await fs.mkdir(path.join(root, 'public/cataloghi'), {recursive: true});
  await fs.copyFile(path.join(output, 'catalogo-completo.pdf'), path.join(root, 'public/cataloghi/fullmuscle-gf.pdf'));
}
console.log(JSON.stringify({documents: documents.map(d => ({filename: d.filename, pages: d.pages, bytes: d.bytes})), issues: report.issues, publicCopyUpdated: !report.issues.length}, null, 2));
if (report.issues.length) process.exitCode = 1;

function addOutlines(pdf, entries) {
  const outline = pdf.context.nextRef(); const refs = entries.map(() => pdf.context.nextRef());
  entries.forEach((entry, i) => pdf.context.assign(refs[i], pdf.context.obj({Title: PDFString.of(entry.title), Parent: outline, ...(i ? {Prev: refs[i - 1]} : {}), ...(i < refs.length - 1 ? {Next: refs[i + 1]} : {}), Dest: [pdf.getPages()[entry.page].ref, PDFName.of('Fit')]})));
  pdf.context.assign(outline, pdf.context.obj({Type: 'Outlines', First: refs[0], Last: refs.at(-1), Count: entries.length}));
  pdf.catalog.set(PDFName.of('Outlines'), outline); pdf.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}
async function makeContactSheet(folder, destination) {
  const tiles = [];
  for (let i = 0; i < 8; i++) tiles.push({input: await sharp(path.join(folder, `${String(i + 1).padStart(2, '0')}.png`)).resize(240, 340, {fit: 'contain', background: '#e5e9e1'}).toBuffer(), left: i % 4 * 240, top: Math.floor(i / 4) * 340});
  await sharp({create: {width: 960, height: 680, channels: 3, background: '#e5e9e1'}}).composite(tiles).jpeg({quality: 90}).toFile(destination);
}
