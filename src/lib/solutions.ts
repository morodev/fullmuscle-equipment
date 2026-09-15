import type { ImageMetadata } from 'astro';
import corporateWellnessImage from '../assets/solutions/corporate-wellness.webp';
import cruiseImage from '../assets/solutions/cruise.webp';
import educationImage from '../assets/solutions/education.webp';
import hospitalityImage from '../assets/solutions/hospitality.webp';
import medicalImage from '../assets/solutions/medical.webp';
import newGymImage from '../assets/solutions/new-gym.webp';
import privateClubImage from '../assets/solutions/private-club.webp';
import renovationImage from '../assets/solutions/renovation.webp';
import studioImage from '../assets/solutions/studio.webp';
import type { ProjectType } from './project-types';
import { route } from './site';
import type { Locale, LocalizedValue } from './types';

export type SolutionId = 'new-gym' | 'renovation' | 'hospitality' | 'studio' | 'cruise' | 'medical' | 'private-club' | 'corporate-wellness' | 'education';
export type SolutionGroup = 'projects' | 'hospitality' | 'health-work' | 'education';

export interface Solution {
  id: SolutionId;
  group: SolutionGroup;
  slug: LocalizedValue;
  name: LocalizedValue;
  eyebrow: LocalizedValue;
  title: LocalizedValue;
  intro: LocalizedValue;
  challenge: LocalizedValue;
  metaTitle: LocalizedValue;
  metaDescription: LocalizedValue;
  image: ImageMetadata;
  imageAlt: LocalizedValue;
  quoteType: ProjectType;
  categoryIds: string[];
  steps: Array<{ title: LocalizedValue; text: LocalizedValue }>;
  checks: LocalizedValue[];
}

