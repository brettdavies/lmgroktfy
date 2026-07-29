# LMGROKTFY (Let Me GROK That For You)

> **Project Overview:** See [PROJECT.md](PROJECT.md) for a high-level overview, achievements, and technical highlights.

A simple, accessible web application that lets you ask questions to Grok AI and share the answers with others.

**Live site: [lmgroktfy.com](https://lmgroktfy.com)**

🇺🇸 [English](https://lmgroktfy.com/?lang=en) · 🇪🇸 [Español](https://lmgroktfy.com/?lang=es) · 🇫🇷
[Français](https://lmgroktfy.com/?lang=fr) · 🇩🇪 [Deutsch](https://lmgroktfy.com/?lang=de) · 🇯🇵
[日本語](https://lmgroktfy.com/?lang=ja) · 🇸🇦 [العربية](https://lmgroktfy.com/?lang=ar)

## How to Use

1. **Ask a question** - Type your question in the search box and press Enter or click "Ask Grok"
2. **Get an answer** - Grok AI will respond with an answer
3. **Share it** - Copy the share link and send it to someone who needs the answer

### Sharing Links

You can create shareable links in two ways:

- **After asking**: Click "Copy Share Link" to get a URL that shows both your question and Grok's answer
- **Direct URL**: Add your question to the URL: `lmgroktfy.com/your+question+here`

When someone opens a shared link, they'll see your question automatically submitted with the answer displayed.

### Keyboard Shortcuts

| Key        | Action                  |
| ---------- | ----------------------- |
| `/` or `?` | Focus the search input  |
| `h`        | Open help               |
| `t`        | Toggle light/dark theme |
| `Esc`      | Close modal             |

**When an answer is displayed:**

| Key | Action                 |
| --- | ---------------------- |
| `c` | Copy answer            |
| `q` | Copy question + answer |
| `s` | Copy share link        |
| `g` | Continue on Grok       |

---

## For Developers

### Architecture

This is a TypeScript monorepo using Bun workspaces:

```plaintext
packages/
├── shared/     # Shared types, schemas (Zod), constants, utilities
├── client/     # Frontend application (TypeScript)
└── web/        # Cloudflare Worker serving API + static assets
```

### Key Design Decisions

- **Bun** - Package manager and runtime
- **TypeScript** - Strict mode enabled
- **Zod** - Single source of truth for API types
- **Cloudflare Workers** - Single worker serves entire site (API + assets)
- **Biome + Prettier** - Linting and formatting

## Development

### Prerequisites

- [Bun](https://bun.sh/) v1.0+

### Setup

```bash
# Install dependencies
bun install

# Start development server (uses wrangler)
bun run dev
```

### Local hooks

Point git at the tracked hooks once per clone (machine-local config that does not travel with the checkout):

```bash
git config core.hooksPath scripts/hooks
```

`pre-commit` runs fast, staged-scoped checks (Biome lint, Prettier check, actionlint, markdownlint). `pre-push` mirrors
CI (`bun run lint`, `typecheck`, `build`, `bun test`). Verify with `git config --get core.hooksPath` (expect
`scripts/hooks`).

### Commands

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `bun run dev`       | Start local dev server with wrangler |
| `bun run build`     | Build all packages                   |
| `bun test`          | Run tests                            |
| `bun run typecheck` | TypeScript type checking             |
| `bun run lint`      | Run Biome linter                     |
| `bun run lint:fix`  | Auto-fix lint issues                 |
| `bun run deploy`    | Build and deploy to Cloudflare       |

### Project Structure

```plaintext
lmgroktfy/
├── packages/
│   ├── shared/           # @lmgroktfy/shared
│   │   └── src/
│   │       ├── schemas/  # Zod schemas (API types)
│   │       ├── types/    # Inferred TypeScript types
│   │       ├── constants/# Shared constants
│   │       └── utils/    # Shared utilities
│   ├── client/           # @lmgroktfy/client
│   │   └── src/
│   │       ├── ui/       # UI utilities (DOM, visibility, transitions, a11y, viewport)
│   │       ├── managers/ # Feature managers (clipboard, theme, placeholder, focus, animation)
│   │       ├── i18n/     # Internationalization
│   │       └── api/      # API client
│   └── web/              # @lmgroktfy/web
│       └── src/
│           ├── api/      # API route handlers
│           ├── static/   # Static asset serving
│           └── middleware/ # CORS, security
├── locales/              # Translation files
├── scripts/              # Build scripts
└── package.json          # Workspace root
```

### Accessibility

- ARIA live regions for dynamic content updates
- Focus management for modal dialogs
- Accessible loading states and error messages
- Full keyboard navigation support

### Deployment

The `apps/web` Astro app builds to a single Cloudflare Worker (via the `@astrojs/cloudflare` adapter) and deploys to one
of two targets:

| Target     | Worker name         | Address                              | Command                  |
| ---------- | ------------------- | ------------------------------------ | ------------------------ |
| Staging    | `lmgroktfy-staging` | `lmgroktfy-staging.workers.dev`      | `bun run deploy:staging` |
| Production | `lmgroktfy`         | `lmgroktfy.com`, `www.lmgroktfy.com` | `bun run deploy:prod`    |

Production promotes **in place**: `deploy:prod` targets the existing `lmgroktfy` Worker that already holds the live
bindings and custom domains, so a release updates the running Worker instead of creating a second one that would collide
on the `lmgroktfy.com` custom domain. The top-level Wrangler config carries a throwaway `lmgroktfy-dev` name, so a bare
`wrangler deploy` with no environment can never land on production.

The adapter fixes the environment at build time through `CLOUDFLARE_ENV`; the deploy scripts set it and pass a matching
`--env`, so Wrangler refuses a build/deploy environment mismatch. Verify a target without publishing:

```bash
cd apps/web
CLOUDFLARE_ENV=staging bunx astro build && bunx wrangler deploy --env staging --dry-run
```

#### Secrets

Per-environment secrets are set out of band and never live in the config or in git:

```bash
wrangler secret put API_KEY --env staging
wrangler secret put API_KEY --env production
wrangler secret put TURNSTILE_SECRET_KEY --env staging
wrangler secret put TURNSTILE_SECRET_KEY --env production
```

#### Release flow

1. `bun run deploy:staging`, then verify `lmgroktfy-staging.workers.dev` (site renders, the API is gated, the cache
   serves a repeat question).
2. `bun run deploy:prod` promotes the verified build in place onto `lmgroktfy`.

#### Rollback

Production is one Worker, so a bad release reverts by restoring the last-known-good build:

- Fast path: `wrangler rollback --env production --message "<reason>"` reverts the production Worker to its previous
  version.
- From source: check out the last-known-good commit and run `bun run deploy:prod`.
- Confirm `lmgroktfy.com` serves the expected build before closing out the incident.

Keep the last-known-good build deployable so a rollback never depends on recovering deleted source.

The legacy worker under `packages/web` still deploys with `bun run deploy` until it is retired.

## Environment Variables

Set these in Cloudflare Workers dashboard or `.dev.vars` for local development:

| Variable      | Description          |
| ------------- | -------------------- |
| `XAI_API_KEY` | xAI API key for Grok |

## Testing

```bash
# Run all tests
bun test

# With coverage
bun test --coverage
```

Tests use Bun's built-in test runner with coverage reporting.

### Internationalization (i18n)

Translation files are in `locales/`. All 6 languages are at 100% completion.

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `bun run i18n:extract`  | Extract translatable strings from source files   |
| `bun run i18n:validate` | Validate all translations against English source |
| `bun run i18n:sync`     | Sync structure across all locale files           |
| `bun run i18n:status`   | Generate translation status report               |

## License

MIT License - see [LICENSE](LICENSE) for details.
