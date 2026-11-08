# Sorgenti dei caroselli

I file di questa cartella generano la raccolta temporanea di dodici post. I PNG nelle cartelle dei post sono i file da pubblicare; HTML, JSON e report servono a continuare il lavoro nel repository.

## File

- `posts.json`: testi delle 48 slide, caption, hashtag, testi alternativi e fonti.
- `products.json`: otto modelli verificati, asset correnti e dati di riferimento.
- `style.css`: impaginazione scura e tipografia.
- `build.mjs`: esportazione con Playwright e Chrome, anteprime con Sharp e documentazione.
- `preview.html`: anteprima locale generata con tutte le slide; richiede gli asset del repository.
- `preflight.json`: ultimo controllo completo dei file esportati.
- `quality-review.md`: esito della revisione visiva e dei controlli finali.

## Rigenerazione

Prerequisiti: dipendenze del progetto installate, Node 24 e Google Chrome. Il percorso Chrome predefinito è quello già utilizzato dalle brochure su Windows; è possibile impostare `CHROME_EXECUTABLE` per indicare un'altra installazione locale.

Dalla root:

```powershell
node social/_src/build.mjs
```

Per esportare un solo carosello durante una revisione:

```powershell
node social/_src/build.mjs --post 01
```

L'esportazione singola non aggiorna la panoramica generale né il documento indice; dopo una modifica approvata eseguire il comando completo. I file generati vengono sovrascritti, quindi modificare testi e stile nei sorgenti prima di rigenerare.

I dati dei modelli sono verificati contro il manifest pubblico corrente prima dell'esportazione. Nessuna immagine originale viene ritoccata e nessun processo viene eseguito sul profilo Instagram.
