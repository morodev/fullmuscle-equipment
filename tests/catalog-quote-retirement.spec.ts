import { expect, test, type Page } from '@playwright/test';

const key = 'fullmuscle-quote-v1';
const kept = { sku: 'FM-GF-001', quantity: 3 };
const retired = { sku: 'FM-X6053', quantity: 2 };

async function seedSelection(page: Page, items: Array<{ sku: string; quantity: number }>) {
  await page.addInitScript(({ key, items }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(items));
  }, { key, items });
}

async function expectSubmissionItems(page: Page, expected: Array<{ sku: string; quantity: number }>) {
  let submitted: unknown;
  // Inspect the real client payload without contacting the delivery service.
  await page.route((url) => url.pathname.replace(/\/$/, '') === '/_actions/submitQuote', async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'AstroActionError', code: 'INTERNAL_SERVER_ERROR', message: 'Test payload only.' }),
    });
  });
  await page.getByLabel('Nome *', { exact: true }).fill('Mario');
  await page.getByLabel('Cognome *').fill('Rossi');
  await page.getByLabel('Email *').fill('mario@example.com');
  await page.getByLabel('Paese *').fill('Italia');
  await page.locator('[name="message"]').fill('Richiesta di attrezzature per una nuova palestra professionale.');
  await page.locator('[name="privacy"]').check();
  await page.getByRole('button', { name: 'Invia richiesta di preventivo' }).click();
  await expect.poll(() => submitted).toBeTruthy();
  expect((submitted as { items: unknown }).items).toEqual(expected);
}

test('una selezione precedente conserva solo prodotti attivi in contatori, modulo e invio', async ({ page }) => {
  const treadmill = { sku: 'FM-7100A', quantity: 2 };
  const bike = { sku: 'FM-7045A', quantity: 1 };
  const variant = { sku: 'FM-3004B', quantity: 2 };
  const unavailable = ['FM-2000B', 'FM-9100P', 'FM-2020A', 'FM-7026', 'FM-SP-20', 'FM-5016', 'FM-8025', 'FM-X6023', 'FM-3004', 'FM-3010D', 'FM-5035'];
  await seedSelection(page, [retired, ...unavailable.map((sku) => ({ sku, quantity: 1 })), kept, treadmill, bike, variant]);
  await page.goto('/');
  await expect(page.locator('.header-quote')).toHaveAttribute('aria-label', 'La tua richiesta: 8');
  await expect(page.locator('.quote-float .quote-badge')).toHaveText('8');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual([kept, treadmill, bike, variant]);

  await page.goto('/it/richiesta/');
  await expect(page.locator('.quote-item')).toHaveCount(4);
  await expect(page.locator('.quote-item').filter({ hasText: kept.sku }).getByRole('spinbutton')).toHaveValue('3');
  await expect(page.locator('.quote-item').filter({ hasText: treadmill.sku }).getByRole('spinbutton')).toHaveValue('2');
  await expect(page.locator('.quote-item').filter({ hasText: bike.sku }).getByRole('spinbutton')).toHaveValue('1');
  await expect(page.locator('.quote-item').filter({ hasText: variant.sku }).getByRole('spinbutton')).toHaveValue('2');
  await expect(page.locator('.quote-list')).not.toContainText(/FM-X6053|FM-2000B|FM-9100P|FM-2020A|FM-7026|FM-SP-20|FM-5016|FM-8025|FM-X6023|FM-3004(?![A-Z0-9-])|FM-3010D|FM-5035/);
  await expectSubmissionItems(page, [kept, treadmill, bike, variant]);
});

test('una selezione composta solo da prodotti ritirati diventa una richiesta progettuale vuota', async ({ page }) => {
  await seedSelection(page, [retired, { sku: 'FM-3000A', quantity: 1 }, { sku: 'FM-7010A', quantity: 1 }]);
  await page.goto('/it/richiesta/');
  await expect(page.locator('.header-quote')).toHaveAttribute('aria-label', 'La tua richiesta: 0');
  await expect(page.locator('.quote-item')).toHaveCount(0);
  await expect(page.locator('.quote-float')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Puoi iniziare anche senza una lista di prodotti.' })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual([]);
  await expectSubmissionItems(page, []);
});

test('il server rifiuta anche gli accessori appena ritirati inviati manualmente', async ({ request, baseURL }, testInfo) => {
  for (const item of [retired, { sku: 'FM-3004', quantity: 1 }]) {
    const response = await request.post('/_actions/submitQuote', {
      headers: {
        origin: baseURL!,
        'x-forwarded-for': testInfo.project.name === 'mobile' ? '198.51.100.82' : '198.51.100.81',
      },
      data: {
        locale: 'it', firstName: 'Mario', lastName: 'Rossi', email: 'mario@example.com',
        country: 'Italia', customerType: 'gym', privacyAcknowledged: true, items: [item],
      },
    });
    expect(response.status(), item.sku).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'BAD_REQUEST', message: 'Prodotto non disponibile per la richiesta.' });
  }
});
