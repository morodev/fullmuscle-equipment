import type { LocalizedValue } from './types';

export interface GuideSection {
  title: LocalizedValue;
  paragraphs: { it: string[]; en: string[] };
  points?: { it: string[]; en: string[] };
}

export interface Guide {
  id: string;
  slug: LocalizedValue;
  title: LocalizedValue;
  description: LocalizedValue;
  intro: LocalizedValue;
  readingTime: number;
  categoryIds: string[];
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    id: 'new-gym-equipment',
    slug: { it: 'attrezzature-apertura-nuova-palestra', en: 'choosing-equipment-for-a-new-gym' },
    title: { it: 'Come scegliere le attrezzature per aprire una nuova palestra', en: 'How to choose equipment for a new gym' },
    description: { it: 'Criteri pratici per definire aree, priorità e mix di attrezzature professionali quando si apre una nuova palestra.', en: 'Practical criteria for defining training areas, priorities and the professional equipment mix for a new gym.' },
    intro: { it: 'La lista delle macchine viene dopo il progetto. Prima occorre chiarire pubblico, superficie utile, modello di servizio, capacità prevista e budget disponibile.', en: 'The equipment list follows the project. Start by defining the audience, usable floor area, service model, expected capacity and available budget.' },
    readingTime: 7,
    categoryIds: ['pin-loaded-machine', 'plate-loaded-machine', 'free-weight', 'treadmill'],
    sections: [
      {
        title: { it: 'Parti dal modello della palestra', en: 'Start with the gym model' },
        paragraphs: {
          it: ['Una palestra generalista, un centro strength, uno studio personal e una fitness room per hotel richiedono dotazioni diverse. Definisci chi userà lo spazio, negli stessi orari, e quali esperienze vuoi rendere centrali.', 'Queste informazioni permettono di distribuire il budget tra cardio, macchine guidate, carico libero e functional senza riempire la sala di modelli poco coerenti con il servizio.'],
          en: ['A general fitness club, a strength facility, a personal training studio and a hotel fitness room need different equipment. Define who will use the space, at the same time, and which experiences should be central.', 'This information helps divide the budget between cardio, selectorised machines, plate-loaded equipment, free weights and functional training without filling the floor with models that do not support the service.'],
        },
        points: { it: ['Pubblico e livello di esperienza', 'Numero di utenti nelle ore di punta', 'Servizi e aree che distinguono la struttura'], en: ['Audience and training experience', 'Users expected at peak times', 'Services and areas that define the facility'] },
      },
      {
        title: { it: 'Costruisci un mix equilibrato', en: 'Build a balanced equipment mix' },
        paragraphs: {
          it: ['Le macchine isotoniche rendono immediato il percorso, il carico libero amplia le possibilità di progressione e il cardio assorbe utilizzi prolungati. Il numero di stazioni deve seguire la domanda prevista, non una lista standard.', 'Individua prima le postazioni indispensabili, poi aggiungi varietà e specializzazione. In questo modo il preventivo può essere organizzato per priorità e la palestra può crescere senza compromettere i passaggi.'],
          en: ['Selectorised machines make the training path easy to understand, free weights support progression and cardio equipment handles longer sessions. The number of stations should follow expected demand rather than a standard list.', 'Identify essential stations first, then add variety and specialisation. This allows the quotation to be organised by priority and leaves room for the gym to grow without compromising circulation.'],
        },
      },
      {
        title: { it: 'Verifica prima del preventivo', en: 'Check the project before requesting a quotation' },
        paragraphs: {
          it: ['Per ogni modello controlla dimensioni, area operativa, alimentazione, pavimentazione e accessi per consegna e montaggio. Considera anche distanze di sicurezza, pulizia e manutenzione.', 'Una richiesta completa dovrebbe includere planimetria, tempi di apertura, budget orientativo e quantità. Questi elementi rendono il confronto tecnico più rapido e riducono le modifiche successive.'],
          en: ['For each model, check dimensions, working clearance, power, flooring and access for delivery and assembly. Include safety distances, cleaning and maintenance access.', 'A complete enquiry should include the floor plan, opening timeline, indicative budget and quantities. These details make technical discussions faster and reduce later changes.'],
        },
        points: { it: ['Planimetria e altezze utili', 'Accessi e alimentazioni', 'Priorità, quantità e tempi'], en: ['Floor plan and clear heights', 'Access and power requirements', 'Priorities, quantities and timeline'] },
      },
    ],
  },
  {
    id: 'gym-floor-planning',
    slug: { it: 'come-organizzare-sala-pesi-professionale', en: 'how-to-plan-a-professional-gym-floor' },
    title: { it: 'Come organizzare una sala pesi professionale', en: 'How to plan a professional gym floor' },
    description: { it: 'Una guida a spazi, flussi, distanze e disposizione delle attrezzature per progettare una sala pesi leggibile e funzionale.', en: 'A guide to space, circulation, clearances and equipment placement for a practical professional gym floor.' },
    intro: { it: 'Una buona disposizione riduce incroci, rende riconoscibili le aree e permette allo staff di controllare la sala. Il punto di partenza è lo spazio operativo, non il solo ingombro dichiarato della macchina.', en: 'A good layout reduces crossing paths, makes training areas easy to understand and helps staff supervise the floor. Start from working clearance rather than the machine footprint alone.' },
    readingTime: 6,
    categoryIds: ['free-weight', 'pin-loaded-machine', 'multi-functional-smith-machine-trainer'],
    sections: [
      {
        title: { it: 'Dividi lo spazio per comportamento', en: 'Divide the floor by training behaviour' },
        paragraphs: {
          it: ['Raggruppa le attrezzature che generano movimenti e tempi simili. Cardio, circuito guidato, pesi liberi e functional hanno esigenze diverse per rumore, supervisione e permanenza.', 'Un percorso leggibile aiuta i nuovi utenti e limita gli spostamenti di dischi, panche e accessori tra aree lontane.'],
          en: ['Group equipment that creates similar movement patterns and session times. Cardio, selectorised circuits, free weights and functional zones have different needs for noise, supervision and dwell time.', 'A clear training path helps new users and limits the movement of plates, benches and accessories between distant areas.'],
        },
      },
      {
        title: { it: 'Calcola lo spazio realmente utilizzato', en: 'Calculate the real working footprint' },
        paragraphs: {
          it: ['Alle dimensioni della macchina aggiungi regolazioni, salita e discesa, caricamento dei dischi e passaggio degli utenti. Le stazioni fronteggiate o affiancate devono poter funzionare contemporaneamente.', 'Mantieni visibili le vie di uscita e lascia accesso agli elementi che richiedono pulizia o interventi tecnici. I modelli più alti vanno verificati rispetto a soffitti, impianti e illuminazione.'],
          en: ['Add adjustment, mounting, plate loading and user circulation space to the dimensions of each machine. Stations positioned opposite or beside one another must be able to operate at the same time.', 'Keep exits visible and retain access to components that need cleaning or technical service. Check taller models against ceilings, building services and lighting.'],
        },
        points: { it: ['Ingombro statico', 'Area di utilizzo', 'Passaggi e accessi tecnici'], en: ['Static footprint', 'Working area', 'Circulation and service access'] },
      },
      {
        title: { it: 'Lascia margine per evolvere', en: 'Leave room for the facility to evolve' },
        paragraphs: {
          it: ['Evita di saturare ogni metro disponibile nella prima fornitura. Uno spazio libero ben posizionato può assorbire nuove stazioni, picchi di utilizzo o attività a corpo libero.', 'Organizza la selezione in livelli: dotazione essenziale, ampliamenti prioritari e modelli specialistici. La stessa struttura può guidare il preventivo e le fasi di installazione.'],
          en: ['Avoid filling every available square metre in the first supply phase. Well-positioned open space can support future stations, peak demand or bodyweight work.', 'Organise the selection in levels: essential equipment, priority additions and specialist models. The same structure can guide the quotation and installation phases.'],
        },
      },
    ],
  },
  {
    id: 'strength-equipment-comparison',
    slug: { it: 'macchine-isotoniche-plate-loaded-pesi-liberi', en: 'selectorised-vs-plate-loaded-vs-free-weights' },
    title: { it: 'Macchine isotoniche, plate loaded e pesi liberi', en: 'Selectorised, plate-loaded and free-weight equipment' },
    description: { it: 'Differenze operative tra macchine con pacco pesi, attrezzature plate loaded e pesi liberi per comporre l’area strength.', en: 'Operational differences between selectorised machines, plate-loaded equipment and free weights when building a strength area.' },
    intro: { it: 'Le tre famiglie non svolgono lo stesso ruolo. Una sala completa le combina in base al pubblico, alla supervisione disponibile, agli obiettivi di allenamento e alla capacità richiesta.', en: 'These three families serve different roles. A complete floor combines them according to the audience, available supervision, training goals and required capacity.' },
    readingTime: 6,
    categoryIds: ['pin-loaded-machine', 'plate-loaded-machine', 'free-weight'],
    sections: [
      {
        title: { it: 'Macchine isotoniche con pacco pesi', en: 'Selectorised machines' },
        paragraphs: {
          it: ['La selezione del carico è rapida e il percorso di utilizzo è immediato. Sono adatte a circuiti guidati, utenti con esperienza diversa e sale in cui più persone alternano frequentemente le stazioni.', 'Nel confronto considera intervallo e incremento del pacco pesi, regolazioni, accessibilità e coerenza ergonomica tra i modelli della stessa linea.'],
          en: ['Load selection is quick and the training path is easy to understand. These machines suit guided circuits, mixed-experience audiences and facilities where users rotate frequently between stations.', 'Compare weight-stack range and increments, adjustments, accessibility and ergonomic consistency across models in the same line.'],
        },
      },
      {
        title: { it: 'Macchine plate loaded', en: 'Plate-loaded machines' },
        paragraphs: {
          it: ['Il carico a dischi interessa soprattutto aree strength e bodybuilding, dove la progressione e la sensazione del movimento hanno un ruolo centrale. Richiede più spazio operativo per caricare i perni.', 'La progettazione deve includere portadischi vicini, pavimentazione adeguata e un numero di dischi coerente con l’uso simultaneo delle stazioni.'],
          en: ['Plate loading is particularly suited to strength and bodybuilding areas where progression and movement feel are central. It needs additional working room around the loading points.', 'The layout should include nearby plate storage, suitable flooring and enough plates for stations that will be used at the same time.'],
        },
      },
      {
        title: { it: 'Pesi liberi e rack', en: 'Free weights and racks' },
        paragraphs: {
          it: ['Rack, panche, bilancieri e manubri offrono la maggiore varietà, ma richiedono organizzazione degli accessori e attenzione ai flussi. La capacità dell’area dipende dal numero di postazioni realmente utilizzabili insieme.', 'Per definire il mix finale valuta esperienza degli utenti, presenza dello staff, spazio per gli esercizi e facilità di riporre ogni elemento vicino alla postazione.'],
          en: ['Racks, benches, barbells and dumbbells provide the broadest variety but require organised storage and careful circulation. Area capacity depends on how many stations can genuinely operate at the same time.', 'When defining the mix, consider user experience, staff presence, exercise space and the ability to store each item close to its station.'],
        },
        points: { it: ['Guidato e rapido: macchine isotoniche', 'Carichi e specializzazione: plate loaded', 'Versatilità: pesi liberi e rack'], en: ['Guided and quick: selectorised machines', 'Loading and specialisation: plate loaded', 'Versatility: free weights and racks'] },
      },
    ],
  },
];

export const GUIDE_BY_ID = new Map(GUIDES.map((guide) => [guide.id, guide]));
