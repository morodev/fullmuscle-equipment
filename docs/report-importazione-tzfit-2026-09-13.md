# Report importazione catalogo — 13 settembre 2026

Questa è la baseline interna della prima acquisizione. I dati sorgente e il nome del fornitore non sono contenuti destinati alla pubblicazione.

## Risultato

| Voce | Totale |
|---|---:|
| Pagine prodotto acquisite | 774 |
| SKU sorgente distinti | 759 |
| Categorie e serie | 40 |
| Cataloghi PDF individuati | 11 |
| Riferimenti a immagini prodotto | 1.243 |
| Immagini scaricate e validate localmente | 1.243 |
| Immagini provvisorie approvate | 762 |
| Immagini preparate per schede pubblicabili | 754 |
| Bozze univoche con immagine principale approvata | 744 |
| Immagini secondarie ancora da ripulire o sostituire | 393 |
| Ricorrenze di banner promozionali bloccate | 88 |
| Prodotti senza immagini individuate | 0 |
| Bozze FullMuscle univoche generate | 744 |
| SKU duplicati in quarantena | 15 |
| Pagine coinvolte nella quarantena | 30 |
| Prodotti senza specifiche strutturate | 19 |
| Prodotti senza descrizione sorgente | 1 |
| Conflitti materiali fra specifiche duplicate | 5 |

Le 744 schede interne restano tracciate come `draft`, mentre la vista del sito applica il livello editoriale pubblico. Le 1.243 immagini sono state scaricate e controllate tramite 78 tavole di contatto. Sono stati approvati 762 asset provvisori; 754 appartenenti agli SKU pubblicabili sono stati convertiti in WebP nella libreria destinata alla build. Ogni prodotto pubblico dispone ora di una fotografia principale reale. Le 393 immagini secondarie non necessarie restano escluse finché non vengono ripulite o sostituite dagli originali OEM. Cinque immagini principali sono già state ripulite rimuovendo soltanto il nome o il logo del fornitore, senza aggiungere il marchio FullMuscle.

La vista pubblica accetta esclusivamente percorsi locali con stato approvato. L'audit ha rilevato zero URL sorgente esposti e 744 SKU pubblici distinti con prefisso `FM-`.

## SKU in quarantena

Questi codici sono dichiarati da due pagine diverse. In diversi casi il codice nella scheda non coincide con quello presente nel titolo o nella URL. Serve scegliere il modello corretto usando il catalogo tecnico o una conferma commerciale.

| SKU FullMuscle | Nomi trovati |
|---|---|
| `FM-2010A` | Commercial Elliptical Machine (Touch Screen Android) / Commercial Elliptical Machine |
| `FM-5054` | Four-Way Neck Machine / Incline Press |
| `FM-6000B` | Commercial Running Treadmill / Commercial Treadmill |
| `FM-8027` | Abdominal Bench / Adjustable Abdominal Bench |
| `FM-8203` | Seated Row / Leg Extension & Prone Leg Curl |
| `FM-GC-5058` | Prone Leg Curl Leg Extension / Combo Leg Exercise Machine |
| `FM-GC-5063` | Standing Abductor Outer Thigh Machine / Standing Abductor |
| `FM-GC-5067-1` | Hip Thrust Glute Machine / Hip Thrust Glute Bridge Machine |
| `FM-GF-005` | Incline Chest Press / Plate Loaded Incline Chest Press |
| `FM-GT-5005` | Seated Chest Press / Seated Row |
| `FM-GT-5095` | Lateral Shoulder Press / Standing Hip Thrust |
| `FM-Q1032` | Multi Squat Power Rack / Commercial Gym Equipment Multi Squat Power Rack |
| `FM-Q1081` | Multi-Functional Smith Machine / Wall Mounted Mirror Functional Trainer |
| `FM-X6002` | Seated Leg Extension / Seated Leg Extension |
| `FM-X6004` | Seated rower machine / Seated Row |

## Dati tecnici da integrare

Mancano specifiche strutturate per questi codici: `GM-5053-1`, `MP-8138`, `MP-8142`, `TZ-3013`, `TZ-3020`, `TZ-3031`, `TZ-3031B`, `TZ-3031C`, `TZ-5000A`, `TZ-5000B`, `TZ-7010A`, `TZ-7015`, `TZ-7026`, `TZ-7036`, `TZ-N2040A`, `TZ-N2040B`, `TZ-N8002`, `TZ-Q1113` e `TZ-Q1114`.

Per `GF-004` manca una descrizione sorgente utilizzabile. Queste assenze non impediscono di conservare la bozza, ma ne impediscono l'approvazione editoriale.

## Baseline e prossimi aggiornamenti

La baseline corrente produce 759 SKU invariati, 15 duplicati segnalati e nessun prodotto nuovo, modificato o rimosso. I crawl successivi confronteranno gli hash contro questa fotografia. Una scomparsa dal sito sorgente verrà sempre marcata per revisione manuale.

Il pacchetto OEM non blocca la copertura fotografica dei 744 prodotti univoci. Servirà per sostituire gli asset provvisori mantenendo invariati SKU e URL. Restano separati dalla vista pubblica i 15 SKU in quarantena, in attesa della scelta del modello corretto.
