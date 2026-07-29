import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@lmgroktfy/shared';
import type { APIRoute, GetStaticPaths } from 'astro';
import { renderHomeTwin } from '../../lib/twin';

export const getStaticPaths: GetStaticPaths = () =>
  SUPPORTED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => ({
    params: { locale },
  }));

export const GET: APIRoute = ({ params }) => {
  const locale = params.locale ?? DEFAULT_LOCALE;
  return new Response(renderHomeTwin(locale), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
