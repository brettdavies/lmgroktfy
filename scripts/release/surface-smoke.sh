#!/usr/bin/env bash
# Canonical version: 2026.11.02 (generic)
#
# lmgroktfy HTTP surface smoke. Invoked against any base URL: the
# orchestrators (preflight.sh and postflight.sh) call this same script with
# different URLs, read from scripts/release/release.env:
#
#   scripts/release/preflight.sh surface-smoke               -> $STAGING_URL_DEFAULT (deployed staging)
#   scripts/release/postflight.sh --env staging surface-smoke -> $STAGING_URL_DEFAULT (deployed staging)
#   scripts/release/postflight.sh --env prod    surface-smoke -> $PROD_URL_DEFAULT    (deployed prod)
#
# Usage:
#   scripts/release/surface-smoke.sh <base-url> [--result-file PATH]
#
# Flags:
#   --result-file PATH     When set, write "<pass> <fail> <skip>" to PATH at
#                          exit so a parent orchestrator can aggregate counters
#                          via _lib.sh's delegate_to_subscript helper. Without
#                          this flag, prints a colored summary line instead.
#
# Both environments are public; no auth headers are staged. Turnstile gates
# POST /api/grok itself (see gate_live), not the transport.
#
# Exit codes:
#   0 = all gates passed (or skipped with reason)
#   1 = one or more gates failed
#   2 = setup error (missing dep, no base URL, etc.)
#
# Dependencies:
#   - curl on PATH

set -euo pipefail

# shellcheck disable=SC1091  # sibling _lib.sh, always vendored alongside
. "$(dirname "$0")/_lib.sh"

# Argument parsing -----------------------------------------------------------

BASE_URL=""
RESULT_FILE=""

# usage [CODE]: prints the header and exits CODE, 2 (a usage error) by default;
# --help passes 0.
usage() {
  print_usage_header
  exit "${1:-2}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --result-file)
      RESULT_FILE="$2"
      shift 2
      ;;
    -h | --help) usage 0 ;;
    http://* | https://*)
      BASE_URL="$1"
      shift
      ;;
    *)
      echo "unknown arg: $1" >&2
      usage
      ;;
  esac
done

[[ -n "$BASE_URL" ]] || {
  echo "missing base URL (positional argument)" >&2
  usage
}
require_bin curl

# Both lmgroktfy environments are public (dev.lmgroktfy.com, lmgroktfy.com);
# no CF Access or bearer auth gates the transport.
CURL_AUTH=()

# Gate: transport reachable --------------------------------------------------
#
# Confirms the surface is reachable at all. An unreachable deployment fails
# here: the orchestrators smoke a deployed URL as given.
#
# A redirect counts as reachable only when it stays on this host. A gated
# deploy answers a request whose auth headers are missing or rejected with a
# redirect to its login page (Cloudflare Access sends it to the team domain
# or to /cdn-cgi/access/login), and that redirect is not the surface.

# Prints the host of a URL, lowercased, without userinfo or port.
url_host() {
  local rest="${1#*://}"
  rest="${rest%%[/?#]*}"
  rest="${rest##*@}"
  rest="${rest%%:*}"
  printf '%s' "${rest,,}"
}

gate_transport() {
  header "Transport reachable at $BASE_URL"
  local out code location path
  out=$(curl "${CURL_AUTH[@]}" -sSo /dev/null -w '%{http_code} %{redirect_url}' --max-time 10 "$BASE_URL/" || echo "000")
  code="${out%% *}"
  location=""
  [[ "$out" == *" "* ]] && location="${out#* }"
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    gate_pass "$BASE_URL/ -> HTTP $code"
    return
  fi
  if [[ ! "$code" =~ ^3[0-9][0-9]$ ]]; then
    gate_fail "$BASE_URL/" "HTTP $code (expected 2xx, or a 3xx that stays on this host)"
    return
  fi
  path="${location#*://*/}"
  [[ "$path" == "$location" ]] && path=""
  if [[ -z "$location" ]] \
    || [[ "$(url_host "$location")" != "$(url_host "$BASE_URL")" ]] \
    || [[ "/$path" == /cdn-cgi/access/* ]]; then
    gate_fail "$BASE_URL/" "HTTP $code to ${location:-an empty Location}: a login page or another host, not this surface (check the auth headers, or point the base URL at the host that serves it)"
    return
  fi
  gate_pass "$BASE_URL/ -> HTTP $code to $location (same host)"
}

# Gate: contract -------------------------------------------------------------
#
# Structural: the discoverable, agent-facing surface. Each route is static
# per-locale content generated at build time (apps/web/src/pages/*.ts) --
# this checks status + Content-Type, not payload semantics.

check_route() {
  local path="$1" want_type="$2"
  local out code type
  out=$(curl "${CURL_AUTH[@]}" -sS -D - -o /dev/null --max-time 10 "$BASE_URL$path" 2>/dev/null || true)
  code=$(printf '%s' "$out" | awk 'NR==1{print $2}')
  type=$(printf '%s' "$out" | grep -i '^content-type:' | head -1 | cut -d: -f2- | tr -d '\r' | xargs || true)
  if [[ "$code" == "200" && "$type" == "$want_type"* ]]; then
    gate_pass "$path -> HTTP 200, Content-Type: $type"
  else
    gate_fail "$path" "HTTP ${code:-000}, Content-Type: ${type:-<none>} (expected 200, $want_type)"
  fi
}

gate_contract() {
  header "Contract surface (describe-not-expose agent affordances)"
  check_route "/llms.txt" "text/plain"
  check_route "/robots.txt" "text/plain"
  check_route "/sitemap.xml" "application/xml"
  check_route "/.well-known/security.txt" "text/plain"
  check_route "/index.md" "text/markdown"
}

# Gate: live exercise --------------------------------------------------------
#
# Behavioral: /api/grok is a hardened SSR endpoint that fails closed on
# Turnstile. A caller with no token must never reach the upstream xAI call --
# it gets 403, identical to a caller with an invalid token (apps/web/src/
# pages/api/grok.ts).

gate_live() {
  header "Live exercise (Turnstile-gated API)"
  local code
  code=$(curl "${CURL_AUTH[@]}" -sSo /dev/null -w '%{http_code}' --max-time 10 \
    -X POST "$BASE_URL/api/grok" \
    -H 'Content-Type: application/json' \
    -d '{"question":"smoke test"}' || echo "000")
  if [[ "$code" == "403" ]]; then
    gate_pass "POST /api/grok (no token) -> HTTP 403 (fails closed)"
  else
    gate_fail "POST /api/grok (no token)" "HTTP $code (expected 403)"
  fi
}

# Main -----------------------------------------------------------------------

gate_transport
gate_contract
gate_live

if [[ -n "$RESULT_FILE" ]]; then
  printf "%d %d %d\n" "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT" >"$RESULT_FILE"
else
  print_summary
fi

[[ $FAIL_COUNT -eq 0 ]] || exit 1
