/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_SITE_READY?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly TURNSTILE_SECRET_KEY?: string;
  readonly SMTP_HOST?: string;
  readonly SMTP_PORT?: string;
  readonly SMTP_SECURE?: string;
  readonly SMTP_USER?: string;
  readonly SMTP_PASSWORD?: string;
  readonly QUOTE_TO_EMAIL?: string;
  readonly QUOTE_FROM_EMAIL?: string;
  readonly COMPANY_LEGAL_NAME?: string;
  readonly COMPANY_VAT?: string;
  readonly COMPANY_ADDRESS?: string;
  readonly COMPANY_EMAIL?: string;
  readonly COMPANY_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
