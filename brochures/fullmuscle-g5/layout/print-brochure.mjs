import {printPages, printSkus, commonTechnicalRows, commonSpecLabels, validatePrintPlan} from '../content/print-plan.mjs';

const shortDescriptions = {
  '5001': 'Flessione del ginocchio da seduti.',
  '5002': 'Estensione del ginocchio per i quadricipiti.',
  '5014': 'Movimento di chiusura delle gambe.',
  '5033': 'Movimento di apertura delle gambe.',
  '5012': 'Spinta sopra la testa da seduti.',
  '5010': 'Alzate laterali per i deltoidi.',
  '5007': 'Chiusura delle braccia per il petto.',
  '5047': 'Croci e aperture posteriori in una postazione.',
  '5004': 'Remata con appoggio toracico.',
  '5019': 'Trazioni e dip con assistenza a pacco pesi.',
  '5046': 'Flessione del gomito per i bicipiti.',
  '5011': 'Estensione del gomito per i tricipiti.',
  '5024': 'Schienale a inclinazione regolabile.',
  '5023': 'Supporti per il lavoro con bilanciere.',
  '5031': 'Appoggio per esercizi con pesi liberi.',
  '5051': 'Postazione squat con bilanciere.',
  '5013': 'Organizzazione della zona manubri.',
  '5028': 'Supporti per riporre i dischi.',
};

