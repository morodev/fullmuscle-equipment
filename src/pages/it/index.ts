import type { APIRoute } from 'astro';
import { route } from '../../lib/site';

export const prerender = false;

export const GET: APIRoute = ({ url, redirect }) => {
  return redirect(`${route('it').home}${url.search}`, 301);
};
