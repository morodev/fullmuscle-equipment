import { z } from 'zod';
import { parseShowroomHours } from '../../src/lib/showroom-hours';

const required = [
  'PUBLIC_SITE_URL', 'COMPANY_LEGAL_NAME', 'COMPANY_VAT', 'COMPANY_ADDRESS', 'COMPANY_CITY', 'COMPANY_EMAIL', 'COMPANY_PHONE', 'COMPANY_SHOWROOM_HOURS',
  'PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'QUOTE_TO_EMAIL', 'QUOTE_FROM_EMAIL',
] as const;

export function validateReleaseConfig(env: Record<string, string | undefined>, privacyTemplate: string): string[] {
  const errors: string[] = required.filter((name) => !env[name]?.trim());
  if (env.PUBLIC_SITE_READY !== 'true') errors.unshift('PUBLIC_SITE_READY=true');
  if (env.FULLMUSCLE_QUOTE_TEST_MODE === 'true') errors.push('FULLMUSCLE_QUOTE_TEST_MODE: disattivare la simulazione locale prima del rilascio');
  try {
    const siteUrl = new URL(env.PUBLIC_SITE_URL ?? '');
    if (siteUrl.origin !== 'https://fullmuscle-equipment.com' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password) {
      errors.push('PUBLIC_SITE_URL=https://fullmuscle-equipment.com');
    }
  } catch {
    errors.push('PUBLIC_SITE_URL=https://fullmuscle-equipment.com');
  }
  for (const name of ['COMPANY_EMAIL', 'QUOTE_TO_EMAIL', 'QUOTE_FROM_EMAIL'] as const) {
    if (env[name] && !z.email().safeParse(env[name]!.trim()).success) errors.push(`${name}: indirizzo email non valido`);
  }
  if (env.SMTP_PORT && (!/^\d+$/.test(env.SMTP_PORT) || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65535)) {
    errors.push('SMTP_PORT: usare una porta tra 1 e 65535');
  }
  if (env.SMTP_SECURE && !['true', 'false'].includes(env.SMTP_SECURE)) errors.push('SMTP_SECURE: usare true o false');
  if (env.SMTP_HOST && /[\s/:]/.test(env.SMTP_HOST)) errors.push('SMTP_HOST: usare il nome host senza protocollo o porta');
  if (env.COMPANY_SHOWROOM_HOURS && !parseShowroomHours(env.COMPANY_SHOWROOM_HOURS)) {
    errors.push('COMPANY_SHOWROOM_HOURS: usare ad esempio Lun-Ven 09:00-13:00,14:00-18:00; Sab 09:00-12:00');
  }
  if (/Il testo definitivo|The final text will be reviewed/.test(privacyTemplate)) {
    errors.push('Privacy: completare il testo definitivo prima del rilascio indicizzabile');
  }
  return [...new Set(errors)];
}
