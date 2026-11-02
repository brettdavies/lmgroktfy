# Post-release verification: `lmgroktfy`

Operational post-flight checklist. Runs **after** the `release/v<version> → main` PR merges and you push the tag (`git
push origin vX.Y.Z`) per [`RELEASES.md` § Tagging and publishing](./RELEASES.md#tagging-and-publishing). Verifies that
`release.yml` landed cleanly and that the GitHub Release is the record it should be. Production deployment is a
separate, human-gated step covered in [§ Production cutover](#production-cutover-manual-human-gated) below; it is not
part of the automated tag-triggered pipeline.

Companion to [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md), which gates the release-branch cut. Both docs follow
the same go/no-go shape: every box is explicit, an unchecked or red item holds the next release (or motivates a hotfix).

## Quick start: run the automated gates

```bash
scripts/release/postflight.sh all                        # tag, release.yml, and the GitHub Release itself
scripts/release/postflight.sh --env staging surface-smoke # any time after bun run deploy:staging
scripts/release/postflight.sh --env prod surface-smoke    # only after bun run deploy:prod (manual, human-gated)
```

`scripts/release/postflight.sh` is vendored verbatim from the github-repo-setup template and covers the automatable
post-tag gates: `release.yml`'s conclusion, the GitHub Release's state and `releases/latest`, the `main → dev` backport
check, and an optional surface-smoke against a deployed env. The template also carries Homebrew-tap, finalize, crates.io,
and workspace-tag gates for Rust CLIs. lmgroktfy has no Homebrew tap and no package registry. `crates` and `tags` SKIP
here (no `Cargo.toml`), and so does `finalize` (no `finalize-release.yml` run). `tap` does not: it matches runs on the
shared `brettdavies/homebrew-tap` by name and start time only, so once any other CLI's formula bump runs after this
release, `tap` passes on that run. A `tap` pass here always describes another repository's release; ignore it.

**`--env staging|prod` selects which deployed URL `surface-smoke` targets, and whether `backport` runs.** The
release-pipeline gates are single-environment (they check `main`, the tag, and the Release once); `backport` is
prod-only and SKIPs under `--env staging`. `--env staging`
runs any time staging needs re-verification (typically right before cutting `release/*`, per `RELEASES-PREFLIGHT.md`).
`--env prod` runs only after a human has actually executed `bun run deploy:prod`. The release/* → main merge does
**not** trigger a production deploy, so running `--env prod` before that manual step just confirms the previous
production build is still healthy, not that this release shipped.

Sub-commands let you re-run one verification in isolation:

| Sub-command     | What it checks                                                                                                           | Source of truth                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `release`       | `release.yml` on the tag push concluded `"success"`                                                                      | `gh run list`, `gh run view`              |
| `tap`           | Homebrew-tap `update-formula` and `Publish formula` runs since `release.yml` started (a pass here is another repo's run) | `gh run list -R brettdavies/homebrew-tap` |
| `finalize`      | `finalize-release.yml` callback ran (SKIPs here: lmgroktfy has no finalize workflow)                                     | `gh run list`                             |
| `make-latest`   | GitHub Release `vX.Y.Z` is published (not a draft, not a prerelease) and `releases/latest` resolves to it                | `gh release view`, `gh api`               |
| `crates`        | crates.io shows the crate at the tag's version (SKIPs here: no `Cargo.toml`)                                             | `cargo search`                            |
| `tags`          | every workspace member the release moved is tagged on the release commit (SKIPs here: no `Cargo.toml`)                   | `git tag`, `cargo metadata`               |
| `backport`      | a merged PR to `dev` with the tag in its title (prod only; SKIPs under `--env staging`)                                  | `gh pr list --base dev --state merged`    |
| `surface-smoke` | Delegates to `scripts/release/surface-smoke.sh` against the env's deployed URL                                           | `scripts/release/surface-smoke.sh`        |
| `all`           | every above, in order; `surface-smoke` targets the `--env` URL (default `prod`) and SKIPs when it is unreachable         | all of the above                          |

Flags:

- `--env staging|prod`: which deployed URL `surface-smoke` targets (default: `prod`). Pass `--env staging` before the
  manual cutover, since `prod` only reflects this release after `bun run deploy:prod`.
- `--repo OWNER/REPO`: override the auto-detected nameWithOwner.
- `--tag vX.Y.Z`: override auto-detection (default: derived from the root `package.json` version, falls back to the
  latest git tag).
- `--staging-url URL`: override the staging URL for `surface-smoke` (default: `STAGING_URL_DEFAULT` in
  `scripts/release/release.env`, `https://dev.lmgroktfy.com`).
- `--prod-url URL`: override the prod URL for `surface-smoke` (default: `PROD_URL_DEFAULT` in
  `scripts/release/release.env`, `https://lmgroktfy.com`).
- `--tap-repo OWNER/REPO` and `--crate NAME` drive the Rust-CLI gates and have no use here.

## Checklist

Run immediately after the tag push triggers `release.yml`.

- [ ] **`release.yml` green end-to-end.** `gh run watch <id> --exit-status` then verify with `gh run view <id> --json
  conclusion --jq .conclusion` because the watcher exit code alone is not authoritative (a completed watcher is not a
  green watcher). Runs the integrity gate (tag format, reachable from `main`, matches `package.json` version), then
  creates the GitHub Release. Run `scripts/release/postflight.sh release` for the automated check.
- [ ] **GitHub Release exists, is published (not draft), and is latest.** `gh api
  repos/<owner>/<repo>/releases/tags/vX.Y.Z --jq '{draft, tag_name}'`, expect `draft: false`. Single-channel:
  `release.yml` publishes the Release directly, so there is no `make_latest: false → true` flip to wait for and
  `releases/latest` resolves to the tag at once. Run `scripts/release/postflight.sh make-latest` for the automated
  check.
- [ ] **Release notes match the tagged version.** The Release body is extracted from the `CHANGELOG.md` section whose
  heading contains the tag's version string, not the first `## [` heading in the file. Confirm they match verbatim.
- [ ] **Last-good identifier recorded.** Before `bun run deploy:prod`, note the active production Version ID
  (`bunx wrangler deployments list --env production`) somewhere reachable under incident pressure, so a rollback is a
  single command. See [`RELEASES.md` § Rollback](./RELEASES.md#rollback).
- [ ] **Rollback path confirmed.** If this release is bad, roll back at the Worker first (`bunx wrangler rollback --env
  production`, or `bunx wrangler versions deploy <VERSION_ID> --env production`), then land a `fix` or `revert` through
  the normal `dev` to `release/*` to `main` flow so `main` reconverges with what is live.
- [ ] **Backport `main` → `dev`** via a **merged PR to `dev` with the version in its title.** Bring the release-only
  changes (`CHANGELOG.md`, the root `package.json` version, and any edit made on the release branch) across to `dev` so
  the next release's `RELEASES-PREFLIGHT.md` drift and diff-B gates stay quiet. The script adopts the release-prep edits
  it discovers since the previous tag and lists contested paths (ones `dev` also changed) without taking them: run it
  with `--dry-run` first to see both lists without creating a branch, then name the contested paths to take with
  `--only PATH` (see [`RELEASES.md` § After publish](./RELEASES.md#after-publish-sync-dev-with-the-release)).
  `scripts/release/postflight.sh backport` looks for the merged PR alone; the only requirement is the tag (`vX.Y.Z`) in
  the PR title.

  ```bash
  scripts/sync-dev-after-release.sh v<X.Y.Z> --dry-run   # previews the sync; no branch, clean tree
  scripts/sync-dev-after-release.sh v<X.Y.Z>             # opens the PR against dev; merge once CI is green
  ```

- [ ] **Staging surface smoke.** `scripts/release/postflight.sh --env staging surface-smoke` (or the manual recipes in
  `RELEASES-PREFLIGHT.md` § Real-world smoke) against `https://dev.lmgroktfy.com`, to confirm staging still reflects a
  healthy build. This does not depend on today's tag having deployed anywhere; it is a standing health check.

## Production cutover (manual, human-gated)

Production deployment is not triggered by the tag, the release PR merge, or `release.yml`. It happens when a human
operator runs it, following [`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md):

- [ ] Pre-cutover checklist in the runbook is green (staging live with the real Turnstile challenge solved by hand,
  production secrets set, rollback Version ID captured).
- [ ] `bun run deploy:prod` run.
- [ ] Post-cutover verification in the runbook passes: `https://lmgroktfy.com/` returns `200` with the production
  Turnstile site key, tokenless `POST /api/grok` returns `403`, HSTS is present.
- [ ] Manual real-challenge check against `https://lmgroktfy.com` and one canary run (`CANARY_XAI_API_KEY=... bun run
  scripts/canary.ts`) as an end-to-end probe.
- [ ] `scripts/release/postflight.sh --env prod surface-smoke` run against `https://lmgroktfy.com` once the cutover is
  live.

The deployed-env smoke catches regressions that only surface at the edge: rate-limiter bindings, KV-backed cache
behavior, and binding drift between `apps/web/wrangler.jsonc` and the live deployment. The staging smoke above cannot
reach these because the production Worker's bindings (rate limits, KV namespace ids) are distinct from staging's.

## Related docs

- [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md): pre-cut go/no-go checklist (runs BEFORE this one).
- [`RELEASES.md`](./RELEASES.md): operational runbook for the full release lifecycle.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md): release-flow rationale.
- [`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md): production cutover and
  rollback runbook.
