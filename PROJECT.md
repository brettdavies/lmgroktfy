# LMGROKTFY (Let Me GROK That For You)

> **Note:** This is a project overview card. For technical documentation and setup instructions, see [README.md](README.md).

## Overview

A production web application that forwards a question to Grok AI and renders a shareable answer via URL. Built on Astro
7 with the `@astrojs/cloudflare` adapter as a Bun-workspaces monorepo, deployed as a single Cloudflare Worker that
serves prerendered pages, the interactive island, and the SSR `/api/grok` endpoint. Accessibility-first (WCAG), with
full internationalization across six languages including RTL.

## Quick Reference

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| **Status**       | Active                                 |
| **Version**      | 2.0.0                                  |
| **Deployed URL** | [lmgroktfy.com](https://lmgroktfy.com) |

## Technical Stack

| Category           | Technologies                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Languages**      | TypeScript (strict mode), HTML5, CSS3                                                                                   |
| **Framework**      | Astro 7.1.4 (`@astrojs/cloudflare`), Tailwind CSS 4.x, daisyUI 5.x                                                      |
| **Runtime**        | Bun (package manager, runtime, test runner)                                                                             |
| **Infrastructure** | Cloudflare Workers (KV answer cache, Turnstile, rate limiting)                                                          |
| **AI/ML**          | Grok AI API (xAI), pinned to `grok-4.20-0309-reasoning`                                                                 |
| **Key Patterns**   | Astro prerendered pages + SSR endpoint + client island, schema-driven types (Zod), URL-routed i18n, accessibility-first |

## Key Achievements

- **Astro rebuild (2.0.0):** rebuilt the app on Astro 7 + the Cloudflare adapter, emitting one Worker that serves
  prerendered pages, the interactive island, and the SSR `/api/grok` endpoint.
- **Hardened API surface:** fail-closed Turnstile, per-IP rate limiting, same-origin CORS, a body-size cap, and an
  upstream timeout on `/api/grok`, plus a roughly one-week KV answer cache keyed on the normalized question.
- **TypeScript monorepo (1.0.0):** Bun workspaces (`apps/web` + `@lmgroktfy/shared`) with schema-driven types via Zod as
  the single source of truth.
- **WCAG accessibility:** ARIA live regions, keyboard navigation, and focus management throughout.
- **Full i18n:** six languages (EN, ES, FR, DE, JA, AR) with RTL support, URL-routed, and automated workflow scripts.
- **Describe-not-expose agent surface:** llms.txt, robots.txt, sitemap.xml, per-locale markdown twins, and
  `.well-known/security.txt`.

## Technical Highlights

- **Astro on Cloudflare Workers:** `apps/web` builds to a single Worker via `@astrojs/cloudflare`; prerendered pages
  bypass the Worker with a build-generated `_headers` CSP, while `/api/grok` runs SSR.

- **Zod schema-driven development:** API contracts defined once in `@lmgroktfy/shared` Zod schemas, with TypeScript
  types derived via `z.infer<>`, eliminating type drift across the app and the shared package.

- **Turnstile-gated interactivity:** the client island awaits the Turnstile token before the deep-link auto-submit, so a
  shared answer link never 403s, and the answer-URL rewrite preserves the active locale.

- **Modern toolchain:** Bun + TypeScript 5.7 + Biome (linting) + Prettier with `prettier-plugin-astro` (formatting) +
  local git hooks (`scripts/hooks`, activated via `core.hooksPath`).

## Deployment

Two Wrangler environments from one codebase: `lmgroktfy-staging` on `dev.lmgroktfy.com` and `lmgroktfy` on the apex plus
www custom domains, with the production name pinned for an in-place cutover. A nightly canary checks the site is up and
the pinned model still answers. Deploys are human-gated (`bun run deploy:staging` / `bun run deploy:prod`), never
automated on a tag or merge.

---

_For detailed technical documentation, setup instructions, and contribution guidelines, please see
[README.md](README.md)._
