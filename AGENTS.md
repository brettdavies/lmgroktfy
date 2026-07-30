---
name: lmgroktfy
description: Accessible, multi-language web UI over Grok AI (i18n, keyboard navigation, screen-reader support) served from Cloudflare Workers.
homepage: https://lmgroktfy.com
repository: https://github.com/brettdavies/lmgroktfy
---

# lmgroktfy

Agent-facing conventions for this repository. Read [`README.md`](README.md) for user-facing usage and
[`PROJECT.md`](PROJECT.md) for the high-level overview.

## What this repository is

LMGROKTFY ("Let Me Grok That For You") is a public, accessibility-first web app that forwards a question to Grok AI and
renders a shareable answer. It supports six languages, full keyboard navigation, and screen-reader semantics, and runs
on Cloudflare Workers.

A Bun workspaces monorepo:

| Workspace           | Role                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`          | Astro app on Cloudflare Workers (`@astrojs/cloudflare`): prerendered pages, the SSR `/api/grok` endpoint, URL-routed i18n, and the interactive island |
| `@lmgroktfy/shared` | Zod schemas, types, and constants shared with the app                                                                                                 |

`bun run build` builds `@lmgroktfy/shared`, then the Astro app (`astro build`) into a single Cloudflare Worker via the
`@astrojs/cloudflare` adapter. `apps/web` runs under `astro dev`.

## Bun + Biome + Wrangler + Tailwind conventions

- Package manager and test runner: Bun. Install with `bun install --frozen-lockfile`; commit `bun.lock`. `bunfig.toml`
  sets `exact = true`, so new dependencies pin exact versions.
- Lint: Biome (`bun run lint`) over the packages; `apps/web` is checked by `astro check`. Format: Prettier (`bun run
  format`) with `prettier-plugin-astro` for `.astro` and `prettier-plugin-tailwindcss` for class sorting. Prettier owns
  `apps/web` formatting because Biome cannot format `.astro`.
- Styling: Tailwind v4 (`@tailwindcss/vite`) plus daisyUI.
- Typecheck: `bun run typecheck` runs `tsc --noEmit` over `packages/shared` and `astro check` over `apps/web`.
- Deploy: Wrangler per environment (`bun run deploy:staging` / `bun run deploy:prod`). Cloudflare Workers only, never
  Cloudflare Pages; a Pages reference is a bug.

## Deploying the Astro app

`apps/web` (the Astro app) builds to one Cloudflare Worker via the `@astrojs/cloudflare` adapter and targets two
environments defined in `apps/web/wrangler.jsonc`:

- **Staging** — Worker `lmgroktfy-staging` on the `dev.lmgroktfy.com` custom domain (workers.dev is disabled; Turnstile
  refuses to issue a widget on the shared `*.workers.dev` zone). `bun run deploy:staging`.
- **Production** — Worker `lmgroktfy` on the `lmgroktfy.com` / `www.lmgroktfy.com` custom domains. `bun run
  deploy:prod`.

`[env.production].name` is pinned to `lmgroktfy` so `--env production` promotes the existing Worker in place; a distinct
`lmgroktfy-production` Worker would collide on the `lmgroktfy.com` custom domain. The top-level `name` is a throwaway
`lmgroktfy-dev`, so a bare `wrangler deploy` with no `--env` cannot reach production — always select an environment.

The adapter fixes the environment at build time via `CLOUDFLARE_ENV`, not the deploy-time `--env` flag; the deploy
scripts set `CLOUDFLARE_ENV` and pass a matching `--env` so Wrangler rejects a build/deploy environment mismatch.
Dry-run a target from `apps/web` with `CLOUDFLARE_ENV=<env> bunx astro build && bunx wrangler deploy --env <env>
--dry-run`.

Secrets (`API_KEY`, `TURNSTILE_SECRET_KEY`) are per-environment and set with `wrangler secret put <NAME> --env <env>` —
never in `wrangler.jsonc` or git. Staging and production carry distinct rate-limit and KV namespace ids so the two
Workers never share state while both exist.

Rollback: `wrangler rollback --env production --message "<reason>"` reverts the production Worker to its previous
version; alternatively redeploy the last-known-good build with `bun run deploy:prod`. Keep that build deployable so a
rollback never waits on recovering deleted source.

## Internationalization

Translations are managed by the `i18n:*` scripts:

- `bun run i18n:extract` pulls translatable strings from source.
- `bun run i18n:validate` checks catalog completeness.
- `bun run i18n:sync` reconciles translation files.
- `bun run i18n:status` reports coverage per locale.

Keep every supported locale in sync; accessibility and i18n are product commitments, not optional polish.

## Testing

`bun test` runs the TypeScript tests under `packages/` (`bunfig.toml` scopes the test root to `./packages`). The
`apps/web` unit tests live outside that root, so `bun run test:app` runs them explicitly and `bun run test:all` runs the
package suite followed by the app suite. Playwright end-to-end tests live in `apps/web/tests/e2e` and run with `bun run
test:e2e`. CI and the pre-push hook run the full set (see below).

## CI

`.github/workflows/test.yml` (workflow `CI`, job `test`) runs on pull requests into `dev` and `main`: install, Biome
lint, Prettier format check, typecheck, build, unit tests, and Playwright end-to-end (Chromium installed explicitly).
Actions are SHA-pinned with a `# vX.Y.Z` trailing comment; keep them pinned. There is no `push` trigger — under squash
merges the merge commit's tree equals the PR head CI already verified.

`.github/workflows/dependabot-lockfile.yml` (workflow `Dependabot lockfile sync`) runs only on Dependabot PRs (`if:
github.actor == 'dependabot[bot]'`). It regenerates `bun.lock` against the bumped `package.json` and commits it back via
the shared `brettdavies/.github/actions/reconcile-lockfile` composite action, so the `test` check passes without a
hand-reconciled lockfile. See Dependencies for the token it pushes with.

## Local hooks

Hooks live at `scripts/hooks/`, activated per clone with `git config core.hooksPath scripts/hooks` (machine-local; does
not travel with the checkout). `pre-commit` runs fast staged-scoped checks (Biome, Prettier incl. `.astro`, actionlint,
markdownlint); `pre-push` mirrors CI (`lint`, `format:check`, `typecheck`, `build`, `test:all`, Playwright e2e,
actionlint, shellcheck). Keep the pre-push checks in lockstep with `test.yml`.

## Branch and release model

- `dev` is the default branch and the forever integration branch; it is never a PR head. Feature branches (`feat/*`,
  `fix/*`) cut from `dev` and squash-merge back into `dev`.
- `main` is the production/release branch. Releases cut a `release/*` branch from `origin/main`, cherry-pick the
  non-docs commits from `dev`, and PR to `main`.
- Conventional Commits. No AI attribution in commit messages or PR bodies.

## Dependencies

Dependabot (`.github/dependabot.yml`) scans npm and github-actions weekly with a 7-day cooldown and targets `dev`. It
never proposes major-version bumps; security updates are a separate path and still land. Bump majors deliberately, by
hand.

Dependabot bumps `package.json` but does not reconcile `bun.lock`, so a plain `bun install --frozen-lockfile` fails on
every Dependabot PR. `dependabot-lockfile.yml` (see CI) regenerates and commits the lockfile automatically. The
reconcile push needs a fine-grained PAT with `Contents: write`, stored as the `DEPENDABOT_RECONCILE_TOKEN` Dependabot
secret (`gh secret set DEPENDABOT_RECONCILE_TOKEN --app dependabot`), because Dependabot-triggered runs cannot read
Actions secrets and a `GITHUB_TOKEN` push would not re-trigger the required `test` check.
