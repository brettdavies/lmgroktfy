# Releases rationale

Companion to [`RELEASES.md`](./RELEASES.md). RELEASES.md is the runbook (commands, paths, decision tables). This file
holds the WHY behind those rules: branching model, PR conventions, release pipeline, CHANGELOG generation, prose-check
pipeline, branch-protection pitfalls.

Read this when:

- A rule in RELEASES.md doesn't make sense and you're tempted to change it.
- A new contributor asks "why do we do X this way".
- You're adding a new release-flow rule and need to know where it fits the existing model.

## Branching model

### Forever `dev`, ephemeral release branches

`dev` is never deleted, even after a release. The next release cycle reuses the same `dev`. The repo's
`deleteBranchOnMerge: true` setting doesn't touch `dev` as long as `dev` is never the head of a PR. Using a short-lived
`release/*` head is what keeps the setting compatible with a forever integration branch.

Engineering docs (`docs/plans/` today, plus six more guarded prefixes reserved for future use) live on `dev` only. They
never reach `main`. `guard-main-docs.yml` blocks them from PRs targeting `main`, and `guard-release-branch.yml` rejects
any PR to main whose head isn't `release/*`.

### Why cherry-pick from `main`, not branch from `dev`

Branching from `dev` and then trashing the guarded paths seems simpler but produces `add/add` merge conflicts whenever
`dev` and `main` have diverged (which they always do after the first squash merge). The file appears as "added" on both
sides with different content. Always branch from `origin/main` and cherry-pick the dev commits onto it.

### Version branch naming

Branch naming `release/v<version>` or `release/v<version>-<slug>` makes release branches sortable and unambiguous when
multiple cuts are in flight. `generate-changelog.py` extracts the version from the branch name, so the `v<version>`
prefix is required. Slug is kebab-case, short, descriptive.

## PR body conventions

### No explainer prose in the body

Every section of a PR body is user-facing substance only: the **net diff**, what is changing for the consumer that was
not already there, not the commit history or intermediate state that produced it. Workflow mechanics (cherry-pick,
regenerate, pre-push gate, CI behavior) are documented in RELEASES.md and `.github/`, NOT in the PR body. Triple-diff
output, leak-check narration, patch-id cherry-check counts, pre-push gate results, CI check status, exclusion rationale,
and other verification artifacts stay local; anomalies get fixed before push, not audit-trailed in the body.

The PR body is read by humans reviewing what shipped. Workflow mechanics and tool-fix provenance are noise from that
perspective; they belong in this file, the script outputs, and the commit history respectively.

### Why `feat`/`fix` are preferred over `chore`

`cliff.toml` drops commits whose subject starts with `chore`, `style`, `test`, `ci`, or `build` regardless of body
content. Mistyping a user-facing change as `chore` silently strips it from release notes. Prefer `feat` / `fix` when the
change has any user-observable effect (config defaults, env vars, default behaviors, new routes, output format changes).

Security-relevant dependency bumps in particular use `fix(deps):`, never `chore(deps):`, so they appear in the
changelog. A bumped dependency that closes a CVE is user-visible value, not internal tooling.

### Why required-when-empty sub-headers

`Related Issues/Stories` has four labels (`Story:` / `Issue:` / `Architecture:` / `Related PRs:`). `Files Modified` has
four sub-headers (`Modified` / `Created` / `Renamed` / `Deleted`). All four must appear in every PR, even when empty:
write `- None.` or `n/a` rather than deleting the label. Reason: scanners and humans both rely on a known section shape.
Conditionally-absent sections force every reader to mentally check "did the author skip this or does it not apply?"

### Why no AI attribution

`Co-Authored-By: Claude ...`, robot emoji / "Generated with Claude Code" trailers, or any similar AI-attribution trailer
is banned from commit messages and PR bodies. Commits and PRs stand on their own technical content. Attribution trailers
are noise and they age poorly as tools shift.

### Why no hard line wraps

Author each paragraph and each bullet as one logical line, however long. GitHub soft-wraps for display. Hard wraps
within prose produce visible mid-sentence breaks in some renderers and interfere with the prose-check pipeline: Vale's
line-anchored output reports findings against split lines, and LanguageTool's input handling can choke on certain
control-char interactions.

### Why release-PR bodies repeat changelog entries from upstream PRs

The release PR carries the same `### Added` / `### Changed` / `### Fixed` / `### Documentation` bullets as the feature
PRs it cherry-picks. The repetition is intentional and harmless: `cliff.toml` already skips its own changelog-update
commit, so the release-PR squash commit can't be double-counted in any future regeneration.

