import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { expect, test } from '@playwright/test';

test('il catalogo GF si scarica dalla serie e dal footer senza esporre prezzi nelle schede web', async ({ page }) => {
  await page.goto('/it/catalogo/linee/fm-gf-series/');
  const downloadLink = page.locator('.page-hero').getByRole('link', { name: 'Scarica il catalogo GF (PDF)' });
  await expect(downloadLink).toBeVisible();
  await expect(page.locator('.site-footer').getByRole('link', { name: 'Catalogo GF (PDF)', exact: true })).toHaveAttribute('href', '/cataloghi/fullmuscle-gf.pdf');
  await expect(page.locator('.site-footer').getByRole('link', { name: 'Catalogo G5 (PDF)', exact: true })).toHaveAttribute('href', '/cataloghi/fullmuscle-g5.pdf');
  await expect(page.locator('.product-card')).toHaveCount(5);
  await expect(page.locator('main')).not.toContainText(/€|\bEUR\b|1[.,]870/);

  const downloaded = page.waitForEvent('download');
  await downloadLink.click();
  const download = await downloaded;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toBe('fullmuscle-gf.pdf');
  const file = await download.path();
  expect(file).not.toBeNull();
  const pdf = await PDFDocument.load(await readFile(file!));
  expect(pdf.getPageCount()).toBe(8);
});

test('il download G5 resta disponibile nella paginazione e i PDF italiani non appaiono in inglese', async ({ page }) => {
  await page.goto('/it/catalogo/linee/fm-g5-series/pagina/2/');
  await expect(page.locator('.page-hero').getByRole('link', { name: 'Scarica il catalogo G5 (PDF)' })).toHaveAttribute('href', '/cataloghi/fullmuscle-g5.pdf');
  await expect(page.locator('.page-hero').getByRole('link', { name: 'Scarica il catalogo GF (PDF)' })).toHaveCount(0);

  await page.goto('/en/catalogue/lines/fm-gf-series/');
  await expect(page.locator('a[href^="/cataloghi/"]')).toHaveCount(0);
});
