import { expect, test, type Page } from '@playwright/test';

async function expectMenuToFillViewport(page: Page) {
  const navigation = page.locator('[data-menu]');
  await expect(navigation).toBeVisible();
  const header = await page.locator('[data-header]').boundingBox();
  const menu = await navigation.boundingBox();
  const viewport = page.viewportSize()!;
  expect(header).not.toBeNull();
  expect(menu).not.toBeNull();
  expect(Math.abs(menu!.y - (header!.y + header!.height))).toBeLessThanOrEqual(1);
  expect(Math.abs(menu!.y + menu!.height - viewport.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(menu!.width - viewport.width)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
}

const mobileViewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
];

for (const viewport of mobileViewports) {
  test(`il menu occupa il viewport e permette di raggiungere gli ultimi link a ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/it/');
    const toggle = page.getByRole('button', { name: 'Apri il menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Chiudi il menu' })).toHaveAttribute('aria-expanded', 'true');
    await expectMenuToFillViewport(page);

    const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });
    await navigation.getByRole('button', { name: 'Strength', exact: true }).click();
    for (const summary of await navigation.locator('#strength-menu summary').all()) {
      await summary.click();
    }

    const language = navigation.getByRole('link', { name: 'Passa alla versione inglese' });
    await language.scrollIntoViewIfNeeded();
    await expect(language).toBeInViewport({ ratio: 1 });
    expect(await navigation.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expectMenuToFillViewport(page);
    await language.click();
    await expect(page).toHaveURL('/en/');
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  });
}

test('il menu blocca la pagina, scorre internamente e ripristina il focus con Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/');
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
  const pageScroll = await page.evaluate(() => window.scrollY);

  await page.getByRole('button', { name: 'Open menu' }).click();
  await expectMenuToFillViewport(page);
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  const strength = navigation.getByRole('button', { name: 'Strength', exact: true });
  await strength.click();
  await navigation.locator('summary').filter({ hasText: 'Pin Loaded Machine' }).click();
  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => navigation.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);

  // Wheel events over the header must not scroll the page behind the menu either.
  await page.mouse.move(200, 20);
  await page.mouse.wheel(0, 400);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);

  await page.keyboard.press('Escape');
  await expect(strength).toHaveAttribute('aria-expanded', 'false');
  await expect(strength).toBeFocused();
  await expect(navigation).toBeVisible();
  await page.keyboard.press('Escape');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(navigation).toBeHidden();

  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(pageScroll);

  await toggle.click();
  await strength.click();
  const series = navigation.locator('a[href="/en/catalogue/lines/fm-5-series/"]');
  await series.click();
  await expect(page).toHaveURL('/en/catalogue/lines/fm-5-series/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
});

test('il menu ripristina navigazione e accordion attraversando il breakpoint desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1179, height: 844 });
  await page.goto('/it/');
  const toggle = page.locator('[data-menu-toggle]');
  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  const strength = navigation.getByRole('button', { name: 'Strength', exact: true });
  const series = navigation.getByRole('link', { name: 'Serie FM N8', exact: true });
  await toggle.click();
  await strength.click();
  await navigation.locator('summary').filter({ hasText: 'Pin Loaded Machine' }).click();
  await expect(series).toBeVisible();
  await expectMenuToFillViewport(page);

  await page.mouse.move(1, 1);
  await page.setViewportSize({ width: 1180, height: 844 });
  await expect(toggle).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(strength).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeVisible();
  await strength.click();
  await expect(series).toBeVisible();
  await page.mouse.move(600, 700);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
  await toggle.click();
  await expectMenuToFillViewport(page);
  await expect(strength).toHaveAttribute('aria-expanded', 'false');
  await strength.click();
  await expect(series).toBeHidden();
  await navigation.locator('summary').filter({ hasText: 'Pin Loaded Machine' }).click();
  await expect(series).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
});
