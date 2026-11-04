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

| Sub-command          | What it checks                                                                                                                                                                                            | Source of truth                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `drift`              | Commits on `main` since the last release whose changes `dev` lacks, `.github/` parity, lockfile packages `main` resolves newer                                                                            | `scripts/release/drift.sh`                                 |
| `surface`            | Commits since the last release reached `dev`, files changed since the last tag, breaking markers                                                                                                          | `git log`, `git diff`                                      |
| `surface-smoke`      | Delegates to `scripts/release/surface-smoke.sh` against the deployed staging URL; staging unreachable fails the gate                                                                                      | `scripts/release/surface-smoke.sh`                         |
| `changelog-sections` | No PR this release carries leaves its changelog entry to its title for want of a `## Changelog` section                                                                                                   | `generate-changelog.py --audit-sections`, `gh`             |
| `mechanics`          | `bun run lint`, `format:check`, `typecheck`, `build`, `test:all`, `test:e2e`, then the `CHANGELOG.md` stamp heading, the guarded-path leak check, unguarded docs added to `main`, diff-B vs `origin/dev`  | `package.json` scripts, `scripts/release/guarded-paths.sh` |
| `all`                | Every above, in order; `drift` runs first, since nothing else matters while `main` holds changes `dev` never received                                                                                     |                                                            |

Flags:

- `--staging-url URL`: override the staging URL for `surface-smoke` (default: `STAGING_URL_DEFAULT` in
  `scripts/release/release.env`, `https://dev.lmgroktfy.com`).
- `--tag TAG`: override `LAST_TAG` resolution (default: the newest `v[0-9]*` tag).

Unlike a CLI repo, lmgroktfy's "real-world smoke" and its "surface smoke" are the same exercise: staging is a live
Cloudflare Worker sitting behind the real Turnstile widget and the real xAI API, so hitting `surface-smoke` against it
IS the live-dependency check, not a mock-bypassing stand-in for one.

## Establish the surface

Everything below assumes you know what's changing. Run this first.

Driven by `scripts/release/preflight.sh surface`.

```bash
LAST_TAG=$(git tag --list 'v[0-9]*' --sort=-version:refname | head -n 1)
# The commit that synced the tag back into dev opens dev's window.
SINCE=$(git log origin/dev --format='%H %s' \
  | grep -E -m1 "^[0-9a-f]+ chore\(release\): (sync dev after|backport) ${LAST_TAG//./\\.}( |$)" | cut -d' ' -f1)
git log "$SINCE..origin/dev" --oneline                          # commits going out
git diff "$LAST_TAG" origin/dev --name-only \
  | grep -Ev "$(scripts/release/guarded-paths.sh)"              # file-level scope: what ships
git log "$SINCE..origin/dev" --grep '^[a-z]\+\(([^)]*)\)\?!:' --oneline   # Conventional-Commits breaking markers, scoped or not
```

Every release squash-merges into `main`, so the tag shares no recent history with `dev`, and a log from the tag counts
`dev`'s whole past. The window opens at the commit that synced the tag back into `dev`, whose subject reads
`chore(release): sync dev after v<version>`. The file list compares trees, so it reads from the tag directly, minus the
guarded set `dev` carries but never ships. In a repo whose tag is an ancestor of `dev`, the window is
`$LAST_TAG..origin/dev`. With no tags yet, or no commit syncing the tag back, `preflight.sh surface` SKIPs, and the
surface is `origin/main..origin/dev`. `generate-changelog.py`'s section, not this count, is the complete list of PRs the
release carries.

Every `!:` commit drives the major-version decision and gets a row in the release's `### Breaking changes` section.

## Checklist

### Branch drift (main ahead of dev)

Driven by `scripts/release/preflight.sh drift` (delegates to `scripts/release/drift.sh`).

Security PRs, hotfixes, and config edits land on `main` first. The release branch is cut from `main` and then takes
`dev`'s changes, so anything `main` holds that `dev` never received is reverted by the release or collides with it, and
Dependabot raises the same fix again.

<!-- canonical:begin drift-gate -->

