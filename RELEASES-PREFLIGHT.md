# Pre-release verification: `lmgroktfy`

Operational pre-flight checklist. Runs **before** step 1 of
[`RELEASES.md` § Releasing dev to main](./RELEASES.md#releasing-dev-to-main). Gates the cut of the `release/v<version>`
branch, not the daily dev integration. Each box is an explicit go/no-go. If any item is unchecked or red, hold the
release.

CI (`.github/workflows/test.yml`) catches mechanical regressions inside the repo. This checklist covers what CI
structurally can't:

- Behavioral drift against the real xAI (Grok) API or Cloudflare Turnstile `siteverify`.
- The real, non-headless Turnstile challenge on staging: a managed challenge cannot be solved by an automated agent, so
  this path is verified by hand.
- Behavior that only exists on the deployed Worker: KV-backed answer cache, the rate limiter binding, security headers
  baked in at build time by `CLOUDFLARE_ENV`.

Post-tag verification (`release.yml` → GitHub Release → manual production cutover) lives in
[`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md). The tag push happens AFTER the release-branch cut and the
PR-to-main merge, so verification of the tag-triggered pipeline is post-flight, not pre-flight.

## Quick start: run the automated gates

```bash
bun install --frozen-lockfile
scripts/release/preflight.sh all
```

`scripts/release/preflight.sh` is project-authored: it wraps the commands below into gated, scriptable subcommands. The
recipes in this checklist are the manual fallback and the contract each subcommand implements.

| Sub-command     | What it checks                                                                                 | Source of truth                                   |
| --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `surface`       | Commits + diff vs last tag, route/endpoint surface, breaking markers                           | `git log`, `git diff`                             |
| `mechanics`     | `bun run lint`, `format:check`, `typecheck`, `build`, `test:all` (unit)                        | `package.json` scripts                            |
| `e2e`           | Playwright `test:e2e` against a local dev instance                                             | `apps/web/tests`, `apps/web/playwright.config.ts` |
| `surface-smoke` | Delegates to `scripts/release/surface-smoke.sh --env staging` against the deployed staging URL | `scripts/release/surface-smoke.sh`                |
| `all`           | Every above, in order                                                                          |                                                   |

Unlike a CLI repo, lmgroktfy's "real-world smoke" and its "surface smoke" are the same exercise: staging is a live
Cloudflare Worker sitting behind the real Turnstile widget and the real xAI API, so hitting `surface-smoke` against it
IS the live-dependency check, not a mock-bypassing stand-in for one.

## Establish the surface

Everything below assumes you know what's changing. Run this first.

```bash
LAST_TAG=$(git tag --sort=-version:refname | head -n 1)
git log "$LAST_TAG..dev" --oneline                              # commits going out
git diff "$LAST_TAG..dev" --stat                                # file-level scope
git log "$LAST_TAG..dev" --grep '^[a-z]\+!:' --oneline          # Conventional-Commits breaking markers
```

Every `!:` commit drives the major-version decision and gets a row in the release's `### Breaking changes` section.

## Checklist

### Route and agent-surface contract

lmgroktfy's public contract is the union of its rendered pages, the `/api/grok` endpoint, and its agent-facing surface:
`llms.txt`, `.well-known/agent.json`, `.well-known/security.txt`, the per-locale `index.md` markdown twins,
`sitemap.xml`, and `robots.txt`.

- [ ] Diff the route list vs the previous release (`apps/web/src/pages/**`, `.well-known/[...path].ts`'s `ROUTES` map).
  Any removed or renamed route has a `!:` commit and a `### Changed` (or `### Breaking changes`) bullet in the release
  changelog.
- [ ] `llms.txt`, `.well-known/agent.json`, and the locale `index.md` twins still describe the actual locale set
  (`SUPPORTED_LOCALES` in `@lmgroktfy/shared`) and route shape.

### Real-world smoke (staging, live dependencies)

Driven by `scripts/release/preflight.sh surface-smoke` against `https://dev.lmgroktfy.com`. Deploy the release branch to
staging first if it hasn't already been deployed (`bun run deploy:staging`).

- [ ] `GET https://dev.lmgroktfy.com/` returns `200` and serves the Astro build with the staging Turnstile site key
  baked in.
- [ ] Tokenless `POST https://dev.lmgroktfy.com/api/grok` returns `403` (fail-closed; matches the production contract).
- [ ] `llms.txt`, `.well-known/agent.json`, `.well-known/security.txt`, `sitemap.xml`, `robots.txt`, and at least one
  locale's `index.md` twin all return `200` with the expected content type.
- [ ] Manual real-challenge check: in a browser at `https://dev.lmgroktfy.com`, solve the live Turnstile challenge,
  submit a question, confirm an answer renders. Cannot be automated: a managed challenge has no headless solve path.
- [ ] Second identical question on staging serves the cached answer (KV `ANSWER_CACHE` hit). Already asserted by `bun
  run test:e2e`; re-confirm manually if the cache layer changed this release.
- [ ] Security headers present with no HSTS on staging (`CLOUDFLARE_ENV=staging` never emits it):

  ```bash
  curl -s -D - -o /dev/null https://dev.lmgroktfy.com/ | grep -i strict-transport   # expect no output
  ```

### Release mechanics sanity

Driven by `scripts/release/preflight.sh mechanics`.

These items duplicate steps in `RELEASES.md` deliberately: easy to skip, expensive to recover from. Confirm explicitly.

- [ ] `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run build`, and `bun run test:all` all pass
  locally against the release branch (`release.yml`'s integrity gate does not re-run these; CI on the release PR to
  `main` does, but confirm before opening it).
- [ ] Version bumped to the new tag value in the root `package.json` (`release.yml`'s integrity gate enforces this;
  catch early).
- [ ] `bun.lock` regenerated (`bun install`), committed.
- [ ] Every PR merged since `$LAST_TAG` has a non-empty `## Changelog` section. Spot-check via `gh pr list --base dev
  --state merged --search "merged:>$(git log -1 --format=%aI $LAST_TAG)"` then `gh pr view <num> --json body`.
- [ ] Bun toolchain pin (`bun-version: 1.4.0` in `.github/workflows/test.yml`, `canary.yml`, and
  `dependabot-lockfile.yml`) last bumped ≥7 days ago (supply-chain quarantine). If a bump landed inside the window, hold
  or revert it before tagging.
- [ ] No open Dependabot security-advisory PRs against `dev` (`gh pr list --state open --label dependencies`, or `gh api
  repos/<owner>/<repo>/dependabot/alerts` if alerts are enabled).
- [ ] Triple-diff verification before tag: `git diff origin/main..HEAD`, `git diff HEAD..origin/dev` (no non-doc paths),
  `git diff origin/dev..origin/main` (sanity): all three agree on intended scope.
- [ ] Leak check: `git diff origin/main..HEAD --name-only | grep -E
  '^(docs/architecture|docs/brainstorms|docs/ideation|docs/plans|docs/research|docs/reviews|docs/solutions|\.context)'`
  returns nothing. If cherry-picks pulled in guarded paths via rename detection, resolve per `RELEASES.md` § Cherry-pick
  conflicts on guarded paths.
- [ ] `CHANGELOG.md` versioned section has no `[Unreleased]` placeholder and matches the bumped version.

### Post-tag verification

Moved to [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md) because tagging happens **after** the release-branch cut
and PR-to-main merge, so verification of the tag-triggered pipeline (`release.yml` → GitHub Release) and the manual
production cutover are post-flight, not pre-flight. Run `scripts/release/postflight.sh all` immediately after `git push
origin vX.Y.Z`.

## Related docs

- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md). Runs AFTER the tag push to verify the downstream pipeline.
- [`RELEASES.md`](./RELEASES.md). Operational runbook this checklist gates.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md). Release-flow rationale.
- [`AGENTS.md`](./AGENTS.md). Project structure, transport contract.
- [`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md). Cutover and rollback runbook
  (the source of the staging pre-cutover checklist referenced above).
