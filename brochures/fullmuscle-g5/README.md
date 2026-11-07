# Brochure e listino G5

I documenti comprendono la brochure di 12 pagine con 8 prodotti e il catalogo
completo di 56 pagine con 105 prodotti. Ogni scheda riporta il prezzo di listino
in euro, IVA esclusa.

## Prezzi dell'edizione del 7 novembre 2026

La fonte è `TZFITNESS Price List for GC Series-20261103.xlsx`, nella root del
progetto: foglio `Sheet1`, colonna G «FOB Tianjin», importi in USD.
Il prezzo base è `(USD / 1,1165 + 100) × 2,6`, arrotondato all'euro più vicino.
Il listino pieno esposto è poi `prezzo base / 0,65`, nuovamente arrotondato
all'euro più vicino; mezzo euro viene arrotondato per eccesso.
Il cambio è fissato al riferimento BCE del 6 novembre 2026
([fonte](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.eu.html)).
Per esempio, 398 USD danno una base di 1.187 € e un **listino di 1.826 € + IVA**;
602 USD danno una base di 1.662 € e un **listino di 2.557 € + IVA**.
Il parametro interno `commercialDiscountRate: 0.35` consente di recuperare il
prezzo base applicando uno sconto del 35% al listino pieno. Con gli importi
interi approvati, il recupero è esatto arrotondando all'euro: ad esempio,
1.826 × 0,65 = 1.186,90 €, che arrotondato dà 1.187 €.
Brochure, catalogo e CSV mostrano soltanto il listino pieno + IVA, senza
percentuale di sconto o prezzo base.

`content/pricing-config.json` conserva cambio, fonte, data, maggiorazione,
moltiplicatore, sconto commerciale e i due alias verificati (`G45` → `G-45`, `GC-5017-1` → `GC-5017`).
`content/purchase-prices.json` conserva le 127 righe di acquisto con codici,
numeri di riga e hash del file originale. Solo i 105 modelli già presenti nel
catalogo vengono esportati. Questi dati sono interni: PDF e CSV espongono
soltanto i prezzi di rivendita.

## Rigenerazione

Dalla root del progetto, per importare nuovamente l'Excel dopo un aggiornamento:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File brochures/fullmuscle-g5/scripts/import-prices.ps1
```

La build usa il cambio salvato, senza interrogazioni automatiche a servizi esterni.
Per una nuova edizione aggiornare esplicitamente cambio e data nella configurazione.
Ogni rigenerazione riparte dal costo di acquisto: non applica aumenti cumulativi
ai prezzi già generati.

```powershell
npm.cmd run brochure:test
npm.cmd run brochure:build
npm.cmd run brochure:check
```

La build rigenera prima `content/catalog.json` e `exports/listino-rivendita.csv`,
poi i PDF e le anteprime. I controlli verificano abbinamenti, formula, copertura
dei prezzi, impaginazione, font e immagini; `brochure:check` rileva anche file
di prezzo modificati dopo l'esportazione.

Gli output finali sono `exports/brochure-stampa.pdf`, `exports/catalogo-completo.pdf`
e `exports/listino-rivendita.csv` (UTF-8 con BOM, separatore punto e virgola,
apribile in Excel). Solo dopo un preflight valido viene aggiornata la copia
locale `public/cataloghi/fullmuscle-g5.pdf`. Il comando non pubblica online.
I file con suffisso `-bozza` appartengono alle precedenti prove interne.