- [ ] The previous release's own bookkeeping reached `dev` (gate 0).

  Gate 0 checks the version carriers and `CHANGELOG.md` as the release left them. It fails when a backport never ran;
  run `scripts/sync-dev-after-release.sh v<previous>`, merge its PR, and rerun.

- [ ] Every commit on `main` since the last release has its changes on `dev` (gate 1).

  Gate 1 lists each commit that does not, as `differs` or `missing`. Backport them by PR into `dev` first, merge, and
  rerun.

- [ ] Nothing under `.github/` on `main` is missing from `dev` (gate 2).

  `.github/` reaches `main` through the release, so config that has reached `dev` and not `main` is what this release
  delivers, and the gate counts it. The gate fails on the other direction, where `main` holds workflow or ruleset
  config `dev` never received, and names each path as `missing` or `differs`.

- [ ] No lockfile package resolves newer on `main` than on `dev` (gate 3).

  Gate 3 reads `package-lock.json`, `bun.lock`, and `Cargo.lock`. The one benign case is a version still inside the
  local package manager's release-age window when the advisory is already patched at `dev`'s version.

- [ ] `dev`-newer packages are the routine updates this release ships; the gate counts them and does not list them.

<!-- canonical:end drift-gate -->

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
staging first if it hasn't already been deployed (`bun run deploy:staging`): an unreachable staging Worker fails the
gate.

Cloudflare Access gates staging: a request without credentials gets `302` to the Access login, which the transport gate
fails, and every other gate reads that redirect too. `surface-smoke.sh` sends the staging service token's
`CF-Access-Client-Id` and `CF-Access-Client-Secret` headers when `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are
both set and the target is exactly `STAGING_URL_DEFAULT`, through a pipe to curl rather than argv or a file. Any other
target gets no headers and a warning: Access strips them on staging before the Worker runs, and nothing strips them on
production. For the same reason the smoke first sends one request without them and withholds the token unless Access
answers. `preflight.sh` unsets both variables at start and passes them only to the smoke, so the same prefix works for
`all`. `postflight.sh` passes them to everything it starts, so give them only to its `surface-smoke` subcommand. Set
them for the one command, so the values never stay in the shell:

```bash
# 3pjk4ix2jxratdogd6viheavoi: CF Service Token - Surface Smoke (lmgroktfy), vault secrets-dev
CF_ACCESS_CLIENT_ID="$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_id")" \
  CF_ACCESS_CLIENT_SECRET="$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_secret")" \
  scripts/release/preflight.sh surface-smoke
```

A browser passes Access by signing in. A `curl` of staging needs the same two headers: without them it reads the Access
login's `302`. For the manual checks below, run `scripts/release/staging-check.sh <check>`. Each check names its own
paths on `STAGING_URL_DEFAULT` and takes no other argument. It confirms Access still answers each path without the
token, then reads the token and sends it through a pipe behind `curl -q`, and prints only a status and a verdict.

Access issues a `CF_Authorization` cookie, a bearer credential, when it admits the service token. Nothing in these
scripts prints it.

- [ ] `GET https://dev.lmgroktfy.com/` returns `200` and serves the Astro build with the staging Turnstile site key
  baked in: `scripts/release/staging-check.sh site-key`.
- [ ] Tokenless `POST https://dev.lmgroktfy.com/api/grok` returns `403` (fail-closed; matches the production contract).
- [ ] `llms.txt`, `.well-known/agent.json`, `.well-known/security.txt`, `sitemap.xml`, `robots.txt`, and at least one
  locale's `index.md` twin all return `200` with the expected content type. The smoke covers all but `agent.json`:
  `scripts/release/staging-check.sh agent-json`.

- [ ] Manual real-challenge check: in a browser at `https://dev.lmgroktfy.com`, solve the live Turnstile challenge,
  submit a question, confirm an answer renders. Cannot be automated: a managed challenge has no headless solve path.
- [ ] Second identical question on staging serves the cached answer (KV `ANSWER_CACHE` hit). Already asserted by
  `bun run test:e2e`; re-confirm manually if the cache layer changed this release.
