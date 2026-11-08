import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const base = path.dirname(fileURLToPath(import.meta.url));
const social = path.resolve(base, '..');
const root = path.resolve(social, '..');
const postsDoc = JSON.parse(await fs.readFile(path.join(base, 'posts.json'), 'utf8'));
const productsDoc = JSON.parse(await fs.readFile(path.join(base, 'products.json'), 'utf8'));
const posts = postsDoc.posts;
const products = new Map(productsDoc.products.map(p => [p.sku, p]));
const only = process.argv.indexOf('--post');
const selected = only >= 0 ? posts.filter(p => p.id === process.argv[only + 1]) : posts;
if (posts.length !== 12 || !selected.length) throw new Error('Expected 12 posts and a valid selection.');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pad = n => String(n).padStart(2, '0');
const css = await fs.readFile(path.join(base, 'style.css'), 'utf8');
const logo = await fs.readFile(path.join(root, 'brochures/fullmuscle-g5/assets/brand/fullmuscle-wordmark-white.svg'), 'utf8');
const publicCatalog = JSON.parse(await fs.readFile(path.join(root, 'data/catalog-public/products.json'), 'utf8'));
const provenance = [];
for (const product of products.values()) {
  const current = publicCatalog.products.find(p => p.publicSku === product.sku);
  if (!current?.assets.some(a => a.localPath === product.image && a.reviewStatus === 'approved-provisional')) throw new Error(`Asset not current: ${product.sku}`);
  const bytes = await fs.readFile(path.join(root, product.image));
  const meta = await sharp(bytes).metadata();
  if (meta.width < 1000 || meta.height < 1000) throw new Error(`Asset too small: ${product.sku}`);
  provenance.push({sku:product.sku,path:product.image,sha256:hash(bytes),width:meta.width,height:meta.height});
}
for (const [index, post] of posts.entries()) {
  if(post.id !== pad(index+1) || !post.slug.startsWith(`${post.id}-`) || !/^[a-z0-9-]+$/.test(post.slug)) throw new Error(`Bad ID or path: ${post.slug}`);
  if(post.slides.length !== 4 || post.slides[0].layout !== 'cover' || post.slides[3].layout !== 'closing') throw new Error(`Four slides required: ${post.slug}`);
  if(!post.caption || post.caption.includes('[') || !post.objective || !post.hashtags?.length) throw new Error(`Incomplete editorial record: ${post.slug}`);
  for (const slide of post.slides) {
    if (!['cover','feature','compare','list','closing'].includes(slide.layout) || !slide.title || !slide.alt) throw new Error(`Incomplete slide: ${post.slug}`);
    for(const sku of slide.productSkus ?? []) if(!products.has(sku)) throw new Error(`Unknown SKU: ${sku}`);
    if(slide.layout === 'compare' && (slide.productSkus?.length !== 2 || slide.items?.length !== 2)) throw new Error(`Invalid comparison: ${post.slug}`);
    if(slide.layout === 'closing' && !slide.cta) throw new Error(`CTA missing: ${post.slug}`);
  }
  for(const source of post.sources) await fs.access(path.join(root,source));
}

