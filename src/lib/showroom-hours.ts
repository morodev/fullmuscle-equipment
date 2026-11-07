const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_ALIASES = new Map([
  ['mo', 0], ['lun', 0], ['tu', 1], ['mar', 1], ['we', 2], ['mer', 2],
  ['th', 3], ['gio', 3], ['fr', 4], ['ven', 4], ['sa', 5], ['sab', 5], ['su', 6], ['dom', 6],
]);

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/** Accepts "Lun-Ven 09:00-13:00,14:00-18:00; Sab 09:00-12:00" and Schema.org day abbreviations. */
export function parseShowroomHours(value: string): OpeningHoursSpecification[] | undefined {
  if (!value.trim()) return undefined;
  const specifications: OpeningHoursSpecification[] = [];
  const sections = value.replace(/[–—]/g, '-').split(';');
  for (const section of sections) {
    const match = section.trim().match(/^([a-z]{2,3})(?:\s*-\s*([a-z]{2,3}))?\s+(.+)$/i);
    if (!match) return undefined;
    const start = DAY_ALIASES.get(match[1]!.toLowerCase());
    const end = DAY_ALIASES.get((match[2] ?? match[1]!).toLowerCase());
    if (start === undefined || end === undefined) return undefined;
    const dayOfWeek: string[] = [];
    for (let offset = 0; offset <= (end - start + 7) % 7; offset++) {
      dayOfWeek.push(`https://schema.org/${DAYS[(start + offset) % 7]}`);
    }
    for (const interval of match[3]!.split(',')) {
      const times = interval.trim().match(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/);
      if (!times) return undefined;
      const opens = `${times[1]}:${times[2]}`;
      const closes = `${times[3]}:${times[4]}`;
      // Equal times could mean closed or open all day; do not infer either from an ambiguous value.
      if (opens === closes) return undefined;
      specifications.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [...dayOfWeek], opens, closes });
    }
  }
  return specifications.length ? specifications : undefined;
}
