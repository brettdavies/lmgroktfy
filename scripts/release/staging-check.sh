#!/usr/bin/env bash
#
# The manual checks in RELEASES-PREFLIGHT.md that need a request through Cloudflare
# Access. Each check names its own paths on STAGING_URL_DEFAULT and builds its own
# curl line, so no argument can carry the token anywhere else. Prints only each
# check's status and verdict, never a header, a cookie or a body: Access answers the
# token with a CF_Authorization cookie, a bearer credential.
#
# Usage:
#   scripts/release/staging-check.sh <check>
#
# Checks:
#   agent-json        /.well-known/agent.json answers 200 with a JSON content type
#   security-headers  / and a question path answer 200 with all six
#                     SECURITY_HEADERS (apps/web/src/lib/security-headers.ts) and no HSTS
#   site-key          / answers 200 and carries the staging Turnstile site key
#
# Reads the service token with `op read`, and sends it only after a request without
# it gets the Access login redirect on that path: Access is what strips these headers
# before the Worker runs, and nothing would strip them without it.
#
# Exit codes:
#   0 = the check passed
#   1 = the check failed, Access is not answering, or op read failed
#   2 = usage error, or a credential that is empty or holds a character outside
#       [A-Za-z0-9._-]
#
# Dependencies:
#   - curl and the 1Password CLI (op) on PATH

set -euo pipefail
# A traced run would print the token and the responses held in variables.
{ set +x; } 2>/dev/null

# shellcheck disable=SC1091  # sibling _lib.sh, always vendored alongside
. "$(dirname "$0")/_lib.sh"

# Public, and baked into the staging build: apps/web/src/lib/turnstile-sitekey.ts.
readonly STAGING_SITE_KEY="0x4AAAAAAEAmF7QdqUEQKt7L"

# usage [CODE]: prints the header and exits CODE, 2 (a usage error) by default;
# --help passes 0.
usage() {
  print_usage_header
  exit "${1:-2}"
}

[[ $# -eq 1 ]] || usage
case "$1" in
  -h | --help) usage 0 ;;
  agent-json | security-headers | site-key) check="$1" ;;
  *)
    echo "staging-check: unknown check: $1" >&2
    usage
    ;;
esac

# Loopback is the only plain http target, for the test server.
case "${STAGING_URL_DEFAULT:-}" in
  https://* | http://127.0.0.1:*) base="${STAGING_URL_DEFAULT%/}" ;;
  *)
    echo "staging-check: STAGING_URL_DEFAULT is not an https URL" >&2
    exit 2
    ;;
esac

# Cleared first: an exported variable keeps its export attribute when assigned, and
# would carry the token to curl.
unset id secret
id=""
secret=""
failed=0

pass() {
  printf '%s: %s: pass\n' "$1" "$2"
}

fail() {
  printf '%s: %s: FAIL\n' "$1" "$2"
  failed=1
}

read_token() {
  [[ -z "$id" ]] || return 0
  # 3pjk4ix2jxratdogd6viheavoi: CF Service Token - Surface Smoke (lmgroktfy), vault secrets-dev
  if ! id=$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_id") \
    || ! secret=$(op read "op://secrets-dev/3pjk4ix2jxratdogd6viheavoi/client_secret"); then
    echo "staging-check: op read failed, so no request carried the token" >&2
    exit 1
  fi
  # A curl config is line-oriented and quoted: a newline in a value adds an option,
  # such as a second url that receives the headers.
  if [[ -z "$id" || -z "$secret" || ! "$id$secret" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "staging-check: a credential is empty or holds a character outside [A-Za-z0-9._-]" >&2
    exit 2
  fi
}

# Records a failure and returns non-zero unless a request without the token gets the
# Access login redirect, so the token stays unread until Access has answered.
ready() {
  local label="$1" url="$2" out
  out=$(curl -q -g -s -o /dev/null --max-time 10 -w '%{http_code} %{redirect_url}' "$url" || true)
  if [[ ! "$out" =~ ^3[0-9][0-9]\ .*/cdn-cgi/access/ ]]; then
    fail "$label" "HTTP ${out%% *} without the token, not the Access login, so the token was withheld"
    return 1
  fi
  read_token
}

# printf is a builtin, so the values reach only the pipe -K reads, never an argv. -q
# keeps the operator's curl config out, so nothing follows a redirect or adds a proxy.
with_token() {
  curl -q -g -K <(printf 'header = "CF-Access-Client-Id: %s"\nheader = "CF-Access-Client-Secret: %s"\n' "$id" "$secret") \
    -s --max-time 10 "$@"
}

check_agent_json() {
  local url="$base/.well-known/agent.json" out code type
  ready "$check" "$url" || return 0
  out=$(with_token -o /dev/null -w '%{http_code} %{content_type}' "$url" || true)
  code="${out%% *}"
  type="${out#* }"
  if [[ "$code" != 200 ]]; then
    fail "$check" "HTTP $code"
  elif [[ "$type" != application/json* ]]; then
    fail "$check" "HTTP 200, not JSON"
  else
    pass "$check" "HTTP 200"
  fi
}

# Both delivery paths: / comes from the asset layer's _headers, and a question path
# from the Worker's middleware. --suppress-connect-headers keeps a proxy's CONNECT 200
# from reading as the response status. A 200 is what shows the request passed Access,
# because the login's 302 carries no HSTS either.
check_security_headers() {
  local route url verdict
  for route in / /preflight-smoke; do
    url="$base$route"
    ready "$check $route" "$url" || continue
    if verdict=$(with_token --suppress-connect-headers -D - -o /dev/null "$url" | awk '
      NR == 1 { status = $2 }
      { name = tolower($0); sub(/:.*/, "", name) }
      name == "strict-transport-security" { hsts = 1 }
      name ~ /^(content-security-policy|x-content-type-options|x-frame-options|referrer-policy|cross-origin-opener-policy|permissions-policy)$/ && !seen[name]++ { count++ }
      END {
        printf "HTTP %s, security headers %d/6, HSTS %s", (status == "" ? "000" : status), count, (hsts ? "present" : "absent")
        exit !(status == 200 && count == 6 && !hsts)
      }'); then
      pass "$check $route" "$verdict"
    else
      fail "$check $route" "$verdict"
    fi
  done
}

check_site_key() {
  local url="$base/" out code
  ready "$check" "$url" || return 0
  out=$(with_token -w '\n%{http_code}' "$url" || true)
  code="${out##*$'\n'}"
  if [[ "$code" != 200 ]]; then
    fail "$check" "HTTP $code"
  elif [[ "$out" != *"data-sitekey=\"$STAGING_SITE_KEY\""* ]]; then
    fail "$check" "HTTP 200, no staging site key"
  else
    pass "$check" "HTTP 200"
  fi
}

case "$check" in
  agent-json) check_agent_json ;;
  security-headers) check_security_headers ;;
  site-key) check_site_key ;;
esac

exit "$failed"
