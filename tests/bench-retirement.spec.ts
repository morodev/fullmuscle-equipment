import { expect, test } from '@playwright/test';
import { retiredBenches, retiredFreeWeight, retainedFreeWeight, retainedVariants, retainedSmith } from './fixtures/bench-selection';

test('pesi liberi e panche presenta i 27 articoli approvati su due pagine', async ({ page }) => {
  for (const [base, pagination] of [
    ['/it/catalogo/categorie/pesi-liberi-panche/', 'pagina'],
    ['/en/catalogue/categories/free-weights-benches/', 'page'],
  ]) {
    const skus: string[] = [];
    for (let number = 1; number <= 2; number += 1) {
      expect((await page.goto(number === 1 ? base! : `${base}${pagination}/${number}/`))?.status()).toBe(200);
      await expect(page.locator('.product-card')).toHaveCount(number === 1 ? 24 : 3);
      skus.push(...await page.locator('.product-card .product-meta span:last-child').allTextContents());
    }
    expect(skus).toHaveLength(27);
    expect(new Set(skus).size).toBe(27);
    expect(skus).toEqual(expect.arrayContaining([...retainedFreeWeight, ...retainedVariants]));
    for (const sku of [...retiredBenches, ...retiredFreeWeight]) expect(skus).not.toContain(sku);
  }
});

test('il catalogo termina alla pagina 15 nelle due lingue', async ({ page }) => {
  for (const path of ['/it/catalogo/pagina/15/', '/en/catalogue/page/15/']) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.locator('.product-card')).toHaveCount(7);
    await expect(page.locator('.pagination .page-direction').last()).toHaveClass(/disabled/);
    await expect(page.locator('.pagination a[href*="/16/"]')).toHaveCount(0);
  }
});

test('Pagefind esclude panche e accessori ritirati ma trova le varianti e Smith conservate', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Il contenuto dell’indice non dipende dal viewport.');
  const retained = [...retainedFreeWeight, ...retainedSmith, ...retainedVariants];
  for (const path of ['/it/catalogo/', '/en/catalogue/']) {
    await page.goto(path);
    const counts = await page.evaluate(async (skus) => {
      const moduleUrl = '/pagefind/pagefind.js';
      const pagefind = await import(/* @vite-ignore */ moduleUrl);
      return Promise.all(skus.map(async (sku) => ({ sku, count: (await pagefind.search(`"${sku}"`)).results.length })));
    }, [...retiredBenches, ...retiredFreeWeight, ...retained]);
    for (const result of counts) {
      if (retained.includes(result.sku)) expect(result.count, `${path}: ${result.sku}`).toBeGreaterThan(0);
      else expect(result.count, `${path}: ${result.sku}`).toBe(0);
    }
  }
});

test('la GC-5041 mantiene gli URL e descrive correttamente la hip extension a 45 gradi', async ({ page }) => {
  for (const [path, name, category, typePath] of [
    ['/it/prodotti/macchina-isotonica-fm-gc-5041/', 'Hip extension a 45° FM-GC-5041', 'Pesi liberi e panche', '/it/catalogo/tipologie/back-extension-machine/'],
    ['/en/products/pin-loaded-machine-fm-gc-5041/', 'Dual 45° hip extension FM-GC-5041', 'Free weights & benches', '/en/catalogue/types/back-extension-machines/'],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.request().redirectedFrom()).toBeNull();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expect(page.locator('.product-copy .eyebrow')).toHaveText(category);
    await expect(page.locator('.line-pill')).toHaveCount(0);
    await expect(page.locator('.specs')).toContainText('1750*1410*1360');
    await expect(page.locator('.specs')).toContainText('137kg');
    await expect(page.locator('.specs')).not.toContainText(/pacco pesi|weight stack/i);
    await page.goto(typePath);
    const card = page.locator('.product-card').filter({ hasText: 'FM-GC-5041' });
    await expect(card).toContainText(name);
    await expect(card.locator('a').first()).toHaveAttribute('href', path);
  }
});
