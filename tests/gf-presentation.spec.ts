import { expect, test, type Locator, type Page } from '@playwright/test';

const italianGf = '/it/catalogo/linee/fm-gf-series/';
const englishGf = '/en/catalogue/lines/fm-gf-series/';

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}

async function expectStaticAssembly(page: Page) {
  const assembly = page.locator('[data-gf-assembly]');
  await expect(assembly).toHaveAttribute('data-motion', 'static');
  const poster = assembly.locator('img[data-gf-poster]');
  await poster.scrollIntoViewIfNeeded();
  await expect(poster).toBeVisible();
  await expect.poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const assemblyBox = await assembly.boundingBox();
  const stageBox = await assembly.locator('[data-gf-stage]').boundingBox();
  expect(assemblyBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  // A static scene must not retain the tall section reserved for scroll progress.
  expect(assemblyBox!.height).toBeLessThanOrEqual(stageBox!.height + 150);
  await expect(page.locator('.product-card')).toHaveCount(5);
  await expectNoHorizontalOverflow(page);
}

async function maximumPartOffset(parts: Locator) {
  return parts.evaluateAll((elements) => Math.max(...elements.map((element) => {
    const transform = getComputedStyle(element).transform;
    const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
    return Math.hypot(matrix.m41, matrix.m42);
  })));
}

test('la presentazione GF conserva contenuti, modelli e navigazione nelle due lingue', async ({ page }) => {
  for (const [locale, path, alternate] of [
    ['it', italianGf, englishGf],
    ['en', englishGf, italianGf],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-gf-presentation]')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('FM-GF');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('main')).toContainText('FM-GF-001');
    await expect(page.locator('.product-card')).toHaveCount(5);
    for (let model = 1; model <= 5; model += 1) {
      await expect(page.locator('.product-card').filter({ hasText: `FM-GF-00${model}` })).toHaveCount(1);
    }
    await expect(page.locator('.language')).toHaveAttribute('href', alternate);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expect(page.locator('[data-gf-presentation] a[href^="' + (locale === 'it' ? '/it/richiesta/' : '/en/quote-request/') + '"]').first()).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/€|\bEUR\b|1[.,]870/);
    await expectNoHorizontalOverflow(page);
    if (locale === 'en') await expect(page.locator('a[href^="/cataloghi/"]')).toHaveCount(0);
  }

  await page.goto('/it/catalogo/linee/fm-g5-series/');
  await expect(page.locator('[data-gf-presentation]')).toHaveCount(0);
  await expect(page.locator('img[src*="/images/animations/gf/"]')).toHaveCount(0);
});

test('il montaggio segue lo scroll in entrambe le direzioni senza allargare la pagina', async ({ page }) => {
  await page.goto(italianGf);
  const assembly = page.locator('[data-gf-assembly]');
  await assembly.scrollIntoViewIfNeeded();
  await expect(assembly).toHaveAttribute('data-motion', 'ready', { timeout: 15_000 });
  const parts = assembly.locator('[data-gf-part]');
  await expect(parts).toHaveCount(5);
  const range = await assembly.evaluate((element) => {
    const headerHeight = document.querySelector('[data-header]')?.getBoundingClientRect().height ?? 0;
    const bounds = element.getBoundingClientRect();
    return { start: bounds.top + scrollY - headerHeight, end: bounds.bottom + scrollY };
  });
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), range.start);
  await expect.poll(() => maximumPartOffset(parts)).toBeGreaterThan(10);
  const startOffset = await maximumPartOffset(parts);
  await expectNoHorizontalOverflow(page);

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), range.end);
  await expect.poll(() => maximumPartOffset(parts)).toBeLessThan(1);
  await expectNoHorizontalOverflow(page);

  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), range.start);
  await expect.poll(async () => Math.abs(await maximumPartOffset(parts) - startOffset)).toBeLessThan(2);
  await expectNoHorizontalOverflow(page);
});

test.describe('presentazione GF senza JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('la macchina completa e il catalogo restano disponibili senza una lunga sezione vuota', async ({ page }) => {
    await page.goto(italianGf);
    await expectStaticAssembly(page);
    await expect(page.locator('.page-hero a[download]')).toHaveAttribute('href', '/cataloghi/fullmuscle-gf.pdf');
  });
});

test.describe('presentazione GF con movimento ridotto', () => {
  test.use({ reducedMotion: 'reduce' });
  test('rispetta la preferenza iniziale e il suo cambiamento durante la visita', async ({ page }) => {
    const partRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/images/animations/gf/') && !request.url().includes('poster')) partRequests.push(request.url());
    });
    await page.goto(italianGf);
    await page.locator('[data-gf-assembly]').scrollIntoViewIfNeeded();
    await expectStaticAssembly(page);
    expect(partRequests).toEqual([]);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('[data-gf-assembly]')).toHaveAttribute('data-motion', 'ready', { timeout: 15_000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expectStaticAssembly(page);
  });
});

test('un componente non scaricabile conserva la presentazione statica e i cinque modelli', async ({ page }) => {
  await page.route('**/images/animations/gf/**', (route) => {
    return route.request().url().includes('poster') ? route.continue() : route.abort();
  });
  await page.goto(italianGf);
  const assembly = page.locator('[data-gf-assembly]');
  await assembly.scrollIntoViewIfNeeded();
  await expect(assembly).toHaveAttribute('data-motion-error', 'true', { timeout: 15_000 });
  await expectStaticAssembly(page);
});
