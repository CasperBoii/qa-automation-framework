# API-Driven Test-Data Seeding (detail)

> **Portfolio note:** real endpoints, tokens, and account names are redacted and replaced with
> generic placeholders (`/api/<resource>`, `<token>`). The transferable engineering — the seeding
> strategy and the hard-won robustness rules — is intact.

The single biggest unlock for stateful features. When a test needs an entity (order, account, …)
in a **precise state** you can't find reliably in existing data, **mint it on demand via the
backend API** using Playwright's native `request` — so the test is deterministic, repeatable, and
parallel-safe.

Use this for any feature whose precondition is "an X already in state Y" (e.g. a delivered order,
a refund-requested order, an under-review item, an approved item, …).

## When to seed (decision)

| Situation | Strategy |
|-----------|----------|
| Data exists + stable + read-only test | Use it directly (cheapest) |
| Need a precise/short-lived state, or test **mutates** it | **Seed a fresh throwaway entity per run** |
| State depends on time windows (N-day) | Seed + a time/dev hook (see "Time-dependent") |
| State only lives in DB / not UI-reachable | Seed + assert at the API layer |

A destructive test (confirm, reject, cancel, approve) is fine **once you can seed** — seed a
disposable entity, mutate it, discard. Don't avoid the AC; isolate its blast radius.

## Why Playwright native `request` (not axios)

- Self-contained in the test repo — no extra dependency, no cross-repo coupling.
- `request.newContext()` has its own **cookie jar** (handles refresh-token cookies automatically).
- Port the *logic* from the backend's API spec, but re-implement the minimal chain you need.

## Anatomy of the seeder (`tests/seeding/seed-*.ts`)

A tiny request helper + per-role login + a compose-able chain. Skeleton (endpoints generic):

```ts
import { request, type APIRequestContext } from '@playwright/test';
const API = process.env.API_URL ?? 'https://staging-api.example.com';

function newContext() {
  return request.newContext({ extraHTTPHeaders: {
    // gateway / bot-protection headers, all from env — never hard-code a real token
    'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET ?? '',
  } });
}
async function api(ctx, method, url, opts = {}) {
  // throws on !ok with body; sets Authorization from opts.token; array params → URLSearchParams; res.json()
}
async function loginAs(ctx, role) {
  // POST /api/auth/login {credentials} → cookie; POST /api/auth/get-access-token → { accessToken }
}
```

## Discovering a feature's own endpoints

For a brand-new feature not yet in the API spec, capture the calls from the live UI with a **temp
capture spec**, then port them:

1. Seed a base entity; open a browser context with the role's `storageState`.
2. `page.on('request' | 'response', …)` filtering the API host.
3. Drive the UI action (click → confirm); log `method url postData()`.
4. Read the request body to learn the payload, then add a seeding step.
5. Delete the throwaway capture spec afterward.

## Compose a state ladder

Build small steps, then compose — each higher state calls the lower seeder:

```
seedDeliveredOrder()       → buy + mark-delivered
seedRefundRequestedOrder() → seedDeliveredOrder      + requestRefund
seedUnderReviewOrder()     → seedRefundRequestedOrder + markUnderReview
seedApprovedOrder()        → seedUnderReviewOrder     + approve
seedRejectedOrder()        → seedUnderReviewOrder     + reject
```

## Robustness rules (each one cost a debugging cycle — bake them in)

| Rule | Why | How |
|------|-----|-----|
| **Correlate by stable id, not "newest"** | Parallel seeds create concurrent entities → "newest" picks another worker's | Match `entity.id.startsWith(<correlationId>)`, not `list[0]` |
| **Retry the whole seed on transient 5xx** | Shared staging 504s under load / on recovery | Wrap in a 3× retry — **safe only if the flaky step is pre-side-effect**; else make the step idempotent |
| **Tolerate "already in state" errors** | Retried POSTs may hit `already-exists` / `already-…` | Treat those substrings as success |
| **Guard heterogeneous list payloads** | A list mixing item types throws on `o.sub.id` | Optional-chain: `o.sub?.id` |
| **Dynamic timestamps** | Hardcoded dates rot | `new Date().toISOString()` |
| **Bump heavy-call timeouts** | Some calls are slow post-outage (15s too tight) | 30s on checkout/settlement-style calls |
| **Read state back by id, not from a list** | Lists are paginated/sorted (backdated entities sort old → not found) | Direct `GET /api/<resource>/{id}` |
| **Reuse a stable account + its existing setup; only the entity is disposable** | Re-creating a user / address / config every run is slow and piles up junk | Log in as a fixed test account; reuse existing default setup, create only if missing |

## Using a seeder in specs

- Non-destructive read of one state → seed **once** in `beforeAll` (`test.setTimeout(120_000)`),
  share via `test.describe.configure({ mode: 'serial' })`.
- Destructive (mutates the entity) → seed **fresh per test** in `beforeEach`.
- Need several states at once → seed in parallel: `const [a,b] = await Promise.all([seedX(), seedY()])`.
- **API-only tests are valid** — a seeding-API + state-read-API assertion with no browser is the
  right test for backend-logic ACs and states the UI collapses (see "Test-layer selection" in standards.md).

## Time-dependent state

- Prefer a **test/dev time hook** exposed by the backend to move an entity's clock.
- **Verify the hook actually drives the AC's clock** — a generic `updatedAt` often does *not* move the
  specific field a business rule keys off. When no available hook controls that field → **raise a
  backend ask** (a dev hook to set the field / force the scheduled job), don't fake it.

## Operational

- **Limit workers** on the full suite (`--workers=4`); default workers fire too many concurrent seeds
  and overload shared staging (504s beyond retries).
- **Staging outage?** A "no healthy upstream" / 503 affects auth too. Poll a lightweight endpoint until
  recovery, then run — report it as infra, not a code bug.
- Seeded entities pollute shared paginated lists — self-seed so your entity is page 1, or assert by
  direct URL / API id (see the pagination anti-pattern in standards.md).
