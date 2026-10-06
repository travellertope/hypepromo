# Promoet — Engineering Standards

> This doc is the checklist every PR is measured against. If a decision here needs revisiting, update the doc and note why — don't just deviate silently.

---

## 1. Architecture principles

- **Monolith first.** One Fastify process. Extract a service only when a module has a distinct scaling or deployment requirement that the monolith genuinely cannot meet.
- **Edge for speed, server for trust.** The Cloudflare Worker only redirects and enqueues. It never writes money. All billing decisions live in the API.
- **The ledger is the source of truth.** No balance is stored anywhere except as a derived cache of the double-entry ledger. If a cache is stale, the ledger wins.
- **All money in kobo, all amounts `BIGINT`.** No `FLOAT`, no `DECIMAL` for money. `₦1 = 100 kobo`. Arithmetic is always integer. Display formatting happens at the view layer only.
- **Async by default for non-critical paths.** Click scoring, XP updates, notifications — enqueue, respond fast, process in the background. The redirect must never block on the database.

---

## 2. Security standards

### Authentication & authorisation
- Supabase Auth issues JWTs. The API verifies every JWT on every request via `@fastify/jwt`. No request bypasses auth except the health endpoint and the webhook endpoints (which verify a shared secret instead).
- Role is embedded in the JWT claims (`creator` | `advertiser` | `admin`). Each route guard checks the role before touching the database.
- Admin routes require `role = admin` AND a second factor (TOTP). No admin action is allowed from a creator or advertiser session even with a valid JWT.
- Principle of least privilege: each DB role (`api_creator`, `api_advertiser`, `api_admin`) has only the permissions its surface needs. Row-Level Security (RLS) is the fallback, not the primary control.

### Input validation
- Every request body, query string and path param is validated with **Zod** at the route level before any handler logic runs. Unknown keys are stripped (`z.object({}).strip()`).
- Never trust client-supplied amounts, IDs or statuses. Recompute them from the database.
- `creator_unit_kobo` is always computed server-side as `floor(unit_price_kobo × 7500 / 10000)`. The client never sends it.

### SQL / injection
- All queries go through **Drizzle ORM**. Raw SQL is allowed only in migrations and in ledger balance queries that need explicit locking (`SELECT ... FOR UPDATE`). Raw SQL must use parameterised queries — never string concatenation.

### Click fraud
- The edge Worker attaches IP, ASN, JA4 fingerprint and Cloudflare bot score to every click event before enqueuing. The scoring worker applies rules 0–9 (see `ARCHITECTURE.md §5.3`) asynchronously.
- Rule 0 is synchronous at the edge: link-preview crawlers (WhatsApp, facebookexternalhit, TelegramBot, Twitterbot, LinkedInBot) are **never** enqueued. They get a 200 with an OG-tag page and are discarded.
- The `pm_vid` dedup cookie is `HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`. It is set by the redirect Worker, not by JavaScript.

### Secrets
- No secret is ever committed to git. All secrets live in environment variables loaded at runtime.
- `.env` is in `.gitignore`. `.env.example` lists every key with a placeholder value and a comment explaining what it is.
- Supabase service-role key is never sent to the browser. The client uses only the publishable anon key.
- Paystack secret key is used server-side only (API and workers). Webhook payloads are verified with `X-Paystack-Signature` (HMAC-SHA512).

### HTTP hardening
- `@fastify/helmet` is applied globally (sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.).
- `@fastify/cors` allows only `promoet.com` and `*.promoet.com` in production.
- `@fastify/rate-limit` is applied globally (100 req/min per IP by default) and tightened per route (auth: 10/min, withdrawal: 5/min).
- The API is not directly internet-facing in production: Render's proxy handles TLS termination. The API only trusts `X-Forwarded-For` after validating that the request came through the expected proxy.

### Payments
- Advertiser funding flow: amount is grossed up server-side to cover Paystack fees. The advertiser sees the exact total before confirming. The API verifies the Paystack charge webhook before crediting the advertiser wallet.
- Creator withdrawals: ops approval required before any transfer is initiated. Transfer amount is taken from the ledger balance, not from a client-supplied number.
- All Paystack webhook events are idempotent: processed events are stored with their reference; a duplicate reference is silently ignored.

### Uploads
- Creative uploads go directly to Supabase Storage via a signed upload URL. The API generates the signed URL after validating file type (image/jpeg, image/png, image/webp, video/mp4) and size limit (images ≤ 10 MB, videos ≤ 100 MB) — the client never uses the service-role key.
- File names are replaced with UUIDs on upload; the original filename is never exposed in a public URL.

---

## 3. Code standards

- **TypeScript strict mode everywhere.** `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`. No `any`. If you need to escape the type system, use `unknown` and narrow explicitly.
- **Shared Zod schemas in `packages/schemas`.** A schema defined once is used for validation in the API and for type inference in the web app. Never redefine the same shape in two places.
- **Error handling:** Fastify's error handler returns a JSON body `{ error: string, code: string }`. Unhandled promise rejections crash the process (let the host restart it — don't swallow errors silently).
- **No magic numbers for money.** Constants like `CREATOR_SHARE_BPS = 7500` and `BPS_DENOMINATOR = 10000` live in `packages/config/src/constants.ts` and are imported everywhere.
- **Tests for the ledger first.** The ledger module has property-based tests (fast-check) verifying double-entry balance before any other feature is tested. A test that touches money must run against a real transaction (use Supabase's local dev stack or a test DB, not mocks).

---

## 4. Environments

| Env | DB | Notes |
|---|---|---|
| `development` | Local Supabase (`supabase start`) or a personal branch | Migrations applied with `db:push` |
| `preview` | Supabase branch DB (one per PR) | Created by CI |
| `production` | `zsbwmafckgqgjrsdnkkw.supabase.co` | Migrations applied by CI on merge to `main` only |

- **Never run migrations directly against production** from a local machine. Production migrations run through the CI pipeline after a PR is merged to `main`.
- Feature flags are a single `config` table row in Postgres (`vat_enabled`, `waitlist_mode`, etc.). No external flag service at launch.

---

## 5. Git & CI

- Branch naming: `feat/`, `fix/`, `chore/`, `db/` prefixes.
- Every PR runs: typecheck → lint → tests. No merge if any check is red.
- Database migrations live in `packages/db/migrations/` and are committed with the PR that needs them. Migrations are forward-only (no down migrations in production — write a new migration to fix a bad one).
- Secrets are never in commit messages, PR descriptions or comments.
