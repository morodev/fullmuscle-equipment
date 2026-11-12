import { expect, test } from '@playwright/test';

test('homepage e navigazione bilingue sono disponibili', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.request().redirectedFrom()).toBeNull();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('fornitura completa');
  await expect(page).toHaveTitle(/Attrezzature professionali per palestre/);
  if ((page.viewportSize()?.width ?? 1280) < 1180) {
    await page.getByRole('button', { name: 'Apri il menu' }).click();
  }
  const language = page.getByRole('link', { name: 'Passa alla versione inglese' });
  await expect(language).toHaveAttribute('href', '/en/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await language.click();
  await expect(page).toHaveURL('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('complete equipment supply');
  if ((page.viewportSize()?.width ?? 1280) < 1180) {
    await page.getByRole('button', { name: 'Open menu' }).click();
  }
  const italian = page.getByRole('link', { name: 'Switch to Italian' });
  await expect(italian).toHaveAttribute('href', '/');
  await italian.click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('fornitura completa');
  expect(consoleErrors).toEqual([]);
});

test('il catalogo pagina 24 prodotti e mantiene la ricerca globale', async ({ page }) => {
  await page.goto('/it/catalogo/');
  await expect(page.locator('.product-card')).toHaveCount(24);
  await expect(page.locator('.product-card').nth(0)).toContainText('FM-GF-001');
  await expect(page.locator('.product-card').nth(1)).toContainText('FM-GC-5005');
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
  await page.getByPlaceholder('Es. chest press, tapis roulant…').fill('FM-9100A');
  await expect(page.locator('[data-search-results] a').filter({ hasText: 'FM-9100A' }).first()).toBeVisible();
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

test('la home presenta le tre macchine strength e mantiene la selezione del catalogo attivo', async ({ page }) => {
  await page.goto('/');
  const heroLinks = await page.locator('.hero-machine').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(heroLinks).toEqual([
    '/it/prodotti/chest-press-fm-5201/',
    '/it/prodotti/low-row-fm-5204/',
    '/it/prodotti/row-machine-fm-mp-8144/',
  ]);
  await expect(page.locator('.hero-note strong')).toHaveText('343');
  await expect(page.locator('.trust-grid > div').nth(0).locator('strong')).toHaveText('11');
  await expect(page.locator('.trust-grid > div').nth(1).locator('strong')).toHaveText('12');
  await expect(page.locator('.category-grid')).toContainText('Tapis roulant');
  await expect(page.locator('.category-grid')).not.toContainText('Pesi liberi e panche');

  const featured = [
    { sku: 'FM-GS-5002', slug: 'leg-extension-fm-gs-5002' },
    { sku: 'FM-GS-5008', slug: 'lat-pulldown-fm-gs-5008' },
    { sku: 'FM-GS-5016', slug: 'leg-press-fm-gs-5016' },
    { sku: 'FM-5201', slug: 'chest-press-fm-5201' },
    { sku: 'FM-5204', slug: 'low-row-fm-5204' },
    { sku: 'FM-MP-8144', slug: 'row-machine-fm-mp-8144' },
  ];
  for (const [home, products, quantity] of [['/', '/it/prodotti/', 1], ['/en/', '/en/products/', 2]] as const) {
    if (home !== '/') await page.goto(home);
    const cards = page.locator('.product-card');
    await expect(cards).toHaveCount(featured.length);
    expect(await cards.locator('.product-meta span:last-child').allTextContents()).toEqual(featured.map((product) => product.sku));
    for (const [index, product] of featured.entries()) {
      const card = cards.nth(index);
      const image = card.locator('img');
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute('alt', new RegExp(`${product.sku}$`));
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      expect(await card.locator('a').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href')))])).toEqual([`${products}${product.slug}/`]);
    }
    const addButton = cards.nth(3).getByRole('button');
    await expect(addButton.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', '');
    await addButton.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fullmuscle-quote-v1') ?? '[]'))).toEqual([{ sku: 'FM-5201', quantity }]);
  }
});

test('la home dà priorità a nuove palestre e rinnovi e mantiene accessibili tutte le soluzioni', async ({ page }) => {
  await page.goto('/');
  const homeSolutions = page.locator('.home-solutions .solution-card');
  const primarySolutions = [
    '/it/soluzioni/apertura-nuova-palestra/',
    '/it/soluzioni/rinnovo-palestra/',
    '/it/soluzioni/centri-medicali-riabilitazione/',
  ];
  await expect(homeSolutions).toHaveCount(3);
  expect(await homeSolutions.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(primarySolutions);
  expect(await page.locator('.home-solutions').evaluate((section) => Boolean(section.compareDocumentPosition(document.querySelector('.category-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);

  await page.locator('.home-solutions').getByRole('link', { name: /Scopri tutte le soluzioni/ }).click();
  await expect(page).toHaveURL('/it/soluzioni/');
  await expect(page.locator('.solutions-grid .solution-card')).toHaveCount(9);
  expect((await page.locator('.solutions-grid .solution-card').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).slice(0, 3)).toEqual(primarySolutions);
  await expect(page.locator('.solutions-grid a[href="/it/soluzioni/navi-da-crociera/"]')).toHaveCount(1);
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

test('apertura e rinnovo portano a richieste con il tipo di progetto corretto', async ({ page }) => {
  for (const project of [
    { slug: 'apertura-nuova-palestra', type: 'new-gym' },
    { slug: 'rinnovo-palestra', type: 'renovation' },
  ]) {
    await page.goto('/');
    await page.locator(`.home-solutions a[href="/it/soluzioni/${project.slug}/"]`).click();
    await page.getByRole('link', { name: /Parliamo del progetto/ }).click();
    await expect(page).toHaveURL(`/it/richiesta/?project=${project.type}`);
    await expect(page.getByLabel('Tipo di progetto *')).toHaveValue(project.type);
  }
});

test('la richiesta di fornitura dalla homepage può essere inviata senza prodotti', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-actions').getByRole('link', { name: /Richiedi una fornitura completa/ }).click();
  await expect(page).toHaveURL('/it/richiesta/?project=gym');
  await expect(page.getByRole('heading', { name: 'Puoi iniziare anche senza una lista di prodotti.' })).toBeVisible();
  await expect(page.getByLabel('Tipo di progetto *')).toHaveValue('gym');
  await page.getByLabel('Nome *', { exact: true }).fill('Mario');
  await page.getByLabel('Cognome *').fill('Rossi');
  await page.getByLabel('Email *').fill('mario@example.com');
  await page.getByLabel('Paese *').fill('Italia');
  await page.getByLabel('Messaggio *').fill('Vorrei una fornitura completa per una nuova palestra di circa 250 metri quadrati.');
  await page.getByLabel(/Ho letto l’informativa/).check();
  await page.getByRole('button', { name: 'Invia richiesta di preventivo' }).click();
  await page.waitForURL('**/it/conferma/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Grazie');
});

test('la selezione persiste e il preventivo viene inviato in modalità di sviluppo', async ({ page }) => {
  await page.goto('/');
  const addButton = page.getByRole('button', { name: 'Aggiungi alla richiesta: FM-5201', exact: true });
  await expect(addButton.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', '');
  await addButton.click();
  await expect(addButton).toContainText('Aggiunto');
  await page.goto('/it/richiesta/');
  await expect(page.getByRole('heading', { name: /Chest press FM-5201/ })).toBeVisible();
  await expect(page.locator('.quote-item').filter({ hasText: 'FM-5201' }).getByRole('spinbutton')).toHaveValue('1');
  await page.getByLabel('Nome *', { exact: true }).fill('Mario');
  await page.getByLabel('Cognome *').fill('Rossi');
  await page.getByLabel('Email *').fill('mario@example.com');
  await page.getByLabel('Paese *').fill('Italia');
  await page.getByLabel(/Ho letto l’informativa/).check();
  await page.getByRole('button', { name: 'Invia richiesta di preventivo' }).click();
  await page.waitForURL('**/it/conferma/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Grazie');
});

test('il menu catalogo espone famiglie, serie e tipologie SEO', async ({ page }) => {
  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1280) < 1180) await page.getByRole('button', { name: 'Apri il menu' }).click();
  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });

  await navigation.getByRole('button', { name: 'Strength', exact: true }).click();
  if ((page.viewportSize()?.width ?? 1280) < 1180) {
    await navigation.locator('summary').filter({ hasText: 'Pin Loaded Machine' }).click();
  }
  await expect(navigation.getByRole('link', { name: 'Serie FM G5', exact: true })).toHaveAttribute('href', '/it/catalogo/linee/fm-g5-series/');

  await navigation.getByRole('button', { name: 'Cardio', exact: true }).click();
  await expect(navigation.getByRole('link', { name: 'Treadmill', exact: true })).toHaveAttribute('href', '/it/catalogo/categorie/tapis-roulant/');

  await navigation.getByRole('link', { name: 'Leg Press', exact: true }).click();
  await expect(page).toHaveURL('/it/catalogo/tipologie/leg-press-machine/');
  await expect(page.getByRole('heading', { level: 1, name: 'Leg Press Machine' })).toBeVisible();
  // The type also includes the two preserved Smith leg-press attachments.
  await expect(page.locator('.product-card')).toHaveCount(11);

  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1280) < 1180) await page.getByRole('button', { name: 'Apri il menu' }).click();
  const refreshedNavigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  await refreshedNavigation.getByRole('button', { name: 'Soluzioni', exact: true }).click();
  if ((page.viewportSize()?.width ?? 1280) < 1180) await refreshedNavigation.locator('summary').filter({ hasText: 'Salute e lavoro' }).click();
  await expect(refreshedNavigation.getByRole('link', { name: 'Wellness aziendale', exact: true })).toHaveAttribute('href', '/it/soluzioni/wellness-aziendale/');
});

test('il mega menu desktop resta aperto durante il passaggio del mouse', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1280) < 1180, 'Verifica specifica per il menu desktop');
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  const strength = navigation.getByRole('button', { name: 'Strength', exact: true });

  await strength.hover();
  const series = navigation.getByRole('link', { name: 'Serie FM G5', exact: true });
  await expect(series).toBeVisible();
  const seriesBox = await series.boundingBox();
  expect(seriesBox).not.toBeNull();
  await page.mouse.move(seriesBox!.x + seriesBox!.width / 2, seriesBox!.y + seriesBox!.height / 2, { steps: 12 });
  await expect(strength).toHaveAttribute('aria-expanded', 'true');
  await series.click();
  await expect(page).toHaveURL('/it/catalogo/linee/fm-g5-series/');

  await page.goto('/');
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
  await page.goto('/');
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
