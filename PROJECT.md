# LMGROKTFY (Let Me GROK That For You)

> **Note:** This is a project overview card. For technical documentation and setup instructions, see [README.md](README.md).

## Overview

A production web application that lets users ask questions to Grok AI and share answers via shareable URLs. Built as a TypeScript monorepo with a 3-package Bun workspace architecture, featuring comprehensive accessibility (WCAG compliant), full internationalization across 6 languages with RTL support, and deployed via Cloudflare Workers serving both API and static assets from a single worker.

## Quick Reference

| Field | Value |
|-------|-------|
| **Status** | Active |
| **Deployed URL** | [lmgroktfy.com](https://lmgroktfy.com) |
| **Build Time** | ~5 days initial + 1-day TypeScript refactor |

## Technical Stack

| Category | Technologies |
|----------|--------------|
| **Languages** | TypeScript (strict mode), HTML5, CSS3 |
| **Runtime** | Bun (package manager, runtime, test runner) |
| **Frameworks** | Tailwind CSS 4.x, DaisyUI 5.x |
| **Infrastructure** | Cloudflare Workers |
| **AI/ML** | Grok AI API (xAI) |
| **Key Patterns** | Monorepo workspaces, Schema-driven types (Zod), Manager pattern, i18n, Accessibility-first |

## Key Achievements

- **1-day TypeScript Migration:** Refactored entire JavaScript codebase to TypeScript strict mode monorepo in a single day
- **Monorepo Architecture:** 3-package Bun workspace (shared, client, web) with proper dependency boundaries and subpath exports
- **Schema-Driven Types:** Zod schemas as single source of truth, generating TypeScript types via inference
- **Unified Deployment:** Single Cloudflare Worker serving both API routes and static assets
- **WCAG Accessibility:** 13+ ARIA live regions, keyboard navigation with 8 custom shortcuts, focus management
- **Full i18n:** 6 languages (EN, ES, FR, DE, JA, AR) with RTL support and automated workflow scripts

## Technical Highlights

- **TypeScript Monorepo:** Clean 3-package workspace with `@lmgroktfy/shared` (types, schemas, utils), `@lmgroktfy/client` (frontend), and `@lmgroktfy/web` (Cloudflare Worker)

- **Zod Schema-Driven Development:** API contracts defined once in Zod schemas with TypeScript types derived via `z.infer<>`, eliminating type drift

- **Manager Pattern Architecture:** 5 specialized managers (Focus, Clipboard, Animation, Theme, Placeholder) with clear separation of concerns

- **Modern Toolchain:** Bun + TypeScript 5.7 + Biome (linting) + Prettier (formatting) + Husky (pre-commit hooks)

## Code Metrics

| Metric | Value |
|--------|-------|
| **Lines of Code** | 3,903 TypeScript (3,332 packages + 571 scripts) |
| **Primary Language** | TypeScript (100%) |
| **Test Coverage** | 503 lines across 5 test files |
| **Key Dependencies** | Bun, TypeScript, Zod, Tailwind CSS, DaisyUI, Biome, wrangler |

---

*For detailed technical documentation, setup instructions, and contribution guidelines, please see [README.md](README.md).*