- [ ] Security headers present with no HSTS on staging, on both delivery paths: `/` from the asset layer's `_headers`,
  where `CLOUDFLARE_ENV=staging` leaves HSTS out, and a question path from the Worker's middleware, which sends HSTS
  only on the production domains. `scripts/release/staging-check.sh security-headers` expects
  `HTTP 200, security headers 6/6, HSTS absent` on each. Only a `200` shows the request passed Access, because the
  login's `302` carries no HSTS either.

### Release mechanics sanity

Driven by `scripts/release/preflight.sh mechanics`.

These items duplicate steps in `RELEASES.md` deliberately: easy to skip, expensive to recover from. Confirm explicitly.

- [ ] `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run build`, and `bun run test:all` all pass
  locally against the release branch (`release.yml`'s integrity gate does not re-run these; CI on the release PR to
  `main` does, but confirm before opening it).
- [ ] The release branch is named for the deploy stamp `scripts/release/site-version.sh` prints for the `dev` commit
  the cut overlaid (`RELEASES.md` § Versioning). No file carries the version, so nothing is bumped.
- [ ] Every PR this release carries offers a `## Changelog` section (`scripts/release/preflight.sh changelog-sections`
  runs `scripts/generate-changelog.py --audit-sections`; a section left empty on purpose passes).
- [ ] Bun toolchain pin (`bun-version: 1.4.0` in `.github/workflows/test.yml` and `canary.yml`) last bumped ≥7 days ago
  (supply-chain quarantine). If a bump landed inside the window, hold or revert it before tagging.
- [ ] No advisory this release should fix: `bun audit` reads every package in `bun.lock`, and open Dependabot alerts
  (`gh api repos/<owner>/<repo>/dependabot/alerts`) cover only the direct dependencies in `package.json`. Dependabot
  opens no security updates for Bun, so each fix is a manual bump.
- [ ] Triple-diff verification before tag: `git diff origin/main..HEAD`, `git diff HEAD..origin/dev` filtered by the
  guarded set (not all of `docs/`, since `docs/runbooks/` ships to `main` and would hide a missed pick),
  `git diff origin/dev..origin/main` (sanity): all three agree on intended scope.
- [ ] **Leak check before pushing the release branch.** No guarded path may surface in the diff vs `origin/main`. The
  set resolves from `.github/workflows/guard-main-docs.yml` via `scripts/release/guarded-paths.sh`; never restate the
  pattern inline. If cherry-picks pulled in guarded paths via rename detection, resolve per `RELEASES.md` § Cherry-pick
  conflicts on guarded paths.

  ```bash
  GUARDED="$(scripts/release/guarded-paths.sh)"
  git diff origin/main..HEAD --name-only | grep -E "$GUARDED" && echo "LEAKED: reset and redo" || echo "(clean)"
  ```

- [ ] **Every doc this release adds to `main` is meant to ship.** The leak check is blind to a category nobody
  registered. `git diff origin/main..HEAD --diff-filter=A --name-only | grep -E '(^docs/|\.md$)' | grep -Ev "$GUARDED"`
  lists the unguarded additions; each one needs a reason to ship (`docs/runbooks/` does by design), or it gets
  registered in the workflow's `extra_paths` and removed from the branch.
- [ ] `CHANGELOG.md` versioned section has no `[Unreleased]` placeholder, and its heading is the deploy stamp:
  `scripts/release/site-version.sh --verify v<version>` passes (`preflight.sh mechanics` runs it).

### Post-tag verification

Moved to [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md) because tagging happens **after** the release-branch cut
and PR-to-main merge, so verification of the tag-triggered pipeline (`release.yml` → GitHub Release) and the manual
production cutover are post-flight, not pre-flight. Run `scripts/release/postflight.sh all` immediately after
`git push origin v<version>`.

## Related docs

- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md). Runs AFTER the tag push to verify the downstream pipeline.
- [`RELEASES.md`](./RELEASES.md). Operational runbook this checklist gates.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md). Release-flow rationale.
- [`AGENTS.md`](./AGENTS.md). Project structure, transport contract.
- [`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md). Cutover and rollback runbook
  (the source of the staging pre-cutover checklist referenced above).
