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

`scripts/release/postflight.sh` covers the automatable post-tag gates: the tag's integrity, `release.yml`'s conclusion,
the GitHub Release's existence and notes, the `main → dev` backport check, and an optional surface-smoke against a
deployed env. There is no `tap`, `finalize`, or registry-publish gate: lmgroktfy has no Homebrew tap and no package
registry, so `release.yml` has nothing downstream of the GitHub Release to verify.

**`--env staging|prod` selects which deployed URL `surface-smoke` targets, not which release-pipeline gates run.** The
tag/release/backport gates are single-environment (they check `main`, the tag, and the Release once). `--env staging`
runs any time staging needs re-verification (typically right before cutting `release/*`, per `RELEASES-PREFLIGHT.md`).
`--env prod` runs only after a human has actually executed `bun run deploy:prod`. The release/* → main merge does
**not** trigger a production deploy, so running `--env prod` before that manual step just confirms the previous
production build is still healthy, not that this release shipped.

Sub-commands let you re-run one verification in isolation:

| Sub-command         | What it checks                                                                                         | Source of truth                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `tag`               | `vX.Y.Z` tag exists, is reachable from `main`, and equals the root `package.json` version              | `git tag --merged main`, `package.json`            |
| `release`           | `release.yml` on the tag push concluded `"success"`                                                    | `gh run view`                                      |
| `release-published` | GitHub Release `vX.Y.Z` exists, is not a draft, and its body matches the tagged `CHANGELOG.md` section | `gh api repos/<owner>/<repo>/releases/tags/vX.Y.Z` |
| `backport`          | a merged PR to `dev` with the version in its title                                                     | `gh pr list --base dev --state merged`             |
| `surface-smoke`     | Delegates to `scripts/release/surface-smoke.sh` against the env's deployed URL                         | `scripts/release/surface-smoke.sh`                 |
| `all`               | every above except `surface-smoke`, which needs an explicit `--env`                                    | all of the above                                   |

Flags:

- `--env staging|prod`: target environment for `surface-smoke` (default: `staging`, since `prod` requires the manual
  cutover to have already happened).
- `--repo OWNER/REPO`: override the auto-detected nameWithOwner.
- `--tag vX.Y.Z`: override auto-detection (default: derived from the root `package.json` version, falls back to the
  latest git tag).
- `--staging-url URL`: override `https://dev.lmgroktfy.com` for `surface-smoke`.
- `--prod-url URL`: override `https://lmgroktfy.com` for `surface-smoke`.

## Checklist

Run immediately after the tag push triggers `release.yml`.

- [ ] **`release.yml` green end-to-end.** `gh run watch <id> --exit-status` then verify with `gh run view <id> --json
  conclusion --jq .conclusion` because the watcher exit code alone is not authoritative (a completed watcher is not a
  green watcher). Runs the integrity gate (tag format, reachable from `main`, matches `package.json` version), then
  creates the GitHub Release. Run `scripts/release/postflight.sh release` for the automated check.
- [ ] **GitHub Release exists and is published (not draft).** `gh api repos/<owner>/<repo>/releases/tags/vX.Y.Z --jq
  '{draft, tag_name}'`, expect `draft: false`. Single-channel: there is no `make_latest: false → true` flip to wait for,
  since nothing attaches assets after creation. Run `scripts/release/postflight.sh release-published` for the automated
  check.
- [ ] **Release notes match the tagged version.** The Release body is extracted from the `CHANGELOG.md` section whose
  heading contains the tag's version string, not the first `## [` heading in the file. Confirm they match verbatim.
- [ ] **Backport `main` → `dev`** via a **merged PR to `dev` with the version in its title.** Bring the release-only
  changes (`CHANGELOG.md`, the version bump, `bun.lock`) across to `dev` so the next release's `RELEASES-PREFLIGHT.md`
  triple-diff stays quiet.

  ```bash
  git switch -c backport/v<X.Y.Z> origin/main
  # ...any other release-only edits you want to backport...
  gh pr create --base dev --title "backport v<X.Y.Z> release-only files from main"
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
