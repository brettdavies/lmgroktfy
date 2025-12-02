# LMGROKTFY (Let Me GROK That For You)

> **Note:** This is a project overview card. For technical documentation and setup instructions, see [README.md](README.md).

## Overview

A production-ready web application enabling users to submit questions to Grok AI and share the answers via shareable URLs. Features comprehensive accessibility support (WCAG compliant), full internationalization across 6 languages with RTL support, and an enterprise-grade testing infrastructure with 129 test cases covering unit, integration, and E2E scenarios.

## Quick Reference

| Field | Value |
|-------|-------|
| **Status** | Active |
| **Deployed URL** | [lmgroktfy.com](https://lmgroktfy.com) |
| **Build Time** | ~5 days (Feb 20-25, 2025) |

## Technical Stack

| Category | Technologies |
|----------|--------------|
| **Languages** | JavaScript (ES6+ Modules), HTML5, CSS3 |
| **Frameworks** | Tailwind CSS, DaisyUI |
| **Infrastructure** | Cloudflare Pages, GitHub Actions |
| **AI/ML** | Grok AI API integration |
| **Key Patterns** | Manager pattern, ES modules, Internationalization (i18n), Accessibility-first design |

## Key Achievements

- Achieved WCAG accessibility compliance with 13+ ARIA live regions and comprehensive keyboard navigation
- Implemented full internationalization (i18n) system supporting 6 languages (EN, ES, FR, DE, JA, AR) with RTL language support
- Built comprehensive testing infrastructure with 129 test cases across unit, integration, and E2E testing using Jest and Playwright
- Deployed production-ready application on Cloudflare Pages with automated minification and CI/CD pipeline
- Developed modular architecture with 6 specialized Manager classes for separation of concerns

## Technical Highlights

- **Accessibility-First Architecture:** WCAG-compliant implementation with 13+ ARIA live regions, focus management, keyboard shortcuts, and screen reader support including focus trapping and automatic announcements
- **i18n Infrastructure:** Complete internationalization system with 8 locale files, automated translation workflow scripts, lazy-loading translations, and RTL language support
- **Testing Excellence:** 129 test cases with multi-layer strategy including Jest unit tests, integration tests, Playwright E2E tests with @axe-core accessibility testing

## Code Metrics

| Metric | Value |
|--------|-------|
| **Lines of Code** | 8,337 total (7,717 JS, 406 HTML, 214 CSS) |
| **Primary Language** | JavaScript (93%) |
| **Test Coverage** | 129 test cases (unit + integration + E2E) |
| **Key Dependencies** | Jest, Playwright, @axe-core, Tailwind CSS, DaisyUI |

---

*For detailed technical documentation, setup instructions, and contribution guidelines, please see [README.md](README.md).*
