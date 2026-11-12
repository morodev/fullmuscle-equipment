# Locandine Instagram · Serie GF

Cinque Storie PNG da **1080 × 1920 px**, con sconto del 30% sul listino GF:
**1.870 € + IVA → 1.309 € + IVA** per ciascun modello.

I cinque PNG nella cartella superiore sono pronti per il caricamento manuale.
`../anteprima.jpg` mostra l'insieme a 360 × 640 px per Storia; serve per consultazione.

## Rigenerazione

Dalla root del repository, con le dipendenze del progetto installate:

```powershell
node locandine/_src/build.mjs
```

Il generatore utilizza Node, Playwright, Sharp e Google Chrome. Per un percorso
Chrome diverso dal predefinito Windows, impostare `CHROME_EXECUTABLE`.
La rigenerazione sovrascrive i cinque PNG, l'anteprima, `preview.html` e `preflight.json`.

- `campaign.json`: ordine dei modelli, titoli, sconto e testi di contatto.
- `style.css`: impaginazione, colori e tipografia; area essenziale tra y=250 e y=1620, margini laterali di 64 px.
- `build.mjs`: lettura del catalogo, calcolo in centesimi, esportazione e controlli.
- `preview.html`: anteprima locale delle cinque locandine; usa gli asset del repository.
- `preflight.json`: prezzi, dimensioni, controlli di impaginazione e hash dei sorgenti e degli output PNG.

Prezzi e immagini provengono da `brochures/fullmuscle-gf/content/catalog.json`.
Un prezzo di listino diverso dai 1.870 € approvati blocca l'esportazione e richiede
la revisione della campagna. Font e logo sono gli stessi dei materiali social esistenti.
Le immagini originali vengono impaginate intere, senza ritocchi o ritagli.

La procedura opera soltanto in `locandine/` e non pubblica su Instagram.
