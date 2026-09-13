import draftsDocument from '../../data/catalog-public/products.json';
import { categoryUrl, lineUrl, productUrl } from './site';
import type { CatalogListItem, CatalogProduct, CatalogTaxonomy, Locale, LocalizedValue, ProductSpecification } from './types';

type DraftAsset = { role: 'primary' | 'gallery'; reviewStatus: string; localPath?: string; width: number; height: number };
type DraftProduct = {
  publicSku: string;
  categoryId: string;
  lineId?: string;
  specifications: Record<string, string>;
  assets: DraftAsset[];
  descriptor: string;
  technicalDescription: string;
};

const imageModules = import.meta.glob('/src/assets/catalog/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const APPROVED_ASSETS = new Set(['approved', 'approved-provisional', 'approved-oem']);

interface CategoryDefinition {
  name: LocalizedValue;
  slug: LocalizedValue;
  description: LocalizedValue;
  singular: LocalizedValue;
  use: LocalizedValue;
}

const CATEGORY_DEFINITIONS: Record<string, CategoryDefinition> = {
  'pin-loaded-machine': {
    name: { it: 'Macchine isotoniche', en: 'Pin loaded machines' },
    singular: { it: 'Macchina isotonica', en: 'Pin loaded machine' },
    slug: { it: 'macchine-isotoniche', en: 'pin-loaded-machines' },
    description: { it: 'Macchine professionali con pacco pesi per allenare ogni distretto in modo guidato.', en: 'Professional selectorised machines for controlled training across every major muscle group.' },
    use: { it: 'sale pesi, centri fitness e studi professionali', en: 'weight rooms, fitness clubs and professional studios' },
  },
  'plate-loaded-machine': {
    name: { it: 'Macchine a carico libero', en: 'Plate loaded machines' },
    singular: { it: 'Macchina a carico libero', en: 'Plate loaded machine' },
    slug: { it: 'macchine-carico-libero', en: 'plate-loaded-machines' },
    description: { it: 'Biomeccanica solida, carico a dischi e configurazioni pensate per l’allenamento della forza.', en: 'Solid biomechanics, plate loading and configurations built for professional strength training.' },
    use: { it: 'allenamento professionale della forza', en: 'professional strength training' },
  },
  'multi-functional-smith-machine-trainer': {
    name: { it: 'Smith machine e multifunzione', en: 'Smith machines & functional trainers' },
    singular: { it: 'Stazione multifunzione', en: 'Multi-function station' },
    slug: { it: 'smith-machine-multifunzione', en: 'smith-machines-functional-trainers' },
    description: { it: 'Stazioni versatili per integrare lavoro guidato, cavi, rack e accessori in uno spazio efficiente.', en: 'Versatile stations combining guided lifting, cables, racks and accessories in an efficient footprint.' },
    use: { it: 'palestre, hotel e personal training studio', en: 'gyms, hotels and personal training studios' },
  },
  'free-weight': {
    name: { it: 'Pesi liberi e panche', en: 'Free weights & benches' },
    singular: { it: 'Attrezzatura per pesi liberi', en: 'Free weight equipment' },
    slug: { it: 'pesi-liberi-panche', en: 'free-weights-benches' },
    description: { it: 'Panche, rack e complementi per organizzare una zona pesi completa e funzionale.', en: 'Benches, racks and accessories for a complete, functional free-weight area.' },
    use: { it: 'zone pesi ad alta intensità', en: 'high-intensity free-weight areas' },
  },
  treadmill: {
    name: { it: 'Tapis roulant', en: 'Treadmills' }, singular: { it: 'Tapis roulant professionale', en: 'Professional treadmill' },
    slug: { it: 'tapis-roulant', en: 'treadmills' },
    description: { it: 'Tapis roulant professionali progettati per un utilizzo continuativo in strutture fitness.', en: 'Professional treadmills designed for continuous use in fitness facilities.' },
    use: { it: 'aree cardio professionali', en: 'professional cardio areas' },
  },
  'exercise-bike': {
    name: { it: 'Bike professionali', en: 'Exercise bikes' }, singular: { it: 'Bike professionale', en: 'Professional exercise bike' },
    slug: { it: 'bike-professionali', en: 'exercise-bikes' },
    description: { it: 'Bike verticali, reclinate e indoor cycle per completare l’area cardio.', en: 'Upright, recumbent and indoor cycles for a complete cardio area.' },
    use: { it: 'allenamento cardio a basso impatto', en: 'low-impact cardio training' },
  },
  'stair-climber': {
    name: { it: 'Stair climber', en: 'Stair climbers' }, singular: { it: 'Stair climber professionale', en: 'Professional stair climber' },
    slug: { it: 'stair-climber', en: 'stair-climbers' },
    description: { it: 'Attrezzature cardio per un lavoro intenso su gambe, glutei e capacità aerobica.', en: 'Cardio equipment for demanding lower-body and aerobic workouts.' },
    use: { it: 'allenamento cardio ad alta intensità', en: 'high-intensity cardio training' },
  },
  elliptical: {
    name: { it: 'Ellittiche', en: 'Ellipticals' }, singular: { it: 'Ellittica professionale', en: 'Professional elliptical' },
    slug: { it: 'ellittiche', en: 'ellipticals' },
    description: { it: 'Movimento fluido e allenamento total body a basso impatto.', en: 'Fluid movement and low-impact full-body cardio training.' },
    use: { it: 'aree cardio e percorsi total body', en: 'cardio zones and full-body training' },
  },
  'crossfit-multi-station': {
    name: { it: 'Stazioni cross training', en: 'Cross training stations' }, singular: { it: 'Stazione cross training', en: 'Cross training station' },
    slug: { it: 'stazioni-cross-training', en: 'cross-training-stations' },
    description: { it: 'Strutture modulari per allenamento funzionale, classi e lavoro di gruppo.', en: 'Modular structures for functional training, classes and group workouts.' },
    use: { it: 'functional training e allenamento di gruppo', en: 'functional and group training' },
  },
  'rowing-machine': {
    name: { it: 'Vogatori', en: 'Rowing machines' }, singular: { it: 'Vogatore professionale', en: 'Professional rowing machine' },
    slug: { it: 'vogatori', en: 'rowing-machines' },
    description: { it: 'Vogatori per il condizionamento completo e il lavoro coordinato di tutto il corpo.', en: 'Rowers for complete conditioning and coordinated full-body training.' },
    use: { it: 'condizionamento cardiovascolare total body', en: 'full-body cardiovascular conditioning' },
  },
  'ski-machine': {
    name: { it: 'Ski trainer', en: 'Ski trainers' }, singular: { it: 'Ski trainer professionale', en: 'Professional ski trainer' },
    slug: { it: 'ski-trainer', en: 'ski-trainers' },
    description: { it: 'Ergometri verticali per potenza, resistenza e coordinazione.', en: 'Vertical ergometers for power, endurance and coordination.' },
    use: { it: 'preparazione atletica e functional training', en: 'athletic preparation and functional training' },
  },
  'ab-coaster': {
    name: { it: 'Ab trainer', en: 'Ab trainers' }, singular: { it: 'Ab trainer professionale', en: 'Professional ab trainer' },
    slug: { it: 'ab-trainer', en: 'ab-trainers' },
    description: { it: 'Attrezzature dedicate al lavoro controllato della zona addominale.', en: 'Equipment dedicated to controlled abdominal training.' },
    use: { it: 'allenamento mirato del core', en: 'focused core training' },
  },
  'surfing-machine': {
    name: { it: 'Surf trainer', en: 'Surf trainers' }, singular: { it: 'Surf trainer', en: 'Surf trainer' },
    slug: { it: 'surf-trainer', en: 'surf-trainers' },
    description: { it: 'Una soluzione dinamica per equilibrio, coordinazione e allenamento funzionale.', en: 'A dynamic solution for balance, coordination and functional training.' },
    use: { it: 'equilibrio e preparazione funzionale', en: 'balance and functional preparation' },
  },
};

const TYPE_RULES: Array<{ pattern: RegExp; name: LocalizedValue }> = [
  { pattern: /recumbent.*bike|bike.*recumbent/, name: { it: 'Bike reclinata', en: 'Recumbent bike' } },
  { pattern: /upright.*bike/, name: { it: 'Bike verticale', en: 'Upright bike' } },
  { pattern: /spin(?:ning)?.*bike|indoor cycl/, name: { it: 'Indoor cycle', en: 'Indoor cycle' } },
  { pattern: /air\s*bike|fan.*bike/, name: { it: 'Air bike', en: 'Air bike' } },
  { pattern: /treadmill|running machine/, name: { it: 'Tapis roulant professionale', en: 'Professional treadmill' } },
  { pattern: /elliptical|cross trainer/, name: { it: 'Ellittica professionale', en: 'Professional elliptical' } },
  { pattern: /stair|ladder climber/, name: { it: 'Stair climber professionale', en: 'Professional stair climber' } },
  { pattern: /rowing machine|rower/, name: { it: 'Vogatore professionale', en: 'Professional rowing machine' } },
  { pattern: /ski machine/, name: { it: 'Ski trainer professionale', en: 'Professional ski trainer' } },
  { pattern: /ab coaster|abdominal trainer/, name: { it: 'Ab trainer professionale', en: 'Professional ab trainer' } },
  { pattern: /hip thrust|glute bridge|glute drive/, name: { it: 'Hip thrust e glute machine', en: 'Hip thrust & glute machine' } },
  { pattern: /abductor.*adductor|adductor.*abductor|inner.*outer thigh/, name: { it: 'Abductor e adductor', en: 'Abductor & adductor' } },
  { pattern: /abductor|outer thigh/, name: { it: 'Hip abductor', en: 'Hip abductor' } },
  { pattern: /adductor|inner thigh/, name: { it: 'Hip adductor', en: 'Hip adductor' } },
  { pattern: /leg extension.*(?:curl|leg curl)|leg curl.*leg extension/, name: { it: 'Leg extension e leg curl', en: 'Leg extension & leg curl' } },
  { pattern: /leg extension/, name: { it: 'Leg extension', en: 'Leg extension' } },
  { pattern: /(?:prone|lying|seated).*leg curl|leg curl/, name: { it: 'Leg curl', en: 'Leg curl' } },
  { pattern: /hack squat/, name: { it: 'Hack squat', en: 'Hack squat' } },
  { pattern: /leg press/, name: { it: 'Leg press', en: 'Leg press' } },
  { pattern: /calf/, name: { it: 'Calf machine', en: 'Calf machine' } },
  { pattern: /chest.*back|back.*chest/, name: { it: 'Chest e back machine', en: 'Chest & back machine' } },
  { pattern: /incline.*(?:chest|press)|super incline/, name: { it: 'Incline chest press', en: 'Incline chest press' } },
  { pattern: /decline.*press/, name: { it: 'Decline chest press', en: 'Decline chest press' } },
  { pattern: /chest press|bench press|pectoral/, name: { it: 'Chest press', en: 'Chest press' } },
  { pattern: /shoulder press|lateral shoulder/, name: { it: 'Shoulder press', en: 'Shoulder press' } },
  { pattern: /lateral raise|deltoid/, name: { it: 'Lateral raise', en: 'Lateral raise' } },
  { pattern: /lat pulldown|pull down|pulldown/, name: { it: 'Lat pulldown', en: 'Lat pulldown' } },
  { pattern: /high row/, name: { it: 'High row', en: 'High row' } },
  { pattern: /low row/, name: { it: 'Low row', en: 'Low row' } },
  { pattern: /seated row|rowing.*strength/, name: { it: 'Seated row', en: 'Seated row' } },
  { pattern: /biceps|preacher curl|arm curl/, name: { it: 'Biceps curl', en: 'Biceps curl' } },
  { pattern: /triceps|dip machine/, name: { it: 'Triceps machine', en: 'Triceps machine' } },
  { pattern: /abdominal crunch|ab crunch/, name: { it: 'Abdominal crunch', en: 'Abdominal crunch' } },
  { pattern: /back extension/, name: { it: 'Back extension', en: 'Back extension' } },
  { pattern: /smith machine/, name: { it: 'Smith machine multifunzione', en: 'Multi-function Smith machine' } },
  { pattern: /cable crossover/, name: { it: 'Cable crossover', en: 'Cable crossover' } },
  { pattern: /functional trainer/, name: { it: 'Functional trainer', en: 'Functional trainer' } },
  { pattern: /power rack|squat rack/, name: { it: 'Power rack', en: 'Power rack' } },
  { pattern: /multi.?station|jungle/, name: { it: 'Stazione multifunzione', en: 'Multi-station gym' } },
  { pattern: /adjustable.*bench/, name: { it: 'Panca regolabile', en: 'Adjustable bench' } },
  { pattern: /flat bench/, name: { it: 'Panca piana', en: 'Flat bench' } },
  { pattern: /incline bench/, name: { it: 'Panca inclinata', en: 'Incline bench' } },
  { pattern: /dumbbell rack/, name: { it: 'Porta manubri', en: 'Dumbbell rack' } },
  { pattern: /dumbbell/, name: { it: 'Manubrio professionale', en: 'Professional dumbbell' } },
  { pattern: /bumper plate|weight plate|olympic plate|coated plate/, name: { it: 'Disco olimpionico', en: 'Olympic weight plate' } },
  { pattern: /curl.*barbell|straight.*barbell/, name: { it: 'Bilanciere fisso', en: 'Fixed barbell' } },
  { pattern: /olympic.*bar|ez curl bar/, name: { it: 'Bilanciere olimpionico', en: 'Olympic barbell' } },
  { pattern: /barbell rack/, name: { it: 'Porta bilancieri', en: 'Barbell rack' } },
  { pattern: /yoga mat|exercise mat/, name: { it: 'Materassino fitness', en: 'Exercise mat' } },
  { pattern: /medicine ball rack/, name: { it: 'Porta palle mediche', en: 'Medicine ball rack' } },
  { pattern: /medicine ball/, name: { it: 'Palla medica', en: 'Medicine ball' } },
  { pattern: /yoga ball|anti burst ball/, name: { it: 'Fitball', en: 'Exercise ball' } },
  { pattern: /kettlebell rack/, name: { it: 'Porta kettlebell', en: 'Kettlebell rack' } },
  { pattern: /kettlebell/, name: { it: 'Kettlebell', en: 'Kettlebell' } },
  { pattern: /^step$|aerobic step/, name: { it: 'Step professionale', en: 'Professional step' } },
  { pattern: /flooring/, name: { it: 'Pavimentazione fitness', en: 'Gym flooring' } },
  { pattern: /gymnastic.*ring/, name: { it: 'Anelli ginnici', en: 'Gymnastic rings' } },
  { pattern: /weight plate storage|weight tree/, name: { it: 'Porta dischi', en: 'Weight plate storage' } },
  { pattern: /parallettes/, name: { it: 'Parallettes', en: 'Parallettes' } },
  { pattern: /farmer walk/, name: { it: 'Farmer walk handle', en: 'Farmer walk handle' } },
  { pattern: /tyre flip/, name: { it: 'Tyre flip trainer', en: 'Tyre flip trainer' } },
  { pattern: /exercise wheel/, name: { it: 'Ruota addominali', en: 'Ab wheel' } },
  { pattern: /plyo box/, name: { it: 'Plyo box', en: 'Plyo box' } },
  { pattern: /chin.*dip.*leg raise|assisted chin.*dip/, name: { it: 'Chin up e dip assistita', en: 'Assisted chin-up & dip' } },
  { pattern: /knee raise/, name: { it: 'Knee raise', en: 'Knee raise' } },
  { pattern: /rotary torso|combo twist/, name: { it: 'Rotary torso', en: 'Rotary torso' } },
  { pattern: /multi hip/, name: { it: 'Multi hip', en: 'Multi hip' } },
  { pattern: /total abdominal|abdominal machine|vertical crunch/, name: { it: 'Abdominal machine', en: 'Abdominal machine' } },
  { pattern: /abdominal oblique/, name: { it: 'Abdominal oblique crunch', en: 'Abdominal oblique crunch' } },
  { pattern: /pec dec|pec fly|butterfly/, name: { it: 'Pectoral fly', en: 'Pec fly' } },
  { pattern: /back.*abdominal combo/, name: { it: 'Back e abdominal combo', en: 'Back & abdominal combo' } },
  { pattern: /delt machine|lateral delt|iateral delt/, name: { it: 'Deltoid machine', en: 'Deltoid machine' } },
  { pattern: /utility bench|seated utility/, name: { it: 'Panca utility', en: 'Utility bench' } },
  { pattern: /olympic military bench|military bench/, name: { it: 'Panca military', en: 'Military bench' } },
  { pattern: /olympic decline bench/, name: { it: 'Panca olimpionica declinata', en: 'Olympic decline bench' } },
  { pattern: /power cage/, name: { it: 'Power cage', en: 'Power cage' } },
  { pattern: /t.?bar row|adjustable t.?bar/, name: { it: 'T-bar row', en: 'T-bar row' } },
  { pattern: /leg sled/, name: { it: 'Leg sled', en: 'Leg sled' } },
  { pattern: /deadlift.*shrug/, name: { it: 'Deadlift e shrug', en: 'Deadlift & shrug' } },
  { pattern: /compound row|angle row|front row|orbital row|anchor row|long row/, name: { it: 'Row machine', en: 'Row machine' } },
  { pattern: /dual.?pulley row/, name: { it: 'Dual pulley row', en: 'Dual pulley row' } },
  { pattern: /vertical chest|horizontal press|multi press/, name: { it: 'Multi press', en: 'Multi press' } },
  { pattern: /seated dip/, name: { it: 'Seated dip', en: 'Seated dip' } },
  { pattern: /overhead press|viking press/, name: { it: 'Overhead press', en: 'Overhead press' } },
  { pattern: /wide chest/, name: { it: 'Wide chest press', en: 'Wide chest press' } },
  { pattern: /squat lunge|max lunge|glute lunge/, name: { it: 'Squat e lunge machine', en: 'Squat & lunge machine' } },
  { pattern: /tibia dorsi/, name: { it: 'Tibialis machine', en: 'Tibialis machine' } },
  { pattern: /wrist curl/, name: { it: 'Wrist curl machine', en: 'Wrist curl machine' } },
  { pattern: /pendulum squat/, name: { it: 'Pendulum squat', en: 'Pendulum squat' } },
  { pattern: /pullover/, name: { it: 'Pullover machine', en: 'Pullover machine' } },
  { pattern: /standing tricep extension/, name: { it: 'Standing triceps extension', en: 'Standing triceps extension' } },
  { pattern: /squat station|power squat|belt squat|super squat/, name: { it: 'Squat machine', en: 'Squat machine' } },
  { pattern: /power runner/, name: { it: 'Power runner', en: 'Power runner' } },
  { pattern: /reverse glute ham|reverse hyper/, name: { it: 'Reverse hyper', en: 'Reverse hyper' } },
  { pattern: /incline hip abduction/, name: { it: 'Hip abduction inclinata', en: 'Incline hip abduction' } },
  { pattern: /roman chair/, name: { it: 'Roman chair', en: 'Roman chair' } },
  { pattern: /hip glute|glute machine|kick back/, name: { it: 'Glute machine', en: 'Glute machine' } },
  { pattern: /split squat/, name: { it: 'Split squat stand', en: 'Split squat stand' } },
  { pattern: /step.?up/, name: { it: 'Step-up machine', en: 'Step-up machine' } },
  { pattern: /vertical bench/, name: { it: 'Vertical bench', en: 'Vertical bench' } },
  { pattern: /vertical traction|upper back/, name: { it: 'Upper back machine', en: 'Upper back machine' } },
  { pattern: /half rack/, name: { it: 'Half rack', en: 'Half rack' } },
  { pattern: /dual adjustable pulley/, name: { it: 'Doppia puleggia regolabile', en: 'Dual adjustable pulley' } },
  { pattern: /multi.?functional bench|multi bench|dumbbell bench/, name: { it: 'Panca multifunzione', en: 'Multi-function bench' } },
  { pattern: /wall mount rack/, name: { it: 'Rack pieghevole a parete', en: 'Fold-back wall rack' } },
  { pattern: /squat stand/, name: { it: 'Supporti squat', en: 'Squat stands' } },
  { pattern: /pec fly attachment/, name: { it: 'Accessorio pectoral fly', en: 'Pec fly attachment' } },
  { pattern: /ab attachment/, name: { it: 'Accessorio addominali', en: 'Ab attachment' } },
  { pattern: /pull.?up bar|chin.?up bar/, name: { it: 'Barra trazioni', en: 'Pull-up bar' } },
  { pattern: /leverage attachment/, name: { it: 'Accessorio leverage', en: 'Leverage attachment' } },
  { pattern: /dip handle/, name: { it: 'Maniglie dip', en: 'Dip handle attachment' } },
  { pattern: /monolift/, name: { it: 'Sistema monolift', en: 'Monolift system' } },
  { pattern: /safety support/, name: { it: 'Barra di sicurezza', en: 'Safety support bar' } },
  { pattern: /j.?hooks/, name: { it: 'J-hooks', en: 'J-hooks' } },
  { pattern: /landmine/, name: { it: 'Accessorio landmine', en: 'Landmine attachment' } },
  { pattern: /support feet/, name: { it: 'Piedi di supporto', en: 'Support feet' } },
  { pattern: /single pulley/, name: { it: 'Puleggia singola', en: 'Single pulley' } },
];

const SPEC_LABELS: Record<string, string> = {
  dimension: 'Dimensioni', dimensions: 'Dimensioni', 'product size': 'Dimensioni prodotto', size: 'Dimensioni',
  weight: 'Peso', 'machine weight': 'Peso macchina', 'net weight': 'Peso netto', 'gross weight': 'Peso lordo',
  'n.w.': 'Peso netto', 'g.w.': 'Peso lordo', 'n.w./g.w.': 'Peso netto/lordo', 'n.w./g.w': 'Peso netto/lordo',
  'max load weight': 'Carico massimo', 'maximum user weight': 'Peso massimo utente', 'max user weight': 'Peso massimo utente',
  'weight stack': 'Pacco pesi', 'standard weight stack': 'Pacco pesi standard', 'weight stack system': 'Sistema pacco pesi',
  'weight stacking': 'Pacco pesi', 'weight options': 'Opzioni di peso', 'weight range': 'Intervallo di peso', 'weight increase': 'Incremento peso',
  material: 'Materiale', painting: 'Verniciatura', cushion: 'Imbottitura', type: 'Tipologia',
  'tube size': 'Sezione tubolare', 'steel tube': 'Tubolare in acciaio', tube: 'Tubolare', 'main tube 1': 'Tubolare principale 1', 'main tube 2': 'Tubolare principale 2',
  '– primary load-bearing members': 'Elementi portanti principali', '– secondary supports': 'Supporti secondari', color: 'Colore',
  resistance: 'Resistenza', 'range of resistance': 'Intervallo di resistenza', power: 'Alimentazione', 'input power': 'Potenza assorbita',
  'input power voltage': 'Tensione di alimentazione', 'power supply mode': 'Modalità di alimentazione', voltage: 'Tensione',
  speed: 'Velocità', 'maximum speed': 'Velocità massima', incline: 'Inclinazione', characteristic: 'Caratteristica',
  'running area': 'Superficie di corsa', 'running belt size': 'Dimensioni nastro', 'running belt thickness': 'Spessore nastro',
  'running board thickness': 'Spessore piano di corsa', 'screen size': 'Dimensioni schermo', 'screen size(back screen)': 'Dimensioni schermo posteriore',
  display: 'Display', 'electronic meter display': 'Dati visualizzati', 'heart rate system': 'Rilevazione frequenza cardiaca',
  'training program': 'Programmi di allenamento', 'preset programs': 'Programmi preimpostati', language: 'Lingue',
  'machine size': 'Dimensioni macchina', 'machine size(l*w*h)': 'Dimensioni macchina', 'machine size(l*w*h)mm': 'Dimensioni macchina',
  'machine size (l*w*h)': 'Dimensioni macchina', 'machine size (l*w*h)mm': 'Dimensioni macchina', 'treadmill size': 'Dimensioni tapis roulant',
  'frame dimensions (l×w×h)': 'Dimensioni telaio', 'dimensions (l×w×h)': 'Dimensioni', 'packing size': 'Dimensioni imballo',
  'packing size (l*w*h)mm': 'Dimensioni imballo', packing: 'Imballo', package: 'Imballo', capacity: 'Capacità', application: 'Destinazione d’uso',
  'maintenance free': 'Manutenzione', 'maintenance-free': 'Manutenzione', 'recommended live area': 'Area d’uso consigliata',
};

function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateMeta(value: string, maximum = 158): string {
  if (value.length <= maximum) return value;
  const shortened = value.slice(0, maximum - 1).replace(/\s+\S*$/, '').replace(/[,:;\s]+$/, '');
  return `${shortened}.`;
}

function selectionNotes(categoryId: string): { it: string[]; en: string[] } {
  const notes: Record<string, { it: string[]; en: string[] }> = {
    'pin-loaded-machine': {
      it: ['Verifica il pacco pesi in rapporto al pubblico previsto.', 'Considera accessi, regolazioni e spazio tra le stazioni.', 'Abbina movimenti complementari per costruire un circuito equilibrato.'],
      en: ['Match the weight stack to the expected user profile.', 'Allow for access, adjustments and circulation between stations.', 'Combine complementary movements to build a balanced strength circuit.'],
    },
    'plate-loaded-machine': {
      it: ['Prevedi spazio laterale per caricare e scaricare i dischi.', 'Valuta portadischi e pavimentazione dell’area strength.', 'Confronta traiettoria, regolazioni e carico utile del modello.'],
      en: ['Allow lateral clearance for loading and unloading plates.', 'Plan plate storage and flooring for the strength area.', 'Compare movement path, adjustments and usable load.'],
    },
    'multi-functional-smith-machine-trainer': {
      it: ['Verifica altezza libera e ingombro operativo della stazione.', 'Definisci gli esercizi prioritari e gli accessori necessari.', 'Mantieni liberi accessi, cavi e aree di sicurezza.'],
      en: ['Check ceiling height and the station’s working footprint.', 'Define priority exercises and the required attachments.', 'Keep access, cable paths and safety areas clear.'],
    },
    'free-weight': {
      it: ['Dimensiona pavimentazione e area di sicurezza in base ai carichi.', 'Organizza dischi, bilancieri e manubri vicino alle postazioni.', 'Verifica compatibilità, portata e regolazioni prima della scelta.'],
      en: ['Size flooring and safety clearances for the expected loads.', 'Keep plates, bars and dumbbells close to their training stations.', 'Confirm compatibility, capacity and adjustments before selection.'],
    },
    treadmill: {
      it: ['Verifica alimentazione, ventilazione e spazio dietro il nastro.', 'Confronta superficie di corsa, velocità e peso massimo utente.', 'Prevedi accesso comodo per pulizia e manutenzione ordinaria.'],
      en: ['Check power, ventilation and clearance behind the running deck.', 'Compare running surface, speed and maximum user weight.', 'Leave practical access for cleaning and routine maintenance.'],
    },
    'exercise-bike': {
      it: ['Valuta facilità di accesso e regolazioni per utenti diversi.', 'Verifica alimentazione, resistenza e dati mostrati dal display.', 'Lascia spazio sufficiente per salire e scendere in sicurezza.'],
      en: ['Consider access and adjustment range for different users.', 'Check power, resistance and the data shown on the console.', 'Leave enough clearance for safe mounting and dismounting.'],
    },
    'stair-climber': {
      it: ['Controlla altezza del locale e spazio di sicurezza superiore.', 'Verifica accesso, velocità, alimentazione e peso massimo utente.', 'Posiziona la macchina in un’area cardio ben ventilata.'],
      en: ['Check ceiling height and overhead safety clearance.', 'Confirm access, speed, power and maximum user weight.', 'Position the machine in a well-ventilated cardio area.'],
    },
    elliptical: {
      it: ['Verifica lunghezza del passo e spazio operativo complessivo.', 'Confronta livelli di resistenza e modalità di regolazione.', 'Mantieni liberi i lati per un accesso semplice alla pedana.'],
      en: ['Check stride length and the complete working footprint.', 'Compare resistance levels and adjustment controls.', 'Keep both sides clear for easy access to the pedals.'],
    },
    'crossfit-multi-station': {
      it: ['Definisci numero di utenti e attività contemporanee.', 'Verifica ancoraggi, altezza e distanze di sicurezza.', 'Pianifica accessori e moduli in base al programma dei corsi.'],
      en: ['Define user capacity and simultaneous activities.', 'Check anchoring, height and safety clearances.', 'Plan attachments and modules around the class programme.'],
    },
    'rowing-machine': {
      it: ['Considera la lunghezza completa durante l’utilizzo.', 'Verifica sistema di resistenza e regolazioni disponibili.', 'Prevedi spazio per spostamento, pulizia e rimessaggio.'],
      en: ['Allow for the machine’s full length during use.', 'Check the resistance system and available adjustments.', 'Plan space for moving, cleaning and storage.'],
    },
    'ski-machine': {
      it: ['Verifica altezza utile e modalità di fissaggio.', 'Lascia spazio per la completa escursione delle braccia.', 'Inserisci la stazione vicino alle aree functional o cardio.'],
      en: ['Check usable height and the mounting method.', 'Leave room for the complete arm movement.', 'Place the station near functional or cardio training areas.'],
    },
    'ab-coaster': {
      it: ['Valuta facilità di accesso e regolazioni della postazione.', 'Verifica ingombro operativo e area libera intorno alla macchina.', 'Abbina la stazione ad altri movimenti per il core.'],
      en: ['Consider access and adjustment of the training position.', 'Check the working footprint and clearance around the machine.', 'Combine the station with complementary core movements.'],
    },
    'surfing-machine': {
      it: ['Prevedi un’area libera adeguata al movimento dinamico.', 'Verifica livelli di resistenza e modalità di arresto.', 'Definisci supervisione e progressione in base agli utenti.'],
      en: ['Provide enough clear space for the dynamic movement.', 'Check resistance levels and stopping controls.', 'Define supervision and progression for the expected users.'],
    },
  };
  return notes[categoryId] ?? {
    it: ['Verifica ingombro e spazio operativo.', 'Confronta regolazioni e capacità con gli utenti previsti.', 'Inserisci il modello in una selezione coerente con il progetto.'],
    en: ['Check footprint and working clearance.', 'Match adjustments and capacity to the expected users.', 'Include the model in an equipment mix suited to the project.'],
  };
}

function productType(rawName: string, category: CategoryDefinition): LocalizedValue {
  const normalized = rawName.toLowerCase();
  return TYPE_RULES.find((rule) => rule.pattern.test(normalized))?.name ?? category.singular;
}

function safeSpecifications(values: Record<string, string>, locale: Locale): ProductSpecification[] {
  return Object.entries(values)
    .filter(([label]) => label.trim().toLowerCase() !== 'product name')
    .map(([label, value]) => ({
      label: locale === 'it' ? (SPEC_LABELS[label.trim().toLowerCase()] ?? cleanText(label)) : cleanText(label),
      value: cleanText(String(value)),
    }))
    .filter((item) => item.label && item.value && item.value.length <= 180)
    .slice(0, 18);
}

function resolveImage(localPath: string | undefined): string | undefined {
  if (!localPath) return undefined;
  return imageModules[`/${localPath.replaceAll('\\', '/')}`];
}

function buildProduct(draft: DraftProduct): CatalogProduct {
  const category = CATEGORY_DEFINITIONS[draft.categoryId] ?? CATEGORY_DEFINITIONS['pin-loaded-machine']!;
  const rawName = cleanText(draft.descriptor);
  const type = productType(rawName, category);
  const name = { it: `${type.it} ${draft.publicSku}`, en: `${type.en} ${draft.publicSku}` };
  const specifications = {
    it: safeSpecifications(draft.specifications, 'it'),
    en: safeSpecifications(draft.specifications, 'en'),
  };
  const approvedImages = draft.assets
    .filter((asset) => APPROVED_ASSETS.has(asset.reviewStatus))
    .map((asset) => ({ ...asset, url: resolveImage(asset.localPath) }))
    .filter((asset): asset is DraftAsset & { url: string } => Boolean(asset.url));
  const primaryAsset = approvedImages.find((asset) => asset.role === 'primary');
  if (!primaryAsset) throw new Error(`${draft.publicSku}: immagine principale approvata assente dalla build.`);
  const detailIt = specifications.it.slice(0, 3).map((item) => `${item.label.toLowerCase()} ${item.value}`).join(', ');
  const detailEn = specifications.en.slice(0, 3).map((item) => `${item.label.toLowerCase()} ${item.value}`).join(', ');
  const primaryIt = specifications.it[0];
  const primaryEn = specifications.en[0];
  const summary = {
    it: `${name.it} per ${category.use.it}${primaryIt ? `, con ${primaryIt.label.toLowerCase()} ${primaryIt.value}` : ''}.`,
    en: `${name.en} for ${category.use.en}${primaryEn ? `, with ${primaryEn.label.toLowerCase()} ${primaryEn.value}` : ''}.`,
  };
  const technicalDescription = cleanText(draft.technicalDescription);
  const description = {
    it: [
      `${name.it} è una soluzione a catalogo pensata per ${category.use.it}. La configurazione privilegia solidità, utilizzo intuitivo e inserimento ordinato all’interno di un progetto fitness professionale.`,
      detailIt ? `I dati disponibili indicano ${detailIt}. Il nostro team può aiutarti a verificare ingombri, configurazione e abbinamento con le altre attrezzature prima del preventivo.` : 'Il nostro team può aiutarti a verificare ingombri, configurazione e abbinamento con le altre attrezzature prima del preventivo.',
    ],
    en: [
      technicalDescription || `${name.en} is a catalogue solution designed for ${category.use.en}. Its configuration supports a coherent fit within a professional fitness project.`,
      detailEn ? `Available technical data includes ${detailEn}. Our team can help you confirm footprint, configuration and equipment combinations before preparing a quotation.` : 'Our team can help you confirm footprint, configuration and equipment combinations before preparing a quotation.',
    ],
  };
  const seoTitle = { it: `${name.it} | FullMuscle Equipment`, en: `${name.en} | FullMuscle Equipment` };
  const seoDescription = {
    it: truncateMeta(`${name.it}: ${category.description.it}${primaryIt ? ` ${primaryIt.label}: ${primaryIt.value}.` : ''}`),
    en: truncateMeta(`${name.en}: ${technicalDescription || category.description.en}${primaryEn ? ` ${primaryEn.label}: ${primaryEn.value}.` : ''}`),
  };
  const features = {
    it: specifications.it.slice(0, 6).map((item) => `${item.label}: ${item.value}`),
    en: specifications.en.slice(0, 6).map((item) => `${item.label}: ${item.value}`),
  };
  if (features.it.length < 3) features.it.push('Configurazione professionale', 'Supporto alla progettazione', 'Preventivo su richiesta');
  if (features.en.length < 3) features.en.push('Professional configuration', 'Layout planning support', 'Quotation on request');

  return {
    sku: draft.publicSku,
    categoryId: draft.categoryId,
    ...(draft.lineId ? { lineId: draft.lineId } : {}),
    slug: { it: slugify(name.it), en: slugify(name.en) },
    name,
    summary,
    seoTitle,
    seoDescription,
    imageAlt: { it: `${name.it}, vista prodotto`, en: `${name.en}, product view` },
    description,
    features,
    selectionNotes: selectionNotes(draft.categoryId),
    specifications,
    primaryImage: primaryAsset.url,
    primaryImageWidth: primaryAsset.width,
    primaryImageHeight: primaryAsset.height,
    gallery: approvedImages.filter((asset) => asset.role === 'gallery').map((asset) => asset.url),
    availableForQuote: true,
  };
}

export const PRODUCTS: CatalogProduct[] = (draftsDocument.products as DraftProduct[]).map(buildProduct);

function taxonomy(): { categories: CatalogTaxonomy[]; lines: CatalogTaxonomy[] } {
  const categoryCounts = new Map<string, number>();
  const lineCounts = new Map<string, number>();
  for (const product of PRODUCTS) {
    categoryCounts.set(product.categoryId, (categoryCounts.get(product.categoryId) ?? 0) + 1);
    if (product.lineId) lineCounts.set(product.lineId, (lineCounts.get(product.lineId) ?? 0) + 1);
  }
  const categories = [...categoryCounts.entries()].map(([id, count]) => {
    const definition = CATEGORY_DEFINITIONS[id] ?? CATEGORY_DEFINITIONS['pin-loaded-machine']!;
    return { id, count, name: definition.name, slug: definition.slug, description: definition.description };
  }).sort((a, b) => b.count - a.count);
  const lines = [...lineCounts.entries()].map(([id, count]) => {
    const series = id.replace(/^fm-/, '').replace(/-series$/, '').replaceAll('-', ' ').toUpperCase();
    return {
      id,
      count,
      name: { it: `Serie FM ${series}`, en: `FM ${series} Series` },
      slug: { it: id, en: id },
      description: { it: `Scopri i ${count} modelli della Serie FM ${series}.`, en: `Explore ${count} models in the FM ${series} Series.` },
    };
  }).sort((a, b) => a.name.it.localeCompare(b.name.it));
  return { categories, lines };
}

export const { categories: CATEGORIES, lines: LINES } = taxonomy();
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));
export const LINE_BY_ID = new Map(LINES.map((line) => [line.id, line]));