function productCard(sku, showName = true) {
  const p = products.get(sku);
  return `<div class="product" data-box><div class="visual"><img src="../../${esc(p.image)}" alt="${esc(p.name)}" data-sku="${esc(sku)}"></div><div class="product-label" data-text>${esc(p.sku)}${showName ? `<span>${esc(p.name)}</span>` : ''}</div></div>`;
}
function gallery(skus) { return `<div class="gallery grow count-${skus.length}" style="--count:${skus.length}">${skus.map(sku => productCard(sku)).join('')}</div>`; }
function points(items) { return `<div class="points">${items.map((item,i) => `<div class="point" data-box><span class="point-no">${pad(i+1)}</span><h3 data-text>${esc(item.title)}</h3><p data-text>${esc(item.text)}</p></div>`).join('')}</div>`; }
function slideMarkup(post, s, i) {
  const skus = s.productSkus ?? [];
  let content;
  if(s.layout === 'cover') content = gallery(skus);
  if(s.layout === 'feature') content = `<div class="feature-stage grow">${productCard(skus[0])}${points(s.items)}</div>`;
  if(s.layout === 'compare') content = `<div class="compare-stage grow">${skus.map((sku,n) => `<div class="compare-card" data-box>${productCard(sku,false)}<div class="compare-copy" data-box><h3 data-text>${esc(s.items[n].title)}</h3><p data-text>${esc(s.items[n].text)}</p></div></div>`).join('')}</div>`;
  if(s.layout === 'list') content = `<div class="list-stage grow ${skus.length ? '' : 'no-product'}">${skus.length ? productCard(skus[0]) : ''}${points(s.items)}</div>`;
  if(s.layout === 'closing') content = `${skus.length ? gallery(skus) : '<div class="grow"></div>'}${s.items?.length ? `<div class="closing-points">${s.items.map(item => `<p data-text><b>${esc(item.title)}</b> ${esc(item.text)}</p>`).join('')}</div>` : ''}<div class="cta" data-box><p data-text>${esc(s.cta)}</p><span class="arrow" aria-hidden="true">↗</span></div>`;
  return `<section class="slide ${s.layout}" id="p${post.id}-${pad(i+1)}" data-post="${post.id}" data-slide="${i+1}" aria-label="${esc(s.alt)}"><header class="brand" data-box><div class="logo">${logo}</div><span class="series" data-text>${post.kind === 'product' ? 'Focus attrezzature' : 'Guida alla scelta'}</span></header><div class="main" data-box><div class="eyebrow" data-text>${esc(s.kicker)}</div><h2 class="heading" data-text>${esc(s.title)}</h2>${s.body ? `<p class="body" data-text>${esc(s.body)}</p>` : ''}${content}</div><footer class="footer" data-box><div class="disclosure" data-text>Immagini illustrative · Configurazioni da confermare</div><div class="footer-row"><span class="handle" data-text>@fullmuscle.equipment</span><span class="swipe">${i < 3 ? 'SCORRI →' : 'FULL MUSCLE EQUIPMENT'}</span><span class="counter">${pad(i+1)} / 04</span></div></footer></section>`;
}
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Full Muscle · 12 caroselli</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main>${posts.flatMap(post => post.slides.map((s,i) => slideMarkup(post,s,i))).join('\n')}</main></body></html>`;
await fs.writeFile(path.join(base,'preview.html'),html);

function postMarkdown(post) {
  const references = [...new Set([...post.sources,...post.productSkus.flatMap(sku => products.get(sku).sourceFiles)])];
  return `# ${post.id} · ${post.title}\n\n**Formato:** carosello, 4 immagini PNG da 1080 × 1350 px.  \n**Obiettivo:** ${post.objective}  \n**Stato:** materiali pronti per pubblicazione manuale; non pubblicato da questa procedura.\n\n## Immagini da caricare\n\nCarica nell'ordine [01.png](01.png), [02.png](02.png), [03.png](03.png), [04.png](04.png). [Anteprima del carosello](anteprima.jpg): solo per consultazione, non da aggiungere al post.\n\n## Caption pronta da copiare\n\n${post.caption}\n\n${post.hashtags.map(x => x.startsWith('#') ? x : `#${x}`).join(' ')}\n\n## Testi alternativi\n\n${post.slides.map((s,i) => `- **${pad(i+1)}.png:** ${s.alt}`).join('\n')}\n\n## Sequenza del carosello\n\n${post.slides.map((s,i) => `### ${pad(i+1)} · ${s.title.replaceAll('\n',' ')}\n\n${s.body ?? ''}${s.items?.length ? '\n\n'+s.items.map(item => `- **${item.title}:** ${item.text}`).join('\n') : ''}${s.cta ? `\n\n**Invito:** ${s.cta}` : ''}`).join('\n\n')}\n\n## Modelli e fonti interne\n\n${post.productSkus.map(sku => {const p=products.get(sku);return `- **${sku} · ${p.name}:** [immagine utilizzata](../../${p.image}), [catalogo](${p.url}).`;}).join('\n')}\n\n${references.map(p => `- [${p}](../../${p})`).join('\n')}\n\nLe immagini sono elaborazioni illustrative approvate nel catalogo, non fotografie di installazioni cliente. I file originali non vengono modificati. Le caratteristiche riportate si riferiscono ai modelli identificati; configurazioni e accessori vanno confermati nella proposta commerciale.\n`;
}
const checks = [];
const executablePath = process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({executablePath,headless:true,args:['--allow-file-access-from-files']});
try {
  const page = await browser.newPage({viewport:{width:1200,height:1500},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(base,'preview.html')).href,{waitUntil:'load'});
  await page.evaluate(async () => {await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
  for(const post of selected) {
    const dir = path.join(social,post.slug);
    await fs.mkdir(dir,{recursive:true});
    for(let i=0;i<4;i++) {
      const selector = `#p${post.id}-${pad(i+1)}`;
      const result = await page.locator(selector).evaluate(el => {
        const issues=[];const bounds=el.getBoundingClientRect();
        for(const text of el.querySelectorAll('[data-text]')) {
          const range=document.createRange();range.selectNodeContents(text);
          const r=range.getBoundingClientRect();const box=text.closest('[data-box]').getBoundingClientRect();
          if(r.left < box.left-1 || r.right > box.right+1 || r.top < box.top-2 || r.bottom > box.bottom+2) issues.push(`Text outside container: ${text.textContent.slice(0,75)}`);
          const style=getComputedStyle(text);
          if(text.scrollWidth > text.clientWidth+2 || (style.overflowY !== 'visible' && text.scrollHeight > text.clientHeight+2)) issues.push(`Text overflow: ${text.textContent.slice(0,75)}`);
          if(r.left < bounds.left+40 || r.right > bounds.right-40 || r.top < bounds.top+30 || r.bottom > bounds.bottom-25) issues.push(`Outside slide safety area: ${text.textContent.slice(0,50)}`);
        }
        const main=el.querySelector('.main');
        const children=[...main.children].map(x=>({name:x.className,r:x.getBoundingClientRect()}));
        for(let n=1;n<children.length;n++) if(children[n].r.top < children[n-1].r.bottom-1) issues.push(`Content overlap: ${children[n].name}`);
        for(const image of el.querySelectorAll('img')) if(!image.complete || !image.naturalWidth) issues.push(`Image missing: ${image.dataset.sku}`);
        return {issues,fontsLoaded:document.fonts.check('700 36px FMDisplay') && document.fonts.check('32px FM'),width:bounds.width,height:bounds.height};
      });
      const target=path.join(dir,`${pad(i+1)}.png`);
      await page.locator(selector).screenshot({path:target,animations:'disabled',type:'png'});
      const bytes=await fs.readFile(target);const meta=await sharp(bytes).metadata();
      checks.push({post:post.id,slide:i+1,file:path.relative(social,target).replaceAll('\\','/'),...result,width:meta.width,height:meta.height,sha256:hash(bytes)});
    }
    await fs.writeFile(path.join(dir,'post.md'),postMarkdown(post));
    const tiles=await Promise.all([1,2,3,4].map(n=>sharp(path.join(dir,`${pad(n)}.png`)).resize(432,540).png().toBuffer()));
    await sharp({create:{width:1796,height:588,channels:3,background:'#27342c'}}).composite(tiles.map((input,n)=>({input,left:24+n*440,top:24}))).jpeg({quality:91,chromaSubsampling:'4:4:4'}).toFile(path.join(dir,'anteprima.jpg'));
    console.log(`Rendered ${post.slug} (4 slides)`);
  }
} finally {await browser.close();}
const issues=checks.flatMap(c=>[...c.issues.map(issue=>`${c.file}: ${issue}`),...(!c.fontsLoaded? [`${c.file}: fonts not loaded`]:[]),...(c.width!==1080||c.height!==1350?[`${c.file}: invalid dimensions`]:[])]);
const inputs=Object.fromEntries(await Promise.all(['posts.json','products.json','style.css','build.mjs'].map(async name=>[name,hash(await fs.readFile(path.join(base,name)))])));
await fs.writeFile(path.join(base,only>=0?`preflight-${selected[0].id}.json`:'preflight.json'),JSON.stringify({generatedAt:new Date().toISOString(),posts:selected.length,slides:checks.length,issues,inputs,assets:provenance,checks},null,2)+'\n');
if(only<0) {
  const covers=await Promise.all(posts.map(p=>sharp(path.join(social,p.slug,'01.png')).resize(324,405).png().toBuffer()));
  await sharp({create:{width:1400,height:1311,channels:3,background:'#27342c'}}).composite(covers.map((input,i)=>({input,left:28+(i%4)*340,top:32+Math.floor(i/4)*421}))).jpeg({quality:92,chromaSubsampling:'4:4:4'}).toFile(path.join(social,'anteprima-12-post.jpg'));
  const rows=posts.map((p,i)=>`| ${i<6?'1':'2'} | ${['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][i%6]} | ${p.id} | [${p.title}](${p.slug}/post.md) | ${p.objective} |`).join('\n');
  const document=`# Dodici post per due settimane — Full Muscle Equipment\n\n**Edizione:** 8 novembre 2026  \n**Consegna:** 12 caroselli da 4 slide, 48 PNG da 1080 × 1350 px, caption e testi alternativi.  \n**Stato:** raccolta temporanea pronta per pubblicazione manuale; nessun post pubblicato o programmato da questa procedura.\n\n## Come usare la raccolta\n\nQuesti contenuti mantengono il profilo attivo mentre il team rivede il [piano marketing e social](../docs/piano-marketing-social.md). La frequenza quotidiana è una scelta temporanea di questo pacchetto, non una modifica alla cadenza del piano generale né una garanzia di crescita.\n\n1. Apri la cartella del post seguendo il calendario sotto.\n2. Consulta \`anteprima.jpg\` e leggi \`post.md\`.\n3. Carica soltanto \`01.png\`, \`02.png\`, \`03.png\`, \`04.png\`, nell'ordine numerico, come unico carosello. Mantieni il formato verticale 4:5 senza ritagliare le slide.\n4. Copia la sezione **Caption pronta da copiare**, compresi gli hashtag. I riferimenti interni e le note sulle fonti non vanno copiati nella caption.\n5. Inserisci i testi alternativi delle quattro immagini e verifica l'anteprima nell'app.\n6. Pubblica manualmente quando desideri e controlla eventuali commenti o richieste di informazioni.\n\n[Apri la panoramica delle dodici copertine](anteprima-12-post.jpg). Le anteprime sono materiali di consultazione: non sono slide aggiuntive del carosello.\n\n## Calendario senza date vincolanti\n\nPubblica un carosello al giorno dal lunedì al sabato per due settimane. Le due domeniche restano libere. Se inizi in un altro giorno, conserva semplicemente l'ordine 01–12 e distribuisci due pause nell'arco di quattordici giorni. Non è necessario attendere integrazioni, nuove riprese o materiali del progettista.\n\n| Settimana | Giorno | Post | Tema e cartella | Obiettivo |\n| --- | --- | --- | --- | --- |\n${rows}\n\n## Linea visiva e messaggi\n\nStile sportivo scuro: antracite, titoli bianchi, accenti verdi e logo Full Muscle. Le macchine sono mostrate intere su pannelli chiari che rispettano il fondo delle immagini esistenti. Ogni carosello contiene una copertina, due slide informative e una chiusura con un riepilogo e un invito utile.\n\nLa raccolta alterna sei presentazioni di prodotto e sei contenuti educativi. Le CTA invitano a salvare il confronto oppure a scrivere in DM indicando il modello: non promettono prezzi, promozioni, progettazione inclusa o disponibilità. Non si pubblicano indicazioni di allenamento, risultati fisici garantiti o confronti di superiorità.\n\nLe immagini provengono dal catalogo brandizzato già approvato e sono illustrative. Non vengono presentate come fotografie di installazioni cliente. Colori, configurazioni e accessori rappresentati vanno confermati in fase commerciale. Ogni post mantiene le fonti interne e i codici dei modelli in \`post.md\`.\n\n## Modifiche e rigenerazione\n\nI PNG sono autonomi e pronti da caricare. Per modificare la raccolta nel repository, i sorgenti si trovano in [\`_src\`](_src/README.md): testi e sequenze in \`posts.json\`, registro dei prodotti in \`products.json\`, impaginazione in \`style.css\` e generatore in \`build.mjs\`. Il generatore riusa font, logo e immagini originali del progetto senza modificarli.\n\nDalla root del repository:\n\n\`\`\`powershell\nnode social/_src/build.mjs\n\`\`\`\n\nLa rigenerazione sovrascrive soltanto i file prodotti da questa procedura nelle dodici cartelle, il documento indice, l'anteprima generale e i report. Per conservare modifiche, aggiornare prima i sorgenti. Non cambia sito, cataloghi o piano marketing.\n\n## Verifica\n\nIl [report di esportazione](_src/preflight.json) registra dimensioni, caricamento di font e immagini, overflow, sovrapposizioni e hash dei file. La revisione visiva e il controllo finale sono riportati in [\`_src/quality-review.md\`](_src/quality-review.md). La procedura non accede a Instagram e non configura pubblicazioni o automazioni.\n`;
  await fs.writeFile(path.join(social,'piano-post-due-settimane.md'),document);
}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}else console.log(`PASS: ${checks.length} slides, no layout errors.`);
