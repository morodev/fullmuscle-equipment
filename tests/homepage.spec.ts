import { expect, test } from '@playwright/test';

test('le tre immagini hero sono caricate e aprono le schede corrette da tastiera in italiano e inglese', async ({ page }) => {
  const models = [
    { sku: 'FM-5201', name: 'Chest press', slug: 'chest-press-fm-5201' },
    { sku: 'FM-5204', name: 'Low row', slug: 'low-row-fm-5204' },
    { sku: 'FM-MP-8144', name: 'Row machine', slug: 'row-machine-fm-mp-8144' },
  ];
  for (const [home, products] of [['/', '/it/prodotti/'], ['/en/', '/en/products/']] as const) {
    await page.goto(home);
    const hero = page.locator('.hero-machine');
    await expect(hero).toHaveCount(3);
    expect(await hero.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(models.map((model) => `${products}${model.slug}/`));
    for (const [index, model] of models.entries()) {
      const image = hero.nth(index).locator('img');
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute('alt', new RegExp(`${model.name}.*${model.sku}`, 'i'));
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    }
    await expect(hero.first().locator('img')).toHaveAttribute('fetchpriority', 'high');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.locator('.hero-actions a').last().focus();
    for (let index = 0; index < models.length; index += 1) {
      await page.keyboard.press('Tab');
      await expect(hero.nth(index)).toBeFocused();
    }

    for (const [index, model] of models.entries()) {
      if (index > 0) await page.goto(home);
      const link = page.locator('.hero-machine').nth(index);
      await link.focus();
      await link.press('Enter');
      await expect(page).toHaveURL(`${products}${model.slug}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${model.name} ${model.sku}`);
    }
  }
});

test('la ricerca italiana trova la homepage sul dominio principale', async ({ page }) => {
  await page.goto('/it/catalogo/');
  if ((page.viewportSize()?.width ?? 1280) < 1180) {
    await page.getByRole('button', { name: 'Apri il menu' }).click();
  }
  await page.getByRole('button', { name: 'Cerca nel sito', exact: true }).click();
  const dialog = page.locator('[data-search-dialog]');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-search-input]').fill('Raccontaci la palestra');
  const homepage = dialog.locator('[data-search-results] a[href="/"]');
  await expect(homepage).toHaveCount(1);
  await expect(homepage.locator('strong')).toContainText('fornitura completa');
  await homepage.click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('fornitura completa');
});

test.describe('accesso alla homepage senza JavaScript', () => {
  test.use({ javaScriptEnabled: false, locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });

  test('il dominio mostra subito la homepage italiana anche con browser inglese', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    expect(response?.request().redirectedFrom()).toBeNull();
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('fornitura completa');
    await expect(page.getByRole('link', { name: 'Esplora il catalogo', exact: true })).toHaveAttribute('href', '/it/catalogo/');
    await expect(page.locator('.product-card')).toHaveCount(6);
    await expect(page.locator('nav[aria-label="Choose language"]')).toHaveCount(0);
    await page.getByRole('link', { name: 'Esplora il catalogo', exact: true }).click();
    await expect(page).toHaveURL('/it/catalogo/');
    await expect(page.locator('.product-card')).toHaveCount(24);
    await expect(page.locator('.logo-link')).toHaveAttribute('href', '/');

    const english = await page.goto('/en/');
    expect(english?.status()).toBe(200);
    await expect(page).toHaveURL('/en/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('complete equipment supply');
  });
});

test('le vecchie homepage italiane rispondono con un solo redirect permanente conservando i parametri', async ({ request, baseURL }) => {
  for (const path of ['/it', '/it/']) {
    for (const search of ['', '?utm_source=legacy&project=gym&label=pesi%20liberi']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await request.fetch(`${path}${search}`, { method, maxRedirects: 0 });
        expect(response.status()).toBe(301);
        const location = response.headers().location;
        expect(location).toBeTruthy();
        expect(new URL(location!, baseURL).href).toBe(new URL(`/${search}`, baseURL).href);
        if (method === 'HEAD') expect(await response.body()).toHaveLength(0);
        const destination = await request.get(location!, { maxRedirects: 0 });
        expect(destination.status()).toBe(200);
        expect(destination.headers().location).toBeUndefined();
      }
    }
  }

  const catalogue = await request.get('/it/catalogo/', { maxRedirects: 0 });
  expect(catalogue.status()).toBe(200);
  expect(catalogue.headers().location).toBeUndefined();
});
