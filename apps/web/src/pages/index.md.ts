import { DEFAULT_LOCALE } from '@lmgroktfy/shared';
import type { APIRoute } from 'astro';
import { renderHomeTwin } from '../lib/twin';

export const GET: APIRoute = () =>
  new Response(renderHomeTwin(DEFAULT_LOCALE), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
