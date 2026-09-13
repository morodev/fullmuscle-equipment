# Catalogo sorgente TZFIT — procedura operativa interna

**Stato:** implementato per acquisizione e normalizzazione iniziale  
**Uso:** documento interno; il nome del fornitore, i suoi URL e i testi originali non devono comparire nel sito pubblico.

La prima acquisizione completa e le eccezioni rilevate sono riepilogate nel [report del 13 settembre 2026](./report-importazione-tzfit-2026-09-13.md).

## Scopo e confini

La pipeline censisce il catalogo pubblico del fornitore e prepara bozze FullMuscle. Non pubblica automaticamente nessun prodotto. Le descrizioni recuperate servono come materiale di lavoro: i testi finali italiani e inglesi devono essere riscritti, verificati e approvati. Prezzi, disponibilità, garanzia, certificazioni e dichiarazioni sull'azienda non vengono importati come affermazioni commerciali FullMuscle.

L'acquisizione usa soltanto pagine HTML e sitemap pubbliche consentite da `robots.txt`. Il percorso `/wp-json/` è escluso. Ogni esecuzione rilegge `robots.txt` e interrompe il lavoro se una URL necessaria risulta vietata.

## Comandi

Installazione iniziale:

```bash
npm install
```

Verifica su un campione senza scrivere dati:

```bash
npm run catalog:crawl -- --dry-run --limit 10
```

Acquisizione completa dei metadati:

```bash
npm run catalog:crawl
```

Creazione delle bozze FullMuscle:

```bash
npm run catalog:normalize
```

Confronto con l'inventario precedente:

```bash
npm run catalog:diff
```

Il download, la revisione e la preparazione degli asset sono intenzionalmente separati, perché un catalogo completo può occupare molto spazio e nessuna immagine deve diventare pubblica senza controllo:

```bash
npm run catalog:assets -- download
npm run catalog:assets -- contact-sheets
npm run catalog:assets -- apply-review --input data/catalog-assets/review-decisions.json
npm run catalog:assets -- stage
npm run catalog:assets -- validate
npm run catalog:normalize
```

Quando arrivano le immagini OEM, si importano con:

```bash
npm run catalog:assets -- import-oem --input <cartella-oem>
npm run catalog:assets -- stage
npm run catalog:normalize
```

Il nome di ogni file OEM deve seguire il formato `<sku>__<primary|gallery>__<ordine>.<estensione>`, con ordine a partire da 1; per esempio `FM-5101__primary__1.jpg`.

Opzioni disponibili: `--concurrency`, `--delay-ms` e, soltanto insieme a `--dry-run`, `--limit`. Il valore predefinito è tre richieste concorrenti e almeno 350 ms fra gli avvii. Timeout e tentativi temporanei sono gestiti dal client.

## File prodotti

| Percorso | Contenuto | Pubblico |
|---|---|---:|
| `data/catalog-source/tzfit/inventory.json` | dati originali, URL, specifiche, hash e provenienza | No |
| `data/catalog-source/tzfit/inventory.previous.json` | inventario precedente per il confronto | No, ignorato da Git |
| `data/catalog-source/tzfit/diff-report.json` | nuovi, modificati, rimossi da verificare e anomalie | No |
| `data/catalog-assets/manifest.json` | stato, hash, dimensioni e destinazione di ogni immagine | No |
| `data/catalog-assets/review-decisions.json` | esito ripetibile della revisione visiva | No |
| `data/catalog-assets/originals/` | copie locali originali | No, ignorato da Git |
| `data/catalog-assets/edited/` | copie provvisorie ripulite e controllate | No, ignorato da Git |
| `src/assets/catalog/` | soli WebP approvati, pronti per la build | Sì, attraverso le schede pubblicate |
| `data/catalog-drafts/products.json` | prodotti FM ancora in stato `draft` | No, finché non superano la revisione |

La scrittura dell'inventario è atomica. Un crawl fallito o vuoto non sostituisce il file valido. Un prodotto scomparso dal sito sorgente viene elencato come `manual-review`: non viene cancellato automaticamente. Se due pagine dichiarano lo stesso SKU, entrambe restano nell'inventario sorgente ma quel codice viene messo in quarantena e non genera una bozza pubblicabile finché non viene scelto il modello corretto.

