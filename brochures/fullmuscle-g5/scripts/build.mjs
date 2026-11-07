import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
import { PDFDocument, PDFName, PDFString, PDFNumber, PDFDict } from 'pdf-lib';
import QRCode from 'qrcode';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { formatListPrice } from '../content/pricing.mjs';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(base, '../..');
const proof = process.argv.includes('--proof');
const onlyBrochure = process.argv.includes('--brochure-only');
await import('../content/build-catalog.mjs');
const catalogue = JSON.parse(await fs.readFile(path.join(base, 'content/catalog.json'), 'utf8'));
const css = await fs.readFile(path.join(base, 'layout/editorial.css'), 'utf8');
const outputs = path.join(base, 'exports');
const proofDir = path.join(base, 'proofs');
const preparedDir = path.join(base, 'layout/prepared');
const pending = [];
const media = new Map();
const pt = mm => mm * 72 / 25.4;
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pricingInputs = Object.fromEntries(await Promise.all(
  ['content/catalog.json','content/pricing-config.json','content/purchase-prices.json']
    .map(async file => [file, hash(await fs.readFile(path.join(base,file)))]),
));
const url = 'https://fullmuscle-equipment.com/cataloghi/fullmuscle-g5.pdf';
const sourcePaths = [];
for (const dir of [outputs,proofDir,preparedDir,path.join(base,'assets/fonts'),path.join(base,'assets/brand')]) await fs.mkdir(dir,{recursive:true});

for (const [name,source] of Object.entries({regular:'arial.ttf',bold:'arialbd.ttf',display:'ARIALNB.TTF'})) {
  const target=path.join(base,'assets/fonts',`${name}.ttf`);
  await fs.copyFile(path.join('C:/Windows/Fonts',source),target);
}
// Build a vector reconstruction of the supplied slanted two-colour wordmark.
// Paths keep the heading sharp at any print scale, independent of installed fonts.
const logoFontBytes=await fs.readFile('C:/Windows/Fonts/arialbi.ttf');
const smallFontBytes=await fs.readFile('C:/Windows/Fonts/arial.ttf');
const logoFont=opentype.parse(logoFontBytes.buffer.slice(logoFontBytes.byteOffset,logoFontBytes.byteOffset+logoFontBytes.byteLength));
const smallFont=opentype.parse(smallFontBytes.buffer.slice(smallFontBytes.byteOffset,smallFontBytes.byteOffset+smallFontBytes.byteLength));
const fullPath=logoFont.getPath('Full',10,61,65).toPathData(2);
const firstWidth=logoFont.getAdvanceWidth('Full',65);
const muscle=logoFont.getPath('Muscle',10+firstWidth,61,65).toPathData(2);
const wordWidth=firstWidth+logoFont.getAdvanceWidth('Muscle',65);
const small=smallFont.getPath('E Q U I P M E N T',wordWidth*.18,86,14).toPathData(2);
const vectorLogo=ink=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(wordWidth+24)} 98" role="img" aria-label="Full Muscle Equipment"><path d="${fullPath}" fill="${ink}"/><path d="${muscle}" fill="#79a64b"/><path d="${small}" fill="${ink}"/></svg>`;
await fs.writeFile(path.join(base,'assets/brand/fullmuscle-wordmark.svg'),vectorLogo('#141b17'));
await fs.writeFile(path.join(base,'assets/brand/fullmuscle-wordmark-white.svg'),vectorLogo('#ffffff'));
await fs.writeFile(path.join(base,'assets/brand/qr-catalogo.svg'),await QRCode.toString(url,{type:'svg',errorCorrectionLevel:'M',margin:4,color:{dark:'#141b17',light:'#ffffff'}}));
const logo=(dark=false,cls='mini-logo')=>`<div class="${cls}" aria-label="Full Muscle Equipment">${vectorLogo(dark?'#fff':'#141b17')}</div>`;

