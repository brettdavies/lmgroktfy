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

Deployed to Cloudflare Workers:

```bash
bun run deploy
```

This builds all packages and deploys the worker with static assets.

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
