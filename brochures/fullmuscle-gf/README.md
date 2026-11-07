# Catalogo Full Muscle GF

Cinque macchine, una per pagina: GF-001 Chest Press, GF-002 Shoulder Press,
GF-003 Seated Row, GF-004 Lat Pulldown e GF-005 Incline Chest Press.
Entrambi i PDF contengono otto pagine: copertina, indice, cinque schede e contatti.
Grafica e impaginazione derivano dalla brochure G5 già approvata.

Il prezzo di vendita indicato dal committente è **1.870 € + IVA per ogni modello**.
È un importo diretto in euro: non si applicano la formula, il cambio, le
maggiorazioni o gli sconti della serie G5. La configurazione e i dati editoriali
sono conservati in `content/catalog.json`; le fonti restano interne.

I cinque codici sono univoci. Le due pagine fornitore GF-005 rappresentano
lo stesso modello, presente una sola volta. Le dimensioni GF provengono dal
campo `Machine Size (L*W*H)`, il peso da `Machine Weight`.
Tutti i modelli sono a dischi; non viene indicato un pacco pesi.

## Rigenerazione e controllo

Dalla root del progetto:

```powershell
node --test brochures/fullmuscle-gf/scripts/validation.test.mjs
node brochures/fullmuscle-gf/scripts/build.mjs
node brochures/fullmuscle-gf/scripts/check.mjs
```

La build copia lo stile, i font e i loghi vettoriali della brochure G5 senza
modificarla né eseguire il suo generatore. Usa esclusivamente le immagini
Full Muscle personalizzate indicate nei contenuti; un'immagine mancante
blocca l'esportazione, senza sostituzione con la fotografia del fornitore.

Le immagini correnti provengono dalla revisione `gf-logo-bicolor-01`: tutte
le scritte sulle macchine usano il logo G5 con Full bianco, Muscle verde
e EQUIPMENT bianco. I precedenti batch `gf-batch-01` e `gf-completion-01`
restano come storico interno. Il catalogo dichiara che
le immagini mostrano una proposta di personalizzazione: colori, finiture,
accessori e dischi eventualmente raffigurati vanno confermati in preventivo.

Tre scene illustrative completano entrambi i PDF senza cambiare le otto
pagine o le cinque fotografie tecniche dei prodotti:

- `assets/scenes/gym.png`: palestra GF in copertina, pagina 1, riquadro
  158 × 103 mm e dicitura «Rendering illustrativo di ambientazione».
- `assets/scenes/chest-training.png`: persona sulla GF-001, pagina 3,
  sotto il prezzo, riquadro 62 × 32 mm e dicitura «Rendering illustrativo».
- `assets/scenes/lat-training.png`: persona sulla GF-004, pagina 6,
  sotto il prezzo, stesso riquadro e dicitura.

Le tre scene sono obbligatorie. La preparazione JPEG sRGB conserva tutto
il fotogramma, senza tagliare persone o macchine; l'impaginazione usa
`object-fit: contain`. Il preflight registra separatamente gli hash dei PNG
sorgente e dei JPEG preparati e, per ogni PDF, pagina, modello associato,
posizione, dimensioni, dicitura e risoluzione effettiva di ciascuna scena.

Le scene sono state create con il tool integrato `image_gen.imagegen`.
La cartella `prompts/` conserva richieste, riferimenti, iterazioni e controlli
visivi; gli asset finali del progetto si trovano in `assets/scenes/`.

Output:

- `exports/catalogo-completo.pdf`: PDF digitale A4, indice e segnalibri.
- `exports/brochure-stampa.pdf`: A4 con abbondanza di 3 mm, pagine singole.
- `exports/listino-rivendita.csv`: listino in euro, UTF-8 con BOM e separatore `;`.
- `exports/preflight.json`: controlli e hash di contenuti, immagini e PDF.
- `proofs/catalogo/` e `proofs/brochure/`: anteprime di tutte le pagine;
  i file `*-contact-sheet.jpg` ne mostrano l'insieme.

Solo dopo preflight positivo viene aggiornata la copia locale
`public/cataloghi/fullmuscle-gf.pdf`, indirizzo usato dal QR. Nessun deploy è
eseguito dalla build. Il controllo verifica anche che la copia pubblica e
gli input non siano cambiati dopo l'esportazione.

Il preflight richiede cinque schede e cinque prezzi corretti in ciascun PDF,
otto pagine, font incorporati, almeno 240 ppi effettivi e assenza di fuoriuscite
nelle aree controllate. Richiede inoltre esattamente le tre scene nelle
collocazioni previste: scene mancanti, duplicate, ritagliate, spostate,
sovrapposte al prezzo o con meno di 240 ppi bloccano la copia pubblica.
Il controllo successivo rileva anche scene modificate dopo l'esportazione.
Il formato colore è sRGB, come G5; non è una
certificazione PDF/X. La scansione fisica del QR non è automatizzata.

Contatto commerciale: Matteo, 392 550 1779, info@fullmuscle-equipment.com.
