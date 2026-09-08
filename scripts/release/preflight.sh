#!/usr/bin/env bash
# Run release preflight gates against the current checkout.
#
# Usage:
#   scripts/release/preflight.sh <subcommand>
#
# Subcommands:
#   drift          Branch drift: what main carries that dev never received (delegated to drift.sh)
#   surface        Establish surface: commits + diff vs last tag, breaking markers
#   mechanics      CI-mirror gates (install, lint, format, typecheck, build, tests) + version/CHANGELOG sanity,
#                  guarded-path leak check, unguarded docs added to main, diff-B vs origin/dev
#   surface-smoke  Delegates to scripts/release/surface-smoke.sh against the deployed staging URL
#   all            Run drift, surface, mechanics, surface-smoke
#
# Post-tag verification (release.yml + GitHub Release) lives in
# scripts/release/postflight.sh -- that runs AFTER the tag push, not before.
#
# Flags:
#   --staging-url URL   Override the staging URL for surface-smoke (default: https://dev.lmgroktfy.com)
#   --tag TAG           Override LAST_TAG resolution (default: git tag --sort=-version:refname | head -n 1)
#
# Exit codes:
#   0 = all gates passed (or skipped with reason)
#   1 = one or more gates failed
#   2 = setup error (missing dep, unreachable staging, etc.)
#
# Dependencies:
#   - `bun`, `gh`, `git`, `curl`, `jaq` on PATH
#
# lmgroktfy has no local-server smoke mode: Turnstile refuses to issue a
# widget for localhost / *.workers.dev (see apps/web/wrangler.jsonc), so the
# only meaningful pre-release smoke is against the already-deployed staging
# Worker at https://dev.lmgroktfy.com (run `bun run deploy:staging` first).
# surface-smoke.sh is the same script postflight.sh delegates to against
# prod after the tag publishes; only the URL differs.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly REPO_ROOT
readonly STAGING_URL_DEFAULT="https://dev.lmgroktfy.com"

# Shared output helpers, gate counters, dependency checks. Same _lib.sh as
# postflight.sh and surface-smoke.sh.
. "$(dirname "$0")/_lib.sh"

# Gate: drift (delegated to drift.sh) ----------------------------------------
#
# Security PRs, hotfixes, and config edits land on main first. The release
# branch is cut from main and then takes dev's changes, so anything main holds
# that dev never received is reverted by the release or collides with it.
# drift.sh lists that set (commits since the last release whose changes dev
# lacks, .github/ parity, and lockfile packages main resolves newer) and
# fails while any exist. Run it before cutting the release branch.

gate_drift() {
  local drift_script
  drift_script="$(dirname "$0")/drift.sh"
  [[ -x "$drift_script" ]] || return 0
  header "Branch drift (delegated to drift.sh)"
  if ! git -C "$REPO_ROOT" rev-parse --verify --quiet origin/dev >/dev/null 2>&1; then
    gate_skip "drift" "no origin/dev branch (single-branch repo)"
    return
  fi
  delegate_to_subscript "$drift_script"
}

# Gate: surface --------------------------------------------------------------
#
# Generic: confirms what's actually changing since the last tag. Counts feed
# the human's gut-check on release scope and the breaking-marker tally drives
# the major-version decision.

gate_surface() {
  header "Establish surface"
  local last_tag commits files breaking
  last_tag="${LAST_TAG:-$(git tag --sort=-version:refname | head -n 1)}"
  [[ -n "$last_tag" ]] || {
    gate_skip "LAST_TAG" "no tags in repo yet (first release); surface is everything on the branch"
    return
  }
  commits=$(git log "$last_tag..HEAD" --oneline | wc -l)
  files=$(git diff "$last_tag..HEAD" --name-only | wc -l)
  # Scoped markers count too: `feat(api)!:` is breaking as much as `feat!:`.
  breaking=$(git log "$last_tag..HEAD" --grep '^[a-z]\+\(([^)]*)\)\?!:' --oneline | wc -l)
  gate_pass "LAST_TAG = $last_tag  ($commits commits, $files files, $breaking breaking)"
}

# Gate: mechanics -------------------------------------------------------------
#
# CI mirror (matches .github/workflows/test.yml and scripts/hooks/pre-push)
# plus release-mechanics sanity: version source of truth, CHANGELOG state,
# guarded-paths leak check, unguarded docs added to main, diff-B vs dev.

run_step() {
  local desc="$1"
  shift
  if "$@" >/tmp/preflight-mechanics.log 2>&1; then
    gate_pass "$desc"
  else
    gate_fail "$desc" "$(tail -n 20 /tmp/preflight-mechanics.log)"
  fi
}