async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function prepareAsset(id,source,trim){
  const input=await fs.readFile(source);
  let pipeline=sharp(input).rotate().flatten({background:'#ffffff'}).toColourspace('srgb');
  if(trim) pipeline=pipeline.trim({background:'#ffffff',threshold:28});
  const {data,info}=await pipeline.jpeg({quality:96,chromaSubsampling:'4:4:4'}).toBuffer({resolveWithObject:true});
  const target=path.join(preparedDir,`${id}.jpg`);
  await fs.writeFile(target,data);
  const record={id,source:path.relative(root,source).replaceAll('\\','/'),prepared:path.relative(base,target).replaceAll('\\','/'),width:info.width,height:info.height,inputHash:hash(input),outputHash:hash(data)};
  media.set(id,record);sourcePaths.push(record);return record;
}
const products=onlyBrochure?catalogue.products.filter(p=>catalogue.featuredSkus.includes(p.sku)):catalogue.products;
for(const product of products){
  const expected=path.join(base,product.image);
  let input=expected;
  if(!await exists(input)){
    pending.push({sku:product.sku,expected:product.image});
    if(!proof) continue;
    input=path.resolve(root,product.sourceImagePath);
  }
  await prepareAsset(product.sku,input,true);
}
for(const id of ['gym','chest-training','legpress-training']){
  const input=path.join(base,'assets/scenes',`${id}.png`);
  if(await exists(input)) await prepareAsset(id,input,false);
  else pending.push({scene:id,expected:`assets/scenes/${id}.png`});
}
if(pending.length&&!proof) throw new Error(`Final export blocked: ${pending.length} required branded images missing. Use --proof only for internal layout review.\n${JSON.stringify(pending)}`);