## Identità FullMuscle

La conversione dello SKU è stabile:

| Sorgente | FullMuscle |
|---|---|
| `TZ-5101` | `FM-5101` |
| `TZ-X82-01` | `FM-X82-01` |
| `GS-5001` | `FM-GS-5001` |
| `GC-5001` | `FM-GC-5001` |

Per le serie, il prefisso `TZ` diventa `FM`; alle sigle senza quel prefisso viene anteposto `FM`. Due codici sorgente che producono lo stesso SKU FullMuscle bloccano la normalizzazione e richiedono una decisione manuale.

Il file delle bozze conserva una `sourceReference` interna per la tracciabilità. La funzione che prepara un record pubblico elimina quel riferimento, gli URL originali e qualsiasi asset non approvato. Il rendering del futuro sito dovrà usare esclusivamente questa vista filtrata.

## Immagini

La pipeline raccoglie l'immagine Open Graph e le immagini del contenuto, preferendo la variante più grande di `srcset` e rimuovendo i suffissi WordPress come `-300x300`. Non usa hotlink nel sito finale. Controlla tipo MIME, dimensioni, limite di peso e hash SHA-256; i duplicati binari condividono lo stesso file originale.

Ogni immagine entra come `needs-review`. Le tavole di contatto permettono la revisione completa. Gli esiti sono `needs-cleaning`, `blocked-branding`, `approved-provisional`, `approved-oem` o `missing`. Soltanto gli ultimi due stati approvati possono essere copiati in `src/assets/catalog/` e inclusi nella vista pubblica.

Le immagini del sito sorgente possono essere usate provvisoriamente. Se mostrano il nome o il logo del fornitore, questi elementi vengono rimossi senza aggiungere per ora il marchio FullMuscle; il file modificato viene approvato solo dopo un nuovo controllo visivo. Banner promozionali, watermark e immagini non certe restano bloccati. La pubblicazione richiede inoltre:

1. diritto d'uso confermato per FullMuscle;
2. file originale o copia locale ad alta risoluzione;
3. assenza di loghi, watermark o riferimenti visivi al fornitore;
4. ritaglio e colore controllati;
5. testo alternativo italiano e inglese approvato.

Gli originali OEM consegnati direttamente dal fornitore hanno priorità sulle immagini provvisorie. L'importazione associa i file tramite SKU, ruolo e ordine e permette di sostituire le fotografie senza cambiare le URL delle schede. La consegna OEM non è un prerequisito per pubblicare i prodotti che hanno già un asset provvisorio approvato.

## Revisione di ogni prodotto

Una bozza diventa pubblicabile soltanto quando sono vere tutte queste condizioni:

- SKU, categoria e serie FullMuscle verificati;
- nome commerciale approvato;
- misure, peso, pacco pesi, materiali e configurazioni confrontati con la scheda tecnica ufficiale;
- descrizione, vantaggi e caratteristiche riscritti in italiano e inglese;
- nessuna affermazione del produttore attribuita a FullMuscle;
- immagini approvate e servite localmente;
- prezzo “a partire da” inserito da una fonte commerciale interna, se previsto;
- stato cambiato esplicitamente da `draft` a `published` e disponibilità preventivo abilitata.

La revisione parte da almeno un prodotto per ogni serie, poi procede a lotti omogenei. I PDF individuati nella pagina Download vengono registrati nell'inventario. Il confronto automatico del loro testo richiederà i file distributore definitivi e un parser dedicato; fino ad allora il controllo sito/PDF resta un passaggio umano tracciato nelle note di revisione.

## Report e controlli

`catalog:diff` confronta gli hash dei contenuti e produce:

- prodotti nuovi;
- schede modificate;
- prodotti non più trovati, sempre da verificare;
- SKU duplicati;
- prodotti senza immagini;
- specifiche discordanti fra pagine che condividono lo stesso SKU.

Prima di usare i dati in una build del sito eseguire:

```bash
npm run typecheck
npm test
npm run catalog:diff
npm run catalog:assets -- validate
```

Il controllo editoriale resta obbligatorio anche quando i test passano: i test verificano il contratto tecnico, non l'esattezza commerciale del contenuto.
