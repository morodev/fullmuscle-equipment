import { expect, test } from '@playwright/test';

const retiredSkus = ['FM-2020A', 'FM-2020B', 'FM-7010A', 'FM-7020', 'FM-7038', 'FM-7041A', 'FM-7041B', 'FM-7042', 'FM-L600B', 'FM-L600C', 'FM-N2040A', 'FM-N2040B', 'FM-7015', 'FM-7026', 'FM-SP-20'];
const retiredCategoryPaths = ['/it/catalogo/categorie/ab-trainer/', '/en/catalogue/categories/ab-trainers/', '/it/catalogo/categorie/surf-trainer/', '/en/catalogue/categories/surf-trainers/'];

test('bike, scale ed ellittiche espongono soltanto i modelli approvati', async ({ page }) => {
  const categories = [
    { it: 'bike-professionali', en: 'exercise-bikes', skus: ['FM-7023', 'FM-2030A', 'FM-2030B', 'FM-7045A', 'FM-7045B', 'FM-7036'] },
    { it: 'stair-climber', en: 'stair-climbers', skus: ['FM-2060', 'FM-2050', 'FM-L100B'] },
    { it: 'ellittiche', en: 'ellipticals', skus: ['FM-7043A', 'FM-7043B'] },
  ];
  for (const [locale, prefix] of [['it', '/it/catalogo/categorie/'], ['en', '/en/catalogue/categories/']] as const) {
    for (const category of categories) {
      await page.goto(`${prefix}${category[locale]}/`);
      const cards = page.locator('.product-card');
      await expect(cards).toHaveCount(category.skus.length);
      expect((await cards.locator('.product-meta span:last-child').allTextContents()).sort()).toEqual([...category.skus].sort());
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('navigazione e filtri mantengono sei categorie cardio senza ab trainer e surf trainer', async ({ page }) => {
  for (const path of ['/it/catalogo/', '/en/catalogue/']) {
    await page.goto(path);
    await expect(page.locator('#cardio-menu a')).toHaveCount(6);
    const categories = page.locator('[data-catalog-filter]').first();
    await categories.locator('summary').click();
    await expect(categories.locator('nav a')).toHaveCount(12);
    for (const href of retiredCategoryPaths) await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
  }
});

test('la 7045A dichiara la foto illustrativa e non presenta specifiche ereditate', async ({ page }) => {
  for (const [path, note] of [
    ['/it/prodotti/bike-reclinata-fm-7045a/', 'Immagine illustrativa. Configurazione e dati tecnici da confermare.'],
    ['/en/products/recumbent-bike-fm-7045a/', 'Illustrative image. Configuration and technical specifications to be confirmed.'],
  ]) {
    expect((await page.goto(path!))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FM-7045A');
    const caption = page.locator('#product-image-note');
    await caption.scrollIntoViewIfNeeded();
    await expect(caption).toBeVisible();
    await expect(caption).toHaveText(note!);
    await expect(page.locator('.specs')).toHaveCount(0);
    const image = page.locator('.primary-image img');
    await expect(image).toHaveAttribute('aria-describedby', 'product-image-note');
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
});

test('la 7043A conserva gli URL esistenti ed appartiene alle ellittiche', async ({ page }) => {
  for (const [path, category] of [
    ['/it/prodotti/ab-trainer-professionale-fm-7043a/', 'Ellittiche'],
    ['/en/products/professional-ab-trainer-fm-7043a/', 'Ellipticals'],
  ]) {
    expect((await page.goto(path!))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FM-7043A');
    await expect(page.locator('.product-copy .eyebrow')).toContainText(category!);
  }
});

test('Pagefind conserva il cardio attivo ed esclude i quindici prodotti e le categorie ritirati', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Il contenuto dell’indice non dipende dal viewport.');
  const activeSkus = ['FM-7045A', 'FM-7043A', 'FM-7027', 'FM-7029', 'FM-9100A'];
  for (const path of ['/it/catalogo/', '/en/catalogue/']) {
    await page.goto(path);
    const results = await page.evaluate(async ({ skus }) => {
      const moduleUrl = '/pagefind/pagefind.js';
      const pagefind = await import(/* @vite-ignore */ moduleUrl);
      // Exact phrases audit SKU presence; free text can legitimately match parts of a code.
      const counts = await Promise.all(skus.map(async (sku) => ({ sku, count: (await pagefind.search(`"${sku}"`)).results.length })));
      const categoryResults = await Promise.all(['Ab trainer', 'Surf trainer'].map(async (query) => {
        const response = await pagefind.search(query);
        return Promise.all(response.results.map(async (result: { data: () => Promise<{ url: string }> }) => (await result.data()).url));
      }));
      return { counts, urls: categoryResults.flat() };
    }, { skus: [...activeSkus, ...retiredSkus] });
    for (const result of results.counts) {
      if (activeSkus.includes(result.sku)) expect(result.count, `${path}: ${result.sku}`).toBeGreaterThan(0);
      else expect(result.count, `${path}: ${result.sku}`).toBe(0);
    }
    for (const url of results.urls) expect(retiredCategoryPaths).not.toContain(new URL(url, 'https://fullmuscle.it').pathname);
  }
});

test('la ricerca libera trova le bike e i codici esatti distinguono prodotti attivi e ritirati', async ({ page }) => {
  for (const [locale, path, empty] of [
    ['it', '/it/catalogo/', 'Nessun risultato.'],
    ['en', '/en/catalogue/', 'No results.'],
  ] as const) {
    await page.goto(path);
    await page.locator('[data-catalog-toolbar] [data-search-open]').click();
    const dialog = page.locator('[data-search-dialog]');
    await expect(dialog).toBeVisible();
    const input = dialog.locator('[data-search-input]');
    const results = dialog.locator('[data-search-results]');
    await input.fill('bike');
    await expect(results.locator('a').filter({ hasText: /bike/i }).first()).toBeVisible();
    await input.fill('FM-2020A');
    await expect(results).toHaveText(empty);
    await expect(results.locator('a')).toHaveCount(0);
    await input.fill('FM-7045A');
    const retained = results.locator('a').filter({ hasText: 'FM-7045A' }).first();
    await expect(retained).toBeVisible();
    await expect(retained).toHaveAttribute('href', new RegExp(`^/${locale}/`));
    await retained.click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FM-7045A');
  }
});