function img(id,maxWidth,maxHeight,extra=''){
  const m=media.get(id);
  if(!m)return `<div class="${extra}" style="width:${maxWidth}mm;height:${maxHeight}mm;background:#e5e9e1;display:flex;align-items:center;justify-content:center;color:#51654c;font-size:10pt">Immagine in preparazione</div>`;
  const ratio=Math.min(maxWidth/m.width,maxHeight/m.height,25.4/240);
  const w=(m.width*ratio).toFixed(3),h=(m.height*ratio).toFixed(3);
  return `<img src="prepared/${encodeURIComponent(id)}.jpg" data-asset="${esc(id)}" data-min-ppi="240" class="${extra}" alt="${esc(id)}" width="${m.width}" height="${m.height}" style="width:${w}mm;height:${h}mm">`;
}
function scene(id,w,h,cls='scene'){
  const m=media.get(id);if(!m)return img(id,w,h,cls);
  // Cover uses physical dimensions only when the native pixels satisfy print preflight.
  const width=Math.min(w,m.width*25.4/240);const height=Math.min(h,m.height*25.4/240);
  return `<img src="prepared/${id}.jpg" data-asset="${id}" data-min-ppi="240" class="${cls}" alt="Rendering illustrativo Full Muscle" width="${m.width}" height="${m.height}" style="width:${width.toFixed(3)}mm;height:${height.toFixed(3)}mm;object-fit:contain">`;
}
function footer(n,digital=false){return `<footer class="page-footer"><span>FULL MUSCLE EQUIPMENT / G5</span><span>${digital?'CATALOGO COMPLETO':'SELEZIONE PROFESSIONALE'} <b>${String(n).padStart(2,'0')}</b></span></footer>`;}
function top(){return `<div class="topline">${logo()}<span>Serie G5 · Full Muscle</span></div>`;}
function page(body,n,{digital=false,dark=false,cls=''}={}){return `<section class="page ${digital?'digital':''} ${dark?'dark':''} ${cls}" id="page-${n}" data-page="${n}"><div class="trim">${body}${footer(n,digital)}</div></section>`;}
function cover(digital=false){return page(`<div class="inner">${logo(true,'cover-logo')}<div class="edition">${digital?'Catalogo completo':'Selezione professionale'}<br>Edizione italiana</div><p class="eyebrow cover-kicker">Attrezzature per la tua area forza</p><h1 class="display cover-title">G5</h1><h2 class="cover-subtitle">La forza prende forma.</h2><div class="cover-image-wrap">${scene('gym',158,103,'cover-image scene')}<p class="render-caption">Rendering illustrativo di ambientazione.</p></div><div class="cover-bottom"><p>${digital?'Macchine, panche, rack e stazioni multifunzione. Una linea da esplorare, modello per modello.':'Otto macchine. Un’identità comune.<br>Scopri una selezione della linea Full Muscle G5.'}</p><div class="badge">${digital?catalogue.products.length:'08'}<small>modelli${digital?' in catalogo':' selezionati'}</small></div></div></div>`,1,{digital,dark:true,cls:'cover'});}
function brochureIntro(){return page(`<div class="inner">${top()}<p class="eyebrow" style="margin-top:11mm">La linea Full Muscle G5</p><h1 class="display intro-title">Scegli le macchine.<br>Dai forma al tuo spazio.</h1><p class="intro-copy">La linea G5 comprende macchine a pacco pesi, attrezzature a dischi, panche, rack e stazioni multifunzione. Questa selezione presenta otto modelli per organizzare il lavoro su gambe, petto, schiena e spalle.</p><div class="intro-band"><div><b>Gambe</b><span>Pressa, estensione<br>e flessione</span></div><div><b>Petto</b><span>Spinta<br>da seduti</span></div><div><b>Schiena</b><span>Trazione verticale<br>e remata</span></div><div><b>Spalle</b><span>Spinta e<br>alzate laterali</span></div></div><div class="contents"><h2>La selezione, in dettaglio.</h2>${catalogue.featuredSkus.map((sku,i)=>{const p=catalogue.products.find(p=>p.sku===sku);return `<a class="contents-row" href="#page-${i+3}"><span class="code">${esc(sku)}</span><span>${esc(p.name)}</span><span class="num">${String(i+3).padStart(2,'0')}</span></a>`;}).join('')}</div><p class="intro-note">La selezione continua online: il catalogo completo G5 raccoglie le altre macchine e le varianti disponibili. Scansiona il QR sul retro per consultarlo.</p></div>`,2,{cls:'introduction'});}
function technicalRows(p){return p.technicalRows?.length?p.technicalRows:[{label:'Dimensioni (L × P × H)',value:p.dimensions},{label:'Peso macchina',value:p.weight},{label:'Pacco pesi',value:p.stack}];}
function priceBlock(p){
  if(!Number.isSafeInteger(p.listPriceEur)||p.listPriceEur<=0)throw new Error('Invalid list price: '+p.sku);
  const label=formatListPrice(p.listPriceEur);
  const prefix='Prezzo di listino ';
  if(!label.startsWith(prefix))throw new Error('Unexpected list price format: '+p.sku);
  return `<p class="product-price" data-price-sku="${esc(p.sku)}" data-price-eur="${p.listPriceEur}"><span>${prefix.trim()}</span> <strong>${esc(label.slice(prefix.length))}</strong></p>`;
}
function featured(p,n){const human=p.sku==='FM-GC-5016'?'legpress-training':p.sku==='FM-GC-5005'?'chest-training':null;return page(`<div class="inner">${top()}<header class="product-heading"><p class="product-code">${esc(p.sku)}</p><h1 class="product-title">${esc(p.name)}</h1><p class="product-category">${esc(p.category)} / Serie G5</p></header><div class="product-stage"><div class="product-image-area">${img(p.sku,105,132,'product-photo')}</div><aside><div class="spec-panel"><h2 class="panel-title">Dati tecnici</h2>${technicalRows(p).slice(0,6).map(r=>`<div class="spec-row"><span class="spec-label">${esc(r.label)}</span><strong class="spec-value ${String(r.value).length>22?'long':''}">${esc(r.value)}</strong></div>`).join('')}</div>${priceBlock(p)}${human?`<div class="training-scene">${scene(human,62,32)}<p class="render-caption">Rendering illustrativo.</p></div>`:''}</aside></div><p class="product-description">${esc(p.description)}</p><div class="feature-grid">${p.features.slice(0,3).map((f,i)=>`<div><b>${['Movimento','Configurazione','Allenamento'][i]}</b>${esc(f)}</div>`).join('')}</div></div>`,n,{cls:'featured'});}
function project(){return page(`<div class="inner">${logo(true)}<p class="eyebrow" style="margin-top:14mm">Dalla selezione al progetto</p><h1 class="display project-title">La tua area forza.<br>La tua combinazione.</h1><div class="project-scene">${scene('gym',158,103)}</div><p class="render-caption project-caption">Rendering illustrativo di ambientazione.</p><p class="project-copy">Confronta i modelli in base agli spazi e al lavoro che vuoi proporre. Verifica con noi colori, finiture e configurazione di ciascun modello.</p><div class="steps"><div><b>01</b><h3>Esplora</h3><p>Consulta il catalogo completo e scegli i modelli di interesse.</p></div><div><b>02</b><h3>Definisci</h3><p>Indica quantità, spazi e priorità della tua area fitness.</p></div><div><b>03</b><h3>Contattaci</h3><p>Invia la selezione a Matteo e richiedi un preventivo.</p></div></div></div>`,11,{dark:true,cls:'project'});}
function contact(n,digital=false){return page(`<div class="green-stripe"></div><div class="inner">${logo(false,'cover-logo')}<p class="eyebrow" style="margin-top:18mm">Full Muscle Equipment</p><h1 class="display contact-title">Parliamo della tua<br>prossima palestra.</h1><p class="contact-intro">Per informazioni sui modelli, sulle configurazioni e per una richiesta di preventivo, contatta il nostro riferimento commerciale.</p><div class="contact-person"><h2>Matteo</h2><a class="contact-phone" href="tel:+393925501779">392 550 1779</a><a class="contact-email" href="mailto:info@fullmuscle-equipment.com">info@fullmuscle-equipment.com</a><a class="contact-web" href="https://fullmuscle-equipment.com">fullmuscle-equipment.com</a></div><div class="qr-area"><a href="${url}"><img class="qr" src="../assets/brand/qr-catalogo.svg" alt="QR catalogo completo G5"></a><div><h3>Tutta la linea G5,<br>sempre con te.</h3><p>Scansiona il QR e apri il catalogo completo in PDF.</p></div></div><p class="contact-bottom">Catalogo B2B · Preventivo su richiesta.<br>Dimensioni espresse come lunghezza × profondità × altezza.</p></div>`,n,{digital,cls:'contact'});}