gate_mechanics() {
  header "Release mechanics sanity"
  require_bin bun
  require_bin jaq

  (cd "$REPO_ROOT" && run_step "bun install --frozen-lockfile" bun install --frozen-lockfile)
  (cd "$REPO_ROOT" && run_step "lint (bun run lint)" bun run lint)
  (cd "$REPO_ROOT" && run_step "format check (bun run format:check)" bun run format:check)
  (cd "$REPO_ROOT" && run_step "typecheck (bun run typecheck)" bun run typecheck)
  (cd "$REPO_ROOT" && run_step "build (bun run build)" bun run build)
  (cd "$REPO_ROOT" && run_step "unit tests (bun run test:all)" bun run test:all)
  (cd "$REPO_ROOT" && run_step "end-to-end tests (bun run test:e2e)" bun run test:e2e)
  rm -f /tmp/preflight-mechanics.log

  local project_version changelog_version
  project_version=$(jaq -r .version "$REPO_ROOT/package.json")
  gate_pass "package.json version = $project_version"

  if [[ -f "$REPO_ROOT/CHANGELOG.md" ]]; then
    changelog_version=$(grep -m1 -oE '^## \[[0-9]+\.[0-9]+\.[0-9]+\]' "$REPO_ROOT/CHANGELOG.md" | tr -d '[]## ')
    [[ "$changelog_version" == "$project_version" ]] \
      && gate_pass "CHANGELOG top section = [$changelog_version] (matches project version)" \
      || gate_fail "CHANGELOG mismatch" "changelog=$changelog_version project=$project_version"
    grep -q '\[Unreleased\]' "$REPO_ROOT/CHANGELOG.md" \
      && gate_fail "CHANGELOG" "has [Unreleased] placeholder" \
      || gate_pass "CHANGELOG has no [Unreleased] placeholder"
  else
    gate_fail "CHANGELOG.md" "missing"
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

  # Leak check: no guarded path in what the release adds to main.
  local leaked
  leaked=$(git -C "$REPO_ROOT" diff "$ship_base..HEAD" --name-only 2>/dev/null | grep -E "$guarded" || true)
  if [[ -z "$leaked" ]]; then
    gate_pass "leak check (guarded paths): clean"
  else
    gate_fail "leak check" "guarded paths in diff vs $ship_base: $(echo "$leaked" | tr '\n' ' ')"
  fi

  # The leak check screens against the registered set, so it is blind to a
  # category nobody registered yet. Enumerate what the release adds to main
  # (anything under docs/, plus markdown anywhere, so a root-level glossary
  # shows up) and put every unguarded doc in front of a human.
  local added_docs
  added_docs=$(git -C "$REPO_ROOT" diff "$ship_base..HEAD" --diff-filter=A --name-only 2>/dev/null | grep -E '(^docs/|\.md$)' | grep -Ev "$guarded" || true)
  if [[ -z "$added_docs" ]]; then
    gate_pass "no unguarded docs newly added to main"
  else
    gate_skip "unguarded docs added to main (confirm each is meant to ship)" "$(echo "$added_docs" | tr '\n' ' ')"
  fi

  # diff-B: files on dev that this branch lacks. Excluding all of docs/ would
  # hide a missed pick under a directory that ships to main (docs/runbooks/),
  # so exclude only the guarded set. Version files and the regenerated
  # changelog are release-only by design.
  if git -C "$REPO_ROOT" rev-parse --verify --quiet origin/dev >/dev/null 2>&1; then
    local missed
    missed=$(git -C "$REPO_ROOT" diff HEAD..origin/dev --name-only 2>/dev/null | grep -Ev "$guarded" | grep -Ev '^(package\.json|bun\.lock|CHANGELOG\.md)$' || true)
    if [[ -z "$missed" ]]; then
      gate_pass "diff-B: no missed picks vs origin/dev"
    else
      gate_skip "diff-B: files on dev but not on this branch (review)" "$(echo "$missed" | head -5 | tr '\n' ' ')"
    fi
  else
    gate_skip "diff-B" "no origin/dev branch"
  fi
}

# Gate: surface-smoke (delegation) -------------------------------------------
#
# Against the deployed staging Worker -- see file header for why localhost
# isn't a meaningful target here.

gate_surface_smoke() {
  local surface_script
  surface_script="$(dirname "$0")/surface-smoke.sh"
  [[ -x "$surface_script" ]] || {
    gate_skip "surface-smoke" "scripts/release/surface-smoke.sh not present or not executable"
    return
  }
  header "Surface smoke (delegated to surface-smoke.sh against staging)"
  local staging_url="${STAGING_URL:-$STAGING_URL_DEFAULT}"
  if ! curl -fsS --max-time 5 "$staging_url/" >/dev/null 2>&1; then
    gate_skip "surface-smoke" "staging not reachable at $staging_url (run 'bun run deploy:staging' first)"
    return
  fi
  delegate_to_subscript "$surface_script" "$staging_url"
}

# Main dispatcher ------------------------------------------------------------

usage() {
  sed -n '2,28p' "$0" | sed 's/^# \?//'
  exit 2
}

LAST_TAG=""
STAGING_URL=""
SUBCMD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging-url)
      STAGING_URL="$2"
      shift 2
      ;;
    --tag)
      LAST_TAG="$2"
      shift 2
      ;;
    -h | --help) usage ;;
    drift | surface | mechanics | surface-smoke | all)
      SUBCMD="$1"
      shift
      ;;
    post-tag)
      echo "post-tag moved to scripts/release/postflight.sh: run that after the tag push" >&2
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
  surface-smoke) gate_surface_smoke ;;
  all)
    gate_drift
    gate_surface
    gate_mechanics
    gate_surface_smoke
    ;;
esac

print_summary

[[ $FAIL_COUNT -eq 0 ]] || exit 1
