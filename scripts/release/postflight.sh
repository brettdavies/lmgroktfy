#!/usr/bin/env bash
# Verify the vX.Y.Z tag's downstream pipeline landed cleanly. Also reusable
# for verifying a deployed env (staging or prod) when the project ships
# multi-env deploys; --env staging|prod selects the target.
#
# Usage:
#   scripts/release/postflight.sh [--env staging|prod] <subcommand>
#
# Runs AFTER the release/v<X.Y.Z> -> main PR merges and the tag is pushed,
# triggering release.yml. Companion to scripts/release/preflight.sh which
# runs BEFORE the release branch cut.
#
# lmgroktfy is a single-channel web-app release: release.yml creates the
# GitHub Release published (not draft, not prerelease) as its terminal step
# and stops. There is no crates.io / Homebrew / finalize-release leg to
# verify. Deploy is a separate, human-gated step (docs/runbooks/
# astro-cloudflare-cutover.md) driven by `bun run deploy:staging` /
# `deploy:prod`, not by this pipeline -- surface-smoke below checks the
# already-deployed env, it does not trigger a deploy.
#
# Subcommands:
#   release        release.yml on the tag push (conclusion=success)
#   github-release GitHub Release vX.Y.Z is published, non-draft, non-prerelease
#   backport       dev has a merged PR carrying the released version in its title
#   surface-smoke  Delegates to scripts/release/surface-smoke.sh against the env's deployed URL
#   all            run every above sequentially
#
# Flags:
#   --env staging|prod      Target environment (default: prod)
#   --repo OWNER/REPO       Override the auto-detected nameWithOwner
#   --tag vX.Y.Z            Override the tag (default: derived from package.json; falls back to latest git tag)
#   --staging-url URL       Override the staging URL for surface-smoke (default: https://dev.lmgroktfy.com)
#   --prod-url URL          Override the prod URL for surface-smoke (default: https://lmgroktfy.com)
#
# Exit codes:
#   0 = all gates passed (or skipped with reason)
#   1 = one or more gates failed
#   2 = setup error (missing dep, unauthenticated gh, etc.)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly REPO_ROOT
readonly STAGING_URL_DEFAULT="https://dev.lmgroktfy.com"
readonly PROD_URL_DEFAULT="https://lmgroktfy.com"

# Shared output helpers, gate counters, dependency checks, 1Password helper.
# Same _lib.sh as preflight.sh and surface-smoke.sh.
. "$(dirname "$0")/_lib.sh"

# Argument parsing -----------------------------------------------------------

ENV=""
REPO=""
TAG=""
STAGING_URL=""
PROD_URL=""
SUBCMD=""

usage() {
  sed -n '2,35p' "$0" | sed 's/^# \?//'
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --staging-url)
      STAGING_URL="$2"
      shift 2
      ;;
    --prod-url)
      PROD_URL="$2"
      shift 2
      ;;
    -h | --help) usage ;;
    release | github-release | backport | surface-smoke | all)
      SUBCMD="$1"
      shift
      ;;
    *)
      echo "unknown arg: $1" >&2
      usage
      ;;
  esac
done

[[ -n "$SUBCMD" ]] || usage

# Default --env to prod when omitted.
ENV="${ENV:-prod}"
case "$ENV" in
  staging | prod) ;;
  *)
    echo "--env must be 'staging' or 'prod', got: $ENV" >&2
    exit 2
    ;;
esac

resolve_repo() {
  [[ -n "$REPO" ]] && {
    echo "$REPO"
    return
  }
  gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null \
    || {
      echo "could not resolve repo (pass --repo OWNER/REPO)" >&2
      exit 2
    }
}

resolve_tag() {
  if [[ -n "$TAG" ]]; then
    echo "$TAG"
    return
  fi
  if [[ -f "$REPO_ROOT/package.json" ]] && command -v jaq >/dev/null 2>&1; then
    local pkg_version
    pkg_version=$(jaq -r .version "$REPO_ROOT/package.json" 2>/dev/null || true)
    if [[ -n "$pkg_version" && "$pkg_version" != "null" ]]; then
      echo "v${pkg_version}"
      return
    fi
  fi
  # Fallback: latest git tag.
  local git_tag
  git_tag=$(git -C "$REPO_ROOT" tag --sort=-version:refname | head -n 1)
  if [[ -n "$git_tag" ]]; then
    echo "$git_tag"
    return
  fi
  echo "could not resolve tag (pass --tag vX.Y.Z)" >&2
  exit 2
}

resolve_env_url() {
  if [[ "$ENV" == "staging" ]]; then
    echo "${STAGING_URL:-$STAGING_URL_DEFAULT}"
  else
    echo "${PROD_URL:-$PROD_URL_DEFAULT}"
  fi
}

# Gate: release.yml ----------------------------------------------------------

