# Promoet — System Plan & Architecture

> Status: **Planning draft v2** (2026-10-06): owner decisions applied (see §16)
> Source: the single-file prototype in [`prototype/index.html`](../prototype/index.html) (built under the working name "HypeQuest")

Promoet is a two-sided marketplace for Nigeria. **Advertisers** fund
campaigns that pay **per verified click (CPC)** or **per conversion (CPA)**.
**Micro-influencers ("creators")** pick up campaigns as *quests*, post the ad
assets on the platforms they choose (WhatsApp Status, X, Facebook, Instagram
Stories, Instagram bio link, Telegram) with a unique tracking link per
platform, and earn **75% of every billed click or conversion**. The
platform keeps 25% of the advertiser's budget as its service fee (VAT, once
it applies, is paid out of this share). Game mechanics (XP, levels, energy, leaderboards, guilds) drive engagement **and** double as the trust system.

---

## 1. What the prototype gets right, and what has to change

The prototype is a solid UX sketch. Moving it to a real product means these
changes:

| Prototype | Production |
|---|---|
| Creator and advertiser views mixed in one UI | Three separate surfaces: **Creator app**, **Advertiser portal**, **Admin console**, with role-based access |
| Wallet, XP and energy stored in `localStorage` | All money and progress live **on the server only**. The client is never trusted |
| `cpc * 0.85` with `toFixed(1)` (fractional naira, old 85/15 split) | Integer **kobo** amounts. A double-entry **ledger** is the source of truth for every balance |
| "Verified click web-hook" (simulated) | A real edge **redirect service**, an async **fraud-scoring pipeline**, and a **hold period** before earnings can be withdrawn |
| "Cash Out to Bank" toast | KYC, bank account name check, and Paystack/Flutterwave **transfers** |
| Hard-coded campaigns | Campaign lifecycle: draft → review → funded → live → paused/exhausted → closed |
| Energy (85/100) has no defined purpose | Energy **limits quest claims**, which stops link hoarding (§6) |
| ₦4M seasonal jackpot | Platform-funded, **skill-based** prize pool ranked on verified earnings (no element of chance, §11) |
| Tailwind CDN, `document.execCommand('copy')` | Built Tailwind with the same design tokens. `navigator.clipboard` with a fallback |

The visual identity carries over unchanged: the `cyber.*` and `brand.*`
colour tokens, Poppins, and the glass-panel cards.

---

## 2. Actors and surfaces

```mermaid
flowchart LR
  C[Creator<br/>mobile PWA] -->|claims quests, shares links, withdraws| PM[(Promoet)]
  A[Advertiser<br/>web portal] -->|funds campaigns, uploads assets, views analytics| PM
  V[Visitor<br/>clicks a link on WhatsApp/X/FB/IG/Telegram] -->|GET /r/code| PM
  OPS[Admin / Ops<br/>console] -->|moderation, fraud review, payouts| PM
  PM -->|302 redirect| LP[Advertiser landing page]
  PM <-->|charges, transfers, webhooks| PSP[Paystack / Flutterwave]
  PM <-->|KYC: BVN/NIN| KYC[KYC provider]
  PM -->|OTP, alerts| MSG[SMS / WhatsApp / Email / Web Push]
```

| Surface | Users | Main screens (mapped from the prototype) |
|---|---|---|
| **Creator app** (mobile-first PWA) | Influencers | Quests (`tab-quests`), Quest detail + link + media kit (`campaign-modal`), Loot Vault (`tab-vault`), Guild Rankings (`tab-guild`), Profile/KYC/Bank, Notifications |
| **Advertiser portal** | Brands and agencies (organisations with members) | Command Center (`tab-studio`), Create Campaign wizard (`advertiser-modal`), Wallet/Funding, Analytics, Invoices |
| **Admin console** | Internal ops | Campaign & creative review, Fraud queue, Payout approvals, User/KYC management, Ledger explorer, Season config |
| **Redirect edge** | Anonymous visitors | `https://pmt.ng/r/{code}`: no UI, or a challenge page only when traffic looks risky |

### Earnings display rule

Creators see **naira amounts, not percentages**. Every quest card, quest
detail screen and notification says what the creator gets, for example
**"You earn ₦375 per click"** or **"You earn ₦1,500 per signup"**. Creator
screens never show the advertiser's price or the platform's share. The
Vault shows the same naira figures.

- The amount is computed on the server (`creator_unit_kobo = floor(unit_price_kobo × creator_share_bps / 10000)`) and sent to the app ready to display, so the client never does the split.
- Advertisers see the full breakdown in the campaign wizard: the price per click they pay, the 25% commission, and the line **"Creators will see: You earn ₦X per click"**, so they can judge how attractive their offer is.
- The creator terms of service still state the commission plainly. The rule is about what quest screens emphasise, not about hiding the split.

---

## 3. High-level architecture

A **modular monolith** plus one **edge redirect worker**. The team is small
and the domain is money-sensitive, so the plan keeps few moving parts and
uses strong consistency in Postgres. Splitting into services can wait until a
real bottleneck shows up.

```mermaid
flowchart TB
  subgraph Edge["Cloudflare edge"]
    RW["Redirect Worker<br/>/r/:code"]
    KV[(Workers KV<br/>link → target cache)]
    CQ[[Cloudflare Queue<br/>click events]]
    RW --> KV
    RW --> CQ
  end

  subgraph App["Application (TypeScript)"]
    WEB["Next.js web app<br/>creator · advertiser · admin<br/>(Vercel)"]
    API["API (Fastify, modular monolith)<br/>auth · campaigns · quests · ledger · payouts · game"]
    WRK["Workers (BullMQ)<br/>click scoring · settlement · payouts · rollups · notifications"]
  end

  subgraph Data["Data"]
    PG[(PostgreSQL<br/>source of truth + ledger)]
    RD[(Redis<br/>queues · rate limits · leaderboards · budget counters)]
    S3[(Object storage R2/S3<br/>ad creatives, media kits)]
  end

  WEB -->|REST/JSON + session cookie| API
  API --> PG
  API --> RD
  API --> S3
  CQ -->|pull consumer| WRK
  WRK --> PG
  WRK --> RD
  API -->|publish link changes| KV
  API <-->|webhooks| PSP[Paystack]
  WRK -->|transfers| PSP
```

