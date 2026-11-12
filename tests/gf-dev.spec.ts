import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const execFileAsync = promisify(execFile);
const workspace = fileURLToPath(new URL('../', import.meta.url));
const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const seriesPath = '/it/catalogo/linee/fm-gf-series/';

async function runAstro(command: 'check' | 'build', testInfo: TestInfo) {
  const env: NodeJS.ProcessEnv = { ...process.env, FULLMUSCLE_E2E_DEV: 'true', ASTRO_TELEMETRY_DISABLED: '1' };
  // Astro must pick the real command default, rather than inheriting dev's React mode.
  delete env.NODE_ENV;
  const args = [astroCli, command];
  if (command === 'build') args.push('--outDir', 'test-results/dev-cache/build');
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, {
      cwd: workspace,
      env,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    await testInfo.attach(`astro-${command}`, { body: Buffer.from(`${stdout}\n${stderr}`), contentType: 'text/plain' });
  } catch (error) {
    const output = error as { stdout?: string; stderr?: string };
    await testInfo.attach(`astro-${command}-failure`, {
      body: Buffer.from(`${output.stdout ?? ''}\n${output.stderr ?? ''}`),
      contentType: 'text/plain',
    });
    throw error;
  }
}

async function progress(page: Page) {
  return page.locator('[data-gf-progress]').evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return new DOMMatrixReadOnly(transform === 'none' ? undefined : transform).m11;
  });
}

async function partOffsets(page: Page) {
  return page.locator('[data-gf-part]').evaluateAll((elements) => elements.map((element) => {
    const transform = getComputedStyle(element).transform;
    const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
    return Math.hypot(matrix.m41, matrix.m42);
  }));
}

async function expectInteractivePage(page: Page, expectedQuoteQuantity: number) {
  const assembly = page.locator('[data-gf-assembly]');
  await assembly.scrollIntoViewIfNeeded();
  await expect(assembly).toHaveAttribute('data-motion', 'ready', { timeout: 30_000 });
  await expect(assembly.locator('[data-gf-part] img')).toHaveCount(5);
  expect(await assembly.locator('[data-gf-part] img').evaluateAll((images) => images.every((element) => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  }))).toBe(true);

  const stage = assembly.locator('[data-gf-stage]');
  const range = await assembly.evaluate((element) => {
    const headerHeight = document.querySelector('[data-header]')?.getBoundingClientRect().height ?? 0;
    const stageHeight = element.querySelector('[data-gf-stage]')!.getBoundingClientRect().height;
    return {
      start: element.getBoundingClientRect().top + scrollY - headerHeight,
      distance: element.getBoundingClientRect().height - stageHeight,
    };
  });
  // Only position the test at the start; the animation itself is exercised by wheel input.
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), range.start);
  await expect.poll(() => progress(page)).toBeLessThan(.02);
  await expect(stage).toBeInViewport({ ratio: .8 });
  await expect(assembly.locator('[data-gf-part]').first()).toBeVisible();
  await expect.poll(async () => Math.max(...await partOffsets(page))).toBeGreaterThan(10);
  const initialOffsets = await partOffsets(page);
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height / 2);

  await page.mouse.wheel(0, range.distance + 5);
  await expect.poll(() => progress(page)).toBeGreaterThan(.98);
  await expect.poll(async () => Math.max(...await partOffsets(page))).toBeLessThan(1);
  await expect(stage).toBeInViewport({ ratio: .8 });

  await page.mouse.wheel(0, -(range.distance + 5));
  await expect.poll(() => progress(page)).toBeLessThan(.02);
  await expect.poll(async () => {
    const offsets = await partOffsets(page);
    return Math.max(...offsets.map((offset, index) => Math.abs(offset - initialOffsets[index]!)));
  }).toBeLessThan(2);
  await expect(stage).toBeInViewport({ ratio: .8 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

  const card = page.locator('.product-card').filter({ hasText: 'FM-GF-001' });
  await card.scrollIntoViewIfNeeded();
  const island = card.locator('astro-island[component-url*="AddToQuote"]');
  await expect(island).toHaveCount(1);
  await expect(island).not.toHaveAttribute('ssr', '');
  const add = card.getByRole('button', { name: 'Aggiungi alla richiesta: FM-GF-001', exact: true });
  await add.click();
  await expect(add).toContainText('Aggiunto');
  await expect.poll(() => page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem('fullmuscle-quote-v1') ?? '[]') as Array<{ sku: string; quantity: number }>;
    return items.find((item) => item.sku === 'FM-GF-001')?.quantity ?? 0;
  })).toBe(expectedQuoteQuantity);
}

test('check e build non invalidano animazione GF e isole React del server dev acceso', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  const unavailableModules: string[] = [];
  const warmedModules = new Set<string>();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 504) unavailableModules.push(response.url());
    const url = new URL(response.url());
    if (response.ok() && url.pathname.includes('/node_modules/') && url.pathname.endsWith('.js') &&
      /gsap|react/i.test(url.pathname) && url.searchParams.has('v')) warmedModules.add(url.href);
  });

  await page.goto(seriesPath);
  await expectInteractivePage(page, 1);
  expect([...warmedModules].some((url) => /gsap/i.test(url))).toBe(true);
  expect([...warmedModules].some((url) => /react/i.test(url))).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(unavailableModules).toEqual([]);

  for (const [index, command] of (['check', 'build'] as const).entries()) {
    await test.step(`server dev utilizzabile dopo astro ${command}`, async () => {
      const existingUrls = [...warmedModules];
      await runAstro(command, testInfo);
      // The modules referenced by the already-open tab must remain valid, including their versions.
      for (const url of existingUrls) {
        const response = await page.request.get(url);
        expect(response.status(), `Modulo già caricato non più disponibile: ${url}`).toBe(200);
      }
      await page.reload();
      await expectInteractivePage(page, index + 2);
      expect(pageErrors).toEqual([]);
      expect(unavailableModules).toEqual([]);
    });
  }
});
