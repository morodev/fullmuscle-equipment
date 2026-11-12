import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { retiredPaginationPaths } from './fixtures/bench-selection';

const retiredProducts = JSON.parse(readFileSync(new URL('../data/catalog-editorial/retired-product-routes.json', import.meta.url), 'utf8')) as Array<{ sku: string; it: string; en: string }>;
const retiredLines = [
  'fm-5-series', 'fm-5xp-series', 'fm-51-series', 'fm-77-series', 'fm-78-series',
  'fm-82-series', 'fm-88-series', 'fm-8xp-series', 'fm-n8-series', 'fm-gb-5-series',
  'fm-gm-series', 'fm-gt-series', 'fm-hip-glute-machine', 'fm-x6-series', 'fm-x82-series',
];

test('tutte le vecchie schede e linee rispondono 404 nelle due lingue', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Lo stato HTTP non dipende dal viewport.');
  test.setTimeout(120_000);
  expect(retiredProducts).toHaveLength(404);
  const paths = [
    ...retiredProducts.flatMap((product) => [product.it, product.en]),
    ...retiredLines.flatMap((line) => [
      `/it/catalogo/linee/${line}/`, `/it/catalogo/linee/${line}/pagina/2/`,
      `/en/catalogue/lines/${line}/`, `/en/catalogue/lines/${line}/page/2/`,
    ]),
    '/it/catalogo/categorie/ab-trainer/', '/en/catalogue/categories/ab-trainers/',
    '/it/catalogo/categorie/surf-trainer/', '/en/catalogue/categories/surf-trainers/',
    ...retiredPaginationPaths,
  ];
  for (let start = 0; start < paths.length; start += 12) {
    await Promise.all(paths.slice(start, start + 12).map(async (path) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).toMatch(/name="robots" content="noindex/);
      await response.dispose();
    }));
  }
});

test('la ricerca trova i prodotti attivi e non ripropone quelli ritirati', async ({ page }) => {
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
    for (const retiredSku of ['FM-X6053', 'FM-X8202', 'FM-2000B', 'FM-3000A']) {
      // Establish that Pagefind works, and that each empty state follows a new query.
      await input.fill('FM-GF-001');
      await expect(results.locator('a').filter({ hasText: 'FM-GF-001' }).first()).toBeVisible();
      await input.fill(retiredSku);
      await expect(results).toHaveText(empty);
      await expect(results.locator('a')).toHaveCount(0);
    }
    await input.fill('FM-5034');
    const retained = results.locator('a').filter({ hasText: 'FM-5034' }).first();
    await expect(retained).toBeVisible();
    await expect(retained).toHaveAttribute('href', new RegExp(`^/${locale}/`));
    await retained.click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FM-5034');
    await expect(page.locator('main')).not.toContainText('5XP');
  }
});
