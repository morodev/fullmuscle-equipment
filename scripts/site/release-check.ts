import { generatePublicCatalog } from './generate-public-catalog';

await generatePublicCatalog();

const required = [
  'PUBLIC_SITE_URL', 'COMPANY_LEGAL_NAME', 'COMPANY_VAT', 'COMPANY_ADDRESS', 'COMPANY_CITY', 'COMPANY_EMAIL', 'COMPANY_PHONE', 'COMPANY_SHOWROOM_HOURS',
  'PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'QUOTE_TO_EMAIL', 'QUOTE_FROM_EMAIL',
] as const;

const missing: string[] = required.filter((name) => !process.env[name]?.trim());
if (process.env.PUBLIC_SITE_READY !== 'true') missing.unshift('PUBLIC_SITE_READY=true');
if (process.env.PUBLIC_SITE_URL?.includes('.invalid')) missing.push('PUBLIC_SITE_URL valido');
try {
  const siteUrl = new URL(process.env.PUBLIC_SITE_URL ?? '');
  if (siteUrl.protocol !== 'https:' || siteUrl.hostname !== 'fullmuscle-equipment.com' || siteUrl.pathname !== '/') {
    missing.push('PUBLIC_SITE_URL=https://fullmuscle-equipment.com');
  }
} catch {
  missing.push('PUBLIC_SITE_URL valido');
}

if (missing.length) {
  console.error(`Configurazione di pubblicazione incompleta:\n- ${[...new Set(missing)].join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Configurazione di pubblicazione completa.');
}
