# FullMuscle Equipment

Sito corporate e catalogo B2B per attrezzature fitness professionali. Il catalogo consente di filtrare 343 prodotti in 11 categorie, creare una selezione con quantità e inviare una richiesta di preventivo; non gestisce acquisti o pagamenti online.

La priorità commerciale è acquisire richieste per nuove aperture di palestre e forniture complete, seguite da rinnovi e ampliamenti. Centri medicali, fisioterapia e riabilitazione completano l'offerta; gli altri contesti restano accessibili nelle pagine Soluzioni.

Il [piano marketing e social](docs/piano-marketing-social.md) definisce posizionamento, progettazione inclusa nella fornitura, calendario Instagram iniziale e attività commerciali dei primi 90 giorni, con ruoli e criteri di misurazione.

## Avvio locale

Richiede Node.js 24.x. Il requisito evita versioni Node 22 precedenti alla `22.19.0`, incompatibili con `undici 8` usato dalla toolchain Astro.

```bash
npm install
npm run dev
```

Il sito locale parte da `http://localhost:4321/` con la homepage italiana. La versione inglese è disponibile su `/en/` e dal selettore nel menu. La build di lavoro usa un dominio `.invalid` e imposta `noindex`, così un ambiente incompleto non può essere indicizzato per errore.

## Catalogo e immagini

La parte alta della homepage presenta Chest press FM-5201, Low row FM-5204 e Row machine FM-MP-8144, con ritagli trasparenti dedicati e composizione responsive. La sezione In evidenza propone prima FM-GS-5002, FM-GS-5008 e FM-GS-5016, poi i tre modelli della parte alta, usando le fotografie di catalogo. Asset, selezione, prompt e verifiche sono documentati in [Immagini della homepage](docs/home-hero.md).

I dati grezzi e i riferimenti di importazione restano in `data/catalog-drafts` e `data/catalog-source`. Prima di ogni avvio o build, `scripts/site/generate-public-catalog.ts` genera `data/catalog-public/products.json`: contiene soltanto SKU FullMuscle, classificazione, dati tecnici filtrati e percorsi delle immagini approvate.

La selezione approvata e aggiornata al 13 novembre 2026 è in `data/catalog-editorial/catalog-selection.json`: conserva G5, GF, GS, 52, 83 e MP-81, le categorie Smith/cross training/accessori e 10 attrezzature indipendenti dalle linee ritirate. I tapis roulant sono limitati a FM-9100A/B/C, FM-7100A/B/C e FM-3000B/C. Le whitelist `categorySkus` mantengono sei bike, tre climber e due ellittiche; restano il vogatore FM-7027 e lo Ski Trainer FM-7029. `retiredCategoryIds` esclude AB Coaster e Surf Trainer. Sono esclusi 404 prodotti importati (351 delle linee strength, 22 accessori della categoria sorgente Free Weight, 16 tapis roulant e altri 15 cardio); le 10 eccezioni conservano SKU e URL. L'elenco dei vecchi indirizzi è archiviato in `data/catalog-editorial/retired-product-routes.json` per i controlli di regressione e non viene pubblicato.

Il campo `excludedSkus` applica la rimozione esplicita di 28 articoli da Pesi liberi e panche prima delle regole di conservazione. Il confronto usa il codice intero: FM-3004B, FM-3031B/C e FM-3010/B/C restano disponibili. Il generatore rifiuta esclusioni duplicate, inesistenti o in conflitto con SKU esplicitamente selezionati nelle whitelist o nelle eccezioni. La categoria contiene 27 prodotti su due pagine; il catalogo generale occupa 15 pagine. Le vecchie pagine 3 della categoria e 16 del catalogo restituiscono 404 in entrambe le lingue.

Il modello aggiuntivo FM-7100A è definito in `data/catalog-editorial/products.json`, separato dagli archivi importati. Usa un'immagine illustrativa della 7100C e una nota localizzata nella scheda: il display Android touch screen è previsto, con configurazione da confermare. Le specifiche restano vuote finché non vengono verificate; non eredita i dati delle varianti B/C. Le immagini dei tapis roulant conservano i colori originali del modello e il marchio FullMuscle.

FM-7045A è una seconda aggiunta editoriale: riutilizza la foto approvata della 7045B, senza ereditarne le specifiche. La nota italiana e inglese indica che l'immagine è illustrativa e che configurazione e dati tecnici sono da confermare. FM-7043A conserva invece il nome e l'URL di Ab trainer nella categoria ellittiche: la rimozione di AB Coaster riguarda soltanto FM-7026.

Il generatore produce anche `active-skus.json`, usato per ripulire le richieste salvate, e `src/lib/generated/catalog-images.ts`, che importa soltanto le immagini attive. Non modificare manualmente i file generati. La build completa rigenera la ricerca e rimuove le vecchie pagine: il deploy deve sostituire l'output precedente, come descritto nella procedura Hostinger.

La ricerca tratta un singolo codice completo `FM-…` contenente almeno una cifra come frase esatta in Pagefind. Questo evita che un codice assente restituisca risultati generici per il prefisso FM. Le ricerche testuali mantengono la corrispondenza normale.

Le immagini approvate sono in `src/assets/catalog`. Tutti i prodotti pubblici devono avere una fotografia principale locale: la build si interrompe se ne manca anche una. Gli strumenti in `scripts/catalog` gestiscono importazione, normalizzazione, revisione e staging degli asset; `npm run catalog:assets -- approve-primary` applica in modo ripetibile l’autorizzazione provvisoria alle sole immagini principali valide.

