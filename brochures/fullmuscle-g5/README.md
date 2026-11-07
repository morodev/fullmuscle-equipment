# Brochure e listino G5

I documenti comprendono la brochure di 12 pagine con 8 prodotti e il catalogo
completo di 56 pagine con 105 prodotti. Ogni scheda riporta il prezzo di listino
in euro, IVA esclusa.

## Prezzi dell'edizione del 7 novembre 2026

La fonte è `TZFITNESS Price List for GC Series-20261103.xlsx`, nella root del
progetto: foglio `Sheet1`, colonna G «FOB Tianjin», importi in USD.
La formula applicata è `(USD / 1,1165 + 100) × 2,6`, arrotondata soltanto alla
fine all'euro più vicino; mezzo euro viene arrotondato per eccesso.
Il cambio è fissato al riferimento BCE del 6 novembre 2026
([fonte](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.eu.html)).
Per esempio, 398 USD diventano **1.187 € + IVA**; 602 USD diventano **1.662 € + IVA**.

`content/pricing-config.json` conserva cambio, fonte, data, maggiorazione,
moltiplicatore e i due alias verificati (`G45` → `G-45`, `GC-5017-1` → `GC-5017`).
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