export const SOLUTIONS: Solution[] = [
  {
    id: 'new-gym', group: 'projects', slug: { it: 'apertura-nuova-palestra', en: 'new-gym-opening' },
    name: { it: 'Apertura nuova palestra', en: 'New gym opening' }, eyebrow: { it: 'Dall’idea all’apertura', en: 'From concept to opening' },
    title: { it: 'Dallo spazio vuoto a una palestra pronta ad accogliere.', en: 'From an empty space to a gym ready to perform.' },
    intro: { it: 'Costruiamo una selezione di attrezzature coerente con metratura, pubblico, posizionamento e budget del nuovo centro fitness.', en: 'We build an equipment mix around the space, audience, positioning and budget of your new fitness facility.' },
    challenge: { it: 'Aprire una palestra richiede equilibrio tra varietà, capacità nelle ore di punta, flussi chiari e investimenti concentrati sulle attrezzature che generano valore.', en: 'Opening a gym requires balance across variety, peak-time capacity, clear circulation and investment focused on equipment that creates value.' },
    metaTitle: { it: 'Attrezzature per apertura nuova palestra | FullMuscle', en: 'Equipment for a new gym opening | FullMuscle' },
    metaDescription: { it: 'Attrezzature professionali e selezione su misura per aprire una nuova palestra: forza, cardio, functional e preventivo dedicato.', en: 'Professional equipment and a tailored mix for a new gym opening, covering strength, cardio and functional areas.' },
    image: newGymImage, imageAlt: { it: 'Nuova palestra professionale con aree forza e cardio', en: 'New professional gym with strength and cardio areas' }, quoteType: 'new-gym',
    categoryIds: ['pin-loaded-machine', 'plate-loaded-machine', 'treadmill', 'multi-functional-smith-machine-trainer', 'exercise-bike', 'free-weight'],
    steps: [
      { title: { it: 'Analisi del progetto', en: 'Project review' }, text: { it: 'Metratura, bacino di utenza, modello di palestra e obiettivi di apertura.', en: 'Floor area, target audience, gym model and launch goals.' } },
      { title: { it: 'Mix delle aree', en: 'Training area mix' }, text: { it: 'Cardio, isotonico, carico libero, functional e spazi di servizio.', en: 'Cardio, selectorised strength, plate loaded, functional and service areas.' } },
      { title: { it: 'Selezione e preventivo', en: 'Selection and quotation' }, text: { it: 'Una proposta organizzata per priorità, quantità e configurazioni.', en: 'A proposal organised by priority, quantities and configurations.' } },
    ],
    checks: [
      { it: 'Quanti utenti devono allenarsi contemporaneamente?', en: 'How many users need to train at the same time?' },
      { it: 'Quali aree definiscono il posizionamento della palestra?', en: 'Which areas define the positioning of the gym?' },
      { it: 'Quali vincoli presentano planimetria, accessi e impianti?', en: 'What constraints come from the floor plan, access and building services?' },
      { it: 'Quale dotazione è essenziale per l’apertura e cosa può essere aggiunto dopo?', en: 'Which equipment is essential for opening and what can be added later?' },
    ],
  },
  {
    id: 'renovation', group: 'projects', slug: { it: 'rinnovo-palestra', en: 'gym-renovation' },
    name: { it: 'Rinnovo palestra', en: 'Gym renovation' }, eyebrow: { it: 'Rinnovo e ampliamento', en: 'Renovation and expansion' },
    title: { it: 'Rinnova la sala senza perdere ciò che funziona.', en: 'Upgrade your gym without losing what already works.' },
    intro: { it: 'Valutiamo le aree esistenti e costruiamo un aggiornamento mirato per migliorare esperienza, capacità e identità dello spazio.', en: 'We assess your current training areas and create a targeted upgrade to improve experience, capacity and identity.' },
    challenge: { it: 'Un rinnovo efficace parte dai colli di bottiglia reali: attrezzature sovraccariche, percorsi confusi, zone poco utilizzate o un’offerta non più allineata ai clienti.', en: 'An effective renovation starts from real bottlenecks: overloaded equipment, unclear circulation, underused areas or an offer that no longer fits members.' },
    metaTitle: { it: 'Rinnovo palestra e nuove attrezzature | FullMuscle', en: 'Gym renovation and equipment upgrade | FullMuscle' },
    metaDescription: { it: 'Rinnova o amplia la palestra con una selezione mirata di attrezzature professionali costruita su spazi, utilizzo e budget.', en: 'Renovate or expand your gym with professional equipment selected around space, usage and budget.' },
    image: renovationImage, imageAlt: { it: 'Palestra rinnovata con attrezzature coordinate e percorsi ampi', en: 'Renovated gym with coordinated equipment and clear circulation' }, quoteType: 'renovation',
    categoryIds: ['pin-loaded-machine', 'plate-loaded-machine', 'treadmill', 'multi-functional-smith-machine-trainer', 'crossfit-multi-station', 'free-weight'],
    steps: [
      { title: { it: 'Audit della dotazione', en: 'Equipment audit' }, text: { it: 'Mappiamo cosa mantenere, sostituire e integrare.', en: 'We map what to keep, replace and add.' } },
      { title: { it: 'Priorità di intervento', en: 'Upgrade priorities' }, text: { it: 'Ordiniamo le scelte per impatto, spazio e budget.', en: 'We rank choices by impact, space and budget.' } },
      { title: { it: 'Nuovo equilibrio', en: 'A better balance' }, text: { it: 'Completiamo le aree con modelli coerenti tra loro.', en: 'We complete training areas with a coherent equipment mix.' } },
    ],
    checks: [
      { it: 'Quali stazioni generano attese nelle ore di punta?', en: 'Which stations create queues at peak times?' },
      { it: 'Quali zone risultano poco utilizzate?', en: 'Which areas are underused?' },
      { it: 'Quali modelli possono restare e quali limitano il servizio?', en: 'Which models can remain and which limit the service?' },
      { it: 'Come intervenire per fasi senza perdere coerenza?', en: 'How can the upgrade be phased without losing consistency?' },
    ],
  },
  {
    id: 'hospitality', group: 'hospitality', slug: { it: 'hotel-resort', en: 'hotels-resorts' },
    name: { it: 'Hotel e resort', en: 'Hotels and resorts' }, eyebrow: { it: 'Ospitalità', en: 'Hospitality' },
    title: { it: 'Una fitness room all’altezza dell’esperienza ospite.', en: 'A fitness room that matches the guest experience.' },
    intro: { it: 'Selezioniamo attrezzature versatili e leggibili, adatte a spazi compatti e a ospiti con livelli di esperienza diversi.', en: 'We select versatile, intuitive equipment suited to compact spaces and guests with different training experience.' },
    challenge: { it: 'In una struttura ricettiva ogni metro conta. La dotazione deve offrire allenamenti completi senza rendere lo spazio affollato o complesso da usare.', en: 'Every square metre matters in hospitality. Equipment should support complete workouts without making the room crowded or difficult to use.' },
    metaTitle: { it: 'Attrezzature palestra per hotel e resort | FullMuscle', en: 'Gym equipment for hotels and resorts | FullMuscle' },
    metaDescription: { it: 'Progetta la fitness room di hotel e resort con attrezzature cardio e forza professionali, versatili e adatte allo spazio disponibile.', en: 'Plan a hotel or resort fitness room with versatile professional cardio and strength equipment.' },
    image: hospitalityImage, imageAlt: { it: 'Fitness room luminosa in un hotel con vista sul giardino', en: 'Bright hotel fitness room overlooking landscaped grounds' }, quoteType: 'hotel',
    categoryIds: ['treadmill', 'exercise-bike', 'elliptical', 'multi-functional-smith-machine-trainer', 'free-weight', 'pin-loaded-machine'],
    steps: [
      { title: { it: 'Profilo della struttura', en: 'Property profile' }, text: { it: 'Categoria, ospiti, dimensione della sala e livello di servizio.', en: 'Property category, guests, room size and service level.' } },
      { title: { it: 'Dotazione essenziale', en: 'Essential equipment' }, text: { it: 'Cardio, forza e mobilità in un insieme compatto.', en: 'Cardio, strength and mobility in a compact mix.' } },
      { title: { it: 'Scelta coordinata', en: 'Coordinated selection' }, text: { it: 'Finiture e attrezzature coerenti con lo spazio.', en: 'Finishes and equipment aligned with the environment.' } },
    ],
    checks: [
      { it: 'Qual è il profilo degli ospiti e quanto dura la permanenza media?', en: 'Who are the guests and how long is the typical stay?' },
      { it: 'Quanti metri quadrati sono realmente utilizzabili?', en: 'How much floor area is genuinely usable?' },
      { it: 'Quali attrezzature risultano intuitive senza supervisione continua?', en: 'Which equipment is intuitive without constant supervision?' },
      { it: 'Come coordinare finiture, rumore e manutenzione con la struttura?', en: 'How should finishes, noise and maintenance fit the property?' },
    ],
  },
  {
    id: 'studio', group: 'health-work', slug: { it: 'personal-trainer-fisioterapia', en: 'personal-training-physiotherapy' },
    name: { it: 'Personal training e fisioterapia', en: 'Personal training and physiotherapy' }, eyebrow: { it: 'Studi professionali', en: 'Professional studios' },
    title: { it: 'Più possibilità di lavoro, in meno spazio.', en: 'More training possibilities in less space.' },
    intro: { it: 'Per personal trainer e studi professionali privilegiamo versatilità, regolazioni rapide e una selezione costruita sul metodo di lavoro.', en: 'For personal trainers and professional studios, we prioritise versatility, quick adjustment and a selection built around your working method.' },
    challenge: { it: 'Uno studio deve adattarsi a persone e sessioni diverse durante la giornata. Servono attrezzature flessibili, accessibili e semplici da regolare.', en: 'A studio must adapt to different clients and sessions during the day. Equipment needs to be flexible, approachable and easy to adjust.' },
    metaTitle: { it: 'Attrezzature per personal trainer e fisioterapia', en: 'Equipment for personal training and physiotherapy' },
    metaDescription: { it: 'Attrezzature versatili per studi personal trainer e fisioterapia: stazioni multifunzione e soluzioni adatte agli spazi compatti.', en: 'Versatile equipment for personal training and physiotherapy studios, including multifunction solutions for compact spaces.' },
    image: studioImage, imageAlt: { it: 'Trainer che guida un esercizio in uno studio professionale', en: 'Trainer guiding an exercise in a professional studio' }, quoteType: 'pt-studio',
    categoryIds: ['multi-functional-smith-machine-trainer', 'pin-loaded-machine', 'treadmill', 'exercise-bike', 'free-weight', 'crossfit-multi-station'],
    steps: [
      { title: { it: 'Metodo di lavoro', en: 'Training method' }, text: { it: 'Partiamo dai servizi e dai protocolli realmente offerti.', en: 'We start from the services and protocols you actually offer.' } },
      { title: { it: 'Versatilità', en: 'Versatility' }, text: { it: 'Selezioniamo stazioni con più possibilità di utilizzo.', en: 'We select stations that support more training options.' } },
      { title: { it: 'Spazio efficiente', en: 'Efficient footprint' }, text: { it: 'Organizziamo ingombri e passaggi per lavorare meglio.', en: 'We organise footprints and circulation for better sessions.' } },
    ],
    checks: [
      { it: 'Quali protocolli e servizi vengono svolti ogni giorno?', en: 'Which protocols and services are delivered each day?' },
      { it: 'Quante persone utilizzano lo spazio nello stesso momento?', en: 'How many people use the space at the same time?' },
      { it: 'Quali regolazioni rendono una stazione adatta a clienti diversi?', en: 'Which adjustments make a station suitable for different clients?' },
      { it: 'Come mantenere libero lo spazio necessario al lavoro assistito?', en: 'How can enough room be retained for coached work?' },
    ],
  },
  {
    id: 'cruise', group: 'hospitality', slug: { it: 'navi-da-crociera', en: 'cruise-ships' },
    name: { it: 'Navi da crociera', en: 'Cruise ships' }, eyebrow: { it: 'Fitness a bordo', en: 'Fitness at sea' },
    title: { it: 'Un’esperienza fitness completa, anche in navigazione.', en: 'A complete fitness experience while at sea.' },
    intro: { it: 'Selezioniamo attrezzature professionali per aree fitness di bordo, considerando ingombri, varietà di utenti e semplicità di utilizzo.', en: 'We select professional equipment for onboard fitness areas, considering footprint, varied users and ease of use.' },
    challenge: { it: 'A bordo gli spazi sono definiti e ogni scelta deve contribuire a un’offerta completa. Cardio, forza e zone libere vanno bilanciati con attenzione.', en: 'Onboard space is defined and every choice must support a complete offer. Cardio, strength and open areas need careful balance.' },
    metaTitle: { it: 'Attrezzature fitness per navi da crociera | FullMuscle', en: 'Fitness equipment for cruise ships | FullMuscle' },
    metaDescription: { it: 'Attrezzature cardio e forza per palestre su navi da crociera, selezionate in base a spazio, pubblico e progetto della fitness area.', en: 'Cardio and strength equipment for cruise ship gyms, selected around space, audience and the fitness area project.' },
    image: cruiseImage, imageAlt: { it: 'Palestra su nave da crociera con vista sul mare', en: 'Cruise ship gym overlooking the sea' }, quoteType: 'cruise',
    categoryIds: ['treadmill', 'exercise-bike', 'elliptical', 'rowing-machine', 'multi-functional-smith-machine-trainer', 'free-weight'],
    steps: [
      { title: { it: 'Analisi degli spazi', en: 'Space analysis' }, text: { it: 'Valutiamo superfici, percorsi e aree con maggiore valore per l’ospite.', en: 'We review floor area, circulation and the zones that create most guest value.' } },
      { title: { it: 'Esperienza completa', en: 'Complete experience' }, text: { it: 'Costruiamo un mix leggibile per allenamenti cardio, forza e funzionali.', en: 'We build an intuitive mix for cardio, strength and functional training.' } },
      { title: { it: 'Configurazione dedicata', en: 'Tailored configuration' }, text: { it: 'Definiamo modelli e quantità rispetto alla capacità prevista.', en: 'We define models and quantities around expected capacity.' } },
    ],
    checks: [
      { it: 'Quanti ospiti utilizzeranno la palestra nelle fasce più frequentate?', en: 'How many guests will use the gym at peak times?' },
      { it: 'Quali viste e percorsi caratterizzano l’area fitness?', en: 'Which views and circulation routes define the fitness area?' },
      { it: 'Quale equilibrio serve tra cardio, forza e spazio libero?', en: 'What balance is needed across cardio, strength and open space?' },
      { it: 'Quali ingombri e accessi condizionano la selezione?', en: 'Which footprints and access constraints affect the selection?' },
    ],
  },
  {
    id: 'medical', group: 'health-work', slug: { it: 'centri-medicali-riabilitazione', en: 'medical-rehabilitation-centres' },
    name: { it: 'Centri medicali', en: 'Medical centres' }, eyebrow: { it: 'Medical fitness e riabilitazione', en: 'Medical fitness and rehabilitation' },
    title: { it: 'Spazi di esercizio pensati intorno al percorso della persona.', en: 'Exercise spaces shaped around each person’s pathway.' },
    intro: { it: 'Supportiamo la selezione di attrezzature per centri medicali e riabilitativi, partendo da accessibilità, controllo del movimento e modalità di supervisione.', en: 'We support equipment selection for medical and rehabilitation centres around accessibility, movement control and supervision.' },
    challenge: { it: 'In un ambiente medicale la scelta deve seguire i protocolli definiti dai professionisti, facilitare l’assistenza e lasciare passaggi chiari intorno alle postazioni.', en: 'In a medical setting, selection must follow professional protocols, support assisted work and preserve clear access around stations.' },
    metaTitle: { it: 'Attrezzature per centri medicali e riabilitazione', en: 'Equipment for medical and rehabilitation centres' },
    metaDescription: { it: 'Attrezzature per medical fitness e centri riabilitativi selezionate in base a protocolli, accessibilità, spazi e supervisione professionale.', en: 'Equipment for medical fitness and rehabilitation centres selected around protocols, accessibility, space and professional supervision.' },
    image: medicalImage, imageAlt: { it: 'Professionista che supervisiona un esercizio in un centro riabilitativo', en: 'Professional supervising exercise in a rehabilitation centre' }, quoteType: 'medical',
    categoryIds: ['exercise-bike', 'treadmill', 'elliptical', 'pin-loaded-machine', 'multi-functional-smith-machine-trainer', 'free-weight'],
    steps: [
      { title: { it: 'Protocolli e utenti', en: 'Protocols and users' }, text: { it: 'Raccogliamo modalità di lavoro, profili delle persone e necessità di assistenza.', en: 'We gather working methods, user profiles and supervision needs.' } },
      { title: { it: 'Accessibilità operativa', en: 'Practical accessibility' }, text: { it: 'Valutiamo accessi, regolazioni e spazio utile intorno alle macchine.', en: 'We review access, adjustments and usable room around equipment.' } },
      { title: { it: 'Selezione verificabile', en: 'Reviewable selection' }, text: { it: 'Prepariamo una proposta che il team professionale possa valutare nel dettaglio.', en: 'We prepare a proposal the professional team can assess in detail.' } },
    ],
    checks: [
      { it: 'Quali protocolli devono supportare le attrezzature?', en: 'Which protocols must the equipment support?' },
      { it: 'Quali livelli di assistenza e supervisione sono previsti?', en: 'What levels of assistance and supervision are expected?' },
      { it: 'Quanto spazio serve intorno a ogni postazione?', en: 'How much space is needed around each station?' },
      { it: 'Quali specifiche devono essere verificate dal responsabile clinico?', en: 'Which specifications need review by the clinical lead?' },
    ],
  },
  {
    id: 'private-club', group: 'hospitality', slug: { it: 'circoli-privati', en: 'private-clubs' },
    name: { it: 'Circoli privati', en: 'Private clubs' }, eyebrow: { it: 'Esperienza riservata', en: 'A private experience' },
    title: { it: 'Una fitness area coerente con il carattere del club.', en: 'A fitness space aligned with the character of the club.' },
    intro: { it: 'Per circoli privati e member club costruiamo selezioni curate, capaci di unire varietà di allenamento, comfort e qualità percepita.', en: 'For private and members’ clubs, we create curated selections combining training variety, comfort and perceived quality.' },
    challenge: { it: 'La dotazione deve inserirsi nell’esperienza complessiva del club: intuitiva per utenti diversi, completa senza sovraccaricare lo spazio e coerente nelle finiture.', en: 'Equipment must fit the wider club experience: intuitive for varied users, complete without overcrowding and coherent in its finishes.' },
    metaTitle: { it: 'Attrezzature fitness per circoli privati | FullMuscle', en: 'Fitness equipment for private clubs | FullMuscle' },
    metaDescription: { it: 'Soluzioni fitness per circoli privati e member club con attrezzature cardio, forza e functional selezionate per spazio ed esperienza.', en: 'Fitness solutions for private and members’ clubs with cardio, strength and functional equipment selected for the space.' },
    image: privateClubImage, imageAlt: { it: 'Area fitness elegante all’interno di un circolo privato', en: 'Elegant fitness area inside a private members club' }, quoteType: 'private-club',
    categoryIds: ['treadmill', 'pin-loaded-machine', 'plate-loaded-machine', 'exercise-bike', 'multi-functional-smith-machine-trainer', 'free-weight'],
    steps: [
      { title: { it: 'Identità del club', en: 'Club identity' }, text: { it: 'Partiamo dal servizio offerto, dagli utenti e dal livello dell’ambiente.', en: 'We start from the service, members and character of the environment.' } },
      { title: { it: 'Esperienze diverse', en: 'Varied experiences' }, text: { it: 'Bilanciamo allenamento autonomo, forza, cardio e lavoro assistito.', en: 'We balance independent training, strength, cardio and coached work.' } },
      { title: { it: 'Insieme coordinato', en: 'Coordinated mix' }, text: { it: 'Selezioniamo linee e finiture che dialogano con lo spazio.', en: 'We select ranges and finishes that complement the space.' } },
    ],
    checks: [
      { it: 'Quale esperienza si aspettano i membri?', en: 'What experience do members expect?' },
      { it: 'Quali fasce orarie e profili di utilizzo prevalgono?', en: 'Which usage profiles and time slots matter most?' },
      { it: 'Quanto deve essere ampia la varietà di allenamento?', en: 'How broad should the training variety be?' },
      { it: 'Quali materiali e finiture caratterizzano il club?', en: 'Which materials and finishes define the club?' },
    ],
  },
  {
    id: 'corporate-wellness', group: 'health-work', slug: { it: 'wellness-aziendale', en: 'corporate-wellness' },
    name: { it: 'Wellness aziendale', en: 'Corporate wellness' }, eyebrow: { it: 'Benessere sul lavoro', en: 'Wellbeing at work' },
    title: { it: 'Uno spazio fitness accessibile durante la giornata di lavoro.', en: 'An accessible fitness space within the working day.' },
    intro: { it: 'Progettiamo la selezione per palestre aziendali e spazi wellness, considerando tempi di utilizzo, semplicità e varietà dei dipendenti.', en: 'We plan equipment selections for workplace gyms and wellness spaces around usage times, simplicity and a varied workforce.' },
    challenge: { it: 'Una palestra aziendale deve funzionare per sessioni brevi e persone con esperienza diversa. Servono percorsi immediati e una dotazione equilibrata, facile da comprendere.', en: 'A workplace gym must support short sessions and people with different experience. It needs intuitive circulation and a balanced, approachable equipment mix.' },
    metaTitle: { it: 'Attrezzature per palestra e wellness aziendale', en: 'Equipment for workplace gyms and corporate wellness' },
    metaDescription: { it: 'Attrezzature professionali per palestra aziendale e corporate wellness, selezionate per spazio, dipendenti e modalità di utilizzo.', en: 'Professional equipment for workplace gyms and corporate wellness, selected around space, employees and usage patterns.' },
    image: corporateWellnessImage, imageAlt: { it: 'Dipendenti in una moderna palestra aziendale', en: 'Employees training in a modern workplace gym' }, quoteType: 'corporate-wellness',
    categoryIds: ['treadmill', 'exercise-bike', 'elliptical', 'multi-functional-smith-machine-trainer', 'pin-loaded-machine', 'free-weight'],
    steps: [
      { title: { it: 'Popolazione aziendale', en: 'Workforce profile' }, text: { it: 'Stimiamo utenti, orari, durata delle sessioni e livello di esperienza.', en: 'We estimate users, times, session length and experience levels.' } },
      { title: { it: 'Uso immediato', en: 'Intuitive use' }, text: { it: 'Privilegiamo un mix chiaro per sessioni efficaci e autonome.', en: 'We prioritise a clear mix for effective independent sessions.' } },
      { title: { it: 'Capacità e spazio', en: 'Capacity and space' }, text: { it: 'Dimensioniamo quantità e aree rispetto ai picchi previsti.', en: 'We size quantities and zones around expected peaks.' } },
    ],
    checks: [
      { it: 'Quante persone potranno accedere allo spazio?', en: 'How many people will have access to the space?' },
      { it: 'In quali momenti si concentrerà l’utilizzo?', en: 'When will most use take place?' },
      { it: 'Quali attività devono essere possibili in sessioni brevi?', en: 'Which activities need to work in short sessions?' },
      { it: 'Come rendere la sala leggibile anche ai meno esperti?', en: 'How can the room remain intuitive for less experienced users?' },
    ],
  },
  {
    id: 'education', group: 'education', slug: { it: 'scuole-universita', en: 'schools-universities' },
    name: { it: 'Scuole e università', en: 'Schools and universities' }, eyebrow: { it: 'Campus e formazione', en: 'Campus and education' },
    title: { it: 'Spazi per allenamento, didattica e benessere del campus.', en: 'Spaces for training, education and campus wellbeing.' },
    intro: { it: 'Selezioniamo attrezzature per scuole, università e centri sportivi accademici, bilanciando capacità, semplicità e varietà delle attività.', en: 'We select equipment for schools, universities and academic sports centres, balancing capacity, simplicity and training variety.' },
    challenge: { it: 'Gli spazi educativi accolgono gruppi, attività differenti e livelli eterogenei. La dotazione deve sostenere l’uso programmato e facilitare il controllo delle aree.', en: 'Education facilities host groups, different activities and varied experience levels. Equipment should support scheduled use and clear supervision of each zone.' },
    metaTitle: { it: 'Attrezzature sportive per scuole e università', en: 'Gym equipment for schools and universities' },
    metaDescription: { it: 'Attrezzature professionali per palestre scolastiche, università e campus: forza, cardio e functional scelti per capacità e attività.', en: 'Professional strength, cardio and functional equipment for schools, universities and campus fitness facilities.' },
    image: educationImage, imageAlt: { it: 'Studenti universitari adulti in una palestra di campus', en: 'Adult university students in a campus training facility' }, quoteType: 'education',
    categoryIds: ['pin-loaded-machine', 'plate-loaded-machine', 'multi-functional-smith-machine-trainer', 'treadmill', 'crossfit-multi-station', 'free-weight'],
    steps: [
      { title: { it: 'Attività e gruppi', en: 'Activities and groups' }, text: { it: 'Definiamo corsi, squadre, accesso libero e numero di utenti.', en: 'We define classes, teams, open access and user numbers.' } },
      { title: { it: 'Aree leggibili', en: 'Clear training zones' }, text: { it: 'Organizziamo forza, cardio e functional per un utilizzo ordinato.', en: 'We organise strength, cardio and functional areas for orderly use.' } },
      { title: { it: 'Dotazione scalabile', en: 'Scalable equipment mix' }, text: { it: 'Costruiamo una selezione per priorità e possibili fasi di sviluppo.', en: 'We build a selection around priorities and possible development phases.' } },
    ],
    checks: [
      { it: 'Quali gruppi e attività useranno la palestra?', en: 'Which groups and activities will use the gym?' },
      { it: 'Qual è la capacità richiesta nelle ore programmate?', en: 'What capacity is needed during scheduled sessions?' },
      { it: 'Quanto spazio va riservato alla supervisione e alla didattica?', en: 'How much room is needed for supervision and teaching?' },
      { it: 'Quali aree hanno priorità nella prima fase?', en: 'Which areas have priority in the first phase?' },
    ],
  },
];

export const SOLUTION_BY_ID = new Map<SolutionId, Solution>(SOLUTIONS.map((solution) => [solution.id, solution]));
export const HOME_SOLUTIONS = SOLUTIONS.filter((solution) => ['cruise', 'medical', 'private-club', 'corporate-wellness', 'education'].includes(solution.id));

export function solutionsHubUrl(locale: Locale): string {
  return `${route(locale).solutions}/`;
}

export function solutionUrl(locale: Locale, solution: Solution): string {
  return `${route(locale).solutions}/${solution.slug[locale]}/`;
}
