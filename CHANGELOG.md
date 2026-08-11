# Changelog

All notable changes to this project will be documented in this file.

## [2.0.2] - 2026-08-10

## [2.0.1] - 2026-07-30

### Documentation

- Correct stale references in `README.md`, `AGENTS.md`, the cutover runbook, and `RELEASES-RATIONALE.md` to match the current Astro/Cloudflare monorepo: staging domain, environment-variable names, monorepo layout, and committed rulesets. by @brettdavies in [#24](https://github.com/brettdavies/lmgroktfy/pull/24)

**Full Changelog**: [v2.0.0...v2.0.1](https://github.com/brettdavies/lmgroktfy/compare/v2.0.0...v2.0.1)

## [2.0.0] - 2026-07-30

### Changed

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

## [1.1.0] - 2025-12-03

### Changed

- Promote the TypeScript-monorepo build to `main` and configure the production Worker: attach the custom domains and disable the `workers.dev` dev/preview URLs so the app is served only from its own hostnames. ([#12](https://github.com/brettdavies/lmgroktfy/pull/12))

## [1.0.0] - 2025-12-03

### Changed

- Migrate the codebase from JavaScript to TypeScript (strict) as a Bun-workspaces monorepo (`shared` + `client` + `web`): replace npm/webpack with Bun's native bundler, swap ESLint for Biome, add Zod schemas as the single source of truth for types and runtime validation, serve from a single Cloudflare Worker with SPA routing, and split large files into single-responsibility modules. ([#11](https://github.com/brettdavies/lmgroktfy/pull/11))

## [0.1.0] - 2025-02-25

### Added

- Original LMGROKTFY single-page app: ask Grok a question and get a shareable answer via URL, with six-language i18n (including RTL), keyboard navigation, screen-reader semantics, and a Tailwind + DaisyUI interface.

### Changed

- Alphabetize the language-picker options for consistent ordering. ([#10](https://github.com/brettdavies/lmgroktfy/pull/10))
