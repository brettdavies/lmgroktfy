#!/usr/bin/env bash
# lmgroktfy HTTP surface smoke. Invoked against any base URL -- the
# orchestrators call this same script with different URLs:
#
#   scripts/release/preflight.sh surface-smoke                -> staging (https://dev.lmgroktfy.com)
#   scripts/release/postflight.sh --env staging surface-smoke -> staging (https://dev.lmgroktfy.com)
#   scripts/release/postflight.sh --env prod    surface-smoke -> prod (https://lmgroktfy.com)
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

. "$(dirname "$0")/_lib.sh"

# Argument parsing -----------------------------------------------------------

BASE_URL=""
RESULT_FILE=""

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \?//'
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --result-file)
      RESULT_FILE="$2"
      shift 2
      ;;
    -h | --help) usage ;;
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

# Gate: transport reachable ---------------------------------------------------

gate_transport() {
  header "Transport reachable at $BASE_URL"
  local code
  code=$(curl "${CURL_AUTH[@]}" -sSo /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL/" || echo "000")
  if [[ "$code" == "200" ]]; then
    gate_pass "$BASE_URL/ -> HTTP $code"
  else
    gate_fail "$BASE_URL/" "HTTP $code (expected 200)"
  fi
}

# Gate: contract ---------------------------------------------------------
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

# Gate: live exercise ----------------------------------------------------
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

# Main -------------------------------------------------------------------

gate_transport
gate_contract
gate_live

if [[ -n "$RESULT_FILE" ]]; then
  printf "%d %d %d\n" "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT" >"$RESULT_FILE"
else
  print_summary
fi

[[ $FAIL_COUNT -eq 0 ]] || exit 1
