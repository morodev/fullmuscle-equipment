# Strategia tecnologica e SEO — FullMuscle Equipment

**Stato:** decisione approvata  
**Data:** 12 settembre 2026  
**Obiettivo:** sito aziendale B2B bilingue con catalogo e richiesta di preventivo, senza acquisto online e senza prezzi nella prima pubblicazione.

**Stato implementazione:** 744 prodotti in italiano e inglese, paginazione HTML, ricerca Pagefind, pagine categoria e linea, tre guide tecniche bilingue, pagina showroom, sitemap con immagini e protezione `noindex` fino alla build di pubblicazione. Il dominio canonical approvato è `fullmuscle-equipment.com`; il server Node applica i redirect permanenti da HTTP, `www` e `.it` prima di servire anche le pagine prerenderizzate.

## 1. Sintesi della decisione

Il sito verrà sviluppato con **Astro e TypeScript**, usando pagine prerenderizzate e piccoli componenti React soltanto per le funzioni realmente interattive. Un importatore ripetibile trasformerà il catalogo ricevuto in CSV e i relativi asset in contenuti tipizzati; nella prima versione non sono necessari né un CMS né un database.

L’architettura scelta è:

- **Astro** per routing, rendering, pagine e componenti;
- **TypeScript in modalità strict** per ridurre errori nei dati del catalogo;
- **Astro Content Collections** per prodotti, linee, categorie e contenuti localizzati;
- **pipeline di importazione validata** da sito sorgente, cataloghi e CSV per gestire i 744 prodotti iniziali e crescere oltre senza inserimenti ripetitivi;
- **Pagefind** per ricerca statica bilingue e filtri del catalogo;
- **Tailwind CSS** e variabili CSS per il design system responsive;
- **React islands** per filtri, selettore lingua e lista “Aggiungi alla richiesta”;
- **Astro Actions + Zod** per validare e inviare il form dal server;
- **Nodemailer tramite SMTP autenticato Hostinger** per la consegna delle richieste;
- **Cloudflare Turnstile**, honeypot e rate limiting per ridurre lo spam;
- **Hostinger Business Web Hosting**, con deploy da GitHub e runtime Node.js;
- **Google Search Console** per indicizzazione, query, copertura e Core Web Vitals.