### Recommended stack

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** end-to-end | One language. Zod schemas shared between client and server |
| Monorepo | pnpm + Turborepo | `apps/*` and `packages/*` (§13) |
| Web | **Next.js (App Router)** + Tailwind + **Serwist** (PWA) | SSR for the advertiser/marketing pages, installable PWA for creators |
| API | **Fastify** + Zod + **Drizzle ORM** | Fast, explicit SQL control for ledger transactions |
| DB + Auth | **Supabase** (decided): Postgres, Auth (phone OTP), Storage. New project `promoet` in **eu-west-2 (London)** | ACID ledger, partitioning for clicks, row locks for budgets. Supabase has no African region; London has the best routes from Lagos |
| Cache/queues | **Redis** (Upstash or managed) + **BullMQ** | Jobs, rate limits, sorted-set leaderboards |
| Redirect | **Cloudflare Workers** + KV + Queues | Under 50 ms redirects near Lagos, bot score / ASN / TLS fingerprint signals at the edge, absorbs viral spikes |
| Storage | Supabase Storage for creatives (with its CDN). Move hot media to Cloudflare R2 if egress costs grow | One less vendor at launch |
| Payments | **Paystack** (primary), Flutterwave (fallback) | NGN card / transfer / USSD collection, NUBAN resolve, bulk transfers |
| KYC | Smile ID / Dojah / Prembly | BVN/NIN check and selfie liveness |
| Messaging | Termii (SMS + WhatsApp OTP), Resend (email), Web Push (VAPID) | Termii has good Nigerian delivery |
| Observability | OpenTelemetry → Grafana/Sentry, structured logs | Trace a click from the edge through scoring to the ledger |
| Infra-as-code | Terraform (Cloudflare, DB, Redis), GitHub Actions CI | Repeatable environments |

**How Supabase is used:**

- **Auth:** Supabase Auth with phone OTP. Termii is plugged in through Supabase's *Send SMS* auth hook if it isn't offered as a built-in provider. The API verifies Supabase JWTs.
- **Database:** the Fastify API and workers connect with a server-only role through the Supavisor pooler. Migrations are managed with Drizzle and the Supabase CLI.
- **RLS:** enabled on **every** table with deny-by-default. The browser may read a few harmless views directly (for example the public quest feed), but **every money path (ledger, budget, payouts, conversions) goes through the server-side API only.** No client SDK writes to those tables.
- **Branches:** Supabase branching for preview and staging databases.

---

## 4. Domain modules (inside the monolith)

Each module owns its own tables and exposes a TypeScript service interface.
Modules do not reach into each other's tables.

| Module | Responsibility |
|---|---|
| `identity` | Accounts, phone/email OTP, sessions, roles, organisations (advertiser teams), devices |
| `creator` | Creator profile, linked social accounts, niches, state/city, tier, KYC status, bank accounts |
| `campaigns` | Campaign CRUD, targeting, creatives, moderation state, budget and caps, lifecycle state machine |
| `quests` | Quest claims, referral links (short codes), post-proof submissions, eligibility checks |
| `tracking` | Click ingestion consumer, fraud rules engine, verdicts, conversion postbacks / pixel, per-platform quality scores |
| `ledger` | Double-entry accounts and journal, balance queries, holds and releases, reversals |
| `payments` | Paystack collections (advertiser funding), webhooks, transfers (creator payouts), reconciliation |
| `game` | XP, levels, energy, streaks, badges, seasons, leaderboards, guilds |
| `notifications` | In-app inbox, web push, SMS/WhatsApp, email, with preference handling |
| `admin` | Review queues, audit log, feature flags, configuration (fee %, hold days, limits) |
| `analytics` | Hourly/daily rollups for advertiser and creator dashboards |

---

## 5. Core flow: from click to payout

This flow is the whole business, and the main risk is **click fraud**. Most
of the engineering effort goes here.

### 5.1 Claiming a quest: platform first

The creator picks **where** they will post first, then gets a kit made for
that platform.

1. The creator opens a quest and sees the platforms the advertiser allowed (from the launch set below).
2. They **select one or more platforms** and tap **Accept Quest**. The client calls `POST /quests/{campaignId}/claim {platforms: ["whatsapp","instagram"]}`.
3. The API checks: campaign is `live` with budget left, creator meets the targeting rules (tier, niche, state, minimum level), creator has enough **energy** (the claim costs the base amount plus a little for each extra platform), and the platforms are allowed on this campaign.
4. For **each platform** the API creates a `referral_link` with its own **random 8-character base62 code** (unguessable, not derived from the username) and writes `code → {link_id, campaign_id, platform, target_url, status}` to Workers KV.
5. The response is a **kit per platform**:
   - creatives in that platform's format (§5.1.1);
   - a caption that fits the platform's length limit, with the link and `#ad`/`#sponsored` already in place;
   - **where to put the link** on that platform (table below), and a one-tap share button where the platform allows it.
6. The creator can add another platform to the same quest later. Each platform keeps its own stats, caps and quality score.

**Launch platforms.** Promoet supports only platforms where the creator can
put a clickable link in front of viewers without workarounds. TikTok and
Instagram Reels/feed posts are **not supported at launch** (captions aren't
clickable there). Platform rules change, so this table lives in config.

| Platform (`platform` value) | Creative format | Where the link goes | Notes |
|---|---|---|---|
| **WhatsApp Status** (`whatsapp_status`) | 9:16 image or short video | In the Status text/caption (clickable). One-tap "Share to WhatsApp" | Highest reach. Extra fraud controls (§5.9) |
| **X** (`x`) | 16:9 or 1:1 image | In the post (clickable). One-tap share via the X post intent URL | X is widely reported to show link posts to fewer people. Caption fits X's character limit |
| **Facebook** (`facebook`) | 1:1 or 4:5 image | In the post (clickable). One-tap share via Facebook's share dialog | Popular with older audiences |
| **Instagram Stories** (`instagram_story`) | 9:16 image or video | **Link sticker** on the Story. The app shows a short how-to (3 screenshots) | Story lasts 24 h, so creators can re-share while the quest is live |
| **Instagram bio link** (`instagram_bio`) | 4:5 / 1:1 feed post or 9:16 Reel, with "link in bio" in the caption | The creator's **Promoet bio page** set as their Instagram bio link | Lets creators promote from feed posts and Reels too |
| **Telegram** (`telegram`) | 1:1 or 16:9 image, caption ≤ 1,024 characters | In the message (clickable) in a channel or group **the creator owns or runs**. One-tap share via Telegram's share URL | Same extra fraud controls as WhatsApp (§5.9). Posting in other people's groups is spam and is banned in the creator terms |

**Promoet bio page.** An Instagram profile has only one bio link, so each
creator gets a page such as `pmt.ng/@ada` listing all their active Instagram
quests. They set it once as their bio link and never have to change it.
Opening the page is not billed. Tapping a quest on it goes through that
quest's `instagram_bio` link and counts as a normal click.

#### 5.1.1 Platform-ready creatives

