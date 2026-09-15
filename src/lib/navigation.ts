import { CATEGORY_BY_ID, FEATURED_TYPE_BY_ID, LINE_BY_ID, taxonomyUrl } from './catalog';
import { route } from './site';
import { SOLUTION_BY_ID, solutionUrl, solutionsHubUrl } from './solutions';
import type { SolutionId } from './solutions';
import type { CatalogTaxonomy, Locale, TaxonomyKind } from './types';

export interface NavigationLink {
  label: string;
  href: string;
}

export interface NavigationGroup {
  label: string;
  links: NavigationLink[];
}

function taxonomyLink(locale: Locale, taxonomy: CatalogTaxonomy | undefined, kind: TaxonomyKind): NavigationLink {
  if (!taxonomy) throw new Error(`Tassonomia del menu non trovata: ${kind}`);
  return { label: taxonomy.name[locale], href: taxonomyUrl(locale, taxonomy, kind) };
}

function categoryLink(locale: Locale, id: string): NavigationLink {
  return taxonomyLink(locale, CATEGORY_BY_ID.get(id), 'category');
}

function lineLink(locale: Locale, id: string): NavigationLink {
  return taxonomyLink(locale, LINE_BY_ID.get(id), 'line');
}

function typeLink(locale: Locale, id: string, label: string): NavigationLink {
  const link = taxonomyLink(locale, FEATURED_TYPE_BY_ID.get(id), 'type');
  return { ...link, label };
}

function solutionLink(locale: Locale, id: SolutionId): NavigationLink {
  const solution = SOLUTION_BY_ID.get(id);
  if (!solution) throw new Error(`Soluzione del menu non trovata: ${id}`);
  return { label: solution.name[locale], href: solutionUrl(locale, solution) };
}

export function navigation(locale: Locale) {
  const isIt = locale === 'it';
  const routes = route(locale);
  const allLabel = isIt ? 'Vedi tutti i modelli' : 'View all models';

  const strength: NavigationGroup[] = [
    {
      label: 'Pin Loaded Machine',
      links: [
        { ...categoryLink(locale, 'pin-loaded-machine'), label: allLabel },
        ...['fm-n8-series', 'fm-82-series', 'fm-x82-series', 'fm-g5-series', 'fm-gm-series', 'fm-gs-series', 'fm-gt-series', 'fm-hip-glute-machine', 'fm-gb-5-series', 'fm-x6-series', 'fm-5-series'].map((id) => lineLink(locale, id)),
      ],
    },
    {
      label: 'Plate Loaded Machine',
      links: [
        { ...categoryLink(locale, 'plate-loaded-machine'), label: allLabel },
        ...['fm-51-series', 'fm-52-series', 'fm-83-series', 'fm-88-series', 'fm-mp-series', 'fm-8xp-series', 'fm-77-series', 'fm-78-series', 'fm-5xp-series', 'fm-gf-series'].map((id) => lineLink(locale, id)),
      ],
    },
    {
      label: 'Smith Machine & Multifunction',
      links: [
        { ...categoryLink(locale, 'multi-functional-smith-machine-trainer'), label: allLabel },
        ...['fm-multi-functional-smith-machine', 'fm-multi-functional-power-rack', 'fm-multi-functional-trainer', 'fm-multi-gym-station', 'fm-multi-functional-adjustable-bench', 'fm-multi-functional-smith-accessories'].map((id) => lineLink(locale, id)),
      ],
    },
    {
      label: isIt ? 'Altre aree Strength' : 'More Strength',
      links: [
        categoryLink(locale, 'crossfit-multi-station'),
        categoryLink(locale, 'free-weight'),
        { label: isIt ? 'Tutto il catalogo' : 'Full catalogue', href: routes.catalog },
      ],
    },
  ];

  const cardioIds: Array<[string, string]> = [
    ['treadmill', isIt ? 'Treadmill' : 'Treadmills'],
    ['stair-climber', isIt ? 'Stair Climber' : 'Stair Climbers'],
    ['elliptical', isIt ? 'Elliptical' : 'Ellipticals'],
    ['exercise-bike', isIt ? 'Exercise Bike' : 'Exercise Bikes'],
    ['rowing-machine', isIt ? 'Rowing Machine' : 'Rowing Machines'],
    ['ski-machine', isIt ? 'Ski Machine' : 'Ski Machines'],
    ['surfing-machine', isIt ? 'Surfing Machine' : 'Surfing Machines'],
    ['ab-coaster', isIt ? 'AB Coaster' : 'AB Coasters'],
  ];
  const cardio = cardioIds.map(([id, label]) => ({ ...categoryLink(locale, id), label }));
  const solutions: NavigationGroup[] = [
    {
      label: isIt ? 'Progetti' : 'Projects',
      links: [
        { label: isIt ? 'Tutte le soluzioni' : 'All solutions', href: solutionsHubUrl(locale) },
        solutionLink(locale, 'new-gym'),
        solutionLink(locale, 'renovation'),
      ],
    },
    {
      label: isIt ? 'Ospitalità' : 'Hospitality',
      links: [solutionLink(locale, 'hospitality'), solutionLink(locale, 'cruise'), solutionLink(locale, 'private-club')],
    },
    {
      label: isIt ? 'Salute e lavoro' : 'Health and workplace',
      links: [solutionLink(locale, 'studio'), solutionLink(locale, 'medical'), solutionLink(locale, 'corporate-wellness')],
    },
    {
      label: isIt ? 'Formazione' : 'Education',
      links: [solutionLink(locale, 'education')],
    },
  ];

  return {
    strength,
    cardio,
    featured: [
      typeLink(locale, 'back-extension', 'Back Extension'),
      typeLink(locale, 'leg-press', 'Leg Press'),
      typeLink(locale, 'chest-press', 'Chest Press'),
    ],
    solutions,
    company: [
      { label: isIt ? 'Azienda' : 'Company', href: routes.company },
      { label: 'Showroom', href: routes.showroom },
      { label: isIt ? 'Guide' : 'Guides', href: `${routes.guides}/` },
      { label: isIt ? 'Contatti' : 'Contact', href: routes.contact },
    ],
  };
}
