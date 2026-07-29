# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-07-29

### Changed

- Add clickable home link in header
 by @brettdavies in [#4](https://github.com/brettdavies/lmgroktfy/pull/4)
- Add reset functionality to clear form and state
- Update URL without page reload using History API
- Add hover styles for home link
- Remove redundant "Question:" prefix when copying Q&A
- Remove redundant "Question:" prefix from tweet format
- Maintain consistent formatting across all share options
- Migrated entire codebase from JavaScript to TypeScript by @brettdavies in [#11](https://github.com/brettdavies/lmgroktfy/pull/11)
- Restructured as monorepo with 3 packages: `shared`, `client`, `web`
- Replaced npm/webpack with Bun workspaces and native Bun bundler
- Added Biome for linting (replacing ESLint)
- Added Zod schemas for runtime validation
- Configured Cloudflare Worker with SPA routing support
- Modularized large files into focused, single-responsibility modules
- Astro 7.1.4 + `@astrojs/cloudflare` 14.x app under `apps/web`, emitting one Worker; the four-way version set is locked with a Dependabot group. by @brettdavies in [#16](https://github.com/brettdavies/lmgroktfy/pull/16)
- `/api/grok` as a hardened SSR endpoint: body-size cap, upstream `AbortController` timeout, generic client errors (nothing leaked), a rate limit keyed only on `CF-Connecting-IP` (IPv6 collapsed to a /48), same-origin CORS, and fail-closed Turnstile (siteverify with its own timeout; missing, invalid, or an outage returns 403/503, never open).
- Roughly one-week KV answer cache keyed on the normalized question; a hit skips the paid xAI call and a KV failure degrades to a live call. Responses carry `X-Cache: HIT|MISS`.
- URL-routed i18n for ar/de/en/es/fr/ja (default unprefixed), server-side RTL, and a `?lang=` to `/xx/` redirect shim so old links keep working.
- Interactive island ported as vanilla TS; the deep-link auto-submit awaits the Turnstile token so a shared link never 403s, and the answer-URL rewrite preserves the active locale.
- Describe-not-expose agent surface: llms.txt, robots.txt, sitemap.xml, per-locale markdown twins, and `.well-known/security.txt`, none publishing a callable endpoint.
- Static, nonce-free CSP delivered via a build-generated `_headers` file for the prerendered pages that bypass the Worker, plus HSTS on the production domains only. The CSP admits the auto-injected Cloudflare Web Analytics beacon.
- Two-environment Wrangler model (`lmgroktfy-staging` on `dev.lmgroktfy.com`, `lmgroktfy` on the apex and www custom domains), with the production name pinned for an in-place cutover.
- Nightly production canary (GitHub Action) that checks the site is up and the pinned model still answers.
- Grok proxy pinned to `grok-4.20-0309-reasoning` with a 25s upstream timeout.
- Legacy `packages/client` and `packages/web` removed; root scripts, Biome, Prettier (now with `prettier-plugin-astro` for `apps/web`), CI, and the pre-commit/pre-push hooks repointed at the Astro structure.
