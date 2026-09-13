# FullMuscle Equipment

Sito corporate e catalogo B2B per attrezzature fitness professionali. Il catalogo consente di filtrare 744 prodotti, creare una selezione con quantità e inviare una richiesta di preventivo; non gestisce acquisti o pagamenti online.

## Avvio locale

Richiede Node.js 22 o successivo.

```bash
npm install
npm run dev
```

Il sito locale parte da `http://localhost:4321/it/`. La build di lavoro usa un dominio `.invalid` e imposta `noindex`, così un ambiente incompleto non può essere indicizzato per errore.

## Catalogo e immagini

I dati grezzi e i riferimenti di importazione restano in `data/catalog-drafts` e `data/catalog-source`. Prima di ogni avvio o build, `scripts/site/generate-public-catalog.ts` genera `data/catalog-public/products.json`: contiene soltanto SKU FullMuscle, classificazione, dati tecnici filtrati e percorsi delle immagini approvate.

Le immagini approvate sono in `src/assets/catalog`. Tutti i 744 prodotti pubblici devono avere una fotografia principale locale: la generazione si interrompe se ne manca anche una. Gli strumenti in `scripts/catalog` gestiscono importazione, normalizzazione, revisione e staging degli asset; `npm run catalog:assets -- approve-primary` applica in modo ripetibile l’autorizzazione provvisoria alle sole immagini principali valide.

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

Il comando si interrompe se manca un valore obbligatorio o se `PUBLIC_SITE_READY` non è impostato a `true`. Il server standalone si avvia con `node dist/server/entry.mjs`.
