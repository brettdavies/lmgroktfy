#!/usr/bin/env bash
# Run release preflight gates against the current checkout.
#
# Usage:
#   scripts/release/preflight.sh <subcommand>
#
# Subcommands:
#   surface        Establish surface: commits + diff vs last tag, breaking markers
#   mechanics      CI-mirror gates (install, lint, format, typecheck, build, tests) + version/CHANGELOG sanity
#   surface-smoke  Delegates to scripts/release/surface-smoke.sh against the deployed staging URL
#   all            Run surface, mechanics, surface-smoke
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
    gate_skip "LAST_TAG" "no tags in repo yet (first release)"
    return
  }
  commits=$(git log "$last_tag..HEAD" --oneline | wc -l)
  files=$(git diff "$last_tag..HEAD" --name-only | wc -l)
  breaking=$(git log "$last_tag..HEAD" --grep '^[a-z]\+!:' --oneline | wc -l)
  gate_pass "LAST_TAG = $last_tag  ($commits commits, $files files, $breaking breaking)"
}

# Gate: mechanics -------------------------------------------------------------
#
# CI mirror (matches .github/workflows/test.yml and scripts/hooks/pre-push)
# plus release-mechanics sanity: version source of truth, CHANGELOG state,
# guarded-paths leak check.

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

  local project_version changelog_version last_tag
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

  # Guarded-paths leak check (engineering docs that must not reach main).
  local leaked
  last_tag="${LAST_TAG:-origin/main}"
  leaked=$(git -C "$REPO_ROOT" diff "$last_tag..HEAD" --name-only 2>/dev/null \
    | grep -cE '^(docs/plans|docs/brainstorms|docs/ideation|docs/reviews|docs/solutions|\.context)' || true)
  [[ "$leaked" -eq 0 ]] \
    && gate_pass "leak check (guarded paths): clean" \
    || gate_fail "leak check" "$leaked guarded paths in diff vs $last_tag"
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
  sed -n '2,26p' "$0" | sed 's/^# \?//'
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
    surface | mechanics | surface-smoke | all)
      SUBCMD="$1"
      shift
      ;;
    post-tag)
      echo "post-tag moved to scripts/release/postflight.sh — run that after the tag push" >&2
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
  surface) gate_surface ;;
  mechanics) gate_mechanics ;;
  surface-smoke) gate_surface_smoke ;;
  all)
    gate_surface
    gate_mechanics
    gate_surface_smoke
    ;;
esac

print_summary

[[ $FAIL_COUNT -eq 0 ]] || exit 1
