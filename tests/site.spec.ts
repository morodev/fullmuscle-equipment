import { expect, test } from '@playwright/test';

test('homepage e navigazione bilingue sono disponibili', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/it/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('più forti');
  await expect(page).toHaveTitle(/Attrezzature professionali per palestre/);
  if ((page.viewportSize()?.width ?? 1000) < 760) {
    await page.getByRole('button', { name: 'Menu' }).click();
  }
  const language = page.getByRole('link', { name: 'EN', exact: true });
  await expect(language).toHaveAttribute('href', '/en/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('il catalogo pagina 24 prodotti e mantiene la ricerca globale', async ({ page }) => {
  await page.goto('/it/catalogo/');
  await expect(page.locator('.product-card')).toHaveCount(24);
  const firstSku = await page.locator('.product-card .product-meta span').nth(1).textContent();
  const lastImage = page.locator('.product-card img').last();
  await lastImage.scrollIntoViewIfNeeded();
  await expect.poll(() => lastImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(lastImage).not.toHaveAttribute('src', /placeholder/);
  await page.getByRole('link', { name: /Successiva/ }).click();
  await expect(page).toHaveURL(/\/it\/catalogo\/pagina\/2\/$/);
  await expect(page.locator('.product-card')).toHaveCount(24);
  await expect(page.locator('.product-card').first()).not.toContainText(firstSku ?? '');
  await page.getByRole('button', { name: 'Cerca per nome o codice' }).click();
  await page.getByPlaceholder('Es. chest press, tapis roulant…').fill('FM-2000B');
  await expect(page.locator('[data-search-results] a').filter({ hasText: 'FM-2000B' }).first()).toBeVisible();
});

test('la selezione persiste e il preventivo viene inviato in modalità di sviluppo', async ({ page }) => {
  await page.goto('/it/prodotti/tapis-roulant-professionale-fm-2000b/');
  const addButton = page.getByRole('button', { name: /Aggiungi alla richiesta: FM-2000B/ }).first();
  await expect(addButton.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', '');
  await addButton.click();
  await expect(addButton).toContainText('Aggiunto');
  await page.goto('/it/richiesta/');
  await expect(page.getByRole('heading', { name: /Tapis roulant professionale FM-2000B/ })).toBeVisible();
  await page.getByLabel('Nome *', { exact: true }).fill('Mario');
  await page.getByLabel('Cognome *').fill('Rossi');
  await page.getByLabel('Email *').fill('mario@example.com');
  await page.getByLabel('Paese *').fill('Italia');
  await page.getByLabel(/Ho letto l’informativa/).check();
  await page.getByRole('button', { name: 'Invia richiesta di preventivo' }).click();
  await page.waitForURL('**/it/conferma/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Grazie');
});

test('il menu mobile è accessibile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/it/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();
});
