import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const sitemap = new URL('/sitemap.xml', SITE.url).toString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${sitemap}</loc></sitemap></sitemapindex>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
