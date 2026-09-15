import { expect, test } from '@playwright/test';

test('homepage e navigazione bilingue sono disponibili', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/it/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('più forti');
  await expect(page).toHaveTitle(/Attrezzature professionali per palestre/);
  if ((page.viewportSize()?.width ?? 1280) < 1180) {
    await page.getByRole('button', { name: 'Apri il menu' }).click();
  }
  const language = page.getByRole('link', { name: 'Passa alla versione inglese' });
  await expect(language).toHaveAttribute('href', '/en/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('il catalogo pagina 24 prodotti e mantiene la ricerca globale', async ({ page }) => {
  await page.goto('/it/catalogo/');
  await expect(page.locator('.product-card')).toHaveCount(24);
  await expect(page.locator('.product-card').nth(0)).toContainText('FM-X6053');
  await expect(page.locator('.product-card').nth(1)).toContainText('FM-X8202');
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

test('i filtri catalogo sono esclusivi e restano sopra i prodotti', async ({ page }) => {
  await page.goto('/it/catalogo/');
  const toolbar = page.locator('[data-catalog-toolbar]');
  const filters = toolbar.locator('[data-catalog-filter]');
  const categories = filters.nth(0);
  const lines = filters.nth(1);

  await categories.locator('summary').click();
  await expect(categories).toHaveAttribute('open', '');
  await expect(categories.locator('nav a').last()).toContainText('Pesi liberi e panche');
  await lines.locator('summary').click();
  await expect(lines).toHaveAttribute('open', '');
  await expect(categories).not.toHaveAttribute('open', '');
  await lines.locator('summary').press('Escape');
  await expect(lines).not.toHaveAttribute('open', '');

  if ((page.viewportSize()?.width ?? 1280) < 620) {
    await categories.locator('summary').click();
    const menuBox = await categories.locator('nav').boundingBox();
    const productsBox = await page.locator('.catalog-product-grid').boundingBox();
    expect(menuBox).not.toBeNull();
    expect(productsBox).not.toBeNull();
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(productsBox!.y);
  }
});

test('la home presenta serie X6, X82 e tapis roulant', async ({ page }) => {
  await page.goto('/it/');
  const heroLinks = await page.locator('.hero-machine').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(heroLinks[0]).toContain('fm-x6053');
  expect(heroLinks[1]).toContain('fm-x8202');
  expect(heroLinks[2]).toContain('fm-2000b');
  await expect(page.locator('.category-grid')).toContainText('Tapis roulant');
  await expect(page.locator('.category-grid')).not.toContainText('Pesi liberi e panche');

  const featuredSkus = ['FM-X6053', 'FM-X8202', 'FM-X6005', 'FM-X8204', 'FM-2000B', 'FM-3000A'];
  const cards = page.locator('.product-card');
  await expect(cards).toHaveCount(featuredSkus.length);
  for (const [index, sku] of featuredSkus.entries()) await expect(cards.nth(index)).toContainText(sku);
});

test('la home e il nuovo hub presentano i settori professionali', async ({ page }) => {
  await page.goto('/it/');
  const homeSolutions = page.locator('.home-solutions .solution-card');
  await expect(homeSolutions).toHaveCount(5);
  await expect(page.locator('.home-solutions a[href="/it/soluzioni/navi-da-crociera/"]')).toHaveCount(1);
  await expect(page.locator('.home-solutions a[href="/it/soluzioni/centri-medicali-riabilitazione/"]')).toHaveCount(1);

  await page.goto('/it/soluzioni/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ogni spazio fitness');
  await expect(page.locator('.solutions-grid .solution-card')).toHaveCount(9);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/en\/solutions\/$/);
  const firstImage = page.locator('.solutions-grid .solution-card img').first();
  await firstImage.scrollIntoViewIfNeeded();
  await expect.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  await page.locator('.solutions-grid a[href="/it/soluzioni/centri-medicali-riabilitazione/"]').click();
  await expect(page).toHaveURL('/it/soluzioni/centri-medicali-riabilitazione/');
  await expect(page).toHaveTitle(/Attrezzature per centri medicali/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('percorso della persona');
  await expect(page.getByRole('link', { name: /Parliamo del progetto/ })).toHaveAttribute('href', '/it/richiesta/?project=medical');
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('Service');
});

test('una richiesta di progetto può essere inviata senza prodotti', async ({ page }) => {
  await page.goto('/it/richiesta/?project=medical');
  await expect(page.getByRole('heading', { name: 'Puoi iniziare anche senza una lista di prodotti.' })).toBeVisible();
  await expect(page.getByLabel('Tipo di progetto *')).toHaveValue('medical');
  await page.getByLabel('Nome *', { exact: true }).fill('Mario');
  await page.getByLabel('Cognome *').fill('Rossi');
  await page.getByLabel('Email *').fill('mario@example.com');
  await page.getByLabel('Paese *').fill('Italia');
  await page.getByLabel('Messaggio *').fill('Vorrei progettare un centro medicale di circa 250 metri quadrati.');
  await page.getByLabel(/Ho letto l’informativa/).check();
  await page.getByRole('button', { name: 'Invia richiesta di preventivo' }).click();
  await page.waitForURL('**/it/conferma/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Grazie');
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
  const menu = page.getByRole('button', { name: 'Apri il menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(page.getByRole('button', { name: 'Chiudi il menu' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible();
});

test('il menu catalogo espone famiglie, serie e tipologie SEO', async ({ page }) => {
  await page.goto('/it/');
  if ((page.viewportSize()?.width ?? 1280) < 1180) await page.getByRole('button', { name: 'Apri il menu' }).click();
  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });

  await navigation.getByRole('button', { name: 'Strength', exact: true }).click();
  if ((page.viewportSize()?.width ?? 1280) < 1180) {
    await navigation.locator('summary').filter({ hasText: 'Pin Loaded Machine' }).click();
  }
  await expect(navigation.getByRole('link', { name: 'Serie FM N8', exact: true })).toHaveAttribute('href', '/it/catalogo/linee/fm-n8-series/');

  await navigation.getByRole('button', { name: 'Cardio', exact: true }).click();
  await expect(navigation.getByRole('link', { name: 'Treadmill', exact: true })).toHaveAttribute('href', '/it/catalogo/categorie/tapis-roulant/');

  await navigation.getByRole('link', { name: 'Leg Press', exact: true }).click();
  await expect(page).toHaveURL('/it/catalogo/tipologie/leg-press-machine/');
  await expect(page.getByRole('heading', { level: 1, name: 'Leg Press Machine' })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(24);

  await page.goto('/it/');
  if ((page.viewportSize()?.width ?? 1280) < 1180) await page.getByRole('button', { name: 'Apri il menu' }).click();
  const refreshedNavigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  await refreshedNavigation.getByRole('button', { name: 'Soluzioni', exact: true }).click();
  if ((page.viewportSize()?.width ?? 1280) < 1180) await refreshedNavigation.locator('summary').filter({ hasText: 'Salute e lavoro' }).click();
  await expect(refreshedNavigation.getByRole('link', { name: 'Wellness aziendale', exact: true })).toHaveAttribute('href', '/it/soluzioni/wellness-aziendale/');
});

test('il mega menu desktop resta aperto durante il passaggio del mouse', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1280) < 1180, 'Verifica specifica per il menu desktop');
  await page.goto('/it/');
  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  const strength = navigation.getByRole('button', { name: 'Strength', exact: true });

  await strength.hover();
  const series = navigation.getByRole('link', { name: 'Serie FM N8', exact: true });
  await expect(series).toBeVisible();
  const seriesBox = await series.boundingBox();
  expect(seriesBox).not.toBeNull();
  await page.mouse.move(seriesBox!.x + seriesBox!.width / 2, seriesBox!.y + seriesBox!.height / 2, { steps: 12 });
  await expect(strength).toHaveAttribute('aria-expanded', 'true');
  await series.click();
  await expect(page).toHaveURL('/it/catalogo/linee/fm-n8-series/');

  await page.goto('/it/');
  const cardio = page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('button', { name: 'Cardio', exact: true });
  await cardio.hover();
  const treadmill = page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('link', { name: 'Treadmill', exact: true });
  const treadmillBox = await treadmill.boundingBox();
  expect(treadmillBox).not.toBeNull();
  await page.mouse.move(treadmillBox!.x + treadmillBox!.width / 2, treadmillBox!.y + treadmillBox!.height / 2, { steps: 12 });
  await expect(cardio).toHaveAttribute('aria-expanded', 'true');
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width - 5, viewport.height - 5);
  await expect(cardio).toHaveAttribute('aria-expanded', 'false');
  await cardio.hover();
  await treadmill.click();
  await expect(page).toHaveURL('/it/catalogo/categorie/tapis-roulant/');
});

test('tutti i mega menu desktop occupano la larghezza della finestra', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1280) < 1180, 'Verifica specifica per il menu desktop');
  await page.goto('/it/');
  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  const viewportWidth = page.viewportSize()!.width;
  const menus = [
    { trigger: 'Strength', panel: '#strength-menu' },
    { trigger: 'Cardio', panel: '#cardio-menu' },
    { trigger: 'Soluzioni', panel: '#solutions-menu' },
    { trigger: 'Azienda', panel: '#company-menu' },
  ];

  for (const menu of menus) {
    await navigation.getByRole('button', { name: menu.trigger, exact: true }).hover();
    const panel = page.locator(menu.panel);
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.x)).toBe(0);
    expect(Math.round(box!.width)).toBe(viewportWidth);
  }
});
