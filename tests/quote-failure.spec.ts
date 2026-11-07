import { expect, test } from '@playwright/test';

test('un errore del servizio non conferma la richiesta e conserva prodotti e quantità', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('fullmuscle-quote-v1')) {
      localStorage.setItem('fullmuscle-quote-v1', JSON.stringify([{ sku: 'FM-2000B', quantity: 2 }]));
    }
  });
  let intercepted = false;
  await page.route((url) => url.pathname.replace(/\/$/, '') === '/_actions/submitQuote', async (route) => {
    intercepted = true;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'AstroActionError', code: 'INTERNAL_SERVER_ERROR', message: 'Servizio email non configurato.' }),
    });
  });
  await page.goto('/it/richiesta/');
  await expect(page.getByRole('heading', { name: /Tapis roulant professionale FM-2000B/ })).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveValue('2');
  await page.getByLabel('Nome *', { exact: true }).fill('Mario');
  await page.getByLabel('Cognome *').fill('Rossi');
  await page.getByLabel('Email *').fill('mario@example.com');
  await page.getByLabel('Paese *').fill('Italia');
  await page.getByLabel(/Ho letto l’informativa/).check();
  await page.getByRole('button', { name: 'Invia richiesta di preventivo' }).click();
  await expect.poll(() => intercepted).toBe(true);
  await expect(page.getByRole('alert')).toContainText('Il servizio richieste non è disponibile');
  await expect(page).toHaveURL('/it/richiesta/');
  await expect(page.getByRole('button', { name: 'Invia richiesta di preventivo' })).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fullmuscle-quote-v1') ?? 'null'))).toEqual([{ sku: 'FM-2000B', quantity: 2 }]);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Tapis roulant professionale FM-2000B/ })).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveValue('2');
});