export function getProductBySlug(locale: Locale, slug: string): CatalogProduct | undefined {
  return PRODUCTS.find((product) => product.slug[locale] === slug);
}

export function listItem(product: CatalogProduct, locale: Locale): CatalogListItem {
  const category = CATEGORY_BY_ID.get(product.categoryId)!;
  const line = product.lineId ? LINE_BY_ID.get(product.lineId) : undefined;
  return {
    sku: product.sku,
    name: product.name[locale],
    summary: product.summary[locale],
    href: productUrl(locale, product.slug[locale]),
    image: product.primaryImage,
    imageWidth: product.primaryImageWidth,
    imageHeight: product.primaryImageHeight,
    categoryId: product.categoryId,
    categoryName: category.name[locale],
    ...(line ? { lineId: line.id, lineName: line.name[locale] } : {}),
  };
}

export function productsForCategory(categoryId: string): CatalogProduct[] {
  return PRODUCTS.filter((product) => product.categoryId === categoryId);
}

export function productsForLine(lineId: string): CatalogProduct[] {
  return PRODUCTS.filter((product) => product.lineId === lineId);
}

export function taxonomyUrl(locale: Locale, taxonomy: CatalogTaxonomy, kind: 'category' | 'line'): string {
  return kind === 'category' ? categoryUrl(locale, taxonomy.slug[locale]) : lineUrl(locale, taxonomy.slug[locale]);
}
