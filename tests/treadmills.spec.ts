import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const expectedSkus = ['FM-9100A', 'FM-9100B', 'FM-9100C', 'FM-7100A', 'FM-7100B', 'FM-7100C', 'FM-3000B', 'FM-3000C'];
const editorial = JSON.parse(readFileSync(new URL('../data/catalog-editorial/products.json', import.meta.url), 'utf8')) as {
  products: Array<{ publicSku: string; imageNote: { it: string; en: string } }>;
};
const illustration = editorial.products.find((product) => product.publicSku === 'FM-7100A')!;
const imported = JSON.parse(readFileSync(new URL('../data/catalog-drafts/products.json', import.meta.url), 'utf8')) as {
  products: Array<{ publicSku: string; categoryId: string }>;
};
const retiredTreadmills = imported.products.filter((product) => product.categoryId === 'treadmill' && !expectedSkus.includes(product.publicSku)).map((product) => product.publicSku);

test('la categoria tapis roulant presenta solo gli otto modelli approvati', async ({ page }) => {
  for (const path of ['/it/catalogo/categorie/tapis-roulant/', '/en/catalogue/categories/treadmills/']) {
    await page.goto(path);
    const cards = page.locator('.product-card');
    await expect(cards).toHaveCount(8);
    const skus = await cards.locator('.product-meta span:last-child').allTextContents();
    expect(skus.sort()).toEqual([...expectedSkus].sort());
    await expect(page.locator('main')).not.toContainText(/FM-2000B|FM-3000A|FM-9100P|FM-9200/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('la 7100A mostra la nota illustrativa nelle due lingue senza una tabella tecnica inventata', async ({ page }) => {
  for (const [locale, path] of [
    ['it', '/it/prodotti/tapis-roulant-professionale-fm-7100a/'],
    ['en', '/en/products/professional-treadmill-fm-7100a/'],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FM-7100A');
    const note = page.locator('.product-gallery').getByText(illustration.imageNote[locale], { exact: true });
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeVisible();
    await expect(page.locator('.specs')).toHaveCount(0);
    const image = page.locator('.primary-image img');
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('Pagefind indicizza la nuova 7100A e non restituisce nessuno dei sedici tapis roulant ritirati', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Il contenuto dell’indice non dipende dal viewport.');
  expect(retiredTreadmills).toHaveLength(16);
  for (const path of ['/it/catalogo/', '/en/catalogue/']) {
    await page.goto(path);
    const counts = await page.evaluate(async (skus) => {
      const moduleUrl = '/pagefind/pagefind.js';
      const pagefind = await import(/* @vite-ignore */ moduleUrl);
      // Exact phrases audit SKU presence; free text can legitimately match parts of a code.
      return Promise.all(skus.map(async (sku) => ({ sku, count: (await pagefind.search(`"${sku}"`)).results.length })));
    }, ['FM-7100A', ...retiredTreadmills]);
    expect(counts[0]!.count).toBeGreaterThan(0);
    for (const result of counts.slice(1)) expect(result.count, `${path}: ${result.sku}`).toBe(0);
  }
});