Al 7 novembre 2026 sono approvate e integrate nel repository 754 immagini elaborate per i 744 prodotti, con logo Full Muscle e verde scuro di riferimento `#356B35` sulle parti verniciate individuate. La coda contiene 754 lavori `integrated` e nessun lavoro residuo. Il catalogo completo ? pubblicato con il commit `281355b`: gli otto campioni dell'ultimo rilascio mostrano le nuove immagini e rispondono 200, inclusi i file immagine ([report](data/site-audits/2026-11-07-branding-release-9.json)). Il [controllo di integrit? completo](data/site-audits/2026-11-07-catalog-branding-integrity.json) non rileva errori sui 754 asset locali.

La coda `data/catalog-branding/jobs.json` e i report dei lotti conservano associazione al modello, `sourceHash`, prompt ed esito della revisione visiva. Le elaborazioni mantengono lo stato asset `approved-provisional`: sono immagini illustrative revisionate, non originali OEM. La [procedura catalogo](docs/catalogo-sorgente-tzfit.md) descrive revisione e integrazione senza cambiare SKU o URL delle schede.

## Serie GF e catalogo PDF

La serie GF comprende cinque modelli, da FM-GF-001 a FM-GF-005. La GF-005 è recuperata tramite una risoluzione esplicita delle due schede sorgente duplicate; le altre quarantene rimangono attive. L'archivio revisionato al completamento GF conteneva 745 prodotti e 756 immagini personalizzate; la selezione pubblica attiva è limitata ai 343 prodotti approvati. Il controllo della pubblicazione GF è separato dai report storici sopra.

Il catalogo GF italiano ha otto pagine, una macchina per pagina, e prezzo fisso di **1.870 € + IVA** per ciascun modello, indicato soltanto nel PDF. File, build e preflight sono descritti nella [procedura GF](brochures/fullmuscle-gf/README.md). Il download è disponibile dalla pagina della serie e dal footer italiano.

## Verifiche

```bash
npm run check
npm test
npm run build
npm run test:output
npm run test:e2e
```

`test:output` controlla il numero di schede, canonical e hreflang, assenza di prezzi, disponibilità degli asset e assenza di riferimenti al fornitore nei bundle client e server. Verifica anche gli otto tapis roulant approvati, la nota illustrativa della 7100A e l'assenza di specifiche ereditate. `tests/treadmills.spec.ts` copre la presentazione bilingue su desktop e mobile; `scripts/site/quote-store.test.ts` verifica la pulizia delle selezioni salvate.

## Configurazione di pubblicazione

Copiare `.env.example` in `.env` e completare dominio, dati legali, recapiti, SMTP e Cloudflare Turnstile. La pubblicazione va costruita con:

```bash
npm run build:release
```

Il comando si interrompe se manca un valore obbligatorio o se `PUBLIC_SITE_READY` non è impostato a `true`. Il server standalone generato da Astro si avvia con `npm start` e serve sia le pagine prerenderizzate sia le route dinamiche. I redirect HTTPS e dei domini secondari devono essere configurati in Hostinger.

## SEO e indicizzazione

Il dominio canonical approvato è `https://fullmuscle-equipment.com`. La verifica online del 7 novembre 2026 conferma il redirect 301 da HTTP a HTTPS con percorso e query conservati. Il redirect da HTTPS `www` è ancora da completare su Hostinger: il campione verificato restituisce 200. I domini `.it` richiederanno un redirect permanente solo quando saranno disponibili e collegati; non sono inclusi fra le configurazioni già verificate.

L’italiano è la lingua predefinita: `/` mostra direttamente la homepage completa, con canonical e `hreflang="x-default"` sulla radice. `/it` e `/it/` reindirizzano con HTTP 301 a `/`, conservando i parametri; le pagine interne italiane mantengono `/it/...`. La homepage inglese resta su `/en/`, con collegamenti `hreflang` reciproci e cambio lingua manuale. La sitemap include soltanto gli URL delle due homepage canoniche. Queste regole vanno verificate sul dominio dopo il deploy.

Il catalogo espone 24 prodotti per pagina attraverso link HTML e URL paginati. Tutte le 343 schede italiane e le 343 inglesi sono raggiungibili senza JavaScript e incluse nella sitemap insieme alle immagini. Le schede, le linee e le categorie ritirate restituiscono 404. Ogni pagina localizzata ha title, description, canonical, `hreflang`, Open Graph, breadcrumb e dati strutturati pertinenti. Le pagine richiesta, conferma e privacy restano escluse dalla sitemap e usano `noindex`.

Finché `PUBLIC_SITE_READY=false`, tutte le pagine usano `noindex,nofollow` e `robots.txt` blocca la scansione. Questa protezione va rimossa solo nella build di pubblicazione, dopo aver inserito i dati reali. Le attività esterne necessarie sono elencate in [Checklist lancio SEO](docs/checklist-lancio-seo.md).

Il lancio SEO resta aperto: servono conferma dei dati legali e della privacy definitiva, configurazione e verifica Turnstile, prova di ricezione SMTP e verifica dell'accesso, della proprietà e della sitemap in Search Console. Il rilascio delle immagini non chiude queste attività; la configurazione osservata online mantiene il blocco dell'indicizzazione.

Per collegare il repository GitHub al piano Hostinger Business e svolgere anteprima e rilascio in sicurezza, seguire [Deploy su Hostinger](docs/deploy-hostinger.md).
