# Presentazione animata della linea GF

La presentazione usa la chest press **FM-GF-001** come protagonista della linea GF. Compare soltanto nella prima pagina della serie, in italiano e inglese:

- `/it/catalogo/linee/fm-gf-series/`
- `/en/catalogue/lines/fm-gf-series/`

La pagina conserva i cinque modelli, i collegamenti alle schede, il preventivo e i metadati della serie. Il catalogo PDF rimane disponibile soltanto nella versione italiana. Le altre linee e le schede prodotto non caricano la presentazione.

## Immagini e fedeltà

I tre originali sono conservati in `img-animations/`. Sono JPEG 1280 × 921 del macchinario completo: frontale, laterale e a tre quarti. La vista a tre quarti, con suffisso `(2)`, è il riferimento per la composizione; le altre due documentano forma e posizione dei componenti.

Il procedimento di preparazione usa il tool integrato `imagegen` per il fondo trasparente e le superfici nascoste. I cinque gruppi sono telaio con meccanismo posteriore, seduta con schienale, braccio sinistro, braccio destro e pedana. La ricomposizione va confrontata con gli originali, controllando proporzioni, logo, verde, contorni e sovrapposizioni.

Il [manifesto di generazione](../data/animations/gf/generation.json) conserva i riferimenti originali, i prompt completi del poster e dei cinque componenti, la correzione del verde e l’associazione ai file generati. I sei PNG con trasparenza sono in `data/animations/gf/source/`, su un piano comune di 1478 × 1064 pixel.

L’effetto è una composizione illustrativa a inquadratura fissa. Non documenta una procedura meccanica di montaggio e non descrive giunzioni o componenti interni non visibili nei riferimenti. Le parti non ruotano per esporre superfici non documentate.

Il manifesto `src/lib/gf-presentation.ts` definisce il poster, le immagini dei componenti e le loro coordinate sul piano comune. Le risorse pubbliche sono in `public/images/animations/gf/`: `poster.webp` e cinque livelli, con corrispondenti varianti `-mobile.webp`. Gli originali di partenza non vanno sovrascritti. Le coordinate dei componenti devono produrre la stessa posa del poster una volta completata la sequenza.

Per rigenerare i WebP dai PNG già salvati, senza nuove chiamate a `imagegen`:

```bash
node scripts/site/build-gf-media.mjs
```

Lo script verifica dimensioni e trasparenza dei sorgenti ed esporta una variante desktop larga 1478 pixel e una mobile larga 768 pixel. Dopo una modifica ai sorgenti, rigenerare le risorse prima della build del sito.

## Funzionamento e fallback

`GFPresentation.astro` contiene struttura, testi nelle due lingue e scena. GSAP e ScrollTrigger collegano le traslazioni allo scroll, senza cambiare il comportamento dello scorrimento della pagina. Il riquadro dell’animazione resta nel viewport durante la sequenza e torna a scorrere normalmente al termine.

L’HTML iniziale contiene un poster statico, titoli e testi leggibili. I componenti e il codice dell’animazione vengono caricati quando la scena si avvicina al viewport. La modalità animata si attiva soltanto dopo il caricamento e la decodifica delle immagini. Il dato `data-motion="ready"` identifica lo stato attivo; `data-motion="static"` quello statico.

JavaScript assente, movimento ridotto o errore di caricamento mantengono la macchina completa e una sezione compatta, senza lo spazio verticale necessario all’animazione. La preferenza di movimento ridotto viene rispettata anche se cambia durante la visita. Il caricamento fallito dei componenti espone `data-motion-error="true"` per la diagnosi locale.

## Verifica

La cache Vite viene separata per comando Astro in `node_modules/.vite-astro/`: sviluppo, controlli e build non possono sovrascrivere le dipendenze del server locale acceso. In sviluppo, un errore di avvio dell'animazione viene registrato in console con il prefisso `[GF]`, mantenendo il poster statico.

Per verificare lo scroll e i pulsanti del catalogo mentre vengono eseguiti `astro check` e `astro build` con il server di sviluppo acceso:

```bash
npx playwright test --config playwright.dev.config.ts
```

Questo controllo avvia un server dedicato sulla porta 4331 e usa una cache di sviluppo separata dal server locale abituale. La build di prova viene scritta in `test-results/dev-cache/build`, preservando `dist` e il suo indice di ricerca. Il test di regressione non viene eseguito nella suite sulla build.

Dopo aver preparato le risorse ed eseguito la build:

```bash
npm run check
npm run build
npm run test:output
npm run test:e2e -- tests/gf-presentation.spec.ts tests/brochures.spec.ts --workers=2
```

Su PowerShell con esecuzione degli script disabilitata, usare `npm.cmd`.

I controlli automatici coprono contenuti nelle due lingue, metadati, cinque schede, isolamento rispetto alle altre linee, avanzamento e ritorno dell’animazione, assenza di scorrimento orizzontale, JavaScript disabilitato, movimento ridotto ed errore di caricamento.

La revisione visiva deve confrontare inizio, fasi intermedie e ricomposizione su desktop e telefono. Verificare inoltre leggibilità del telaio nero sul fondo scuro, allineamento dei pezzi, assenza di aloni bianchi, continuità con il poster e resa dopo un ridimensionamento. Il semplice esito positivo dei test non sostituisce questa verifica delle immagini.
