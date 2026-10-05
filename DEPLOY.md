# Deploying zen-proxy (serverless)

This fork adds a Vercel entrypoint: `api/index.mjs` + `vercel.json`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `PROXY_KEY` | **Recommended** | Bearer token for clients (your local orchestrator). Locks `/v1/*`, dashboard, and `/api/*`. `/health` stays public. |
| `ZEN_KEY` | Optional | Default opencode BYOK key (`Bearer public` if unset). |
| `ZEN_UA` | Optional | Default `opencode/1.18.30`; `AUTO_UA=1` refreshes from npm when enabled. |
| `FALLBACK_MODELS` | Optional | JSON array; shipped defaults work if omitted. |
| `TRUST_FORWARDED` | Optional | Leave **unset/0** if you want each deploy’s own egress IP for opencode quotas. |
| `AUTO_SYNC` | Optional | Default **off** on Vercel (`VERCEL=1`). Set `AUTO_SYNC=1` to probe models on cold starts (slow). |
| `TIMEOUT_MS` | Optional | Default 120000; `maxDuration` is **300s** (Pro). Hobby caps at 60s regardless of config. |

`VERCEL=1` enables serverless mode: no persistent `zen-proxy.json`; dashboard edits apply only to the current invocation.

## Orchestrator wiring

Point each backend in `zen-orchestrator/orchestrator.json` at:

- `url`: `https://<project>.vercel.app`
- `proxyKey`: same as `PROXY_KEY` on that project

Clients talk to `http://127.0.0.1:4000/v1` with the orchestrator `listenKey`.

## Smoke test

```bash
curl -s "https://<project>.vercel.app/health"
curl -s "https://<project>.vercel.app/v1/models" -H "Authorization: Bearer $PROXY_KEY"
```
