#!/usr/bin/env bash
# Canonical version: 2026.11.03 (generic)
#
# Run release preflight gates against the current checkout.
#
# Usage:
#   scripts/release/preflight.sh <subcommand>
#
# Subcommands:
#   drift          Branch drift: what main carries that dev never received (delegated to drift.sh)
#   surface        Establish surface: commits + diff vs last tag, breaking markers
#   surface-smoke  Delegates to scripts/release/surface-smoke.sh against the deployed staging URL
#   changelog-sections
#                  No PR this release carries leaves its changelog entry to its title for want
#                  of a ## Changelog section (generate-changelog.py --audit-sections)
#   mechanics      CI-mirror gates (install, lint, format, typecheck, build, tests) + version/CHANGELOG sanity,
#                  guarded-path leak check, unguarded docs added to main, diff-B vs origin/dev
#   all            Run drift, surface, surface-smoke, changelog-sections, mechanics
#
# Post-tag verification (release.yml + GitHub Release) lives in
# scripts/release/postflight.sh, that runs AFTER the tag push, not before.
#
# Flags:
#   --tag TAG           Override LAST_TAG resolution (default: the newest `v[0-9]*` tag)
#   --staging-url URL   Run surface-smoke against this deployed URL (default: STAGING_URL_DEFAULT
#                       from release.env)
#
# Environment:
#   CHANGELOG_PR_BASE   Branch whose merged PRs changelog-sections reads (default: dev, or main
#                       when origin/dev does not exist)
#
# Exit codes:
#   0 = all gates passed (or skipped with reason)
#   1 = one or more gates failed
#   2 = setup error (missing dep, etc.)
#
# Dependencies:
#   - `bun`, `gh`, `git`, `curl`, `jaq` on PATH
#
# lmgroktfy has no local-server smoke mode: Turnstile refuses to issue a
# widget for localhost / *.workers.dev (see apps/web/wrangler.jsonc), so the
# only meaningful pre-release smoke is against the already-deployed staging
# Worker at STAGING_URL_DEFAULT (run `bun run deploy:staging` first).
# surface-smoke.sh is the same script postflight.sh delegates to against
# prod after the tag publishes; only the URL differs.

set -euo pipefail
# A traced run would print the Access token smoke_with_token reads.
{ set +x; } 2>/dev/null