export function renderPrintBrochure({catalogue, page, top, logo, img, scene, priceBlock, technicalRows, esc, url}) {
  validatePrintPlan(catalogue);
  const bySku = new Map(catalogue.products.map(product => [product.sku, product]));
  const contact = catalogue.contact;
  const wrap = (content, number, cls, dark = false) => page(`<div class="inner">${content}</div>`, number, {cls: `print-brochure ${cls}`, dark});
  const spec = (row, cls = '') => `<div class="print-spec ${cls}" data-spec-label="${esc(row.label)}" data-spec-value="${esc(row.value)}"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`;
  const heading = (eyebrow, title, subtitle = '') => `<header class="print-page-heading"><p class="eyebrow">${esc(eyebrow)}</p><h1 class="display">${esc(title)}</h1>${subtitle ? `<p class="print-subtitle">${esc(subtitle)}</p>` : ''}</header>`;
  const numberFor = code => printPages.findIndex(entry => entry.skus.includes(`FM-GC-${code}`)) + 1;

  function cover(number) {
    return wrap(`${logo(true, 'cover-logo')}<p class="print-edition">Selezione professionale<br>Edizione italiana</p><p class="eyebrow print-cover-kicker">Attrezzature per la tua area forza</p><h1 class="display print-cover-title">G5</h1><h2 class="display print-cover-subtitle">La forza prende forma.</h2><div class="print-cover-image">${scene('gym-project', 176, 116)}<p class="render-caption">Rendering illustrativo di ambientazione.</p></div><div class="print-cover-bottom"><p>Dalla planimetria alla fornitura.<br>Una selezione per la tua palestra.</p><div class="print-count">${printSkus.length}<span>modelli selezionati</span></div></div>`, number, 'print-cover', true);
  }

  function intro(number) {
    const index = [
      ['Gambe e glutei', numberFor('5016'), 'Pressa, flessione, estensione e anche'],
      ['Petto e spalle', numberFor('5005'), 'Spinte e aperture'],
      ['Schiena e braccia', numberFor('5008'), 'Trazioni, remata e lavoro specifico'],
      ['Cavi e multifunzione', numberFor('5090'), 'Una postazione, più possibilità'],
      ['Panche, rack e accessori', numberFor('5024'), 'La dotazione dei pesi liberi'],
      ['Core', numberFor('5015'), 'Una postazione per gli addominali'],
    ];
    return wrap(`${top()}${heading('La linea Full Muscle G5', 'Dalle macchine alla tua palestra.')}<p class="print-intro-lead">${printSkus.length} modelli per comporre la tua area forza: macchine a pacco pesi, cavi, panche e accessori. Una selezione da valutare insieme agli spazi, alle attività e al budget.</p><div class="print-service-band"><b>Il progetto accompagna la fornitura.</b><p>Interior design, disposizione dei macchinari e rendering sono inclusi nella fornitura.</p></div><nav class="print-index">${index.map(([title, destination, description]) => `<a href="#page-${destination}"><div><b>${esc(title)}</b><span>${esc(description)}</span></div><strong>${String(destination).padStart(2, '0')}</strong></a>`).join('')}</nav><p class="print-intro-note">I prezzi indicati sono di listino, IVA esclusa. Dimensioni espresse in millimetri, nell’ordine lunghezza × profondità × altezza. Scansiona il QR sul retro per consultare il catalogo completo della linea G5.</p>`, number, 'print-intro');
  }

  function featured(product, number) {
    const human = product.sku === 'FM-GC-5016' ? 'legpress-training' : product.sku === 'FM-GC-5005' ? 'chest-training' : null;
    return wrap(`${top()}<article class="print-product print-feature-product" data-sku="${esc(product.sku)}"><header class="product-heading"><p class="product-code">${esc(product.sku)}</p><h1 class="product-title">${esc(product.name)}</h1><p class="product-category">${esc(product.category)} / Serie G5</p></header><div class="product-stage"><div class="product-image-area">${img(product.sku, 105, 132, 'product-photo')}</div><aside><div class="spec-panel"><h2 class="panel-title">Dati tecnici</h2>${technicalRows(product).map(row => spec(row)).join('')}</div>${priceBlock(product)}${human ? `<div class="training-scene">${scene(human, 62, 32)}<p class="render-caption">Rendering illustrativo.</p></div>` : ''}</aside></div><p class="product-description">${esc(product.description)}</p><div class="print-feature-strip"><span>LA TUA SELEZIONE</span><p>Comunica il codice del modello e la quantità desiderata. Definiamo insieme la dotazione per la tua palestra.</p></div></article>`, number, 'featured print-featured');
  }

  function card(product, compact) {
    const rows = technicalRows(product).filter(row => !compact || !commonSpecLabels.includes(row.label));
    return `<article class="print-product print-card" data-sku="${esc(product.sku)}"><header class="print-card-heading"><p class="product-code">${esc(product.sku)}</p><h2>${esc(product.name)}</h2></header><div class="print-card-image">${img(product.sku, 78, compact ? 25 : 42, 'product-photo')}</div><p class="print-card-description">${esc(shortDescriptions[product.sku.replace('FM-GC-', '')])}</p><div class="print-card-specs">${rows.map(row => spec(row, row.label.startsWith('Dimensioni') ? 'print-dimensions' : ['Peso macchina', 'Pacco pesi'].includes(row.label) ? 'print-load' : 'print-material')).join('')}</div>${priceBlock(product)}</article>`;
  }

  function grid(entry, number) {
    const products = entry.skus.map(code => bySku.get(code));
    const compact = products.length === 6;
    const common = compact ? `<aside class="print-common-specs"><h2>Caratteristiche comuni ai sei modelli</h2><div>${commonTechnicalRows(products).map(row => spec(row)).join('')}</div></aside>` : '';
    return wrap(`${top()}${heading(entry.eyebrow, entry.title, entry.subtitle)}<div class="print-cards">${products.map(product => card(product, compact)).join('')}</div>${common}`, number, `print-grid ${compact ? 'print-six' : 'print-four'}`);
  }

  function ambient(entry, number) {
    const renewal = entry.variant === 'renewal';
    const title = renewal ? 'Dai spazio alla prossima fase della tua palestra.' : 'La tua palestra, dalla planimetria alla fornitura.';
    const copy = renewal
      ? 'Un rinnovo o un ampliamento parte da ciò che hai già. Valutiamo le attrezzature da mantenere e le nuove aree da sviluppare, con il supporto del progettista.'
      : 'Partiamo dai tuoi spazi, dai tuoi obiettivi e dal tuo budget. Interior design, disposizione dei macchinari e rendering sono inclusi nella fornitura.';
    return wrap(`${logo(true)}<p class="eyebrow print-ambient-kicker">${renewal ? 'Rinnovo e ampliamento' : 'Dallo spazio al progetto'}</p><h1 class="display print-ambient-title">${title}</h1><div class="print-ambient-image">${scene(entry.scene, 176, 116)}<p class="render-caption">Rendering illustrativo di ambientazione.</p></div><div class="print-ambient-text"><p>${copy}</p><b>${renewal ? 'Raccontaci cosa vuoi migliorare.' : 'Parliamo della tua palestra.'}</b></div>`, number, `print-ambient ${renewal ? 'print-renewal' : 'print-project'}`, true);
  }

  function process(number) {
    return wrap(`${top()}${heading('Dalla selezione al progetto', 'Ogni macchina trova posto nel tuo progetto.')}<p class="print-process-lead">Organizziamo la proposta per aree, quantità e priorità, mettendo in relazione la dotazione con lo spazio disponibile e l’investimento previsto.</p><div class="print-process-steps"><section><span>01</span><div><h2>Spazi e obiettivi</h2><p>Partiamo dalla planimetria, dalle attività che vuoi offrire, dal budget e dai tempi desiderati.</p></div></section><section><span>02</span><div><h2>Progettazione e dotazione</h2><p>Interior design, disposizione delle attrezzature e rendering sono inclusi nella fornitura.</p></div></section><section><span>03</span><div><h2>Proposta commerciale</h2><p>Definiamo modelli, quantità e condizioni del progetto e della fornitura con il tuo referente.</p></div></section></div><div class="print-process-callout"><h2>Hai già uno spazio in mente?</h2><p>Raccontaci il progetto. Nel confronto con il referente raccoglieremo la planimetria e le informazioni utili alla proposta.</p></div>`, number, 'print-process');
  }

  function contactPage(number) {
    return wrap(`${logo(false, 'cover-logo')}<p class="eyebrow print-contact-kicker">Full Muscle Equipment</p><h1 class="display print-contact-title">Parliamo della tua palestra.</h1><p class="print-contact-copy">Nuova apertura, rinnovo o ampliamento: confrontiamoci sui tuoi spazi e sulla dotazione che vuoi realizzare.</p><div class="print-contact-person"><h2>${esc(contact.name)}</h2><a class="print-contact-phone" href="tel:${esc(contact.phoneLink)}">${esc(contact.phone)}</a><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a><a href="${esc(contact.website)}">${esc(contact.website.replace(/^https?:\/\//, ''))}</a></div><div class="print-contact-qr"><a href="${esc(url)}"><img src="../assets/brand/qr-catalogo.svg" alt="QR catalogo completo G5"></a><div><h2>Tutta la linea G5,<br>sempre con te.</h2><p>Scansiona il QR e consulta il catalogo completo in PDF.</p></div></div><p class="print-contact-note">Catalogo B2B · Prezzi di listino + IVA.<br>Configurazioni, finiture e condizioni da definire nella proposta.</p>`, number, 'print-contact');
  }

  return printPages.map((entry, index) => {
    const number = index + 1;
    switch (entry.type) {
      case 'cover': return cover(number);
      case 'intro': return intro(number);
      case 'featured': return featured(bySku.get(entry.skus[0]), number);
      case 'grid': return grid(entry, number);
      case 'scene': return ambient(entry, number);
      case 'process': return process(number);
      case 'contact': return contactPage(number);
      default: throw new Error(`Unknown print page type: ${entry.type}`);
    }
  });
}