### Why internal-tooling commits don't appear in `## Changelog`

`chore(cliff): ...`, `chore(ci): ...`, and similar internal-tooling commits don't appear in the PR body's `##
Changelog`. They are not user-facing. They belong in commit history and in the Files Modified section of the PR body,
not in the source-of-truth release notes.

## Triple-diff verification

The release-PR procedure runs three diffs (A: main→release, B: release→dev for non-doc paths, C: dev→main) plus a
patch-id cherry check. This is belt-and-suspenders because missed cherry-picks have shipped to `main` on sibling repos
before, and the file-level diff in B alone doesn't catch the patch-id false-negative class.

### Why patch-id cherry-check output is noisy

In a squash-merge workflow, `git cherry HEAD origin/dev` produces many `+` lines that need human triage. They do NOT
auto-block the release. Expected sources of false positives:

1. **Historical commits squash-merged in prior releases.** The squash commit on main has a different patch-id than the
   dev commits it consolidates, so old commits show as `+` forever. Anything older than the previous release tag is
   almost always this.
2. **Cherry-picks where conflict resolution stripped guarded paths** (`docs/plans/` and the other guarded prefixes) or
   otherwise altered the tree. Same source-code intent, different patch-id.
3. **Intentionally skipped commits** (docs-only commits, release-prep backports, revert-and-redo prep steps).

A real miss looks like: a recent feat/fix/chore commit on dev whose *file content* is not yet on main. To triage a `+`
line:

```bash
git show <sha> --stat                       # what did it touch?
git diff origin/main..HEAD -- <those-files> # already on release?
```

If every touched file is guarded OR the content is already on main via a prior squash, it's a false positive (no
action). Otherwise cherry-pick the commit and re-run the triple-diff.

## CHANGELOG generation

### Generated, never hand-written

`scripts/generate-changelog.py` (vendored from the `github-repo-setup` skill, with the repo-local `cliff.toml`) is the
only sanctioned way to update `CHANGELOG.md`. The script runs `git-cliff` to prepend a versioned entry for commits since
the last tag, then walks each squash-merged PR's body to extract the `## Changelog → ### Added / Changed / Fixed /
Documentation` subsections, replacing the auto-generated bullets with the curated PR-body content (with author and
PR-link attribution).

If a PR's `## Changelog` section is empty, that PR's entry is omitted from the changelog (empty section = no user-facing
change). To fix a wrong CHANGELOG entry, fix the input: edit the squash-merged PR body, then re-run the script. Do
**not** edit `CHANGELOG.md` directly.

CI enforces that `CHANGELOG.md` is modified in every PR to main and that it contains a versioned section, not
`[Unreleased]`. The release workflow extracts the latest section for the GitHub Release body.

### Why `cliff.toml` skips chore/style/test/ci/build

These commit types do not produce user-facing content. If a cherry-picked PR has user-facing `## Changelog` content but
its commit subject starts with one of those types, its bullets get silently dropped. After running the script,
cross-check the generated section against `gh pr view <num> --json body` for each cherry-picked PR; correct mistyped PR
titles (e.g. `chore` → `feat`) and re-amend the cherry-pick subject before re-running.

## Release pipeline

### Annotated tags

Always use annotated tags (`-a -m`). Bare `git tag <name>` silently fails with `fatal: no tag message?` on machines
where `tag.gpgsign=true` is set globally.

### Why no draft/finalize split

Rust CLI repos distributed through Homebrew create the GitHub Release visible-but-not-latest (`make_latest: false`) and
flip it to latest only after a separate `homebrew-tap` job attaches bottles, because the Release must exist before those
assets can attach. lmgroktfy has no post-creation asset attachment: nothing else writes to the Release after
`release.yml`'s terminal job creates it. Carrying the draft/finalize machinery into a repo with nothing to attach after
creation would add a dispatch loop and a `finalize-release.yml` for no benefit: the terminal job creates the Release
published and the pipeline stops.

### Why backport `main` → `dev` after publish

Once `release.yml` has run and the GitHub Release exists, the release-bookkeeping files on `main` (version bump,
lockfile, `CHANGELOG.md`) need to reach `dev` so future builds from `dev` report the released version and so the next
dev work starts from the released baseline.

This pattern backports with a `git merge` from `main` into `dev`. The merge preserves full history on both branches,
lands the release commits on dev as expected, and is signed via the normal commit-signing path. No surgical script is
needed; the squash-merge structure on both sides means the merge is effectively trivial.

