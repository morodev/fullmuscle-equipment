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
node brochures/fullmuscle-gf/scripts/build.mjs
node brochures/fullmuscle-gf/scripts/check.mjs
```

La build copia lo stile, i font e i loghi vettoriali della brochure G5 senza
modificarla né eseguire il suo generatore. Usa esclusivamente le immagini
Full Muscle personalizzate indicate nei contenuti; un'immagine mancante
blocca l'esportazione, senza sostituzione con la fotografia del fornitore.

Per GF-001–004 le immagini revisionate provengono dal batch `gf-batch-01`;
GF-005 usa `gf-completion-01/fm-gf-005-primary.png`. Il catalogo dichiara che
le immagini mostrano una proposta di personalizzazione: colori, finiture,
accessori e dischi eventualmente raffigurati vanno confermati in preventivo.

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
nelle aree controllate. Il formato colore è sRGB, come G5; non è una
certificazione PDF/X. La scansione fisica del QR non è automatizzata.

Contatto commerciale: Matteo, 392 550 1779, info@fullmuscle-equipment.com.
