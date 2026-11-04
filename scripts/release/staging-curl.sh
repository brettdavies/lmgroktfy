#!/usr/bin/env bash
#
# curl one path on staging through Cloudflare Access, for the manual checks in
# RELEASES-PREFLIGHT.md. Reads the service token with `op read` and sends it only
# after a request without it shows Access still answers that path, because Access
# is what strips these headers before the Worker runs.
#
# Usage:
#   scripts/release/staging-curl.sh <path> [options]
#
# Example:
#   scripts/release/staging-curl.sh /llms.txt -o /dev/null -w '%{http_code}\n'
#
# The path must start with /, so it cannot change the host. Only these curl options
# are accepted: -o, -D, -w, -X, -H, -d, -I, --suppress-connect-headers. Anything else
# is refused, because curl hands the headers to every URL it is given (a bare host,
# --url, --next), to any host a config or proxy names, and across a followed redirect,
# and -v and --trace print them.
#
# Exit codes:
#   0 = curl succeeded, or curl's own status when it did not
#   1 = Access is not answering, so the token was withheld, or op read failed
#   2 = usage error, or a credential holding a character outside [A-Za-z0-9._-]
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

options=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o | -D | -w | -X | -H | -d)
      [[ $# -ge 2 ]] || usage
      options+=("$1" "$2")
      shift 2
      ;;
    -I | --suppress-connect-headers)
      options+=("$1")
      shift
      ;;
    *)
      echo "staging-curl: option not allowed: $1" >&2
      usage
      ;;
  esac
done

url="$STAGING_URL_DEFAULT$route"

access=$(curl -q -sS -o /dev/null --max-time 10 -w '%{http_code} %{redirect_url}' "$url" || true)
case "$access" in
  3??\ */cdn-cgi/access/*) ;;
  *)
    echo "staging-curl: Access is not answering for $url (HTTP ${access%% *}), so the token was withheld" >&2
    exit 1
    ;;
esac

# 3pjk4ix2jxratdogd6viheavoi: CF Service Token - Surface Smoke (lmgroktfy), vault secrets-dev
if ! id=$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_id") \
  || ! secret=$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_secret"); then
  echo "staging-curl: op read failed, so no request carried the token" >&2
  exit 1
fi
# A curl config is line-oriented and quoted: a newline in a value adds an option,
# such as a second url that receives the headers.
if [[ ! "$id$secret" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "staging-curl: a credential holds a character outside [A-Za-z0-9._-]" >&2
  exit 2
fi

# printf is a builtin, so the values reach only the pipe -K reads, never an argv.
curl -q -K <(printf 'header = "CF-Access-Client-Id: %s"\nheader = "CF-Access-Client-Secret: %s"\n' "$id" "$secret") \
  -sS --max-time 10 "${options[@]}" "$url"
