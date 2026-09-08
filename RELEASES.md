# Releasing `lmgroktfy`

Operational runbook. Rationale lives in [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md). Pre-cut go/no-go checklist
lives in [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md). Post-tag verification lives in
[`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md).

```text
feature branch → PR to dev (squash merge)
              → release/* branch cut from main with dev's tree overlaid
              → PR to main (squash merge)
              → tag push creates the GitHub Release (a record, not a deploy trigger)
```

Direct commits to `dev` or `main` are not permitted through the normal path: every change has a PR number in its squash
commit message. `dev` and `main` each carry a GitHub ruleset (`Protect dev`, `Protect main`) requiring a PR, one
approving review, signed commits, and squash-only merges.

lmgroktfy is a Cloudflare Workers web app (Astro on `@astrojs/cloudflare`), not a published package or CLI. There is no
cargo/npm registry publish, no Homebrew tap, and no cross-compiled binary. The tag-triggered pipeline's only job is to
create the GitHub Release; deploying the built app to `https://lmgroktfy.com` is a separate, human-gated action (see
[§ Deploying, not releasing](#deploying-not-releasing)).

## Branches

| Branch                                 | Role                                    | Lifetime                                    | Protection                    |
| -------------------------------------- | --------------------------------------- | ------------------------------------------- | ----------------------------- |
| `main`                                 | Production. Only release commits.       | Forever.                                    | GitHub ruleset `Protect main` |
| `dev`                                  | Integration. All feature PRs land here. | Forever. Never delete.                      | GitHub ruleset `Protect dev`  |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Feature work.                           | One PR's worth. Auto-deleted on merge.      | None. Squash into dev freely. |
| `release/*`                            | Head of a dev → main PR.                | One release's worth. Auto-deleted on merge. | None.                         |

Both rulesets are versioned as JSON under `.github/rulesets/` (`protect-dev.json`, `protect-main.json`, the source of
truth) and applied to GitHub via the API. `Protect main` already requires the three guard checks (`guard-docs /
check-forbidden-docs`, `guard-provenance / check-provenance`, `guard-release / check-release-branch-name`); they first
run on the initial `release/* -> main` PR, which carries the guard workflows (see
[§ Branch protection](#branch-protection)).

→ Rationale: [`RELEASES-RATIONALE.md` § Branching model](./RELEASES-RATIONALE.md#branching-model).

## Daily development (feature → dev)

```bash
git checkout dev && git pull
git checkout -b feat/short-description
# ... work ...
bun install --frozen-lockfile && bun run test:all && bun run typecheck
git push -u origin feat/short-description
gh pr create --base dev --title "feat(scope): what changed"
# CI passes → squash-merge (PR_BODY becomes the dev commit message)
```

- **Commit style**: [Conventional Commits](https://www.conventionalcommits.org/).
- **PR body**: follow `.github/pull_request_template.md`. See [§ PR body](#pr-body).

### Dev-direct exception

Paths that live only on `dev` and never ship to `main` can be committed directly to `dev` without a feature branch or PR
(via the ruleset's admin bypass). The `guard-main-docs` workflow blocks them from `main` PRs regardless. The reusable
workflow hardcodes seven guarded prefixes: `docs/architecture/`, `docs/brainstorms/`, `docs/ideation/`, `docs/plans/`,
`docs/research/`, `docs/reviews/`, `docs/solutions/`, plus `.context/` by repo convention. Today lmgroktfy only
populates `docs/plans/`; the other six are reserved and blocked identically if adopted later.

`docs/runbooks/` is **not** on this list: runbooks (e.g. `docs/runbooks/astro-cloudflare-cutover.md`) are
operator-facing and ship to `main` through the normal PR flow.

The standard feature → PR → squash-merge flow remains required for everything else, including consumer-facing markdown
(README, AGENTS, CONTRIBUTING, CHANGELOG, in-repo runbooks).

## PR body

Every PR (feature, fix, docs, release) uses `.github/pull_request_template.md` verbatim. Six sections, no inventions:
`## Summary`, `## Changelog`, `## Type of Change`, `## Related Issues/Stories`, `## Files Modified`, `## Testing`.

- **No explainer prose anywhere in the body.** User-facing substance only.
- **Summary describes the net diff only**: what merged `main` looks like vs the base branch. Not commit history,
  intermediate state, or cherry-pick mechanics.
- **Zero verification artifacts in the body.** No triple-diff stats, leak-check output, patch-id cherry-check counts,
  pre-push gate results, CI status, or prose-scrub findings. Anomalies get fixed before push, not audit-trailed.
- **Changelog** subsections (`### Added` / `### Changed` / `### Fixed` / `### Documentation`): 1-5 bullets each, delete
  empty subsections, each bullet starts with a verb.
- **Type of Change**: one checkbox. Prefer `feat`/`fix` over `chore` for any user-observable change.
- **Related Issues/Stories**: four labels (`Story:` / `Issue:` / `Architecture:` / `Related PRs:`). All four required
  even when empty (`- None.` / `n/a`).
- **Files Modified**: four sub-headers (`Modified` / `Created` / `Renamed` / `Deleted`). All four required even when
  empty.
- **No AI attribution** in commits or PR bodies.
- **No hard line wraps**: one logical line per paragraph or bullet.

→ Rationale: [`RELEASES-RATIONALE.md` § PR body conventions](./RELEASES-RATIONALE.md#pr-body-conventions).

## Releasing dev to main

Before cutting a release branch, walk [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md) end-to-end. Any unchecked item
holds the release.

Engineering docs (`docs/plans/`, and the other six guarded prefixes if adopted) live on `dev` only.
`guard-main-docs.yml` blocks them from reaching `main`, and `guard-release-branch.yml` rejects any PR to main whose head
isn't `release/*`.

**Branch naming**: `release/v<version>` or `release/v<version>-<slug>`. `scripts/generate-changelog.py` extracts the
version from the branch name, so the `v<version>` prefix is required.

`main` and `dev` share only an ancient merge-base: every release squash-merges into `main`, so the two branches diverge
in history even as their content converges. Reconciling that with a merge, or a branch cut from `dev`, produces a pile
of rename/delete and lockfile conflicts that are artifacts of the lineage, not of the content shipping. The release
branch is therefore built as a **clean descendant of `main`** with `dev`'s tree overlaid on top, asserting the desired
end-state directly:

```bash
# 0. Nothing on main that dev never received (security PRs, hotfixes, config). Exits 1 while drift exists.
scripts/release/drift.sh

# 1. Branch from main, NOT dev.
git fetch origin
git checkout -B release/v<version> origin/main

# 2. Overlay dev's entire tracked tree onto the main base. `checkout -- .` writes dev's
#    paths but does not delete files that exist on main and are absent on dev, so remove
#    those next (the 'D' rows are main-only files dev deleted).
git checkout origin/dev -- .
git diff --name-status origin/main origin/dev | grep '^D'
trash <each main-only file listed above>

# 3. Strip the paths guard-main-docs forbids on main. The set resolves from the workflow;
#    never restate it inline, because every hand-kept copy drifted from what CI enforces.
GUARDED="$(scripts/release/guarded-paths.sh)"
git ls-files | grep -E "$GUARDED" | xargs -r trash
git add -A                                                      # stages adds, mods, AND deletions

# 4. Version bump, then the changelog from the PRs merged into dev since the previous
#    release. The overlay commit carries no per-PR history, so the section is built from
#    dev's PRs, not from this branch's commits.
#    - Bump "version" in the root package.json to <version> (release.yml's integrity gate
#      requires tag == package.json version). apps/web and packages/shared keep their own
#      workspace-package versions.
#    - bun install (re-resolves bun.lock against the bump).
scripts/generate-changelog.py --from-dev-prs
git add -A

# 5. Verify before committing.
#    A: staged tree equals dev's minus the version files and the stripped guarded paths.
#       Anything else printed here is a mistake.
git diff --cached --name-only origin/dev | grep -Ev "$GUARDED" \
  | grep -Ev '^(package\.json|bun\.lock|CHANGELOG\.md)$' \
  && echo "unexpected delta above; investigate" || echo "(clean: only intended deltas)"
#    B: no guarded path in the release tree.
git diff --cached --name-only origin/main | grep -E "$GUARDED" \
  && echo "LEAKED a guarded path: reset and redo" || echo "(no guarded paths)"
#    D: what this release ADDS to main. The leak check screens against the registered
#       set, so it is blind to a category nobody registered yet. Every docs/ entry and
#       every added markdown file needs a reason to ship, or it needs registering in the
#       workflow's extra_paths and removing from the branch. docs/runbooks/ ships by design.
git diff --cached --diff-filter=A --name-only origin/main | grep -E '(^docs/|\.md$)' | grep -Ev "$GUARDED" || echo "(none unguarded)"

# 6. Commit the overlay as one commit sitting directly on top of main, then run the
#    preflight gates against it.
git commit
scripts/release/preflight.sh all

# 7. Push and open the PR. Scrub body in /tmp/ first.
git push -u origin release/v<version>
gh pr create --base main --head release/v<version> --title "release: v<version>" --body-file /tmp/body.md
```

The result is a single commit whose diff against `main` is the release, with `main` as an ancestor, so the PR merges
with zero conflicts. When it merges, `dev` is untouched and `release/v<version>` auto-deletes.

→ Rationale (why overlay, not merge; why cut from `main`):
[`RELEASES-RATIONALE.md` § Branching model](./RELEASES-RATIONALE.md#branching-model). CHANGELOG mechanics:
[`RELEASES-RATIONALE.md` § CHANGELOG generation](./RELEASES-RATIONALE.md#changelog-generation).

### Exception: cherry-pick

The overlay is the release construction for this repo. Cherry-picking the dev squash-commits onto the `origin/main`
base is the exception, kept for a release that has a stated reason it cannot overlay (record it under
[Project specifics](#project-specifics)); the per-PR changelog is not such a reason, since `--from-dev-prs` builds it
from `dev` either way. When cherry-picking, run the triple-diff verification:

```bash
# 2. List the dev commits not yet on main.
git log --oneline dev --not origin/main

# 3. Cherry-pick the ones to ship. Docs commits stay on dev.
git cherry-pick <sha1> <sha2> ...

# 4. Triple-diff verification.
GUARDED="$(scripts/release/guarded-paths.sh)"

git diff origin/main..HEAD --stat                                              # A: ship surface
git diff HEAD..origin/dev --name-only | grep -Ev "$GUARDED" || echo "(none)"   # B: no missed picks
git diff origin/dev..origin/main --stat | tail -5                              # C: phantom-commits sanity

# Re-confirm no guarded paths leaked.
git diff origin/main..HEAD --name-only \
  | grep -E "$GUARDED" \
  && echo "LEAKED: reset and redo" || echo "(clean)"

# D: what this release ADDS to main (see step 5 above for why).
git diff origin/main..HEAD --diff-filter=A --name-only | grep -E '(^docs/|\.md$)' | grep -Ev "$GUARDED" || echo "(none unguarded)"

# Patch-id cherry check (noisy in squash-merge workflow; triage per-line).
git cherry HEAD origin/dev | grep '^+' || echo "(none)"
```

Cherry-picks of PRs that touched guarded paths hit modify/delete or rename/delete conflicts, since those paths live on
`dev` but are blocked from `main`; resolve them per the next section. Steps 4 to 7 of the overlay recipe then apply
unchanged.

→ Triple-diff false-positive triage:
[`RELEASES-RATIONALE.md` § Triple-diff verification](./RELEASES-RATIONALE.md#triple-diff-verification).

### Cherry-pick conflicts on guarded paths

Cherry-picks of feature PRs that touched a guarded `docs/` prefix (see [§ Dev-direct exception](#dev-direct-exception))
will hit modify/delete conflicts on the release branch. Those paths exist on `dev` but are blocked from `main` by
`guard-main-docs.yml`, so the cherry-pick sees them as "deleted in HEAD, modified in `<commit>`". A PR that renames such
a file also produces rename/delete conflicts on the same paths.

Resolution (the standard `git rm` is denied by repo policy; use the plumbing form):

```bash
# 1. Mark every unmerged guarded path as deleted in the index.
git update-index --remove $(git diff --name-only --diff-filter=U)

# 2. Trash the orphan worktree files left by the rename target side.
gio trash docs/plans/<leftover-paths>.md

# 3. Continue the cherry-pick.
git cherry-pick --continue --no-edit
```

Repeat per conflicting commit. After all picks land, run `git ls-files docs/plans/ docs/solutions/ docs/brainstorms/`.
If anything remains, drop it with the same two-step pattern and commit as `chore(release): drop stray plan spikes from
cherry-pick rename detection` before the leak check.

## Tagging and publishing

After the `release/v<version> → main` PR merges, tag and push:

```bash
git checkout main && git pull
git tag -a -m "Release v<version>" v<version>
git push origin main --tags
```

Always use annotated tags (`-a -m`). The tag push triggers `.github/workflows/release.yml`, which runs an integrity gate
(tag is `vX.Y.Z`-shaped, reachable from `main`, and equal to the root `package.json` version), then creates the GitHub
Release with notes extracted from the tagged version's `CHANGELOG.md` section.

**Single-channel**: the Release is created published and the pipeline stops. There is no `cargo publish`, no `npm
publish`, no Homebrew dispatch, and no `finalize-release` step: lmgroktfy has no distribution channel besides the
Release record itself.

### Deploying, not releasing

The tag push does **not** deploy anything. Deployment is a separate, manual action via `bun run deploy:staging` / `bun
run deploy:prod`, run whenever an operator decides to promote a build, typically staging ahead of the release cut (to
satisfy `RELEASES-PREFLIGHT.md`'s surface smoke) and production some time after the tag, gated by a human per
[`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md). Never automate the production
step on a tag or merge event.

→ Rationale: [`RELEASES-RATIONALE.md` § Release pipeline](./RELEASES-RATIONALE.md#release-pipeline).

### After publish: sync `dev` with the release

Once `release.yml` completes and the GitHub Release exists, bring the release bookkeeping (the root `package.json`
version, `CHANGELOG.md`) back to `dev` so the integration branch starts from the released baseline:

```bash
scripts/sync-dev-after-release.sh v<version>
```

The script opens a PR against `dev`; merge it once CI is green. The postflight backport gate looks for that merged PR.
Never merge `main` into `dev` or push to `dev` directly: the squash-merged histories share no recent ancestry, so the
merge conflicts on every file both sides touched, and a direct push bypasses `dev`'s required checks.

→ Rationale: [`RELEASES-RATIONALE.md` § Release pipeline](./RELEASES-RATIONALE.md#release-pipeline).

## Rollback

A bad release is rolled back at the deploy surface first, then repaired in git. Rollback re-points what users get; it
does not revert history. After rolling back, land a `fix/*` or `revert` through the normal `dev` to `release/*` to
`main` flow so `main` matches what is live. Knowing the last-good identifier before the release goes out is a
[`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md) gate.

Production is one Cloudflare Worker (`lmgroktfy`), so rollback is a Worker version re-point, per
[`docs/runbooks/astro-cloudflare-cutover.md` § Rollback](docs/runbooks/astro-cloudflare-cutover.md#rollback):

```bash
# Before the cutover: capture the active production Version ID (the last-good identifier).
bunx wrangler deployments list --env production

# Roll back: interactive pick of the previous version, or target the captured Version ID.
bunx wrangler rollback --env production
bunx wrangler versions deploy <VERSION_ID> --env production
```

Rollback restores the Worker code only; DNS and the custom-domain bindings stay attached to the `lmgroktfy` Worker
throughout. Staging (`lmgroktfy-staging`) rolls back the same way with `--env staging`.

→ Rationale: [`RELEASES-RATIONALE.md` § Rollback](./RELEASES-RATIONALE.md#rollback).

## Prose scrubbing

Three release-flow artifacts live outside any automated prose check and need a manual scrub before they ship:

- PR bodies (`gh pr create` / `gh pr edit` send body text directly to GitHub).
- `CHANGELOG.md` (a generated artifact built from upstream PR bodies).
- Release-PR bodies (composed after `CHANGELOG.md` has been generated).

The canonical Vale + LanguageTool rule packs live in the agentnative-spec repo at
`~/dev/agentnative-spec/docs/architecture/voice-enforcement.md`. Point Vale at the spec checkout via `--config`; the
spec is the source of truth, not vendored locally.

```bash
# 1. Save the artifact to /tmp/.
gh pr view <num> --json body --jq .body > /tmp/body.md         # for PR body edits
# cp CHANGELOG.md /tmp/body.md                                 # for changelog scrub

# 2. Vale (against the spec's rule packs).
vale --no-global --config ~/dev/agentnative-spec/.vale.ini --output=line --minAlertLevel=error /tmp/body.md

# 3. LanguageTool grammar check via lt_check.
lt_check /tmp/body.md

# 4. unslop (em-dash density and AI-unique structural patterns).
~/.claude/skills/unslop/scripts/score.py /tmp/body.md

# 5. Apply fixes per finding. Re-run until 0 blocking and unslop score is 0.

# 6. Apply the cleaned version.
gh pr edit <num> --body-file /tmp/body.md     # for PR body edits
```

For a `CHANGELOG.md` finding, fix the upstream PR body (which `generate-changelog.py` re-fetches every run) and
regenerate. Hand-editing `CHANGELOG.md` directly produces drift the next regeneration overwrites.

→ Rationale + which artifacts need this:
[`RELEASES-RATIONALE.md` § Prose scrubbing scope](./RELEASES-RATIONALE.md#prose-scrubbing-scope).

## Branch protection

`Protect dev` and `Protect main` are GitHub rulesets, versioned as JSON under `.github/rulesets/` (`protect-dev.json`,
`protect-main.json`) and applied to GitHub via the API. `Protect main` enforces: PR required, 1 approving review, signed
commits, linear history, squash-only merges, creation/deletion blocked, non-fast-forward blocked, and the three guard
checks required (`guard-docs / check-forbidden-docs`, `guard-provenance / check-provenance`, `guard-release /
check-release-branch-name`). `Protect dev` enforces the same set minus the guard checks and keeps its PR-review
requirement.

The guard checks are required on `main` already, but the guard caller workflows land on `main` only with the first
`release/* -> main` PR. They first run, and become satisfiable, on that PR, from the PR head against the reusable
workflows in `brettdavies/.github`. Until then, no non-release PR should target `main`.

### Re-applying a ruleset after an edit

Edit the JSON under `.github/rulesets/`, then PUT it live:

```bash
# Find the ruleset id.
gh api repos/<owner>/<repo>/rulesets --jq '.[] | {id, name}'

# Apply the edited ruleset.
gh api -X PUT repos/<owner>/<repo>/rulesets/<id> --input .github/rulesets/protect-main.json
```

Expected context strings: `guard-docs / check-forbidden-docs`, `guard-provenance / check-provenance`, `guard-release /
check-release-branch-name`.

→ Status-check context strings (inline vs reusable):
[`RELEASES-RATIONALE.md` § Status-check context strings](./RELEASES-RATIONALE.md#status-check-context-strings).

## Project specifics

lmgroktfy has no package registry and no Homebrew tap. The release pipeline's only output is the GitHub Release record.

**Required secrets (release pipeline):** none beyond the default `GITHUB_TOKEN`. `release.yml` only runs the integrity
gate and creates the GitHub Release.

**Other repo secrets (unrelated to the release pipeline):** `.github/workflows/canary.yml` uses the `CANARY_XAI_API_KEY`
repo secret for its nightly production health probe against the real xAI API.

**Distribution channels:**

| Channel                              | Command                  | Trigger                                                                                                                                                   |
| ------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staging Worker (`lmgroktfy-staging`) | `bun run deploy:staging` | Manual, whenever staging needs to reflect the latest `dev` (or a release branch) ahead of preflight.                                                      |
| Production Worker (`lmgroktfy`)      | `bun run deploy:prod`    | Manual, human-gated, after `RELEASES-POSTFLIGHT.md` passes; see [`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md). |

**No cross-compile matrix.** lmgroktfy builds one Cloudflare Worker bundle (`bun run build`), not per-platform binaries.

**Rollback:** `bunx wrangler rollback --env production` (or `bunx wrangler versions deploy <VERSION_ID> --env
production` against the Version ID captured before cutover). See [§ Rollback](#rollback).

**Release construction:** the overlay recipe in [§ Releasing dev to main](#releasing-dev-to-main). No standing reason
to cherry-pick; the cherry-pick exception is unused.

## Related docs

- [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md): pre-cut go/no-go checklist gating release-branch creation.
- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md): post-tag verification of the release pipeline.
- [`RELEASES-RATIONALE.md`](./RELEASES-RATIONALE.md), release-flow rationale: branching, PR body, pipeline, prose-check.
- [`.github/pull_request_template.md`](.github/pull_request_template.md): PR body structure with changelog sections.
- [`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md): production cutover and
  rollback runbook.
- [`AGENTS.md`](AGENTS.md): project structure, daily development.
- [`README.md`](README.md): user-facing overview.
