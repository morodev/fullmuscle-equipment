import type { Locale, LocalizedValue } from './types';

export const PROJECT_TYPE_VALUES = [
  'gym',
  'new-gym',
  'renovation',
  'hotel',
  'pt-studio',
  'physiotherapy',
  'cruise',
  'medical',
  'private-club',
  'corporate-wellness',
  'education',
  'other',
] as const;

export type ProjectType = typeof PROJECT_TYPE_VALUES[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, LocalizedValue> = {
  gym: { it: 'Palestra', en: 'Gym' },
  'new-gym': { it: 'Apertura nuova palestra', en: 'New gym opening' },
  renovation: { it: 'Rinnovo palestra', en: 'Gym renovation' },
  hotel: { it: 'Hotel e resort', en: 'Hotels and resorts' },
  'pt-studio': { it: 'Personal training studio', en: 'Personal training studio' },
  physiotherapy: { it: 'Studio di fisioterapia', en: 'Physiotherapy practice' },
  cruise: { it: 'Nave da crociera', en: 'Cruise ship' },
  medical: { it: 'Centro medicale o riabilitativo', en: 'Medical or rehabilitation centre' },
  'private-club': { it: 'Circolo privato', en: 'Private club' },
  'corporate-wellness': { it: 'Wellness aziendale', en: 'Corporate wellness' },
  education: { it: 'Scuola o università', en: 'School or university' },
  other: { it: 'Altro progetto', en: 'Other project' },
};

export function isProjectType(value: string | null): value is ProjectType {
  return Boolean(value && PROJECT_TYPE_VALUES.includes(value as ProjectType));
}

export function projectTypeLabel(value: ProjectType, locale: Locale): string {
  return PROJECT_TYPE_LABELS[value][locale];
}
