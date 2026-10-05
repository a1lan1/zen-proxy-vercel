# Deploying zen-proxy (serverless)

Fork entrypoint: **`api/index.mjs`** + **`vercel.json`** (rewrite всех путей на API).

Общая архитектура zen-fly: [../README.md](../README.md). Локальный шлюз: [../zen-orchestrator/README.md](../zen-orchestrator/README.md).

---

## Что делает деплой

- Тот же **`zen-proxy.mjs`**, но без `listen()` — обработчик **`router(req, res)`**.
- **`VERCEL=1`** (ставится автоматически) включает **serverless-режим**:
  - конфиг только из **переменных окружения** (файл `zen-proxy.json` не читается/не пишется);
  - изменения через дашборд **`PUT /api/config`** живут только до конца текущего invocation;
  - **auto-sync** моделей по умолчанию **выключен** (cold start + много probe-запросов).

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `PROXY_KEY` | **Да** (для production) | Bearer для orchestrator. Закрывает `/v1/*`, `/`, `/api/*`. **`/health` открыт.** |
| `ZEN_KEY` | Optional | BYOK: default `Authorization` к opencode вместо `public`. |
| `ZEN_UA` | Optional | Default `opencode/1.18.30`. |
| `AUTO_UA` | Optional | `1` — подтягивать версию opencode с npm (может писать в in-memory config). |
| `INJECT_SESSION` | Optional | `0` — не генерировать `x-opencode-session` (обычно оставить включённым). |
| `FALLBACK_MODELS` | Optional | JSON-массив id моделей; иначе встроенный список. |
| `MODEL_ALIASES` | Optional | JSON object. |
| `DEFAULT_MODEL` | Optional | Пусто = auto из healthy free models. |
| `TRUST_FORWARDED` | Optional | **`0` / не задавать** — opencode видит IP **egress деплоя** (нужно для нескольких инстансов). `1` — доверять `X-Forwarded-For` (редко на serverless). |
| `AUTO_SYNC` | Optional | На Vercel default **off**. `AUTO_SYNC=1` — probe всех free models при старте invocation. |
| `TIMEOUT_MS` | Optional | Default **120000**. Upstream fetch; не отменяет лимит **Vercel maxDuration**. |
| `ZEN_SERVERLESS` | Optional | `1` — serverless без Vercel (Fly, Lambda и т.д.). |

Явно задать serverless локально (тест): `ZEN_SERVERLESS=1 node api/index.mjs` — не сработает без adapter; для локальной разработки используй `node zen-proxy.mjs`.

---

## Duration и streaming

В репозитории:

| Файл | Настройка |
|---|---|
| `api/index.mjs` | `export const config = { maxDuration: 300 }` |
| `vercel.json` | `functions.api/index.mjs.maxDuration: 300` |

- **Vercel Pro:** до **300 s** на функцию.
- **Vercel Hobby:** платформа **обрежет до 60 s** независимо от конфига.
- **`TIMEOUT_MS=120000`** может быть больше, чем `maxDuration` — для streaming решает **min(maxDuration, TIMEOUT_MS)**.

Рекомендация: для агентов со streaming на Hobby планируй короткие turn’ы или хост с большим лимитом (Fly, VPS + `node zen-proxy.mjs`).

---

## Несколько инстансов

1. Один git → **несколько Vercel projects** (или разные хосты).
2. У каждого свой **`PROXY_KEY`** (можно один секрет на все — но разные ключи безопаснее).
3. **Не включай** `TRUST_FORWARDED`, если цель — **разные IP-квоты** opencode.
4. Зарегистрируй URL + ключи в **`zen-orchestrator/orchestrator.json`**.

Orchestrator при `429` / `FreeUsageLimit` / `5xx` пробует следующий backend.

---

## Сессии за orchestrator

Orchestrator шлёт **`x-zen-client-id`** (из заголовка клиента или hash IP+UA). zen-proxy держит стабильный **`x-opencode-session`** per client id в памяти instance (на cold start сессия новая — это нормально для serverless).

Клиент может передать:

- `x-zen-client-id: my-laravel-app`
- или уже готовый `x-opencode-session`

---

## Orchestrator wiring

В `orchestrator.json` для каждого backend:

```json
{
  "name": "zen-vercel-1",
  "url": "https://your-project.vercel.app",
  "proxyKey": "<тот же PROXY_KEY>"
}
```

Клиенты на Mac:

- `baseURL`: `http://127.0.0.1:4000/v1`
- `apiKey`: `listenKey` orchestrator

---

## Smoke test

```bash
export PROXY_KEY='your-secret'

curl -s "https://<project>.vercel.app/health"
curl -s "https://<project>.vercel.app/v1/models" -H "Authorization: Bearer $PROXY_KEY"

curl -s "https://<project>.vercel.app/v1/chat/completions" \
  -H "Authorization: Bearer $PROXY_KEY" \
  -H "Content-Type: application/json" \
  -H "x-zen-client-id: smoke-test" \
  -d '{"model":"mimo-v2.6-flash-free","stream":false,"messages":[{"role":"user","content":"hi"}]}'
```

Дашборд: `https://<project>.vercel.app/` с тем же Bearer.

---

## Локаль vs этот деплой

| Topic | `node zen-proxy.mjs` | Serverless |
|---|---|---|
| Порт | `8787` | HTTPS URL платформы |
| Persist config | `zen-proxy.json` | env + ephemeral UI |
| `maxDuration` | нет | 300 (Pro) / 60 (Hobby) |
| Документация upstream | [README.md](./README.md) | этот файл |
