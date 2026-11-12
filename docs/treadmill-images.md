# Immagini tapis roulant: colori originali

La selezione pubblica dei tapis roulant comprende FM-9100A/B/C, FM-7100A/B/C e FM-3000B/C. Le fotografie delle sette varianti presenti nell'archivio sono state ripristinate dai file originali locali: carrozzeria nera/antracite, parti argento e accenti azzurri originali. Gli indicatori verdi originali del display 9100B restano invariati.

Le modifiche fotografiche sono state eseguite con lo strumento integrato `image_gen.imagegen`: sostituzione dei marchi del fornitore con il logo FullMuscle Equipment bianco sul fianco visibile, vicino all'estremità posteriore del nastro. Gli originali non sono stati sovrascritti.

- PNG definitivi e riferimento del logo: `data/catalog-branding/generated/treadmills-original-colors-01/`.
- Prompt completi per ciascun modello, inclusa la correzione del posizionamento 3000B: sottocartella `prompts/`; i prompt scelti sono elencati in `assignment.json`.
- Revisione visiva, provenienza, hash, dimensioni e percorsi WebP: `review.json` nella stessa cartella.
- Immagine trasparente della precedente composizione homepage, conservata in archivio: `src/assets/home/FM-9100A.png`; prompt di estrazione e rifinitura in `prompts/hero.txt`. La composizione attuale è documentata in [Immagini della homepage](home-hero.md).

FM-7100A è una voce editoriale richiesta dall'utente e riutilizza la stessa immagine della 7100C. La nota IT/EN dichiara l'immagine illustrativa e il display Android touch screen previsto, da confermare. Non sono state copiate le specifiche della C né aggiunta una fonte TZ fittizia.

## Rigenerazione

La coda `data/catalog-branding/jobs.json` conserva le precedenti versioni verdi nella cronologia e punta ai nuovi PNG approvati. Il manifest delle immagini usa questi nuovi file come `editedPath`; normalizzazione e staging successivi mantengono quindi la palette originale. Per questi sette modelli vale la politica `preserve-original` descritta in `assignment.json`, indipendentemente dal verde di riferimento degli altri macchinari.

Una nuova revisione della 7100C deve aggiornare anche il percorso della sua immagine riutilizzata in `data/catalog-editorial/products.json`. La build importa soltanto gli asset del catalogo attivo e non distribuisce le vecchie immagini verdi. Eseguire `npm run build` per rigenerare catalogo, HTML, sitemap e indice Pagefind.
