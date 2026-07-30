# Astro on Cloudflare Workers — cutover & rollback runbook

Operator reference for promoting the Astro build to production and rolling back if the promotion misbehaves.

## Topology

Both environments are Cloudflare **Workers** deployed from `apps/web/wrangler.jsonc`:

| Environment | Worker name         | Serves                               | Custom domains                       |
| ----------- | ------------------- | ------------------------------------ | ------------------------------------ |
| staging     | `lmgroktfy-staging` | `dev.lmgroktfy.com`                  | `dev.lmgroktfy.com`                  |
| production  | `lmgroktfy`         | `lmgroktfy.com`, `www.lmgroktfy.com` | `lmgroktfy.com`, `www.lmgroktfy.com` |

`lmgroktfy.com` and `www.lmgroktfy.com` are already custom domains bound to the `lmgroktfy` Worker (AAAA `100::`,
proxied, worker-managed). Production cutover is an **in-place update of that Worker** — `deploy:prod` replaces the code
the existing domains already route to. No DNS change is part of a production cutover.

`CLOUDFLARE_ENV` selects the environment at build time: it picks the per-environment Turnstile site key baked into the
prerendered HTML and the `_headers` file (HSTS is emitted only when `CLOUDFLARE_ENV=production`).

## Secrets

Each Worker holds two secrets, set with `wrangler secret put <NAME> --env <env>`:

| Secret                 | 1Password item                     | Field     |
| ---------------------- | ---------------------------------- | --------- |
| `API_KEY`              | `LM Grok TFY`                      | `API Key` |
| `TURNSTILE_SECRET_KEY` | `lmgroktfy Turnstile (production)` | `secret`  |

Pipe the value straight from 1Password into `wrangler` so it never lands on a shell argv or in the environment:

```bash
op read "op://secrets-dev/LM Grok TFY/API Key" | bunx wrangler secret put API_KEY --env production
op read "op://secrets-dev/lmgroktfy Turnstile (production)/secret" | bunx wrangler secret put TURNSTILE_SECRET_KEY --env production
```

`API_KEY` and `TURNSTILE_SECRET_KEY` are a matched pair with the values baked at build time: the production site key is
compiled into the HTML, so its verifying secret must be the production Turnstile secret. The canary's
`CANARY_XAI_API_KEY` GitHub secret is a copy of the same xAI key — rotate the two together.

## Pre-cutover checklist

1. Staging is green. `deploy:staging` succeeds, `https://dev.lmgroktfy.com/` serves the Astro build with the staging
   site key baked in, a tokenless `POST /api/grok` returns `403`, and the security headers are present with no HSTS.
2. Manual real-challenge check on staging. In a browser at `https://dev.lmgroktfy.com`, solve the live Turnstile
   challenge, submit a question, and confirm an answer renders. A managed challenge cannot be solved headlessly, so this
   path is verified by hand, not by the e2e suite.
3. Production secrets are set (`wrangler secret list --env production` shows `API_KEY` and `TURNSTILE_SECRET_KEY`).
4. Rollback target is captured (see below).

## Capture the rollback target (before cutover)

Record the currently-active production version so it can be restored verbatim:

```bash
bunx wrangler deployments list --env production   # note the active Version ID
```

Keep that Version ID for the session. It is the last known-good build to roll back to.

## Cutover

```bash
bun run deploy:prod
```

`deploy:prod` builds `apps/web` with `CLOUDFLARE_ENV=production` and runs `wrangler deploy --env production`, replacing
the `lmgroktfy` Worker in place.

## Post-cutover verification

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://lmgroktfy.com/
curl -s https://lmgroktfy.com/ | grep -o 'data-sitekey="[^"]*"'          # expect the production site key
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://lmgroktfy.com/api/grok \
  -H 'Content-Type: application/json' -d '{"question":"hi"}'              # expect 403 (fail-closed)
curl -s -D - -o /dev/null https://lmgroktfy.com/ | grep -i strict-transport   # expect HSTS present in production
```

Then run the manual real-challenge check against `https://lmgroktfy.com` (solve Turnstile → submit → answer renders),
and run the canary against production once as an end-to-end probe:

```bash
CANARY_XAI_API_KEY="$(op read 'op://secrets-dev/LM Grok TFY/API Key')" bun run scripts/canary.ts
```

## Bake window

Leave the new build serving production for the agreed bake window. Watch the nightly canary and error rates across the
window.

## Rollback

If production misbehaves, redeploy the captured known-good version:

```bash
bunx wrangler rollback --env production                    # interactive: pick the previous version
# or, non-interactively, target the captured Version ID:
bunx wrangler versions deploy <VERSION_ID> --env production
```

Rollback restores the Worker code only. It does not touch DNS or the custom-domain bindings, which stay attached to the
`lmgroktfy` Worker throughout.