Tutte le pagine pubbliche devono contenere nell’HTML iniziale testi, link e metadati completi. Google considera il rendering server-side o il prerendering una buona soluzione per utenti e crawler, anche se è in grado di eseguire JavaScript ([Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).

La tecnologia crea una base SEO molto forte, ma non può garantire la prima posizione. Google dichiara esplicitamente che non esistono tecniche capaci di portare automaticamente un sito al primo posto e attribuisce grande peso a contenuti utili, originali e affidabili ([Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Helpful Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)).

## 2. Requisiti e vincoli iniziali

| Area | Decisione |
| --- | --- |
| Modello commerciale | Catalogo consultabile con richiesta di preventivo; nessun pagamento o checkout |
| Catalogo iniziale | 744 prodotti, organizzati per categorie e linee/serie |
| Prezzi | Non pubblicati nella prima versione; configurazioni e quotazioni vengono gestite nel preventivo |
| Pubblico | Palestre, hotel, resort, studi personal trainer, fisioterapisti e altre strutture professionali |
| Mercato | Europa |
| Lingue iniziali | Italiano e inglese |
| Aggiornamento contenuti | Importazione controllata da CSV, con modifiche tecniche nel repository |
| Lead | Invio via email; nessun archivio lead o CRM nella prima versione |
| Hosting attuale | Hostinger Premium Web Hosting |
| Misurazione iniziale | Google Search Console; Google Analytics rinviato |

Il riferimento “come Technogym” viene interpretato come livello qualitativo: fotografia di prodotto dominante, ampio respiro visivo, tipografia curata, animazioni controllate, navigazione per linee e utilizzi, schede tecniche complete e percorso di contatto semplice. Grafica, testi, fotografie e struttura non dovranno copiare quelli di Technogym.

## 3. Confronto delle alternative

I punteggi da 1 a 5 sono una valutazione progettuale relativa a questo sito, non benchmark assoluti.

| Soluzione | Prestazioni e SEO | Catalogo content-first | Manutenzione | Interattività | Multilingua | Hostinger | Totale pesato |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Astro + React islands** | 5 | 5 | 5 | 4 | 5 | 4 | **4,75/5** |
| Next.js | 4 | 4 | 3 | 5 | 5 | 4 | 4,10/5 |
| WordPress/WooCommerce | 3 | 4 | 3 | 4 | 4 | 5 | 3,65/5 |
| HTML/CSS/JS manuale | 5 | 3 | 2 | 2 | 2 | 5 | 3,40/5 |

### Perché Astro

Astro è pensato per siti ricchi di contenuti e genera pagine statiche per impostazione predefinita. Il browser riceve poco JavaScript, mentre i componenti interattivi vengono attivati solo dove servono. Le Content Collections possono leggere Markdown, MDX, YAML o JSON e validare i dati con uno schema tipizzato ([documentazione Astro](https://docs.astro.build/en/guides/content-collections/)).

Questo coincide con la natura del progetto: 1.488 schede prodotto localizzate prerenderizzabili, aggiornamenti a lotti e poche funzioni applicative. Le Content Collections supportano sorgenti locali o remote, validazione dello schema e collezioni di decine di migliaia di elementi ([Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)).

### Perché non Next.js come prima scelta

Next.js è una soluzione ottima quando gran parte del prodotto è un’applicazione React: area riservata, configuratori complessi, account, dati dinamici e numerose integrazioni. In questa prima versione aggiungerebbe convenzioni e runtime non necessari alla maggior parte delle pagine. Rimane una possibile evoluzione soltanto se il sito diventerà in futuro una vera applicazione o un ecommerce.

### Perché non WordPress/WooCommerce

Il progetto non richiede un pannello editoriale e non vende online. WordPress e WooCommerce introdurrebbero database, plugin, aggiornamenti di sicurezza, caching e funzionalità di checkout che non risolvono un bisogno attuale. Un CMS potrà essere aggiunto in seguito come sorgente headless senza riscrivere il frontend.

### Perché non sviluppo manuale senza framework

HTML e JavaScript manuali potrebbero produrre pagine veloci, ma renderebbero più fragile la gestione di 500 prodotti, due lingue, URL, sitemap, metadati e collegamenti tra contenuti. Astro offre questa automazione mantenendo un output leggero.

## 4. Architettura applicativa

### Rendering

L’applicazione userà l’adapter Node di Astro, prerenderizzando le pagine pubbliche e lasciando on-demand soltanto le route server necessarie:

- homepage, catalogo, linee, categorie, prodotti, soluzioni e pagine aziendali vengono **prerenderizzati durante la build**;
- l’endpoint della richiesta preventivo viene **eseguito sul server**;
- filtri e lista richiesta funzionano nel browser mediante componenti React caricati soltanto nelle pagine che li usano;
- contenuti e navigazione di base rimangono disponibili anche prima del caricamento di JavaScript.

Questa separazione mantiene stabile il catalogo sotto carico e limita il codice server alla sola funzione che ne ha bisogno.

### Struttura delle pagine

La prima versione deve prevedere almeno:

- homepage;
- catalogo generale;
- pagina per ogni linea;
- pagina per ogni categoria;
- scheda di ogni prodotto;
- soluzioni per apertura di una nuova palestra;
- soluzioni per rinnovo e ampliamento di una palestra;
- soluzioni per hotel e resort;
- soluzioni per studi personal trainer e fisioterapia;
- azienda, contatti, privacy e cookie policy;
- pagina della lista richiesta e conferma dell’invio.

Le pagine “Soluzioni” sono necessarie per rispondere a ricerche commerciali come “attrezzatura per apertura nuova palestra”. Il catalogo copre invece ricerche su linee, categorie, caratteristiche e singoli prodotti.

### Organizzazione del catalogo

I contenuti saranno separati dalla presentazione. Ogni prodotto avrà un’identità comune basata su SKU e contenuti localizzati per italiano e inglese. La tassonomia seguirà la gerarchia **categoria → linea/serie → prodotto**: per esempio `Pin Loaded Machine → G5 Series → singolo modello`.

Contratti concettuali di riferimento:

```ts
type Locale = 'it' | 'en';
type PublishStatus = 'draft' | 'published';

interface Product {
  sku: string;
  lineId: string;
  categoryId: string;
  tagIds?: string[];
  images: ProductImage[];
  specifications: Record<string, string | number>;
  priceFrom?: {
    amount: number;
    currency: 'EUR';
    vatIncluded: boolean;
    note?: string;
  };
  featured: boolean;
  availableForQuote: boolean;
}

interface LocalizedProduct {
  sku: string;
  locale: Locale;
  status: PublishStatus;
  reviewed: boolean;
  slug: string;
  name: string;
  summary: string;
  description: string;
  features: string[];
  seoTitle: string;
  seoDescription: string;
  imageAlt: string[];
}

interface CatalogImportRow {
  sourceSku: string;
  model: string;
  categoryId: string;
  lineId: string;
  sourceLocale: Locale;
  sourceName: string;
  sourceDescription?: string;
  specifications: Record<string, string | number>;
  priceFrom?: number;
  imageUrls?: string[];
}

interface AssetManifestEntry {
  sku: string;
  source: string;
  role: 'primary' | 'gallery' | 'detail';
  sortOrder: number;
}

interface ImportReport {
  created: string[];
  updated: string[];
  unchanged: string[];
  rejected: Array<{ sku?: string; reasons: string[] }>;
  missingTranslations: Array<{ sku: string; locale: Locale }>;
  unmatchedAssets: string[];
}

interface QuoteRequest {
  locale: Locale;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    country: string;
  };
  customerType: 'gym' | 'hotel' | 'pt-studio' | 'physiotherapy' | 'other';
  items: Array<{
    sku: string;
    quantity?: number;
  }>;
  message?: string;
  privacyAcknowledged: true;
  turnstileToken: string;
}
```

Lo schema definitivo deve essere validato durante l’importazione e la build. SKU e slug duplicati, riferimenti a categorie o linee inesistenti, immagini senza testo alternativo e prezzi non validi devono interrompere la pubblicazione delle schede coinvolte. Una localizzazione incompleta può esistere come bozza, ma `status: 'published'` richiede tutti i campi obbligatori e `reviewed: true`.

### Pipeline di importazione

La prima sorgente operativa è il catalogo pubblico TZFIT, affiancato dai cataloghi tecnici e, quando disponibile, dal CSV o dal pacchetto distributore. Il rapporto commerciale e il nome del fornitore sono dati interni: non devono comparire negli URL, nei metadati, nel codice HTML, nelle immagini o nei testi del sito pubblico. La procedura completa è descritta in [Catalogo sorgente TZFIT](./catalogo-sorgente-tzfit.md).

L'acquisizione automatica usa pagine e sitemap pubbliche nel rispetto di `robots.txt`; non usa gli endpoint espressamente esclusi. Registra URL sorgente, SKU, tassonomia, testi, specifiche, immagini, data di modifica e hash. I dati originali restano in un inventario interno. Il CSV rimane una sorgente ripetibile e prioritaria quando verrà consegnato: il suo formato sarà mappato verso `CatalogImportRow` senza legare il resto del sito ai nomi delle colonne del fornitore.

Il processo previsto è:

1. eseguire `catalog:crawl --dry-run` su un campione e controllare struttura, limiti e sorgenti;
2. eseguire `catalog:crawl` per aggiornare l'inventario privato e `catalog:diff` per individuare variazioni;
3. integrare gli originali ricevuti come CSV, PDF e archivi immagini;
4. eseguire `catalog:normalize` per produrre esclusivamente bozze FullMuscle;
5. correggere errori bloccanti, collisioni SKU, associazioni e immagini mancanti;
6. riscrivere e revisionare testi italiani e inglesi, quindi validare specifiche e asset;
7. pubblicare soltanto le schede approvate ed eseguire build e anteprima.

La riconciliazione avverrà sempre tramite SKU stabile. Un cambio di nome non deve creare un duplicato; un cambio di slug già pubblicato deve produrre una redirect permanente dalla vecchia URL.

Gli SKU pubblici seguono una trasformazione deterministica: `TZ-5101` diventa `FM-5101`; un codice con altro prefisso riceve `FM-`, per esempio `GS-5001` diventa `FM-GS-5001`. La stessa regola vale per le serie. Una collisione fra due codici sorgente interrompe l'importazione e non viene risolta automaticamente.

Il flusso immagini accetta tre modalità:

- URL nel CSV: l’importatore scarica una volta i file, controlla formato e dimensioni e li conserva nella libreria asset;
- archivio o cartelle: i file che contengono lo SKU nel nome vengono associati automaticamente;
- materiale non riconoscibile: `asset-map.csv` collega manualmente file e SKU soltanto per le eccezioni.

Perciò non sarà necessario caricare a mano ogni immagine. I file privi di associazione, i prodotti senza immagine principale e i download falliti compariranno nel report. Le immagini sorgente saranno normalizzate e le varianti AVIF/WebP responsive verranno prodotte dalla pipeline immagini.

Nella prima fase si possono usare anche le immagini pubbliche del fornitore come materiale provvisorio, dopo download locale e revisione visiva. Un'immagine entra nel catalogo soltanto se non mostra nomi o loghi del fornitore, oppure dopo che quei soli elementi sono stati rimossi e il risultato è stato controllato. Per ora non viene aggiunto il marchio FullMuscle sulle fotografie. Banner promozionali, watermark e immagini dubbie restano esclusi.

Il successivo pacchetto OEM sostituirà gli asset tramite SKU, ruolo e ordine senza cambiare gli URL pubblici dei prodotti. La sua consegna non blocca la prima pubblicazione delle sole schede che dispongono già di un'immagine provvisoria approvata; tutte le altre restano in bozza finché non ricevono un asset pulito o OEM.

I testi acquisiti dal sito del fornitore restano materiale sorgente interno. Le descrizioni pubbliche vengono riscritte per FullMuscle in italiano e inglese; non si importano automaticamente affermazioni sull'azienda produttrice, clienti, anni di attività, fabbrica, garanzie o certificazioni non confermate. Entrambe le lingue restano in bozza fino a revisione e non vengono generate pagine indicizzabili con testi mancanti o non approvati.

Astro permette al loader `file()` di leggere un CSV tramite parser personalizzato e di validare ogni elemento come Content Collection ([Astro Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)).

### Ricerca, filtri e paginazione

Con 744 prodotti la ricerca fa parte della prima versione. **Pagefind** crea dopo ogni build un indice statico del contenuto pubblicato, senza database o servizio di ricerca esterno. Rileva l’attributo `lang` e mantiene indici distinti per italiano e inglese ([Pagefind](https://pagefind.app/docs/), [ricerca multilingue](https://pagefind.app/docs/multilingual/)).

L’indice includerà nome, modello, SKU, testo descrittivo e specifiche ricercabili. Categoria, linea, gruppo muscolare e destinazione d’uso saranno metadati filtrabili. Le pagine di ricerca interna avranno `noindex` e non genereranno combinazioni di filtri indicizzabili.

Le pagine di categoria e linea mostreranno 24 prodotti per pagina, con URL paginati, canonical autoreferenziale e link HTML verso pagina precedente e successiva. Nessuna vista iniziale deve inserire tutte le 500 card nel DOM. Pagefind caricherà soltanto le porzioni dell’indice necessarie alla ricerca.

## 5. Esperienza della richiesta preventivo

Ogni scheda e card prodotto presenta la call to action **“Aggiungi alla richiesta”**. Una barra o un pannello persistente mostra il numero di prodotti selezionati e conduce alla pagina **“Invia richiesta”**.

La selezione viene conservata in `localStorage` usando gli SKU, senza account e senza cookie. L’utente può:

- aggiungere e rimuovere prodotti;
- indicare una quantità orientativa;
- continuare a navigare tra linee e categorie;
- compilare una sola richiesta per più prodotti;
- inviare il form in italiano o inglese.

Il server non deve fidarsi di nomi, prezzi o descrizioni ricevuti dal browser. Prima dell’email, ricostruisce ogni voce dal catalogo usando lo SKU e rifiuta prodotti inesistenti o non richiedibili.

La disponibilità commerciale non viene pubblicata né inviata dal browser: resta un’informazione interna da valutare quando si prepara il preventivo.

Il form sarà implementato con Astro Actions, che supporta validazione Zod e chiamate tipizzate dal client ([Astro Actions](https://docs.astro.build/en/guides/actions/)). La protezione comprende:

- validazione client per l’esperienza utente e validazione server obbligatoria;
- limite alla lunghezza di ogni campo e al numero di prodotti;
- campo honeypot invisibile;
- verifica server del token Cloudflare Turnstile;
- rate limiting per IP o fingerprint tecnico, senza conservarlo oltre la finestra necessaria;
- messaggi di errore che non espongono dettagli interni;
- identificativo tecnico della richiesta nei log, senza registrare il contenuto del messaggio.

L’email verrà inviata tramite SMTP autenticato. Il mittente sarà una casella del dominio aziendale e l’indirizzo del cliente verrà impostato come `Reply-To`, così da preservare SPF/DKIM e la consegna. Hostinger raccomanda SMTP autenticato al posto della funzione PHP `mail()` per affidabilità e sicurezza ([Hostinger: invio SMTP](https://www.hostinger.com/support/11393648-php-mail-limitation-explained-how-to-improve-email-delivery-with-smtp/)).

In caso di successo, la lista viene svuotata soltanto dopo la conferma del server. In caso di errore, rimane disponibile e l’utente può riprovare. Nella prima versione i dati non vengono salvati in un database.

## 6. Multilingua e mercato europeo

Le pagine useranno prefissi coerenti:

```text
/it/
/it/catalogo/
/it/prodotti/{slug}/
/it/soluzioni/{slug}/

/en/
/en/catalogue/
/en/products/{slug}/
/en/solutions/{slug}/
```

La radice `/` sarà una pagina neutra per la scelta della lingua, associata a `hreflang="x-default"`. Non verranno eseguiti redirect obbligatori basati sull’indirizzo IP. Ogni pagina avrà:

- attributo `lang` corretto;
- canonical autoreferenziale;
- alternates reciproci soltanto per le versioni effettivamente pubblicate, oltre a `x-default` quando applicabile;
- collegamento visibile per cambiare lingua;
- titolo, descrizione, slug e contenuto realmente tradotti.

Google raccomanda URL distinti per ogni lingua e annotazioni `hreflang`, invece di cambiare il contenuto dello stesso URL in base a cookie o impostazioni del browser ([Google: siti multilingua](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)).

L’inglese fungerà inizialmente da lingua internazionale. Nuove lingue dovranno essere aggiunte soltanto quando sarà possibile mantenere traduzioni commerciali e tecniche di qualità.

## 7. Strategia SEO

### SEO tecnica

Ogni URL indicizzabile deve includere:

- un solo `h1` descrittivo e una gerarchia semantica dei titoli;
- `title` e meta description unici;
- canonical e alternates localizzati;
- Open Graph e immagine di condivisione;
- breadcrumb HTML e strutturati;
- collegamenti contestuali verso linea, categoria, prodotti correlati e soluzione pertinente;
- stato HTTP corretto, inclusi veri `404` per contenuti inesistenti;
- presenza nelle sitemap XML localizzate;
- immagini con dimensioni dichiarate e testo alternativo utile.

I dati strutturati JSON-LD previsti sono:

- `Organization` per identità, logo, contatti e profili ufficiali;
- `LocalBusiness` soltanto se esiste una sede aperta al pubblico con informazioni verificabili;
- `BreadcrumbList` per la gerarchia di navigazione;
- `Product` per ogni singola scheda prodotto.

Il sito non deve dichiarare un checkout o una merchant listing acquistabile. Google distingue i product snippet, utilizzabili anche per pagine senza acquisto diretto, dalle merchant listing destinate a prodotti acquistabili online ([Google: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)).

Un prezzo “A partire da” può essere inserito nei dati strutturati solo se è visibile nella pagina, aggiornato e rappresentabile senza ambiguità. Quando dipende da una configurazione non definita, è preferibile non pubblicare il prezzo nello schema anziché fornire a Google informazioni fuorvianti. La disponibilità non verrà aggiunta ai dati strutturati. Recensioni e valutazioni verranno marcate soltanto se reali, verificabili e visibili.

### Prestazioni

Obiettivi sul 75° percentile dei dati reali:

- Largest Contentful Paint: massimo 2,5 secondi;
- Interaction to Next Paint: massimo 200 millisecondi;
- Cumulative Layout Shift: massimo 0,1.

Per raggiungerli:

- immagini prodotto in AVIF/WebP, responsive e correttamente dimensionate;
- immagine principale prioritaria, immagini successive lazy-loaded;
- font locali con subset e preload limitato;
- animazioni basate soprattutto su transform e opacity;
- rispetto di `prefers-reduced-motion`;
- nessun video hero pesante caricato automaticamente su rete mobile;
- JavaScript client limitato alle isole interattive;
- asset con hash e cache a lunga durata.

### Contenuti e posizionamento

Le keyword non devono essere ripetute artificialmente. Ogni pagina deve rispondere a un bisogno preciso con contenuti originali, fotografie reali, specifiche complete e prova dell’esperienza dell’azienda.

Il lancio dovrà coprire tre gruppi di intenti:

1. **Prodotto:** attrezzatura palestra, panche, rack, macchine isotoniche, cardio e relative categorie reali.
2. **Progetto:** attrezzare o aprire una nuova palestra, rinnovare una sala pesi, progettare gli spazi.
3. **Settore:** attrezzature per hotel, studi personal trainer e fisioterapia.

La futura sezione “Progetti” dovrà mostrare casi reali con obiettivo, spazio, attrezzature usate, fotografie originali e risultato. Avrà più valore SEO e commerciale di una serie di articoli generici creati soltanto per intercettare keyword.

### Misurazione

La prima versione userà Google Search Console per:

- inviare e monitorare le sitemap;
- controllare indicizzazione e canonical;
- analizzare query, impressioni, clic e posizione media;
- rilevare problemi Core Web Vitals e dati strutturati;
- confrontare pagine e query italiane e inglesi.

Google Analytics 4 non è necessario per indicizzare il sito e non verrà inserito al lancio. Potrà essere aggiunto in seguito, con configurazione privacy adeguata, se servirà misurare percorsi, interazioni e tasso di invio dei preventivi. Search Console rimane la fonte principale per il rendimento nella ricerca Google ([Google: Search Console e Analytics](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console)).

## 8. Design system, responsive e accessibilità

Il design system deve definire colori, caratteri, spaziature, raggi, ombre, transizioni e breakpoint tramite token CSS. Tailwind userà questi token, evitando valori casuali nei componenti.

Principi visivi:

- impostazione premium e tecnica;
- ampie immagini reali delle attrezzature e degli ambienti;
- griglia pulita e molto spazio visivo;
- testi brevi nelle aree promozionali e specifiche dettagliate nelle schede;
- animazioni discrete, funzionali alla gerarchia e mai bloccanti;
- call to action riconoscibili e coerenti;
- confronto chiaro tra linee e destinazioni d’uso.

Il sito seguirà WCAG 2.2 livello AA: contrasto, focus visibile, navigazione da tastiera, label dei form, messaggi di errore associati ai campi, target touch adeguati, ordine semantico e alternative testuali. La versione mobile viene progettata per prima; non sarà una semplice riduzione del layout desktop.

## 9. Hosting e distribuzione

### Piano consigliato

Si raccomanda il passaggio da **Hostinger Premium Web Hosting** a **Business Web Hosting**. Hostinger dichiara il supporto alle applicazioni Astro frontend e backend, alle versioni Node.js supportate dal piano e al deploy automatico da GitHub ([Hostinger: Node.js Web Apps](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)).

L’upgrade non è richiesto dalla SEO: anche un output interamente statico potrebbe essere molto veloce. È consigliato perché permette di mantenere nello stesso progetto TypeScript il sito, la validazione e l’invio del preventivo, evitando un endpoint PHP separato e facilitando future integrazioni CRM.

Il progetto fisserà una versione Node.js LTS supportata da Hostinger e una versione precisa delle dipendenze tramite lockfile.

### Processo di deploy

1. Il codice viene pubblicato su un repository GitHub privato.
2. Pull request e branch principale eseguono build, controlli di tipo e test.
3. Hostinger costruisce e pubblica automaticamente il branch principale.
4. Le credenziali SMTP, le chiavi Turnstile e gli altri segreti sono variabili d’ambiente, mai file versionati.
5. Un ambiente di anteprima o staging usa `noindex` e accesso protetto.
6. Il dominio pubblico usa HTTPS, redirect univoco tra `www` e dominio principale e una sola forma canonica degli URL.

Prima del lancio devono essere configurati e verificati SPF, DKIM e DMARC per il dominio email.

### Costi ricorrenti

La prima versione richiede:

- rinnovo del dominio e delle caselle email;
- piano Hostinger Business;
- eventuale servizio DNS/protezione, se separato.

Non richiede licenze CMS, database, servizio di ricerca esterno, piattaforma ecommerce o abbonamento analytics. Pagefind produce l’indice insieme al sito e non aggiunge infrastruttura runtime. I prezzi Hostinger promozionali cambiano nel tempo: la decisione economica deve considerare il prezzo di rinnovo mostrato nell’account, non soltanto l’offerta iniziale.

Se l’upgrade risultasse sproporzionato, il fallback documentato è Astro completamente statico sul piano Premium più un endpoint PHP minimale con validazione server equivalente, Turnstile e SMTP autenticato. Questa variante evita il blocco del progetto, ma introduce due linguaggi e due pipeline applicative.

## 10. Sicurezza e privacy

La raccolta dati deve essere limitata alle informazioni utili per rispondere alla richiesta. La pagina privacy dovrà spiegare titolare, finalità, dati trattati, destinatari, tempi di conservazione e modalità di esercizio dei diritti, con testo verificato da un professionista competente.

Requisiti tecnici minimi:

- HTTPS obbligatorio e header di sicurezza;
- Content Security Policy compatibile con Turnstile;
- nessun segreto nel browser o nel repository;
- dipendenze aggiornate e monitorate;
- sanitizzazione dei dati inseriti nelle email HTML;
- nessun allegato nella prima versione;
- log tecnici privi del corpo della richiesta;
- messaggi SMTP e credenziali esclusi dagli errori mostrati all’utente;
- eliminazione della lista locale dopo un invio confermato.

Poiché al lancio non vengono usati analytics pubblicitari e la lista prodotti resta nel browser, il banner cookie non deve essere aggiunto automaticamente “per sicurezza”. La necessità effettiva dipenderà dagli strumenti finali incorporati e dalla revisione privacy.

## 11. Verifica e criteri di accettazione

### Contenuti e build

- Il dry run su un catalogo realistico di 500 prodotti produce un report senza modificare i dati normalizzati.
- L’importazione distingue correttamente prodotti creati, modificati, invariati e scartati.
- SKU o slug duplicati, categoria o linea inesistente, prezzi invalidi e asset corrotti vengono segnalati con il prodotto e la causa.
- Una localizzazione in bozza può essere incompleta; una localizzazione pubblicata senza campi obbligatori o revisione blocca la build.
- Ogni localizzazione pubblicata genera la propria pagina; `hreflang` non punta mai a una traduzione assente.
- La sostituzione del CSV aggiorna per SKU senza duplicare prodotti rinominati.
- I cambi di slug già pubblicati generano redirect permanenti verificabili.
- URL immagini, archivi locali, `asset-map.csv`, download falliti e file non associati vengono coperti da test dedicati.
- Ogni pagina indicizzabile compare nella sitemap appropriata.
- Collegamenti interni, canonical e `hreflang` non producono URL inesistenti.

### Percorso utente

- L’utente può filtrare prodotti e navigare per linea su mobile, tablet e desktop.
- La ricerca restituisce risultati soltanto nella lingua attiva e combina correttamente categoria, linea, gruppo muscolare e destinazione d’uso.
- Le liste mostrano 24 elementi per pagina e restano navigabili tramite link HTML.
- Può aggiungere più prodotti, cambiare pagina, aggiornare il browser e mantenere la lista.
- Può modificare quantità, rimuovere prodotti e inviare una richiesta completa.
- Un invio valido produce una sola email leggibile con SKU, nomi e dati del cliente.
- Errori di rete o SMTP non cancellano la selezione.
- Spam, SKU falsi e payload fuori limite vengono rifiutati dal server.

### SEO, prestazioni e accessibilità

- Lighthouse CI: almeno 90 Performance e almeno 95 per Accessibility, Best Practices e SEO sulle pagine campione mobili.
- Nessuno spostamento evidente del layout durante il caricamento delle immagini.
- Navigazione principale e form sono utilizzabili da tastiera e con screen reader.
- I template superano la validazione HTML pertinente.
- I dati strutturati vengono controllati con Rich Results Test prima della pubblicazione.
- URL Inspection conferma che Google riceve contenuto, metadata e link nell’HTML renderizzato.
- Le pagine inesistenti restituiscono `404`, mentre redirect e canonical non creano catene.

I test automatici raccomandati sono:

- controllo tipi TypeScript e build Astro;
- test unitari sugli schemi, sul parser CSV, sulla riconciliazione SKU, sugli asset e sulla normalizzazione della richiesta;
- test Playwright di ricerca, filtri, paginazione, lista persistente, cambio lingua e invio form;
- verifica di tempo e memoria della build con 500 prodotti, due lingue e relativo indice Pagefind;
- controllo automatico dei link interni;
- Lighthouse CI su homepage, categoria, prodotto, soluzione e richiesta.

## 12. Roadmap

### Fase 1 — Fondamenta

Design system, layout bilingue, schema dati, importatore CSV con gestione asset, catalogo, Pagefind, filtri, paginazione, linee, categorie, schede prodotto, pagine Soluzioni, lista richiesta, invio email, SEO tecnica e Search Console.

### Fase 2 — Autorevolezza

Sezione Progetti con installazioni reali, testimonianze verificabili, fotografie originali, ampliamento delle pagine Soluzioni e ottimizzazione basata sulle query Search Console.

### Fase 3 — Automazione

Valutare un CMS headless soltanto quando gli aggiornamenti diventeranno quotidiani o serviranno più redattori non tecnici; collegare un CRM quando il volume dei lead richiederà assegnazione, stato e follow-up; aggiungere nuove lingue soltanto con contenuti professionali; sostituire Pagefind con un servizio di ricerca dedicato solo se emergeranno esigenze non gestibili da un indice statico.

## 13. Assunzioni confermate

- Il catalogo iniziale contiene 744 prodotti; la pipeline non assume un limite fisso.
- I prodotti seguono la gerarchia categoria, linea/serie e singolo modello.
- Il sito non consente ordini o pagamenti.
- I prezzi non vengono pubblicati nella prima versione e non compaiono nei dati strutturati.
- Italiano e inglese sono le sole lingue del lancio.
- Il mercato è europeo e il pubblico è prevalentemente professionale.
- Il catalogo pubblico TZFIT è la sorgente iniziale autorizzata; cataloghi tecnici, CSV e pacchetti distributore hanno priorità quando disponibili.
- Il nome del fornitore e la provenienza OEM restano informazioni interne e non compaiono nel sito pubblico.
- I prodotti acquisiti entrano tutti come bozze. Nessuna scheda, traduzione, immagine, prezzo o dichiarazione commerciale viene pubblicata senza revisione.
- Il materiale aggiuntivo può arrivare come CSV in una sola lingua e con immagini consegnate come URL, archivio o formato non ancora definito.
- CSV e asset vengono acquisiti tramite una pipeline ripetibile; le eccezioni immagini vengono associate con un manifest, senza caricamenti manuali uno per uno.
- Un CMS non è incluso nella prima versione; gli aggiornamenti restano sotto controllo Git e deploy revisionato.
- La disponibilità dei prodotti resta interna e non compare nel sito o nei dati strutturati.
- Le richieste vengono consegnate via email e non archiviate in un database.
- Le pagine Soluzioni e le guide tecniche fanno parte del lancio; la sezione Progetti arriverà quando saranno disponibili installazioni documentate.
- Il sito è predisposto per Google Search Console; la proprietà e la sitemap devono essere attivate sull’account dopo il deploy. GA4 è escluso dalla prima versione.
- L’upgrade Hostinger Business è accettato quando viene avviata l’implementazione.

## 14. Riferimenti ufficiali

- [Astro — Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro — Content Loader API](https://docs.astro.build/en/reference/content-loader-reference/)
- [Astro — Actions](https://docs.astro.build/en/guides/actions/)
- [Astro — Internationalization](https://docs.astro.build/en/guides/internationalization/)
- [Pagefind — Getting Started](https://pagefind.app/docs/)
- [Pagefind — Multilingual Search](https://pagefind.app/docs/multilingual/)
- [Pagefind — Filters](https://pagefind.app/docs/filtering/)
- [Google — JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google — Managing multi-regional and multilingual sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google — Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google — SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google — Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Hostinger — Deploy a Node.js web app](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Hostinger — SMTP instead of PHP mail](https://www.hostinger.com/support/11393648-php-mail-limitation-explained-how-to-improve-email-delivery-with-smtp/)
