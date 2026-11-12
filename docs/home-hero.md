# Immagini della homepage

La parte iniziale delle homepage italiana e inglese presenta insieme Chest press FM-5201, Low row FM-5204 e Row machine FM-MP-8144. Le fotografie di catalogo restano invariate; la homepage usa tre ritagli trasparenti separati.

## Asset e metodo

Scontorno con lo strumento integrato image_gen, modalità edit con trasparenza. Non viene usata la CLI/API. I risultati selezionati sono copiati nel repository e importati tramite Astro Image, che genera varianti WebP responsive con canale alpha. La Chest press ha priorità di caricamento alta; gli altri due modelli sono caricati immediatamente senza priorità alta.

| SKU | Sorgente | Asset homepage |
| --- | --- | --- |
| FM-5201 | `src/assets/catalog/FM-5201/primary-01-73dcd11ce1f1.webp` | `src/assets/home/FM-5201.png` |
| FM-5204 | `src/assets/catalog/FM-5204/primary-01-eb66fd942137.webp` | `src/assets/home/FM-5204.png` |
| FM-MP-8144 | `src/assets/catalog/FM-MP-8144/primary-01-13be51335b80.webp` | `src/assets/home/FM-MP-8144.png` |

## Composizione

Desktop: Chest press in primo piano, Low row a sinistra e Row machine a destra. Mobile: Chest press sopra, gli altri due modelli affiancati sotto. Le tre immagini sono collegamenti indipendenti alle schede localizzate. Titoli, CTA e conteggi non cambiano. Gli asset precedenti restano disponibili nell'archivio ma non vengono importati da HomePage.

## Selezione dal catalogo

La sezione In evidenza usa sei schede prodotto, nello stesso ordine in italiano e inglese: Leg extension FM-GS-5002, Lat pulldown FM-GS-5008, Leg press orizzontale FM-GS-5016, Chest press FM-5201, Low row FM-5204 e Row machine FM-MP-8144. Su desktop le tre GS occupano la prima riga e gli altri tre modelli la seconda; sui viewport più piccoli la griglia conserva l'ordine. GS-5002 è il modello esatto, distinto dalla variante GS-5002-1.

Le schede usano le fotografie originali di catalogo, i collegamenti localizzati e i pulsanti preventivo esistenti. Questa selezione non modifica disponibilità, ordinamento del catalogo generale o conteggio di 343 prodotti. Le identità GS sono state verificate sulle schede TZ di [GS-5002](https://tzfit.com/es/gs-5002-seated-leg-extension-machine/), [GS-5008](https://tzfit.com/ru/gs-5008-lat-pulldown-machine/) e [GS-5016](https://tzfit.com/commercial-horizontal-seated-leg-press-machine-gs-5016/).

Verifica della nuova selezione: build completata, Astro check senza errori o avvisi e 28 test browser homepage/sito superati, con due casi riservati al desktop esclusi dal progetto mobile. I controlli IT/EN includono ordine delle sei schede, caricamento immagini, collegamenti e aggiunta della Chest press FM-5201 al preventivo con quantità persistenti.

## Prompt esatti

### FM-5201

```text
Use case: background-extraction. Asset type: isolated product cutout for the FullMuscle website hero. Image 1 is the edit target: the Chest press FM-5201. Change ONLY the plain white background and the floor shadow to genuine full transparency, including every background gap between frame members. Preserve the original product exactly: identical viewpoint, framing, silhouette, proportions, every handle, lever, chrome loading horn, bolt, pad and foot. Preserve the black and green finishes, metallic highlights, lighting, all original label and Full Muscle Equipment logo pixels. Do not redraw, redesign, recolor, simplify, mirror, rotate, add or remove any machine component. Keep the complete machine inside the canvas with a small clear margin. Sharp natural antialiased edges without white fringes, halos or opaque patches. Retain light-colored metal surfaces as opaque product, not background. Output a single photorealistic isolated machine on an actual transparent alpha background. No new text, no environment, no floor, no added shadow.
```

### FM-5204

```text
Use case: background-extraction. Asset type: isolated product cutout for the FullMuscle website hero. Image 1 is the edit target: the Low row FM-5204. Change ONLY the plain white background and the floor shadow to genuine full transparency, including every background gap between frame members. Preserve the original product exactly: identical viewpoint, framing, silhouette, proportions, every handle, lever, chrome loading horn, bolt, pad and foot. Preserve the black and green finishes, metallic highlights, lighting, all original label and Full Muscle Equipment logo pixels. Do not redraw, redesign, recolor, simplify, mirror, rotate, add or remove any machine component. Keep the complete machine inside the canvas with a small clear margin. Sharp natural antialiased edges without white fringes, halos or opaque patches. Retain light-colored metal surfaces as opaque product, not background. Output a single photorealistic isolated machine on an actual transparent alpha background. No new text, no environment, no floor, no added shadow.
```

### FM-MP-8144

```text
Use case: background-extraction. Asset type: isolated product cutout for the FullMuscle website hero. Image 1 is the edit target: the Supported angle row FM-MP-8144. Change ONLY the plain white background and the floor shadow to genuine full transparency, including every background gap between frame members. Preserve the original product exactly: identical viewpoint, framing, silhouette, proportions, every handle, lever, chrome loading horn, bolt, pad and foot. Preserve the black and green finishes, metallic highlights, lighting, all original label and Full Muscle Equipment logo pixels. Do not redraw, redesign, recolor, simplify, mirror, rotate, add or remove any machine component. Keep the complete machine inside the canvas with a small clear margin. Sharp natural antialiased edges without white fringes, halos or opaque patches. Retain light-colored metal surfaces as opaque product, not background. Output a single photorealistic isolated machine on an actual transparent alpha background. No new text, no environment, no floor, no added shadow.
```

## Verifica completata il 13 novembre 2026

I tre PNG sono 1254 × 1254 pixel con canale alpha effettivo (valori da 0 a 255). Controllati visivamente ritagli, prodotti e loghi rispetto alle fotografie di catalogo. Le varianti WebP compilate mantengono la trasparenza.

Verifica visiva della composizione a 1440, 768 e 390 pixel; controllo aggiuntivo a 320 pixel senza immagini fuori dal viewport o debordamenti. Nessun errore o avviso nella console mobile. Build completata, Astro check senza errori/avvisi, 40 test browser su homepage/navigazione e 20 test dell'output pubblico superati. Due test esclusivamente desktop sono saltati nella configurazione mobile.

