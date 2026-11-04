#!/usr/bin/env bash
#
# curl one path on staging through Cloudflare Access, for the manual checks in
# RELEASES-PREFLIGHT.md. Reads the service token with `op read` and sends it only
# after a request without it shows Access still answers, because Access is what
# strips these headers before the Worker runs.
#
# Usage:
#   scripts/release/staging-curl.sh <path> [curl output options]
#
# Example:
#   scripts/release/staging-curl.sh /llms.txt -o /dev/null -w '%{http_code}\n'
#
# The path must start with /, so it cannot change the host. A second URL is
# refused, and --max-redirs 0 comes after the caller's options, so -L cannot carry
# the headers off staging.
#
# Exit codes:
#   0 = curl succeeded, or curl's own status when it did not
#   1 = Access is not answering, so the token was withheld and never read
#   2 = usage error
#
# Dependencies:
#   - curl and the 1Password CLI (op) on PATH

set -euo pipefail
# A traced run would print the token.
{ set +x; } 2>/dev/null

# shellcheck disable=SC1091  # sibling _lib.sh, always vendored alongside
. "$(dirname "$0")/_lib.sh"

# usage [CODE]: prints the header and exits CODE, 2 (a usage error) by default;
# --help passes 0.
usage() {
  print_usage_header
  exit "${1:-2}"
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage 0
route="${1:-}"
[[ "$route" == /* ]] || usage
shift
for arg in "$@"; do
  if [[ "$arg" == *://* ]]; then
    echo "staging-curl: pass a path and curl output options, not a second URL" >&2
    exit 2
  fi
done

access=$(curl -q -sS -o /dev/null --max-time 10 -w '%{http_code} %{redirect_url}' "$STAGING_URL_DEFAULT/" || true)
case "$access" in
  401\ * | 403\ * | 3??\ */cdn-cgi/access/*) ;;
  *)
    echo "staging-curl: Access is not answering for $STAGING_URL_DEFAULT (HTTP ${access%% *}), so the token was withheld" >&2
    exit 1
    ;;
esac

# 3pjk4ix2jxratdogd6viheavoi: CF Service Token - Surface Smoke (lmgroktfy), vault secrets-dev
# printf is a builtin, so the values reach only the pipe -K reads, never an argv.
curl -q -K <(printf 'header = "CF-Access-Client-Id: %s"\nheader = "CF-Access-Client-Secret: %s"\n' \
  "$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_id")" \
  "$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_secret")") \
  -sS --max-time 10 "$@" --max-redirs 0 "$STAGING_URL_DEFAULT$route"
