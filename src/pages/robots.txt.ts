import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const body = SITE.ready
    ? `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml', SITE.url)}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