gate_release() {
  header "release.yml on tag push"
  require_bin gh
  require_bin jaq
  local repo tag run
  repo=$(resolve_repo)
  tag=$(resolve_tag)

  run=$(gh run list --repo "$repo" --branch "$tag" --workflow release.yml --limit 1 \
    --json databaseId,status,conclusion --jq '.[0]' 2>/dev/null || true)
  if [[ -z "$run" || "$run" == "null" ]]; then
    gate_skip "release.yml run for $tag" "no run found on tag $tag yet (push the tag?)"
    return
  fi

  local status conclusion run_id
  status=$(printf '%s' "$run" | jaq -r .status)
  conclusion=$(printf '%s' "$run" | jaq -r .conclusion)
  run_id=$(printf '%s' "$run" | jaq -r .databaseId)

  if [[ "$status" != "completed" ]]; then
    gate_skip "release.yml run $run_id" "status=$status (still running; re-run after watcher exits)"
    return
  fi
  [[ "$conclusion" == "success" ]] \
    && gate_pass "release.yml run $run_id conclusion=success" \
    || gate_fail "release.yml run $run_id" "conclusion=$conclusion (see gh run view $run_id --log-failed)"
}

# Gate: GitHub Release published ----------------------------------------------
#
# Single-channel: release.yml publishes the Release directly (no draft/
# finalize split -- there are no Homebrew bottles or other post-creation
# assets to wait on). This gate just confirms the terminal step landed.

gate_github_release() {
  header "GitHub Release published"
  require_bin gh
  require_bin jaq
  local repo tag
  repo=$(resolve_repo)
  tag=$(resolve_tag)

  local rel
  rel=$(gh release view "$tag" --repo "$repo" --json isDraft,isPrerelease,tagName 2>/dev/null || true)
  if [[ -z "$rel" ]]; then
    gate_skip "Release $tag" "release.yml hasn't created it yet"
    return
  fi
  local is_draft is_prerelease
  is_draft=$(printf '%s' "$rel" | jaq -r .isDraft)
  is_prerelease=$(printf '%s' "$rel" | jaq -r .isPrerelease)

  if [[ "$is_draft" == "true" ]]; then
    gate_fail "Release $tag draft" "isDraft=true (release.yml should publish non-draft)"
  elif [[ "$is_prerelease" == "true" ]]; then
    gate_fail "Release $tag prerelease" "isPrerelease=true (release.yml should publish stable)"
  else
    gate_pass "Release $tag published non-draft, non-prerelease"
  fi
}

# Gate: main → dev backport --------------------------------------------------

gate_backport() {
  header "main → dev backport"
  require_bin gh
  require_bin jaq
  local repo tag version
  repo=$(resolve_repo)
  tag=$(resolve_tag)
  version="${tag#v}"

  # Look for a merged PR to dev with the version in the title. The backport
  # carries package.json's version bump + CHANGELOG.md; the merged PR is the
  # durable signal that the backport ran, regardless of which files changed.
  # `gh pr list --search` is GitHub Search API syntax; "<text> in:title"
  # silently returns an empty result. Pass the version alone for
  # server-side filtering, then jaq-filter the title for precision and sort
  # by mergedAt descending so the BACKPORT PR beats any other PR that
  # happens to carry the version string in its title.
  local pr=""
  pr=$(gh pr list --repo "$repo" --base dev --state merged --limit 20 \
    --search "$version" \
    --json number,title,mergedAt,headRefName \
    --jq "[.[] | select(.title | test(\"$version\"))] | sort_by(.mergedAt) | reverse | .[0]" \
    2>/dev/null || true)
  [[ "$pr" == "null" ]] && pr=""

  if [[ -n "$pr" ]]; then
    local pr_num pr_title pr_head
    pr_num=$(printf '%s' "$pr" | jaq -r .number)
    pr_title=$(printf '%s' "$pr" | jaq -r .title)
    pr_head=$(printf '%s' "$pr" | jaq -r .headRefName)
    gate_pass "backport PR #$pr_num merged to dev from $pr_head: $pr_title"
  else
    gate_skip "main → dev backport" \
      "no PR titled '$version*' merged to dev -- run scripts/sync-dev-after-release.sh $tag"
  fi
}

# Gate: surface-smoke (optional delegation) ----------------------------------
#
# Deployed HTTP surface with a Cloudflare Worker per env. Same suite as
# preflight uses against the local dev server; only the URL differs.

gate_surface_smoke() {
  local surface_script
  surface_script="$(dirname "$0")/surface-smoke.sh"
  [[ -x "$surface_script" ]] || return 0
  header "Surface smoke (delegated to surface-smoke.sh against $ENV)"
  local url
  url=$(resolve_env_url)
  if [[ -z "$url" ]]; then
    gate_skip "surface-smoke" "no URL configured for env=$ENV (pass --staging-url / --prod-url)"
    return
  fi
  if ! curl -fsS --max-time 5 "$url/" >/dev/null 2>&1; then
    gate_skip "surface-smoke" "URL $url not reachable (deploy still in flight?)"
    return
  fi
  delegate_to_subscript "$surface_script" "$url"
}

# Main dispatcher ------------------------------------------------------------

case "$SUBCMD" in
  release) gate_release ;;
  github-release) gate_github_release ;;
  backport) gate_backport ;;
  surface-smoke) gate_surface_smoke ;;
  all)
    gate_release
    gate_github_release
    gate_backport
    gate_surface_smoke
    ;;
esac

print_summary

[[ $FAIL_COUNT -eq 0 ]] || exit 1
