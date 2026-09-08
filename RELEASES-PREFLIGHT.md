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

| Sub-command     | What it checks                                                                                                                                                                                            | Source of truth                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `drift`         | What `main` carries that `dev` never received (delegates to `scripts/release/drift.sh`)                                                                                                                   | `git log`, `.github/`, lockfiles on both branches          |
| `surface`       | Commits + diff vs last tag, breaking markers                                                                                                                                                              | `git log`, `git diff`                                      |
| `mechanics`     | `bun run lint`, `format:check`, `typecheck`, `build`, `test:all`, `test:e2e`, then version and `CHANGELOG.md` sanity, the guarded-path leak check, unguarded docs added to `main`, diff-B vs `origin/dev` | `package.json` scripts, `scripts/release/guarded-paths.sh` |
| `surface-smoke` | Delegates to `scripts/release/surface-smoke.sh` against the deployed staging URL                                                                                                                          | `scripts/release/surface-smoke.sh`                         |
| `all`           | Every above, in order; `drift` runs first, since nothing else matters while `main` holds changes `dev` never received                                                                                     |                                                            |

Flags:

- `--staging-url URL`: override `https://dev.lmgroktfy.com` for `surface-smoke`.
- `--tag TAG`: override `LAST_TAG` resolution (default: `git tag --sort=-version:refname | head -n 1`).

Unlike a CLI repo, lmgroktfy's "real-world smoke" and its "surface smoke" are the same exercise: staging is a live
Cloudflare Worker sitting behind the real Turnstile widget and the real xAI API, so hitting `surface-smoke` against it
IS the live-dependency check, not a mock-bypassing stand-in for one.

## Establish the surface

Everything below assumes you know what's changing. Run this first.

Driven by `scripts/release/preflight.sh surface`.

```bash
LAST_TAG=$(git tag --sort=-version:refname | head -n 1)
git log "$LAST_TAG..dev" --oneline                              # commits going out
git diff "$LAST_TAG..dev" --stat                                # file-level scope
git log "$LAST_TAG..dev" --grep '^[a-z]\+\(([^)]*)\)\?!:' --oneline   # Conventional-Commits breaking markers, scoped or not
```

On a repo with no tags yet, or whose lineage is squash-only so no tag is an ancestor of `dev`, the surface is
`origin/main..origin/dev` instead of `$LAST_TAG..dev`; `preflight.sh surface` SKIPs the tag counts in that case.

Every `!:` commit drives the major-version decision and gets a row in the release's `### Breaking changes` section.

## Checklist

### Branch drift (main ahead of dev)

Driven by `scripts/release/preflight.sh drift` (delegates to `scripts/release/drift.sh`).

Security PRs, hotfixes, and config edits land on `main` first. The release branch is cut from `main` and then takes
`dev`'s changes, so anything `main` holds that `dev` never received is reverted by the release or collides with it, and
Dependabot raises the same fix again.

- [ ] The previous release's bookkeeping (`package.json` version, `CHANGELOG.md` section) is on `dev` (gate 0 fails
      when it never reached `dev`; run `scripts/sync-dev-after-release.sh v<previous>` and rerun).
- [ ] Every commit on `main` since the last release has its changes on `dev` (gate 1 lists the ones that do not, as
      `differs` or `missing`). Backport them by PR into `dev` first, merge, and rerun.
- [ ] `.github/` is identical on both branches (gate 2). A difference either way is a config change that only reached
      one branch; a `dev`-only change (a Bun pin bump, a Dependabot edit) ships with this release and clears on merge.
- [ ] No `bun.lock` package resolves newer on `main` than on `dev` (gate 3). The one benign case is a version still
      inside Bun's release-age window when the advisory is already patched at `dev`'s version.
- [ ] `dev`-newer packages are the routine updates this release ships; the gate counts them and does not list them.

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
