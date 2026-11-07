# FullMuscle Equipment

Sito corporate e catalogo B2B per attrezzature fitness professionali. Il catalogo consente di filtrare 744 prodotti, creare una selezione con quantità e inviare una richiesta di preventivo; non gestisce acquisti o pagamenti online.

La priorità commerciale è acquisire richieste per nuove aperture di palestre e forniture complete, seguite da rinnovi e ampliamenti. Centri medicali, fisioterapia e riabilitazione completano l'offerta; gli altri contesti restano accessibili nelle pagine Soluzioni.

## Avvio locale

Richiede Node.js 24.x. Il requisito evita versioni Node 22 precedenti alla `22.19.0`, incompatibili con `undici 8` usato dalla toolchain Astro.

```bash
npm install
npm run dev
```

Il sito locale parte da `http://localhost:4321/it/`. La build di lavoro usa un dominio `.invalid` e imposta `noindex`, così un ambiente incompleto non può essere indicizzato per errore.

## Catalogo e immagini

I dati grezzi e i riferimenti di importazione restano in `data/catalog-drafts` e `data/catalog-source`. Prima di ogni avvio o build, `scripts/site/generate-public-catalog.ts` genera `data/catalog-public/products.json`: contiene soltanto SKU FullMuscle, classificazione, dati tecnici filtrati e percorsi delle immagini approvate.

Le immagini approvate sono in `src/assets/catalog`. Tutti i 744 prodotti pubblici devono avere una fotografia principale locale: la generazione si interrompe se ne manca anche una. Gli strumenti in `scripts/catalog` gestiscono importazione, normalizzazione, revisione e staging degli asset; `npm run catalog:assets -- approve-primary` applica in modo ripetibile l’autorizzazione provvisoria alle sole immagini principali valide.

Al 7 novembre 2026 sono approvate e integrate nel repository 754 immagini elaborate per i 744 prodotti, con logo Full Muscle e verde scuro di riferimento `#356B35` sulle parti verniciate individuate. La coda contiene 754 lavori `integrated` e nessun lavoro residuo. Il catalogo completo ? pubblicato con il commit `281355b`: gli otto campioni dell'ultimo rilascio mostrano le nuove immagini e rispondono 200, inclusi i file immagine ([report](data/site-audits/2026-11-07-branding-release-9.json)). Il [controllo di integrit? completo](data/site-audits/2026-11-07-catalog-branding-integrity.json) non rileva errori sui 754 asset locali.

La coda `data/catalog-branding/jobs.json` e i report dei lotti conservano associazione al modello, `sourceHash`, prompt ed esito della revisione visiva. Le elaborazioni mantengono lo stato asset `approved-provisional`: sono immagini illustrative revisionate, non originali OEM. La [procedura catalogo](docs/catalogo-sorgente-tzfit.md) descrive revisione e integrazione senza cambiare SKU o URL delle schede.

## Verifiche

```bash
npm run check
npm test
npm run build
npm run test:output
npm run test:e2e
```

`test:output` controlla il numero di schede, canonical e hreflang, assenza di prezzi, disponibilità degli asset e assenza di riferimenti al fornitore nei bundle client e server.

## Configurazione di pubblicazione

Copiare `.env.example` in `.env` e completare dominio, dati legali, recapiti, SMTP e Cloudflare Turnstile. La pubblicazione va costruita con:

```bash
npm run build:release
```

Il comando si interrompe se manca un valore obbligatorio o se `PUBLIC_SITE_READY` non è impostato a `true`. Il server standalone generato da Astro si avvia con `npm start` e serve sia le pagine prerenderizzate sia le route dinamiche. I redirect HTTPS e dei domini secondari devono essere configurati in Hostinger.

## SEO e indicizzazione

Il dominio canonical approvato è `https://fullmuscle-equipment.com`. La verifica online del 7 novembre 2026 conferma il redirect 301 da HTTP a HTTPS con percorso e query conservati. Il redirect da HTTPS `www` è ancora da completare su Hostinger: il campione verificato restituisce 200. I domini `.it` richiederanno un redirect permanente solo quando saranno disponibili e collegati; non sono inclusi fra le configurazioni già verificate.

Il catalogo espone 24 prodotti per pagina attraverso link HTML e URL paginati. Tutte le 744 schede italiane e le 744 inglesi sono raggiungibili senza JavaScript e incluse nella sitemap insieme alle immagini. Ogni pagina localizzata ha title, description, canonical, `hreflang`, Open Graph, breadcrumb e dati strutturati pertinenti. Le pagine richiesta, conferma e privacy restano escluse dalla sitemap e usano `noindex`.

Finché `PUBLIC_SITE_READY=false`, tutte le pagine usano `noindex,nofollow` e `robots.txt` blocca la scansione. Questa protezione va rimossa solo nella build di pubblicazione, dopo aver inserito i dati reali. Le attività esterne necessarie sono elencate in [Checklist lancio SEO](docs/checklist-lancio-seo.md).

Il lancio SEO resta aperto: servono conferma dei dati legali e della privacy definitiva, configurazione e verifica Turnstile, prova di ricezione SMTP e verifica dell'accesso, della proprietà e della sitemap in Search Console. Il rilascio delle immagini non chiude queste attività; la configurazione osservata online mantiene il blocco dell'indicizzazione.

Per collegare il repository GitHub al piano Hostinger Business e svolgere anteprima e rilascio in sicurezza, seguire [Deploy su Hostinger](docs/deploy-hostinger.md).