# The token is read at smoke time, not taken from here: unset does not change
# /proc/<pid>/environ, so what this process was started with stays readable to
# everything `all` starts (bun, gh, every package script) for the whole run.
if [[ -n "${CF_ACCESS_CLIENT_ID:-}${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  echo "preflight: ignoring CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET; the smoke reads the token with op read" >&2
fi
unset CF_ACCESS_CLIENT_ID CF_ACCESS_CLIENT_SECRET
# An exported variable passes its export attribute through `local`, and would carry
# the token smoke_with_token holds to the smoke's children.
unset id secret

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly REPO_ROOT

# Shared output helpers, gate counters, dependency checks, and release.env.
# Same _lib.sh as postflight.sh and surface-smoke.sh.
# shellcheck disable=SC1091  # sibling _lib.sh, always vendored alongside
. "$(dirname "$0")/_lib.sh"

# Gate: surface --------------------------------------------------------------
#
# Generic: confirms what's actually changing since the last release on the
# binary's tag line. Counts feed the human's gut-check on release scope and the
# breaking-marker tally drives the major-version decision.
#
# The window is read on the integration branch (origin/dev, or HEAD in a repo
# without one). Every release squash-merges into main, so its tag shares no
# recent history with dev, and a log from the tag counts dev's whole past. When
# the tag is not an ancestor, the window opens at the commit that synced the tag
# back into dev instead. A PR merged after the previous cut and before that
# commit sits outside this window; generate-changelog.py reads those PRs too, so
# its section, not this count, is the complete list.

# The commit on REF whose subject syncs TAG back, the way generate-changelog.py
# finds it: `chore(release): sync dev after <tag>`, or `backport <tag>` from
# older backport scripts. Only the subject counts, because a later message can
# quote it. Empty when no commit names the tag. awk reads the whole log rather
# than exiting at the match: an early exit leaves git log writing into a closed
# pipe, and under pipefail the SIGPIPE ends the script on any long history.
release_backport_commit() {
  git log --format='%H %s' "$1" 2>/dev/null | awk -v tag="$2" '
    !found {
      subject = substr($0, index($0, " ") + 1)
      split("chore(release): sync dev after |chore(release): backport ", prefixes, "|")
      for (i = 1; i <= 2; i++) {
        lead = prefixes[i] tag
        rest = substr(subject, length(lead) + 1)
        if (index(subject, lead) == 1 && (rest == "" || substr(rest, 1, 1) == " ")) {
          print $1
          found = 1
          break
        }
      }
    }'
}

gate_surface() {
  header "Establish surface"
  local last_tag head_ref window anchor="" commits files breaking
  last_tag="${LAST_TAG:-$(last_release_tag)}"
  [[ -n "$last_tag" ]] || {
    gate_skip "LAST_TAG" "no tags in repo yet (first release); surface is everything on the branch"
    return
  }
  head_ref=origin/dev
  git rev-parse --verify --quiet "$head_ref" >/dev/null 2>&1 || head_ref=HEAD
  window="$last_tag..$head_ref"
  if ! git merge-base --is-ancestor "$last_tag" "$head_ref" 2>/dev/null; then
    anchor=$(release_backport_commit "$head_ref" "$last_tag")
    if [[ -z "$anchor" ]]; then
      gate_skip "LAST_TAG" \
        "$last_tag is no ancestor of $head_ref and no commit there syncs it back; read the surface as origin/main..$head_ref"
      return
    fi
    window="$anchor..$head_ref"
  fi
  # Files compare trees, so they read from the tag directly, minus the guarded
  # set: dev carries engineering docs that never ship.
  local guarded
  guarded=$("$(dirname "$0")/guarded-paths.sh" 2>/dev/null) || guarded='^$'
  commits=$(git log "$window" --oneline | wc -l)
  files=$(git diff "$last_tag" "$head_ref" --name-only | { grep -Ev "$guarded" || true; } | wc -l)
  # Scoped markers count too: `feat(api)!:` is breaking as much as `feat!:`.
  breaking=$(git log "$window" --grep '^[a-z]\+\(([^)]*)\)\?!:' --oneline | wc -l)
  gate_pass "LAST_TAG = $last_tag  ($commits commits, $files files, $breaking breaking${anchor:+, counted from its backport ${anchor:0:12} on $head_ref})"
}

# Gate: drift (delegated to drift.sh) ----------------------------------------
#
# Security PRs, hotfixes, and config edits land on main first. The release
# branch is cut from main and then takes dev's changes, so anything main holds
# that dev never received is reverted by the release or collides with it.
# drift.sh lists that set (commits since the last release whose changes dev
# lacks, .github/ parity, and lockfile packages main resolves newer) and
# fails while any exist. Run it before cutting the release branch. Repos
# without a dev branch skip it.

# delegate_to_subscript counts nothing when a sub-script writes no result file,
# as when it exits during setup, so a gate that never ran fails here rather than
# reading as a pass.
delegate_or_fail() {
  local name="$1" before=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
  shift
  delegate_to_subscript "$@"
  if ((PASS_COUNT + FAIL_COUNT + SKIP_COUNT == before)); then
    gate_fail "$name" "recorded no gates, so nothing was checked"
  fi
}

gate_drift() {
  local drift_script
  drift_script="$(dirname "$0")/drift.sh"
  if [[ ! -x "$drift_script" ]]; then
    gate_fail "drift" "$drift_script is missing or not executable"
    return
  fi
  header "Branch drift (delegated to drift.sh)"
  if ! git rev-parse --verify --quiet origin/dev >/dev/null 2>&1; then
    gate_fail "drift" "no origin/dev: this repo always has a dev branch, so fetch it (git fetch origin dev)"
    return
  fi
  delegate_or_fail "drift" "$drift_script"
}

# Gate: surface-smoke (delegation) -------------------------------------------
#
# Against the deployed staging Worker; see the file header for why localhost
# isn't a meaningful target here. The sub-script must accept --result-file PATH
# per the contract in _lib.sh's delegate_to_subscript helper. Post-flight runs
# the SAME script against the deployed env.

# Assignments in front of a shell function reach everything it starts, so in
# front of delegate_to_subscript they would also reach its mktemp and rm.
smoke_with_token() {
  local id="" secret=""
  # With no token the smoke sends no headers, and its transport gate fails on the
  # Access login.
  if have_bin op; then
    # 3pjk4ix2jxratdogd6viheavoi: CF Service Token - Surface Smoke (lmgroktfy), vault secrets-dev
    id=$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_id") || id=""
    secret=$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_secret") || secret=""
  fi
  CF_ACCESS_CLIENT_ID="$id" CF_ACCESS_CLIENT_SECRET="$secret" "$(dirname "$0")/surface-smoke.sh" "$@"
}

gate_surface_smoke() {
  local surface_script
  surface_script="$(dirname "$0")/surface-smoke.sh"
  if [[ ! -x "$surface_script" ]]; then
    gate_fail "surface-smoke" "$surface_script is missing or not executable"
    return
  fi
  header "Surface smoke (delegated to surface-smoke.sh against staging)"
  # A deployed staging URL (--staging-url, else STAGING_URL_DEFAULT from
  # release.env, the same default postflight reads) is smoked as given: an
  # unreachable deployment is a failure, not a skip.
  local url="${STAGING_URL:-${STAGING_URL_DEFAULT:-}}"
  if [[ -z "$url" ]]; then
    gate_fail "surface-smoke" "no staging URL (pass --staging-url or set STAGING_URL_DEFAULT in scripts/release/release.env)"
    return
  fi
  delegate_or_fail "surface-smoke against $url" smoke_with_token "$url"
}

# Gate: changelog-sections ---------------------------------------------------
#
# generate-changelog.py owns the rules for reading a PR body, so it runs the
# audit: `--audit-sections` names the PRs whose entry would fall back to their
# title because the body never offered the changelog section. It reads the PRs
# from the integration branch's history since the previous release on the tag
# line, as the changelog itself does, so stacked PRs are among them and a
# member's tag never moves the binary's window. A section left empty on purpose
# passes, because the generator reads it as "nothing for this crate".
#
# One audit per changelog the release writes: the release package's, and each
# workspace member whose release is pending (no tag yet at its version), each
# under the heading its [package.metadata.changelog] table declares.
gate_changelog_sections() {
  header "PR changelog sections"
  if [[ ! -x "$REPO_ROOT/scripts/generate-changelog.py" ]]; then
    gate_skip "PR changelog sections" "scripts/generate-changelog.py not vendored"
    return
  fi
  have_bin gh || {
    gate_skip "PR changelog sections" "gh not installed"
    return
  }

  local base
  base="${CHANGELOG_PR_BASE:-dev}"
  git -C "$REPO_ROOT" rev-parse --verify --quiet "origin/$base" >/dev/null 2>&1 || base="main"

  local targets=() name prefix version
  targets+=("$(cd "$REPO_ROOT" && changelog_crate_args)")
  while IFS=$'\t' read -r name _ prefix _ version; do
    [[ -n "$name" && -n "$version" ]] || continue
    git -C "$REPO_ROOT" rev-parse --verify --quiet "refs/tags/$prefix$version" >/dev/null && continue
    targets+=("--crate $name --tag $prefix$version")
  done < <(cd "$REPO_ROOT" && release_members)

  local target label out
  for target in "${targets[@]}"; do
    label="PR changelog sections"
    if [[ "$target" == --crate* ]]; then
      read -r _ name _ <<<"$target"
      label="$label ($name)"
    fi
    # shellcheck disable=SC2086  # target is a flag list, split on purpose
    if out=$(cd "$REPO_ROOT" && scripts/generate-changelog.py --audit-sections --dev-branch "$base" $target 2>&1); then
      gate_pass "$label: ${out%%$'\n'*}"
    else
      gate_fail "$label" "$out"
    fi
  done
}

# Gate: mechanics -------------------------------------------------------------
#
# CI mirror (matches .github/workflows/test.yml and scripts/hooks/pre-push)
# plus release-mechanics sanity: version source of truth, CHANGELOG state,
# guarded-paths leak check, unguarded docs added to main, diff-B vs dev.

# Only the command runs in a subshell, so gate_pass and gate_fail update the
# counters print_summary and the exit code read.
run_step() {
  local desc="$1"
  shift
  if (cd "$REPO_ROOT" && "$@") >"$MECHANICS_LOG" 2>&1; then
    gate_pass "$desc"
  else
    gate_fail "$desc" "$(tail -n 20 "$MECHANICS_LOG")"
  fi
}

gate_mechanics() {
  header "Release mechanics sanity"
  require_bin bun
  require_bin jaq

  # Per run: `test:all` can start another preflight, and a shared path would lose
  # this run's failure output.
  MECHANICS_LOG=$(mktemp)

  run_step "bun install --frozen-lockfile" bun install --frozen-lockfile
  run_step "lint (bun run lint)" bun run lint
  run_step "format check (bun run format:check)" bun run format:check
  run_step "typecheck (bun run typecheck)" bun run typecheck
  run_step "build (bun run build)" bun run build
  run_step "unit tests (bun run test:all)" bun run test:all
  run_step "end-to-end tests (bun run test:e2e)" bun run test:e2e
  rm -f "$MECHANICS_LOG"

  local project_version changelog_version site=""

  # The version a release tag names: the site deploy stamp its changelog
  # heading carries, checked below with site-version.sh (RELEASES.md
  # § Versioning). Without SITE_VERSION_BASE, the root package.json's.
  if [[ -n "${SITE_VERSION_BASE:-}" ]]; then
    site=1
    project_version=""
    gate_pass "site version: the deploy stamp at base $SITE_VERSION_BASE (scripts/release/site-version.sh)"
  else
    project_version=$(jaq -r .version "$REPO_ROOT/package.json")
    gate_pass "package.json version = $project_version"
  fi

  # The changelog the release notes are cut from. One that release.env names
  # must exist; a repo that declares none and keeps no CHANGELOG.md has
  # nothing to check.
  local release_changelog
  release_changelog=$(release_changelog)
  if [[ -f "$REPO_ROOT/$release_changelog" ]]; then
    changelog_version=$(grep -m1 -oE '^## \[[0-9]+\.[0-9]+\.[0-9]+(-g[0-9a-f]{7})?\]' "$REPO_ROOT/$release_changelog" | tr -d '[]## ' || true)
    if [[ -n "$site" ]]; then
      local verified
      if git -C "$REPO_ROOT" rev-parse --verify --quiet "refs/tags/v$changelog_version" >/dev/null; then
        gate_fail "$release_changelog top section = [$changelog_version]" "v$changelog_version is already tagged, so this is a released section, not this release's
    fix: re-cut the release, writing the section for the next stamp (RELEASES.md § Releasing dev to main)"
      elif verified=$(cd "$REPO_ROOT" && scripts/release/site-version.sh --verify "v$changelog_version" 2>&1); then
        gate_pass "$release_changelog top section = [$changelog_version] (site-version.sh: ${verified#v"$changelog_version" })"
      else
        gate_fail "$release_changelog top section = [${changelog_version:-none}]" "$verified"
      fi
    elif [[ "$changelog_version" == "$project_version" ]]; then
      gate_pass "$release_changelog top section = [$changelog_version] (matches project version)"
    else
      gate_fail "$release_changelog mismatch" "changelog=$changelog_version project=$project_version"
    fi
    # The heading, not the text: a released section may quote `[Unreleased]`.
    if grep -qE '^## \[Unreleased\]' "$REPO_ROOT/$release_changelog"; then
      gate_fail "$release_changelog" "has [Unreleased] placeholder"
    else
      gate_pass "$release_changelog has no [Unreleased] placeholder"
    fi
  else
    gate_fail "$release_changelog" "missing"
  fi

  # The three screens below match against the guarded set the workflow
  # enforces, resolved by guarded-paths.sh, so this copy cannot drift from
  # what guard-main-docs rejects. A copy that omits a guarded path reports a
  # real leak as clean.
  local guarded ship_base
  if ! guarded=$("$(dirname "$0")/guarded-paths.sh" 2>/dev/null); then
    gate_fail "guarded-path list" "scripts/release/guarded-paths.sh resolved no pattern"
    return
  fi
  ship_base="${LAST_TAG:-origin/main}"
  git -C "$REPO_ROOT" rev-parse --verify --quiet origin/main >/dev/null 2>&1 && ship_base=origin/main

  # Leak check: no guarded path added or modified in what the release ships to
  # main. --diff-filter=ACMR, as in cut-release-branch.sh's check B: a release
  # that removes a guarded doc main still carries from before the guard existed
  # lists the removal too, and that is cleanup, not a leak.
  local leaked
  leaked=$(git -C "$REPO_ROOT" diff --diff-filter=ACMR "$ship_base..HEAD" --name-only 2>/dev/null | grep -E "$guarded" || true)
  if [[ -z "$leaked" ]]; then
    gate_pass "leak check (guarded paths): clean"
  else
    gate_fail "leak check" "guarded paths in diff vs $ship_base: $(echo "$leaked" | tr '\n' ' ')"
  fi

  # The leak check screens against the registered set, so it is blind to a
  # category nobody registered yet. Enumerate what the release adds to main
  # (anything under docs/, plus markdown anywhere, so a root-level glossary
  # shows up) and put every unguarded doc in front of a human. --no-renames,
  # because rename detection reports a doc moved from one main carries as R,
  # and the A filter then drops it.
  local added_docs
  added_docs=$(git -C "$REPO_ROOT" diff --no-renames "$ship_base..HEAD" --diff-filter=A --name-only 2>/dev/null | grep -E '(^docs/|\.md$)' | grep -Ev "$guarded" || true)
  if [[ -z "$added_docs" ]]; then
    gate_pass "no unguarded docs newly added to main"
  else
    gate_skip "unguarded docs added to main (confirm each is meant to ship)" "$(echo "$added_docs" | tr '\n' ' ')"
  fi

  # diff-B: files on dev that this branch lacks. Excluding all of docs/ would
  # hide a missed pick under a directory that ships to main (docs/runbooks/),
  # so exclude only the guarded set. Version files and the regenerated
  # changelogs are release-only by design, at any depth, so a workspace
  # package's bump reads as a release edit; cut-release-branch.sh's check A
  # excludes the same set.
  if git -C "$REPO_ROOT" rev-parse --verify --quiet origin/dev >/dev/null 2>&1; then
    local missed
    missed=$(git -C "$REPO_ROOT" diff HEAD..origin/dev --name-only 2>/dev/null | grep -Ev "$guarded" \
      | grep -Ev '^((.*/)?(Cargo\.toml|Cargo\.lock|package\.json|package-lock\.json|bun\.lock|pyproject\.toml|uv\.lock|VERSION|CHANGELOG\.md))$' || true)
    if [[ -z "$missed" ]]; then
      gate_pass "diff-B: no missed picks vs origin/dev"
    else
      gate_skip "diff-B: files on dev but not on this branch (review)" "$(echo "$missed" | head -5 | tr '\n' ' ')"
    fi
  else
    gate_skip "diff-B" "no origin/dev branch"
  fi
}

# Main dispatcher ------------------------------------------------------------

# usage [CODE]: prints the header and exits CODE, 2 (a usage error) by default;
# --help passes 0.
usage() {
  print_usage_header
  exit "${1:-2}"
}

LAST_TAG=""
STAGING_URL=""
SUBCMD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      LAST_TAG="$2"
      shift 2
      ;;
    --staging-url)
      STAGING_URL="$2"
      shift 2
      ;;
    -h | --help) usage 0 ;;
    drift | surface | mechanics | changelog-sections | surface-smoke | all)
      SUBCMD="$1"
      shift
      ;;
    post-tag)
      echo "post-tag moved to scripts/release/postflight.sh, run that after the tag push" >&2
      exit 2
      ;;
    *)
      echo "unknown arg: $1" >&2
      usage
      ;;
  esac
done

[[ -n "$SUBCMD" ]] || usage

case "$SUBCMD" in
  drift) gate_drift ;;
  surface) gate_surface ;;
  mechanics) gate_mechanics ;;
  changelog-sections) gate_changelog_sections ;;
  surface-smoke) gate_surface_smoke ;;
  all)
    gate_drift
    gate_surface
    gate_surface_smoke
    gate_changelog_sections
    gate_mechanics
    ;;
esac

print_summary

[[ $FAIL_COUNT -eq 0 ]] || exit 1