- The advertiser uploads **one master image or video** in the campaign wizard. Promoet automatically produces each format (9:16, 4:5, 1:1, 16:9) with smart cropping or padding that keeps text out of the areas each app covers (such as the Story reply bar).
- The advertiser previews every version and can upload their own replacement for any platform.
- The caption is written once, then shortened or adjusted per platform (for example to fit X's character limit). The advertiser can edit each version.
- Creators can only select the platforms the advertiser enabled.

> The prototype's `?r=user_id&ad=campaign_slug` format leaks identities and
> can be tampered with. Use opaque codes instead.

### 5.2 The redirect (edge, hot path)

```mermaid
sequenceDiagram
  participant V as Visitor (in-app browser)
  participant W as Redirect Worker (edge)
  participant KV as Workers KV
  participant Q as Click Queue
  participant S as Scoring Worker
  participant DB as Postgres (ledger)
  participant LP as Landing page

  V->>W: GET /r/Xk29PqLm
  W->>KV: lookup code
  KV-->>W: link_id, campaign_id, target_url, status
  W->>W: collect signals (IP, ASN, country, UA, JA4, CF bot score, headers, pm_vid cookie)
  alt high-risk signals
    W-->>V: lightweight Turnstile challenge page, then continue
  end
  W-)Q: enqueue ClickEvent{click_id (ULID), link_id, signals, ts}
  W-->>V: 302 → target_url?pm_click=click_id  (+ Set-Cookie pm_vid)
  V->>LP: loads advertiser page
  Q-)S: batch of click events
  S->>S: run fraud rules → verdict
  S->>DB: insert click + verdict; if VALID: reserve budget + journal entries (pending)
```

- The worker **never blocks on the database.** It enqueues and redirects. If KV has no entry, it falls back to an API lookup. Paused or exhausted campaigns still redirect (so the visitor isn't left on a dead link) but are recorded as `not_billable`.
- `pm_click` is appended so advertisers can report conversions (§5.7).
- Click IDs are ULIDs: sortable and unique, and they double as idempotency keys.

### 5.3 Fraud rules (rules engine v1)

Each rule adds to a risk score or forces a verdict. The output is
`valid | invalid(reason) | review`.

| # | Signal | Rule |
|---|---|---|
| 0 | **Link-preview crawlers** (`WhatsApp/…`, `facebookexternalhit`, `Twitterbot`, `TelegramBot`, …) fetch the link when it is pasted | Serve Open Graph preview tags; **never** recorded as a click |
| 1 | Edge bot score / known bot UA / headless markers | Invalid |
| 2 | ASN is a datacenter, VPN or hosting provider | Invalid (high risk) |
| 3 | Geo outside campaign targeting (default: NG) | `not_billable` |
| 4 | Same visitor (`pm_vid` cookie, or a fingerprint hash of UA + accept-language + JA4 + IP /24) on the same **campaign** within 24 h, through *any* creator | Duplicate, not billable. This stops creators swapping links with each other |
| 5 | Visitor matches the **creator's own** device or session fingerprint | Invalid (self-click) |
| 6 | Link velocity is far above the creator's baseline, or clicks arrive in suspiciously regular intervals | `review`, and the link is auto-throttled |
| 7 | Very short time between link creation and a burst of clicks with no referrer from a social platform | Higher risk score |
| 8 | Per-creator daily cap per campaign (set by the advertiser) is reached | `not_billable` |
| 9 | Optional: landing-page beacon (advertiser adds a JS snippet) confirms the page actually loaded or stayed open more than 3 s | Turns "click" into "engaged click", which supports a higher CPC tier |

**Nigeria-specific caution:** MTN, Airtel and Glo use **carrier-grade NAT**,
so thousands of real people share one public IP. **Never deduplicate on IP
alone.** Treat IP as a weak signal and combine it with the cookie, UA and TLS
fingerprint. In-app browsers (Instagram, Facebook, WhatsApp, Telegram) often drop cookies
between sessions, so the fingerprint hash is the fallback.

Every verdict stores its reasons and the rule-set version. Clicks can be
**re-scored retroactively** during the hold period when rules get better.

### 5.4 Budget reservation

When a click is valid, one Postgres transaction does the following:

```sql
UPDATE campaigns
   SET spent_kobo = spent_kobo + :cpc
 WHERE id = :campaign_id
   AND status = 'live'
   AND spent_kobo + :cpc <= budget_kobo
RETURNING spent_kobo;
-- 0 rows → budget exhausted: click = not_billable, campaign → 'exhausted', purge KV
```

…followed by the journal entries in §7, all in the same transaction. Postgres
row-level locking makes concurrent clicks safe. At very high throughput (well
over 500 billable clicks per second on one campaign), switch to Redis
`DECRBY` pre-reservation with periodic settlement into Postgres.

### 5.5 Hold, release and clawback

**What the hold period is, in plain terms:** when a click is counted, the
creator sees the money straight away as **pending**. It becomes
**withdrawable** only after a waiting period. Fraud often shows up only in
hindsight: a burst of clicks from the same few phones, a creator who joined
a "click-for-click" WhatsApp group, a pattern that shows up after several days
of data. Once money has gone to a bank account it is practically impossible to
recover. The hold gives the system time to catch these cases and refund the
advertiser **before** anything leaves the platform.

Example (7-day hold):

| Day | What happens |
|---|---|
| Mon 6 Oct | Ada's link gets 120 valid clicks at ₦100 CPC → ₦9,000 shows as *pending* (75%) |
| Tue–Sun | Nightly re-scoring finds 20 clicks from a click farm → ₦1,500 reversed, ₦2,000 back to the advertiser's campaign |
| Mon 13 Oct | ₦7,500 moves to *available*; Ada can withdraw |

**Hold period: a flat 7 days for every creator**, whatever their level or
account age. It is simple to explain, and it's the same on every platform.

| Situation | When earnings become available |
|---|---|
| Clicks (all creators, all platforms) | **7 days** after the click |
| CPA conversions | When the conversion is approved (by the advertiser, or automatically after 14 days, §5.7) **and** is at least 7 days old |
| Any link currently under `review` | Frozen until reviewed, then follows the rule above |

The rules:

- Earnings land in the creator's **pending** balance. After **7 days** (a single config value), a settlement job moves them to **available**.
- If fraud is confirmed during the hold, the click is reversed: creator pending −, platform fee −, campaign escrow +. The advertiser only pays for clicks that survive the hold.
- After release, earnings are final for the creator. Fraud found later is handled through account action and future earnings, not negative balances.

### 5.6 Withdrawal

1. Creator adds a bank account. The API calls Paystack **Resolve Account Number** and requires the account name to fuzzy-match the KYC name.
2. `POST /payouts`: checks the minimum (₦1,000, §7.1), available balance, daily limit by KYC tier, and the account's cooling-off period after a bank change (24–72 h). The screen shows the Paystack transfer fee that will be deducted and the exact amount that will arrive.
3. Ledger: available → `payouts_in_transit` for the full amount requested. A job sends a Paystack **Transfer** for *amount − transfer fee*, using the payout ID as the idempotency reference. Paystack takes the fee from the balance, so the full requested amount leaves `psp_clearing`.
4. Webhook `transfer.success` → in_transit → cleared. `transfer.failed/reversed` → money goes back to available, and the creator is notified.
5. MVP: an admin approves payouts manually. Later: automatic approval below a risk threshold.


### 5.7 Pay per conversion (CPA), available at launch

A campaign is billed **either** per click **or** per conversion
(`billing_model = cpc | cpa`). With CPA, clicks are still tracked and scored,
but they cost nothing. The advertiser pays only when a conversion is reported
and approved. Advertisers trust this model more, and it is much harder to fake.

**Conversion types:** `signup/lead` (fixed payout), `purchase` (a fixed payout
or a % of order value), `app_install` (later, through an attribution provider
such as AppsFlyer or Adjust).

**No promo codes.** Conversions are tracked through the creator's link: the
redirect adds `pm_click` to the landing-page URL, and the advertiser's
pixel or server reports it back with the conversion. The visitor never types
anything, so it works on any website, with or without a discount-code field.

**How conversions are reported** (the advertiser chooses one or more in the
campaign wizard):

| Method | How it works | Best for |
|---|---|---|
| **Server-to-server postback** (recommended) | The advertiser's backend calls `POST /v1/conversions {click_id, event, order_id, value}` with an org API key | Anyone with a developer |
| **JS pixel** | A small `promoet.js` script on the landing page saves `pm_click` in a first-party cookie. The thank-you page fires `promoet('conversion', {...})` | Simple websites, landing builders |
| **Integrations** (later) | Shopify / WooCommerce plugins; app attribution providers | E-commerce, apps |

**Rules:**

- **Attribution:** last valid click wins, within a 7-day window by default (the advertiser can set 1–30 days).
- **Dedupe:** each `(campaign, order_id)` is counted once, and each visitor once per campaign for lead campaigns.
- **Approval window:** conversions arrive as *pending approval*. The advertiser can reject one with a reason (refund, fake signup) within **14 days**. After that it is **auto-approved**. This is shown to creators as part of the hold (§5.5).
- **Guarding against advertisers who under-report or reject unfairly:** track each advertiser's rejection rate and click → conversion rate. If it looks wrong, ops reviews it. Advertisers with high rejection rates lose access to top creators. Creators can see each campaign's approval rate before claiming.
- **Conversion fraud signals:** a conversion within seconds of the click, many conversions from one device, the same visitor converting through several creators, and email or phone patterns shared by many leads.
- **Billing:** the same budget-reservation transaction as for clicks, using `unit_price_kobo`. The 75/25 split applies.

### 5.8 Impressions (CPM): not offered

Promoet bills **only clicks and conversions**. Impressions happen inside
WhatsApp, X, Facebook, Instagram and Telegram, where Promoet can't count them.
Screenshots are easy to fake. The platform APIs that report views need long
app reviews, cost money on X, and don't exist for WhatsApp Status. Promoet
measures clicks and conversions itself, so every naira billed is backed by
its own data.

### 5.9 WhatsApp Status and Telegram

WhatsApp Status is Nigeria's largest "feed", and Telegram channels are popular
too. On both, Promoet can't see who the post reached. The
key point is that **for CPC and CPA campaigns, nothing needs to be verified
about the post itself.** Promoet pays for clicks and conversions that come
through the link, wherever it was shared. What these two make
harder is **fraud**: links pasted into big "click for click" groups, or sent
to friends who click out of politeness. The design (applies to both):

1. **Its own link.** Creators pick platforms first (§5.1), so a WhatsApp claim gets its own link (`/r/Wa7Hq2Zs`), separate from the same creator's Instagram link. Stats, caps and risk are tracked per platform.
2. **Share-ready kit.** A 9:16 Status image or video with the caption, link and `#ad` already composed. A one-tap "Share to WhatsApp" button (`https://wa.me/?text=…` on the web, the share sheet in the PWA). Open Graph tags on the link make the preview look good.
3. **Engaged clicks only.** For WhatsApp and Telegram links, a click is billable only if the landing-page beacon confirms the page loaded and stayed open for ≥ 3 seconds, or a conversion follows. This requires the advertiser's one-line script, so campaigns without it can only be CPA on these two platforms.
4. **Stricter limits:** lower per-creator daily caps on WhatsApp and Telegram until the creator builds a track record. Rules 4–6 in §5.3 apply per platform.
5. **Platform quality score.** For each creator and platform, compare downstream quality (dwell rate, conversion rate, reversal rate) with the campaign average. Low-quality links get throttled. High-quality sharers unlock higher caps and premium campaigns.
6. **Advertiser control.** Campaigns opt in to platforms. WhatsApp and Telegram are on by default for CPA and off by default for CPC.
7. **Optional post-proof:** a screenshot of the Status with the "seen by N" count earns a small amount of XP only, never money, because screenshots can be faked.
8. **WhatsApp Channels and Telegram channels** are treated like social accounts: the creator verifies ownership by posting a code, and the subscriber count counts toward their tier. Telegram links must be posted only in channels or groups the creator runs.

### 5.10 Self-serve advertisers from day one

Anyone can sign up as an advertiser, fund an account and launch a campaign
without talking to Promoet. That means the safeguards have to be automated:

| Risk | Safeguard |
|---|---|
| Scams, loan apps, Ponzi schemes, adult content | Prohibited-category policy shown in the wizard. Automatic checks: image and text moderation, landing URL against Safe Browsing, domain age, keyword rules. **Every campaign gets human review before going live**, with a target SLA of under 4 business hours. Edits to live campaigns go back to review |
| Stolen cards and chargebacks (card disputes can arrive months later) | **Verification tiers.** *Unverified*: card top-ups up to ₦200,000 in total. *Verified business* (CAC lookup by RC/BN number through the KYC provider, plus a director's BVN): no cap. Encourage **bank transfer** funding through Paystack dedicated virtual accounts, which can't be charged back |
| Advertisers gaming creators (rejecting genuine CPA conversions) | Approval-rate monitoring (§5.7) |
| Regulatory (ARCON) | The advertiser attests in the wizard. An ARCON reference field is required for regulated categories (finance, alcohol, health) |
| Support load | Clear wizard with budget calculator, help centre, and in-app chat (for example Crisp or Intercom) |

---

## 6. Gamification design (engagement that also builds trust)

Game state is earned **only from verified, settled activity**. Otherwise
fraudsters would farm levels the same way they farm clicks.

| Mechanic | Rules (initial; all configurable in admin) |
|---|---|
| **XP** | +10 when claiming a quest. +1 per valid click **after release** (daily cap). +50 the first time a quest gets 10 valid clicks. +25 for an approved post-proof. Daily login streak bonus. −XP when fraud is confirmed |
| **Levels** | XP curve `xp(L) = 100·L^1.6`. Levels unlock **trust perks** (the 7-day hold never changes): higher daily withdrawal limit, higher per-campaign caps, access to premium (higher-CPC) campaigns, more energy |
| **Energy** | Max 100 (more at higher levels). Claiming a quest costs 10–25 depending on campaign tier. Regenerates +1 every 15 min. This limits link spraying and pushes creators to pick campaigns they will actually post |
| **Streaks** | Days in a row with at least one valid click. Badges at 7, 30 and 100 days |
| **Badges** | Niche badges ("Tech Titan"), "First ₦10k", "Clean Record 90d" (no fraud flags) |
| **Seasons & leaderboards** | 4–8 week seasons. Ranked by **verified, released earnings** (not raw clicks). Global, by state (Lagos, Abuja…), by niche. Stored in Redis sorted sets and rebuilt nightly from Postgres |
| **Guilds** (Phase 3) | Teams of up to 20. Guild leaderboard, guild quests ("guild hits 5,000 valid clicks"), shared cosmetic rewards. Guild members cannot earn from each other's links |
| **Prize pool** | Platform-funded marketing budget paid to the top N at season end, after a fraud audit |

---

## 7. Money: the ledger

All amounts are `BIGINT` **kobo** (₦1 = 100 kobo). Every transaction is a
journal entry whose lines sum to **zero**. Balances are derived from journal
lines (with cached balance rows updated in the same transaction). There is no
free-floating `balance` column that code can change directly.

### Accounts

| Account | Type | Per |
|---|---|---|
| `psp_clearing` | asset | platform: money held at Paystack |
| `advertiser_wallet` | liability | advertiser org |
| `campaign_escrow` | liability | campaign |
| `creator_pending` | liability | creator |
| `creator_available` | liability | creator |
| `payouts_in_transit` | liability | platform |
| `platform_revenue` | revenue | platform |
| `vat_payable` | liability | platform |
| `promo_prize_pool` | expense | platform |

### Journal templates

| Event | Debit | Credit |
|---|---|---|
| Advertiser funds ₦1,000,000 net (pays ₦1,002,000 incl. Paystack fee; `charge.success`) | `psp_clearing` ₦1,000,000 | `advertiser_wallet` ₦1,000,000 |
| Campaign launched with ₦500,000 budget | `advertiser_wallet` | `campaign_escrow` |
| Valid click, CPC ₦500 (or approved conversion at ₦500) | `campaign_escrow` 50,000k | `creator_pending` 37,500k · `platform_revenue` 12,500k (split with `vat_payable` when VAT is on, §7.1) |
| Hold released | `creator_pending` | `creator_available` |
| Click reversed (fraud) | `creator_pending` · `platform_revenue` | `campaign_escrow` |
| Creator withdraws ₦20,000 (₦25 fee → ₦19,975 arrives) | `creator_available` ₦20,000 | `payouts_in_transit` ₦20,000 |
| Transfer succeeds (Paystack debits ₦19,975 + ₦25 fee) | `payouts_in_transit` ₦20,000 | `psp_clearing` ₦20,000 |
| Campaign closed with unspent budget | `campaign_escrow` | `advertiser_wallet` |
| Advertiser withdraws or refunds | `advertiser_wallet` | `psp_clearing` |

**Split rounding:** `creator = floor(cpc × 7500 / 10000)` and
`platform = cpc − creator`. The platform absorbs any rounding, and fee
percentages are stored per campaign so changing the fee never rewrites
history.

**Reconciliation:** a daily job compares the ledger's `psp_clearing` with the
Paystack balance and settlement reports, and alerts on any difference.

### 7.1 Fees, charges and minimums (decided)

**Platform fee:** 25% is taken **out of** the advertiser's budget. With a
₦100,000 budget at ₦100 CPC the advertiser buys 1,000 clicks, creators
receive ₦75,000 and Promoet keeps ₦25,000. Nothing is added on top.

**Paystack charges, paid by whoever moves the money:**

| Movement | Who pays | How it's applied |
|---|---|---|
| Advertiser adds funds | **Advertiser** | Grossed up at checkout: to put ₦B in the wallet the advertiser pays `A` so that `A − fee(A) = B`. At Paystack's published local rate (1.5% + ₦100, capped at ₦2,000): ₦50,000 → pay ₦50,863; ₦200,000 or more → pay B + ₦2,000. The fee schedule is stored in config, not hard-coded |
| Creator withdraws | **Creator** | Transfer fee deducted from the amount: ₦10 (≤ ₦5,000), ₦25 (₦5,001–₦50,000), ₦50 (> ₦50,000), plus any levy Paystack passes on. The exact amount that will arrive is shown before the creator confirms |

These fee figures come from current published pricing and should be checked
against the Paystack dashboard before launch.

**Tax setup (decided):**

| Topic | Decision |
|---|---|
| Promoet's role | **Agent.** Creators provide the promotion to the advertiser; Promoet runs the marketplace and charges a 25% service fee. VAT applies to the **25% fee only**, never to the creators' 75% |
| Pricing | **VAT-inclusive.** Nothing is added to the advertiser's budget |
| VAT at launch | **Off.** Promoet has no turnover yet, so it starts without charging VAT |
| Creator payouts | **No tax deducted.** Creators only pay the gateway's transfer fee |
| Gateway fees | No VAT effect for Promoet |

**VAT switch.** VAT is a single setting (`vat_enabled`, `vat_rate_bps = 750`)
so it can be turned on the day Promoet registers for VAT or crosses the
threshold the accountant gives. The admin console shows Promoet's running
total of fee income (in the agent model, turnover is the 25% fees, not the
full ad spend) and alerts when it nears that threshold.

| Example: ₦100,000 budget | VAT off (launch) | VAT on |
|---|---|---|
| Creators get | ₦75,000 | ₦75,000 |
| VAT (inside the 25% fee: ₦25,000 × 7.5/107.5) | — | ≈ ₦1,744 |
| Promoet keeps | ₦25,000 (25%) | ≈ ₦23,256 (~23.3%) |

When VAT is on, the ledger books the VAT portion of each billed click into
`vat_payable` at billing time, so the remittance is always ready. Changing the
setting applies to new billing only and never rewrites history.

**Advertiser invoices** (for every funding payment, plus a monthly statement
of spend) follow the agent model. They separate the two parts of the spend:

- *Creator promotion payouts, paid on the advertiser's behalf:* ₦75,000
- *Promoet service fee:* ₦25,000 (when VAT is on: *"includes VAT of ₦1,744"*)
- *Total:* ₦100,000

When VAT is off, invoices show **no VAT line**: a business not registered for
VAT must not show VAT. Invoices carry a sequential number (and Promoet's TIN
once issued) and are downloadable as PDFs in the advertiser portal. The
advertiser terms of service state that Promoet acts as an agent and that
creators are independent, which supports the invoice wording.

**Recommended minimums** (all configurable in admin):

| Setting | Value | Reasoning |
|---|---|---|
| Minimum CPC | **₦50** (creator gets ₦37.50) | Below this, creators won't bother posting. The wizard *suggests* ₦100–₦150 and shows a "competitiveness" meter based on live campaigns |
| Minimum CPA payout | **₦300** per lead/signup, **₦500** or 5% per purchase | Conversions take much more effort than a click |
| Minimum campaign budget | **₦25,000** for CPC (≥ 500 clicks at the minimum CPC), **₦50,000** for CPA | Enough to spread across 10+ creators and produce meaningful data. Low enough for small Instagram vendors |
| Minimum wallet top-up | **₦10,000** | Keeps Paystack's fixed ₦100 fee below 1% |
| Max share of a budget per creator | **10%** by default (the advertiser can set 2–25%) | One creator (or one fraudster) can't drain a campaign |
| Minimum withdrawal | **₦1,000** | The ₦10 fee is 1%, which is acceptable. Lower values would mostly create support load |
| Daily withdrawal limit | ₦50,000 without KYC verification of a selfie, ₦500,000 after full KYC, raised by level | Limits damage from account takeover |

---

## 8. Data model (core tables)

```mermaid
erDiagram
  users ||--o| creator_profiles : has
  users ||--o{ org_members : "belongs to"
  organizations ||--o{ org_members : has
  organizations ||--o{ campaigns : owns
  campaigns ||--o{ creatives : has
  campaigns ||--o{ quest_claims : "claimed as"
  creator_profiles ||--o{ quest_claims : makes
  quest_claims ||--|| referral_links : gets
  referral_links ||--o{ clicks : receives
  clicks ||--o| click_verdicts : scored
  creator_profiles ||--o{ social_accounts : links
  creator_profiles ||--o{ bank_accounts : adds
  creator_profiles ||--o{ payouts : requests
  ledger_accounts ||--o{ journal_lines : has
  journal_entries ||--o{ journal_lines : contains
  creator_profiles ||--o{ xp_events : earns
```

| Table | Key columns |
|---|---|
| `users` | id, phone (unique), email, password_hash/null, role_flags, status, created_at |
| `creator_profiles` | user_id, handle, display_name, avatar_url, state, niches[], tier, level, xp, energy, energy_updated_at, kyc_status, kyc_name, risk_score |
| `social_accounts` | id, creator_id, platform (whatsapp/whatsapp_channel/x/facebook/instagram/telegram), handle, followers, verified_at, verification_method |
| `organizations` | id, name, rc_number (CAC), billing_email, verification_tier (unverified/verified), card_funding_cap_kobo, cpa_approval_rate, api_key_hash, status |
| `org_members` | org_id, user_id, role (owner/admin/analyst) |
| `campaigns` | id, org_id, title, slug, description, category, landing_url, billing_model (cpc/cpa), unit_price_kobo, conversion_event, attribution_window_days, approval_window_days, allowed_platforms[], requires_beacon, creator_share_bps (7500), max_creator_share_bps, budget_kobo, spent_kobo, daily_cap_kobo, per_creator_daily_click_cap, targeting (jsonb: states, niches, min_level, platforms), starts_at, ends_at, status, arcon_ref, moderation_notes |
| `creatives` | id, campaign_id, master_id/null, platform/null (null = master), aspect (9:16, 4:5, 1:1, 16:9), type (image/video/caption), storage_key, width, height, duration, source (uploaded/auto), status |
| `quest_claims` | id, campaign_id, creator_id, energy_spent, claimed_at, post_proof_url, proof_status — unique(campaign_id, creator_id) |
| `referral_links` | id, claim_id, platform (whatsapp_status/x/facebook/instagram_story/instagram_bio/telegram), code (unique), status (active/throttled/disabled), quality_score — unique(claim_id, platform) |
| `conversions` | id, campaign_id, click_id, creator_id, event, order_id, value_kobo, source (postback/pixel), status (pending_approval/approved/rejected/invalid), reject_reason, approve_by, journal_entry_id — unique(campaign_id, order_id) |
| `beacons` | click_id, loaded_at, dwell_ms |
| `clicks` | id (ULID), link_id, campaign_id, creator_id, ts, ip_hash, asn, country, ua_hash, fp_hash, visitor_id, referrer_host, edge_bot_score — **partitioned by month** |
| `click_verdicts` | click_id, verdict, reasons[], ruleset_version, billed_kobo, journal_entry_id, released_at, reversed_at |
| `ledger_accounts` | id, type, owner_type, owner_id, currency, cached_balance_kobo |
| `journal_entries` | id, kind, idempotency_key (unique), ref_type, ref_id, created_at |
| `journal_lines` | entry_id, account_id, amount_kobo (signed) — CHECK that each entry sums to 0 (deferred constraint or enforced in the service) |
| `payments` | id, org_id, provider, reference (unique), amount_kobo, status, raw_webhook |
| `bank_accounts` | id, creator_id, bank_code, account_number_enc, account_name, recipient_code, verified_at |
| `payouts` | id, creator_id, bank_account_id, amount_kobo, status, provider_ref, approved_by, failure_reason |
| `post_tracking` (Phase 2) | id, claim_id, platform, post_url, external_post_id, views_baseline, views_latest, billed_views, last_polled_at |
| `xp_events` | id, creator_id, kind, amount, ref_id, created_at |
| `seasons`, `season_standings`, `badges`, `creator_badges`, `guilds`, `guild_members` | game tables |
| `notifications` | id, user_id, kind, payload, read_at |
| `audit_log` | id, actor_id, action, target_type, target_id, before, after, ip, ts (append-only) |
| `click_rollups_hourly` | campaign_id, creator_id, hour, clicks, valid, invalid, billed_kobo |

**PII:** store hashed IPs (salted, rotated monthly) and encrypt bank account
numbers and KYC payloads at the application level (envelope encryption with a
KMS key).

---

## 9. API surface (v1, REST + JSON)

```
Auth
  POST /auth/otp/request        {phone|email}
  POST /auth/otp/verify         → session cookie (httpOnly, SameSite=Lax)
  POST /auth/logout
  GET  /me

Creator
  GET  /quests?category=&sort=payout|new&cursor=
  GET  /quests/:campaignId
  POST /quests/:campaignId/claim            {platforms[]} → link + kit per platform
  POST /quests/:campaignId/platforms        {platform} → add a platform later
  GET  /@:handle                            public creator bio page (web)
  POST /quests/:campaignId/proof            {post_url}
  GET  /quests/:campaignId/media-kit        → signed zip URL
  GET  /me/links                            per-link stats
  GET  /me/wallet                           pending / available / lifetime
  GET  /me/earnings?cursor=                 "loot drops" feed
  POST /me/bank-accounts   GET /banks       (Paystack bank list, cached)
  POST /me/kyc
  POST /payouts            GET /payouts
  GET  /me/game                             xp, level, energy, streak, badges
  GET  /leaderboards/:season?scope=global|state:LA|niche:tech

Advertiser (scoped to org)
  GET/POST/PATCH /orgs/:orgId/campaigns
  POST /orgs/:orgId/campaigns/:id/creatives  → presigned upload URL
  POST /orgs/:orgId/campaigns/:id/submit     → moderation queue
  POST /orgs/:orgId/campaigns/:id/pause|resume|close
  GET  /orgs/:orgId/campaigns/:id/analytics?granularity=hour|day
  POST /orgs/:orgId/wallet/fund              → Paystack checkout URL
  GET  /orgs/:orgId/wallet  /invoices
  GET  /orgs/:orgId/conversions?status=pending_approval     POST .../:id/approve|reject
  POST /orgs/:orgId/api-keys

Conversions (advertiser servers, API-key auth)
  POST /v1/conversions          {click_id, event, order_id, value}

Admin
  GET  /admin/review/campaigns  POST .../:id/approve|reject
  GET  /admin/fraud/queue       POST /admin/clicks/:id/verdict
  POST /admin/links/:id/disable  POST /admin/users/:id/suspend
  GET  /admin/payouts?status=pending  POST .../:id/approve|reject
  GET  /admin/ledger/accounts/:id
  PUT  /admin/config/:key

Webhooks / edge
  POST /webhooks/paystack        (HMAC-SHA512 signature check, idempotent on event id)
  GET  /r/:code                  (Cloudflare Worker, not the API)
  GET  /px.gif?c=click_id&e=view|lead|purchase   (pixel + engagement beacon from promoet.js)
```

Rules: cursor pagination, an `Idempotency-Key` header on every POST that
moves money, Zod-validated input and output, and rate limits in Redis (per
user, per IP, plus stricter limits on OTP and payout endpoints).

---

## 10. Security

- **Auth:** phone OTP (Termii) as the main login, which suits Nigeria. Optional email/password and Google. Server-side sessions in Redis. **2FA is required** for advertiser owners and all admins.
- **RBAC:** `creator`, `org:owner|admin|analyst`, `admin:ops|finance|super`. Payout approval and ledger adjustments need the `finance` role, and adjustments above a threshold need **two-person approval**.
- **Money safety:** idempotency keys everywhere, every money mutation in a DB transaction, webhook signature checks, a daily reconciliation job, an append-only audit log, and no `UPDATE`/`DELETE` on journal tables (enforced by DB grants).
- **Account takeover:** a new bank account or new device triggers a cooling-off period before withdrawals. Alerts on login from a new device. SIM-swap risk is reduced by requiring KYC selfie re-verification for large withdrawals.
- **Content:** creative uploads go through presigned URLs, MIME and size checks, a malware scan and image re-encoding. Landing URLs are checked against Google Safe Browsing and re-checked periodically, so the redirect can't be used as an open redirect to phishing pages.
- **Web:** CSP, httpOnly cookies, CSRF protection on cookie-authenticated routes, dependency scanning and secret scanning in CI.

---

## 11. Compliance & policy (Nigeria) — get legal advice before launch

| Area | Implication |
|---|---|
| **NDPA 2023 / NDPC** | Privacy notice, lawful basis, consent for marketing, retention schedule, DPO, data-breach process. Possibly registration as a data controller of major importance |
| **ARCON** (Advertising Regulatory Council) | Ads shown in Nigeria may need pre-exposure vetting. Store `arcon_ref` per campaign and make advertisers attest to compliance in the ToS |
| **Influencer disclosure** | Make creators include `#ad`/`#sponsored` (show it in caption templates, check it in post-proof review) |
| **Holding funds** | Don't operate as an unlicensed wallet or e-money issuer. Keep funds with the licensed PSP (Paystack/Flutterwave) and present balances as earned receivables. Confirm the structure with counsel and the PSP |
| **KYC / AML** | BVN or NIN check before the first withdrawal. Tiered limits. Sanctions/PEP screening through the KYC provider for advertisers |
| **Tax** | Agent model: VAT only on the 25% fee, switched on once Promoet registers or crosses the threshold. No tax deducted from creator payouts (owner decision). Agent-style itemised invoices |
| **Promotions** | Keep the seasonal prize **skill/performance-based**. Prizes decided by chance can fall under lottery or sales-promotion rules |
| **Prohibited categories** | No gambling, unlicensed loan apps, crypto schemes or adult content without approval (loan apps and Ponzi-style "investment" ads are a known local abuse vector) |

---

## 12. Non-functional targets & scale

| Metric | MVP target |
|---|---|
| Redirect latency (p95, Lagos) | < 80 ms |
| Redirect availability | 99.95% (the edge keeps redirecting even if the API is down; events queue up) |
| Click → verdict | < 60 s p95 |
| Creator dashboard freshness | ≤ 5 min (rollups) |
| Initial load on 3G, low-end Android | < 3 s, JS < 200 KB on creator routes |
| Data | 1–5M clicks per month in Year 1. Postgres monthly partitions are enough. Move analytics to ClickHouse if clicks go past ~50M per month |

**Mobile and data cost:** many users are on prepaid data. Use compressed
images (AVIF/WebP), lazy-load the media kit, cache the app shell in the
service worker, and allow downloading creatives over Wi-Fi only.

**Offline (PWA):** the app shell and the last-viewed quests/wallet are cached
read-only. Actions that need the server (claim, withdraw) show a clear
"you're offline" state. Unlike in the prototype, nothing financial is stored
in `localStorage`.

---

## 13. Repository layout

```
hypepromo/
├─ apps/
│  ├─ web/            Next.js — (creator)/, (advertiser)/, (admin)/ route groups, PWA
│  ├─ api/            Fastify modular monolith — src/modules/<module>/
│  ├─ worker/         BullMQ processors + Cloudflare Queue consumer
│  └─ redirect/       Cloudflare Worker (/r/:code, /px.gif)
├─ packages/
│  ├─ db/             Drizzle schema, migrations, seed data
│  ├─ shared/         Zod schemas, money helpers (kobo), types, constants
│  ├─ fraud-rules/    pure, versioned rule functions (shared by worker + tests)
│  ├─ ui/             design system (cyber/brand tokens from the prototype)
│  └─ config/         eslint, tsconfig, tailwind preset
├─ infra/             Terraform, environment configs
├─ docs/              this document, ADRs, runbooks
└─ prototype/         original single-file prototype (reference only)
```

**Environments:** `local` (docker-compose: Postgres, Redis, MinIO, Paystack
test keys, `wrangler dev`), `staging` (Paystack test mode, seeded data), and
`production`.

**CI:** lint, typecheck, unit tests, integration tests against ephemeral
Postgres, migration check, Playwright end-to-end tests of the main flows, and
preview deploys per PR.

### Testing priorities

1. **Ledger property tests:** every entry sums to zero, balances never go negative, and replaying events is idempotent.
2. **Fraud rule table tests:** labelled click fixtures → expected verdicts, plus regression tests when rules change.
3. **Concurrency tests:** 1,000 parallel valid clicks on a campaign with budget for 500 → exactly 500 billed.
4. **Webhook replay tests:** duplicate and out-of-order Paystack events.
5. **End-to-end tests:** advertiser funds and launches → creator claims → simulated clicks → hold release → withdrawal.

---

## 14. Delivery roadmap

Assumes 2–3 full-stack engineers, 1 designer (part-time) and 1 ops/finance
person.

### Phase 0 — Foundations (weeks 1–2)
- Monorepo, CI, environments, Terraform, Sentry/OTel
- Port the prototype's design tokens and components into `packages/ui`
- Auth (phone OTP), users, roles, organisations
- Ledger module and its property tests (built **first**, because everything depends on it)

### Phase 1 — MVP with self-serve (weeks 3–12)
- Creator onboarding: profile, social handles (verified by putting a code in the bio), niches, state
- **Self-serve advertiser sign-up**, verification tiers, campaign wizard (CPC or CPA), creative upload, automated checks plus human review (§5.10)
- Advertiser funding through Paystack with the fee grossed up, plus dedicated virtual accounts for bank transfers
- Quest feed, claim, **per-platform links for the six launch platforms** (WhatsApp Status, X, Facebook, Instagram Stories, Instagram bio link, Telegram), caption + `#ad` template, share buttons
- Redirect worker, click queue, rules engine v1, link-preview crawler filter, budget reservation, 7-day hold
- **CPA:** S2S postback, `promoet.js` pixel + engagement beacon, approval window
- Platform-first claim flow, auto-generated platform formats, creator bio page (`pmt.ng/@handle`)
- Creator wallet (pending/available), earnings feed, bank account + KYC, **manually approved** withdrawals
- Basic XP, levels, energy
- Advertiser dashboard: clicks, valid %, spend, by creator and by day
- Admin: review queues, fraud queue, payouts, audit log
- **Launch:** advertisers are open from day one. Creators are let in from a waitlist in batches (Lagos and Abuja first) so the supply of creators doesn't outgrow the advertiser budget available

### Phase 2 — Scale (weeks 13–20)
- OAuth social verification and follower sync (optional; the bio code keeps working)
- Consider TikTok and more Instagram formats if creators ask for them
- Advanced targeting (state, niche, level, platform), daily caps, scheduling
- Platform quality scores, Shopify/WooCommerce plugins
- Automatic payouts below a risk threshold, retries, reconciliation dashboard
- Seasons, leaderboards (global/state/niche), badges, streaks
- Web push, WhatsApp notifications, media-kit zips, post-proof review
- Risk-based Turnstile interstitial, velocity anomaly detection

### Phase 3 — Growth (after week 20)
- Guilds and guild quests
- App-install CPA through attribution providers
- Capacitor wrappers for the Play Store (and iOS if needed)
- ML fraud scoring trained on labelled verdicts, ClickHouse analytics
- Agency accounts (multi-brand), API access for advertisers
- Expansion to Ghana and Kenya (multi-currency ledger already supported by `currency` on accounts)

---

## 15. Key metrics

- **Marketplace:** GMV (campaign spend), take rate, creator payouts, number of live campaigns, budget usage
- **Quality:** valid-click rate, reversal rate, advertiser repeat-funding rate, cost per conversion, CPA approval rate per advertiser, quality score per platform
- **Creators:** activation (first valid click within 7 days), D7/D30 retention, median monthly earnings, withdrawal success rate
- **Ops:** payout turnaround time, size of the fraud queue, reconciliation differences (target ₦0)

---

## 16. Decisions log

| # | Topic | Decision | Where |
|---|---|---|---|
| 1 | Pricing models | **Clicks (CPC) and conversions (CPA) only.** Impressions/CPM dropped. No promo codes: conversions are tracked through the link | §5.7, §5.8 |
| 2 | Fee & charges | **25%** taken **from** the advertiser's budget (raised from 15% so VAT can be paid out of it), 75% to creators. **VAT-inclusive:** nothing added on top. Advertiser pays Paystack fees when funding. Creator pays transfer fees when withdrawing | §7.1 |
| 3 | Minimums | CPC ₦50, CPA ₦300/₦500, budget ₦25k (CPC) / ₦50k (CPA), top-up ₦10k, withdrawal ₦1k, 10% max share per creator | §7.1 |
| 4 | Hold period | **Flat 7 days for everyone**, regardless of level or account age. CPA: available once approved and at least 7 days old | §5.5 |
| 5 | WhatsApp Status | Supported, with its own link per creator, engaged-click rule, stricter caps and quality scores | §5.9 |
| 6 | Go-to-market | **Self-serve advertisers from day one**, with automated safeguards and human review of every campaign | §5.10 |
| 7 | Hosting | **Supabase**: new project `promoet`, London (eu-west-2) | §3 |
| 8 | Claim flow | **Platform first:** creators choose where they'll post, then get creatives, caption and link instructions made for that platform | §5.1 |
| 9 | Launch platforms | **WhatsApp Status, X, Facebook, Instagram Stories, Instagram bio link, Telegram.** TikTok and Instagram feed/Reel links (other than through the bio page) are not supported at launch | §5.1 |
| 10 | Tax | **Agent model** (VAT on the 25% fee only). VAT **off at launch**, switched on later. Invoices itemise creator payouts and the service fee. No tax deducted from creator payouts. Gateway fees have no VAT effect | §7.1 |

### Still open

1. **Seasonal prize pool:** size and funding source.
2. **Domains:** the name is **Promoet**. Secure `promoet.ng` / `promoet.com` plus a short redirect domain for tracking links (the doc uses `pmt.ng` as a placeholder; check availability).
3. **Supabase project:** the Bluu organisation is at the free plan's 2-project limit. Pause a project or upgrade before Phase 0 starts.
4. **Legal review** of the funds-holding structure, ARCON obligations and terms of service (§11).