const grouped=[...catalogue.products].sort((a,b)=>a.category.localeCompare(b.category,'it')||a.sku.localeCompare(b.sku,'it',{numeric:true}));
const categoryPages=new Map();grouped.forEach((p,i)=>{if(!categoryPages.has(p.category))categoryPages.set(p.category,{page:3+Math.floor(i/2),count:grouped.filter(x=>x.category===p.category).length});});
function catalogueIntro(){return page(`<div class="inner">${top()}<p class="eyebrow" style="margin-top:13mm">Catalogo completo G5</p><h1 class="display intro-title">Trova il modello<br>per il tuo progetto.</h1><p class="intro-copy">${catalogue.products.length} modelli della linea G5, organizzati per tipologia. Ogni scheda riunisce codice, descrizione, caratteristiche e dati tecnici disponibili.</p><nav class="catalogue-index">${[...categoryPages].map(([name,data])=>`<a href="#page-${data.page}"><b>${esc(name)}</b><span>${data.count} modelli · p. ${data.page}</span></a>`).join('')}</nav><div class="catalogue-info"><p><strong>Come leggere le schede</strong><br>Le dimensioni sono indicate in millimetri, nell’ordine lunghezza × profondità × altezza. Il peso macchina è distinto dal pacco pesi. Per le stazioni multifunzione i carichi sono riportati per singola stazione quando disponibili.</p><p>I valori indicati come “su richiesta” sono da confermare in fase di preventivo. Le immagini mostrano una proposta di personalizzazione Full Muscle. Finiture, accessori e carichi raffigurati vanno verificati nella configurazione richiesta.</p><p><strong>Un riferimento semplice.</strong><br>Comunica il codice Full Muscle del modello e la quantità desiderata: Matteo · 392 550 1779 · info@fullmuscle-equipment.com.</p></div></div>`,2,{digital:true,cls:'catalogue-intro'});}
function catalogueCard(p){if(!p)return `<div class="catalogue-card empty-card">La tua selezione<br>comincia da qui.</div>`;const rows=technicalRows(p);const features=p.features.filter(f=>!p.description.toLocaleLowerCase('it').includes(f.toLocaleLowerCase('it')));return `<article class="catalogue-card ${rows.length>7?'many-specs':''}" data-sku="${esc(p.sku)}"><header class="catalogue-card-head"><div><p class="product-code">${esc(p.sku)}</p><h2>${esc(p.name)}</h2></div><span class="category-chip">${esc(p.category)}</span></header><div class="catalogue-card-body"><div class="catalogue-visual"><div class="catalogue-image">${img(p.sku,63,60,'product-photo')}</div>${priceBlock(p)}</div><div><p class="catalogue-description">${esc(p.description)}</p><div class="catalogue-specs">${rows.map(r=>`<div class="catalogue-spec"><span>${esc(r.label)}</span><b>${esc(r.value)}</b></div>`).join('')}</div><p class="catalogue-features">${esc(features.slice(0,2).join(' · '))}</p></div></div></article>`;}
function cataloguePages(){const out=[];for(let i=0;i<grouped.length;i+=2)out.push(page(`<div class="inner">${top()}<div class="catalogue-cards">${catalogueCard(grouped[i])}${catalogueCard(grouped[i+1])}</div></div>`,3+i/2,{digital:true,cls:'catalogue-products'}));return out;}
const brochure=[cover(),brochureIntro(),...catalogue.featuredSkus.map((sku,i)=>featured(catalogue.products.find(p=>p.sku===sku),3+i)),project(),contact(12)];
const full=[cover(true),catalogueIntro(),...cataloguePages(),contact(3+Math.ceil(grouped.length/2),true)];
const html=(pages,title,digital)=>`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{size:${digital?'210mm 297mm':'216mm 303mm'};margin:0}${css}\n.mini-logo svg,.cover-logo svg{width:100%;height:100%;display:block}.many-specs .catalogue-spec{padding:1mm 0;font-size:7.4pt}.many-specs .catalogue-description{font-size:8.5pt;margin-bottom:2mm}.many-specs .catalogue-features{font-size:7.4pt;margin-top:2mm}</style></head><body>${proof?'<div class="proof-banner">BOZZA INTERNA · immagini in completamento</div>':''}${pages.join('\n')}</body></html>`;
const docs=[{key:'brochure',name:'brochure-stampa',title:'Full Muscle G5 · Selezione professionale',pages:brochure,digital:false}];
if(!onlyBrochure)docs.push({key:'catalogo',name:'catalogo-completo',title:'Full Muscle G5 · Catalogo completo',pages:full,digital:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
const results=[];
try{
for(const doc of docs){
  const htmlPath=path.join(base,'layout',`${doc.key}.html`);await fs.writeFile(htmlPath,html(doc.pages,doc.title,doc.digital));
  const tab=await browser.newPage({viewport:{width:1200,height:1500},deviceScaleFactor:1});
  await tab.goto(pathToFileURL(htmlPath).href,{waitUntil:'networkidle'});
  await tab.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  await tab.emulateMedia({media:'print'});
  const expectedProducts=doc.digital?catalogue.products:catalogue.featuredSkus.map(sku=>catalogue.products.find(p=>p.sku===sku));
  const inspected=await tab.evaluate((expectedPrices)=>{
    const imageChecks=[...document.querySelectorAll('img[data-asset]')].map(img=>{const r=img.getBoundingClientRect(),contain=getComputedStyle(img).objectFit==='contain';const scale=(contain?Math.min:Math.max)(r.width/img.naturalWidth,r.height/img.naturalHeight);return {asset:img.dataset.asset,page:Number(img.closest('.page').dataset.page),loaded:img.complete&&img.naturalWidth>0,ppi:Math.round(96/scale),widthMm:Number((r.width*25.4/96).toFixed(2)),heightMm:Number((r.height*25.4/96).toFixed(2))};});
    const overflow=[];
    for(const page of document.querySelectorAll('.page')){const trim=page.querySelector('.trim').getBoundingClientRect();for(const el of page.querySelectorAll('.inner p,.inner h1,.inner h2,.inner h3,.contents,.feature-grid,.catalogue-card-body,.qr-area,.steps')){const r=el.getBoundingClientRect();if(r.bottom>trim.bottom-12*96/25.4||r.left<trim.left+10*96/25.4||r.right>trim.right-10*96/25.4)overflow.push({page:page.dataset.page,tag:el.className||el.tagName,text:el.textContent.slice(0,100),bottomMm:(r.bottom-trim.top)*25.4/96});}}
    for(const page of document.querySelectorAll('.featured')){const aside=page.querySelector('.product-stage aside').getBoundingClientRect();const text=page.querySelector('.product-description').getBoundingClientRect();if(aside.bottom>text.top-5)overflow.push({page:page.dataset.page,tag:'product-stage aside',text:'Technical panel or scene overlaps description'});}
    for(const card of document.querySelectorAll('.catalogue-card')){const body=card.querySelector('.catalogue-card-body');if(body&&body.getBoundingClientRect().bottom>card.getBoundingClientRect().bottom-2)overflow.push({page:card.closest('.page').dataset.page,tag:'catalogue-card-body',text:card.dataset.sku+' card content exceeds allotted space'});}
    const priceElements=[...document.querySelectorAll('[data-price-sku]')];
    const normalize=text=>text.replace(/\s+/g,' ').trim();
    const entries=priceElements.map(el=>({sku:el.dataset.priceSku,amountEur:Number(el.dataset.priceEur),text:normalize(el.textContent)}));
    const priceIssues=[];
    if(entries.length!==expectedPrices.length)priceIssues.push('Unexpected rendered price count');
    for(const expected of expectedPrices){
      const matches=entries.filter(entry=>entry.sku===expected.sku);
      if(matches.length!==1){priceIssues.push(`Expected one price for ${expected.sku}, found ${matches.length}`);continue;}
      const actual=matches[0];
      if(actual.amountEur!==expected.amountEur||actual.text!==normalize(expected.text)||!actual.text.endsWith('+ IVA'))priceIssues.push(`Incorrect rendered price for ${expected.sku}`);
    }
    for(const [index,el] of priceElements.entries()){
      const entry=entries[index];
      const container=el.closest('.catalogue-card,.featured');
      const containerSku=container?.dataset.sku||container?.querySelector('.product-code')?.textContent;
      if(!expectedPrices.some(expected=>expected.sku===entry.sku)||entry.sku!==containerSku)priceIssues.push(`Unexpected price association: ${entry.sku}`);
      const r=el.getBoundingClientRect();
      const value=el.querySelector('strong')?.getBoundingClientRect();
      const style=getComputedStyle(el);
      if(!r.width||!r.height||style.visibility==='hidden'||style.display==='none')priceIssues.push(`Invisible price for ${entry.sku}`);
      if(el.scrollWidth>el.clientWidth+1||value&&(value.left<r.left-1||value.right>r.right+1))overflow.push({page:el.closest('.page').dataset.page,tag:'product-price',text:entry.sku+' price exceeds allotted width'});
      const visual=el.closest('.catalogue-visual');
      if(visual){
        const image=visual.querySelector('.catalogue-image').getBoundingClientRect();
        const card=container.getBoundingClientRect();
        if(image.bottom>r.top+1||r.bottom>card.bottom-2)overflow.push({page:el.closest('.page').dataset.page,tag:'product-price',text:entry.sku+' price overlaps image or exceeds card'});
      }
    }
    const priceChecks={expectedCount:expectedPrices.length,renderedCount:entries.length,entries,issues:priceIssues};
    return {pages:document.querySelectorAll('.page').length,images:imageChecks,overflow,priceChecks,fontStatus:document.fonts.status,text:document.body.textContent};
  },expectedProducts.map(p=>({sku:p.sku,amountEur:p.listPriceEur,text:formatListPrice(p.listPriceEur)})));
  const raw=await tab.pdf({preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,tagged:true,outline:true});
  const pdf=await PDFDocument.load(raw);
  pdf.setTitle(doc.title);pdf.setAuthor('FullMuscle Equipment');pdf.setSubject('Attrezzature professionali · Serie G5');pdf.setCreator('FullMuscle · impaginazione editoriale');pdf.setProducer('FullMuscle / Chromium + pdf-lib');pdf.setLanguage('it-IT');
  for(const page of pdf.getPages()){if(!doc.digital){page.setTrimBox(pt(3),pt(3),pt(210),pt(297));page.setBleedBox(0,0,pt(216),pt(303));}else{page.setTrimBox(0,0,pt(210),pt(297));page.setBleedBox(0,0,pt(210),pt(297));}}
  if(doc.digital)addOutlines(pdf,[{title:'Indice',page:1},...[...categoryPages].map(([title,d])=>({title,page:d.page-1})),{title:'Contatti',page:pdf.getPageCount()-1}]);
  const filename=`${doc.name}${proof?'-bozza':''}.pdf`;const pdfBytes=await pdf.save();await fs.writeFile(path.join(outputs,filename),pdfBytes);
  const pagesDir=path.join(proofDir,doc.key);await fs.mkdir(pagesDir,{recursive:true});
  for(let i=0;i<doc.pages.length;i++)await tab.locator('.page').nth(i).screenshot({path:path.join(pagesDir,`${String(i+1).padStart(2,'0')}.png`),animations:'disabled'});
  const embeddedFonts=[];
  for(const [ref,obj] of pdf.context.enumerateIndirectObjects()){if(obj instanceof PDFDict&&obj.get(PDFName.of('Type'))?.toString()==='/FontDescriptor'){embeddedFonts.push({reference:ref.toString(),name:obj.get(PDFName.of('FontName'))?.toString(),embedded:['FontFile','FontFile2','FontFile3'].some(k=>obj.has(PDFName.of(k)))});}}
  const badImages=inspected.images.filter(i=>!i.loaded||i.ppi<239);
  const checks={filename,pages:pdf.getPageCount(),expectedPages:doc.pages.length,format:doc.digital?'A4 210 × 297 mm':'A4 trim 210 × 297 mm / bleed 216 × 303 mm',colorSpace:'RGB / sRGB image assets; not certified PDF/X',embeddedFonts,images:inspected.images,overflow:inspected.overflow,issues:[...badImages.map(i=>`Image ${i.asset} page ${i.page}: ${i.loaded?i.ppi+' ppi':'missing'}`),...inspected.overflow.map(o=>`Content exceeds safety area on page ${o.page}: ${o.tag}`)],sha256:hash(pdfBytes),bytes:pdfBytes.length};
  if(inspected.pages!==doc.pages.length||pdf.getPageCount()!==doc.pages.length)checks.issues.push('Unexpected PDF page count');
  if(embeddedFonts.some(f=>!f.embedded))checks.issues.push('Unembedded fonts found');
  checks.priceChecks=inspected.priceChecks;
  checks.issues.push(...inspected.priceChecks.issues);
  if(/tzfit|tianzhan|\bTZ\s?FIT(?:NESS)?\b/i.test(inspected.text))checks.issues.push('Supplier identity present in customer text');
  if(/\bscont\w*\b|\bdiscount\b|commercialDiscountRate|35\s*%/i.test(inspected.text))checks.issues.push('Internal commercial discount present in customer text');
  results.push(checks);await tab.close();
  await contactSheet(pagesDir,path.join(proofDir,`${doc.key}-contact-sheet.jpg`),doc.pages.length);
}
}finally{await browser.close();}
const report={generatedAt:new Date().toISOString(),mode:proof?'internal-proof':'final-export',catalogModels:catalogue.products.length,pricingInputs,brochureModels:catalogue.featuredSkus,originalSourcesModified:false,pendingImages:pending,qr:{destination:url,encoded:true,publicHttpStatus:'not-verified',physicalPrintScan:'not-performed'},print:{trimMm:[210,297],bleedMm:3,safeMarginMm:12,minimumImagePpi:240,targetImagePpi:300,profile:'sRGB; printer-specific CMYK/PDF-X conversion pending printer requirements',imposition:'single pages in reading order'},documents:results,assets:sourcePaths,issues:results.flatMap(d=>d.issues.map(s=>`${d.filename}: ${s}`))};
await fs.writeFile(path.join(outputs,`preflight${proof?'-bozza':''}.json`),JSON.stringify(report,null,2));
if(!proof&&report.issues.length===0&&!onlyBrochure){await fs.mkdir(path.join(root,'public/cataloghi'),{recursive:true});await fs.copyFile(path.join(outputs,'catalogo-completo.pdf'),path.join(root,'public/cataloghi/fullmuscle-g5.pdf'));}
console.log(JSON.stringify({mode:report.mode,documents:results.map(d=>({file:d.filename,pages:d.pages,bytes:d.bytes,issues:d.issues})),pendingImages:pending.length},null,2));
if(report.issues.length&&!proof)process.exitCode=1;

function addOutlines(pdf,entries){const rootRef=pdf.context.nextRef();const refs=entries.map(()=>pdf.context.nextRef());const pages=pdf.getPages();for(let i=0;i<entries.length;i++){const e=entries[i];pdf.context.assign(refs[i],pdf.context.obj({Title:PDFString.of(e.title),Parent:rootRef,...(i?{Prev:refs[i-1]}:{}),...(i+1<refs.length?{Next:refs[i+1]}:{}),Dest:[pages[e.page].ref,PDFName.of('Fit')]}));}pdf.context.assign(rootRef,pdf.context.obj({Type:'Outlines',First:refs[0],Last:refs.at(-1),Count:entries.length}));pdf.catalog.set(PDFName.of('Outlines'),rootRef);pdf.catalog.set(PDFName.of('PageMode'),PDFName.of('UseOutlines'));}
async function contactSheet(dir,destination,count){const width=240,height=340,cols=4,rows=Math.ceil(count/cols);const tiles=[];for(let i=0;i<count;i++){const image=await sharp(path.join(dir,`${String(i+1).padStart(2,'0')}.png`)).resize(width,height,{fit:'contain',background:'#e5e9e1'}).toBuffer();tiles.push({input:image,left:(i%cols)*width,top:Math.floor(i/cols)*height});}await sharp({create:{width:cols*width,height:rows*height,channels:3,background:'#e5e9e1'}}).composite(tiles).jpeg({quality:88}).toFile(destination);}