```bash
git checkout dev && git pull
git merge --no-ff origin/main -m "Merge remote-tracking branch 'origin/main' into dev"
git push origin dev
```

### Why the deploy step is not in `release.yml`

The tag event is a natural deploy trigger for most web-app repos, but lmgroktfy's production Worker fronts a public
domain (`lmgroktfy.com`) with no staging-style safety net beyond a version rollback: an automatic deploy on tag push
removes the human decision point between "the Release pipeline succeeded" and "this build is now live for every
visitor." Keeping `bun run deploy:prod` a separate, manual command (documented in
[`docs/runbooks/astro-cloudflare-cutover.md`](docs/runbooks/astro-cloudflare-cutover.md)) means a bad build can be
caught between tag and cutover, and rollback is a `wrangler rollback` away from the last known-good Version ID rather
than a second automated pipeline run.

### No cross-compile matrix

lmgroktfy ships one Cloudflare Worker bundle built by `bun run build` (Astro + the `@astrojs/cloudflare` adapter), not
per-platform binaries. There is no target matrix to maintain.

## Prose scrubbing scope

Three release-flow artifacts live outside any automated prose check and need a manual scrub before they ship:

- **PR bodies.** `gh pr create` and `gh pr edit` send body text directly to GitHub; no automated prose check has reach
  there.
- **`CHANGELOG.md`.** A generated artifact built from upstream PR bodies; it inherits whatever prose those PR bodies
  carry, so scrubbing happens at generation time on the release branch.
- **Release-PR bodies.** The `release/v<version>` PR to `main` carries contributor-authored wrap-up text composed after
  `CHANGELOG.md` has been generated, and the same out-of-repo gap applies.

The canonical Vale + LanguageTool rule packs and orchestrator behavior live in the agentnative-spec repo. lmgroktfy does
not vendor a local copy of those packs; point Vale at the spec checkout via `--config`.

Scrub-before-submit (author in `/tmp/`, scrub there, submit via `--body-file`) avoids the round-trip of "submit, scrub,
edit, scrub again". Every fix lands locally and the public PR sees only clean text. The auto-format hook skips `/tmp/`
paths so the body keeps its authored shape and no soft-wrapping is injected.

For a `CHANGELOG.md` finding, fix the upstream PR body (which `generate-changelog.py` re-fetches every run) and
regenerate. Hand-editing `CHANGELOG.md` directly produces drift the next regeneration overwrites.

## Branch protection

### Status-check context strings

The `required_status_checks[].context` strings in the `Protect main` ruleset MUST match exactly what GitHub publishes
for each check:

- **Inline job** (with `name:` field): published as just `<job-name>` (no workflow-name prefix).
- **Reusable-workflow caller** (`uses: .../foo.yml@ref`): published as `<caller-job-id> / <reusable-job-id-or-name>`.

Mixing these produces a stuck-but-green PR: all actual checks report green, but the ruleset waits forever on a context
that will never appear. Confirm the real contexts after a first CI run with:

```bash
gh api repos/<owner>/<repo>/commits/<sha>/check-runs --jq '.check_runs[].name'
```

`guard-main-docs.yml`, `guard-main-provenance.yml`, and `guard-release-branch.yml` all use job keys (`guard-docs:`,
`guard-provenance:`, `guard-release:`) chosen specifically so their published context strings are `guard-docs /
check-forbidden-docs`, `guard-provenance / check-provenance`, and `guard-release / check-release-branch-name`.

### Why lmgroktfy's rulesets are committed in-repo

`Protect dev` and `Protect main` are versioned as JSON under `.github/rulesets/` (`protect-dev.json`,
`protect-main.json`) and applied to GitHub via the API, not edited only in the web UI. Committing the spec makes it the
source of truth: ruleset changes get a diff and a review trail instead of living as invisible account state, and the `gh
api -X PUT repos/<owner>/<repo>/rulesets/<id> --input .github/rulesets/protect-main.json` recipe in
[`RELEASES.md`](./RELEASES.md) reapplies an edited file verbatim.

## Related docs

- [`RELEASES.md`](./RELEASES.md): operational runbook (commands, paths, decision tables).
- [`RELEASES-PREFLIGHT.md`](./RELEASES-PREFLIGHT.md): pre-cut checklist gating the release-branch cut.
- [`RELEASES-POSTFLIGHT.md`](./RELEASES-POSTFLIGHT.md): post-tag verification of the release pipeline.
- [`.github/pull_request_template.md`](.github/pull_request_template.md): PR body structure with changelog sections.
