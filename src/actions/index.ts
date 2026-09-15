import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { PRODUCTS } from '../lib/catalog';
import { PROJECT_TYPE_VALUES, projectTypeLabel } from '../lib/project-types';

const publicProducts = new Map(PRODUCTS.map((product) => [product.sku, product]));
const attempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const quoteInput = z.object({
  locale: z.enum(['it', 'en']),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  country: z.string().trim().min(2).max(80),
  customerType: z.enum(PROJECT_TYPE_VALUES),
  message: z.string().trim().max(2000).optional(),
  items: z.array(z.object({ sku: z.string().trim().min(2).max(40), quantity: z.number().int().min(1).max(99) })).max(50),
  privacyAcknowledged: z.literal(true),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().optional(),
}).superRefine((input, context) => {
  if (!input.items.length && (!input.message || input.message.length < 20)) {
    context.addIssue({ code: 'custom', path: ['message'], message: 'Descrivi il progetto con almeno 20 caratteri.' });
  }
});

export const server = {
  submitQuote: defineAction({
    input: quoteInput,
    handler: async (input, context) => {
      const requestId = randomUUID();
      if (input.website) return { requestId };
      enforceRateLimit(context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || context.clientAddress || 'unknown');
      await verifyTurnstile(input.turnstileToken, context.clientAddress);

      const resolvedItems = input.items.map((item) => {
        const product = publicProducts.get(item.sku);
        if (!product?.availableForQuote) throw new ActionError({ code: 'BAD_REQUEST', message: 'Prodotto non disponibile per la richiesta.' });
        return { sku: product.sku, name: product.name[input.locale], quantity: item.quantity };
      });

      if (smtpConfigured()) {
        await sendQuoteEmail({ ...input, items: resolvedItems, requestId });
      } else if (import.meta.env.PROD && import.meta.env.PUBLIC_SITE_READY === 'true') {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Servizio email non configurato.' });
      } else {
        console.info(`[quote:${requestId}] richiesta di test con ${resolvedItems.length} prodotti`);
      }
      return { requestId };
    },
  }),
};

function enforceRateLimit(identifier: string): void {
  const now = Date.now();
  const recent = (attempts.get(identifier) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: 'Troppe richieste. Riprova tra qualche minuto.' });
  recent.push(now);
  attempts.set(identifier, recent);
}

async function verifyTurnstile(token: string | undefined, remoteIp: string | undefined): Promise<void> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (import.meta.env.PROD && import.meta.env.PUBLIC_SITE_READY === 'true') {
      throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Protezione antispam non configurata.' });
    }
    return;
  }
  if (!token) throw new ActionError({ code: 'BAD_REQUEST', message: 'Completa la verifica antispam.' });
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = await response.json() as { success?: boolean };
  if (!result.success) throw new ActionError({ code: 'BAD_REQUEST', message: 'Verifica antispam non riuscita.' });
}

function smtpConfigured(): boolean {
  return Boolean(import.meta.env.SMTP_HOST && import.meta.env.SMTP_USER && import.meta.env.SMTP_PASSWORD && import.meta.env.QUOTE_TO_EMAIL && import.meta.env.QUOTE_FROM_EMAIL);
}

type QuoteEmailInput = Omit<z.infer<typeof quoteInput>, 'items'> & {
  items: Array<{ sku: string; name: string; quantity: number }>;
  requestId: string;
};

async function sendQuoteEmail(input: QuoteEmailInput): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: import.meta.env.SMTP_HOST,
    port: Number(import.meta.env.SMTP_PORT || 465),
    secure: import.meta.env.SMTP_SECURE !== 'false',
    auth: { user: import.meta.env.SMTP_USER!, pass: import.meta.env.SMTP_PASSWORD! },
  });
  const rows = input.items.map((item) => `<tr><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td></tr>`).join('');
  const projectType = projectTypeLabel(input.customerType, input.locale);
  const itemText = input.items.length ? input.items.map((item) => `${item.quantity} × ${item.sku} — ${item.name}`).join('\n') : 'Nessun prodotto selezionato';
  const itemHtml = input.items.length
    ? `<table cellpadding="8" cellspacing="0" border="1"><thead><tr><th>SKU</th><th>Prodotto</th><th>Qtà</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p><em>Nessun prodotto selezionato: richiesta progettuale.</em></p>';
  const subject = `Richiesta FullMuscle · ${input.requestId.slice(0, 8)}`;
  await transporter.sendMail({
    from: import.meta.env.QUOTE_FROM_EMAIL,
    to: import.meta.env.QUOTE_TO_EMAIL,
    replyTo: input.email,
    subject,
    text: `${input.firstName} ${input.lastName}\n${input.company || ''}\n${input.email}\n${input.phone || ''}\n${input.country}\nTipo di progetto: ${projectType}\n\n${itemText}\n\n${input.message || ''}\n\nID: ${input.requestId}`,
    html: `<h1>Nuova richiesta FullMuscle</h1><p><strong>${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</strong><br>${escapeHtml(input.company || '')}<br><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a><br>${escapeHtml(input.phone || '')}<br>${escapeHtml(input.country)}<br><strong>Tipo di progetto:</strong> ${escapeHtml(projectType)}</p>${itemHtml}<p>${escapeHtml(input.message || '').replaceAll('\n', '<br>')}</p><p><small>ID richiesta: ${input.requestId}</small></p>`,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}
