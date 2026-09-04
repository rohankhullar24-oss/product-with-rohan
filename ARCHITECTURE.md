# Architecture

This repo is Rohan Khullar's personal site plus a handful of standalone side
projects that happen to live in the same tree. There are two build systems:
**npm/Next.js** for everything web, and **Gradle** for the Android apps.

## Web app (`src/`)

Next.js 16 (App Router) + TypeScript + Tailwind v4. `src/app/page.tsx` is the
single-page portfolio (Hero → About → Experience → Projects → Skills →
Contact, see `SITE_SPEC.md` for the content spec); everything else under
`src/app/` is a separate route tree bolted onto the same Next app.

```
src/
├── app/
│   ├── page.tsx, layout.tsx         portfolio landing page
│   ├── api/                         route handlers (see below)
│   ├── articles/[slug], blogs/[slug]  markdown content, rendered via src/lib/posts.ts
│   ├── handbook/                    a paid PDF handbook funnel (Razorpay checkout → email delivery)
│   ├── resume-builder/              resume tailoring tool (parses + rewrites a resume with Claude)
│   ├── course/                      a mini course area (signup, weekly content, dashboard)
│   ├── productshot/                 a distinct sub-product: auth, dashboard, teardowns,
│   │                                 news, bookmarks, files — its own login/session flow
│   │                                 via src/lib/auth + src/lib/supabase
│   ├── projects/                    small interactive demos embedded as pages
│   │                                 (chladni-plate, decision-dice, stock-analyzer)
│   ├── will-you-go-on-a-date-with-me/  one-off novelty page (src/lib/date-invite.ts)
│   ├── privacy, terms, refund-policy, unsubscribe, sitemap.ts
│   └── globals.css
├── components/                      shared/page-level React components (Navbar, Hero,
│                                     About, Experience, Projects, Skills, Contact, Footer,
│                                     BottomNav, plus feature-specific ones like
│                                     HandbookCheckout, ShotReveal, ChladniPlate, DecisionDice)
├── lib/
│   ├── anthropic.ts                 Claude API client wrapper (used by resume-builder, news)
│   ├── supabase/                    client.ts / server.ts / admin.ts / middleware.ts / public.ts
│   │                                 — Supabase clients scoped by context (browser, RSC, admin, edge)
│   ├── auth/                        productshot's own auth: admin-allowlist.ts, cron.ts
│   ├── posts.ts, articles/          markdown/frontmatter content loading (gray-matter)
│   ├── razorpay.ts, resend.ts       payment (handbook checkout) and transactional email
│   ├── resume/                      parse.ts (PDF → text via unpdf/mammoth), tailor.ts
│   │                                 (Claude rewrite), ResumePdf.tsx (@react-pdf/renderer)
│   ├── shots/                       generate.ts, rotation.ts — productshot's content pipeline
│   ├── news/generate.ts             productshot's news summarization pipeline
│   ├── date-invite.ts               backing logic for the novelty date-invite page
│   └── theme-context.tsx, use-scroll-animation.ts   client-side UI helpers
├── content/blog/                    markdown blog source files
└── types/                           shared TypeScript types
```

### API routes (`src/app/api/*/route.ts`)

| Route | Purpose |
|---|---|
| `create-order`, `verify-payment` | Razorpay order creation + payment verification (handbook checkout) |
| `handbook/download`, `handbook/email` | deliver the paid PDF handbook, email it via Resend |
| `date-invite` | backs the novelty date-invite page |
| `posts`, `posts/[slug]` | serve markdown blog/article content |
| `productshot/latest` | productshot's latest-content feed |
| `unsubscribe` | email unsubscribe link handler |

### Data & external services

- **Supabase** — primary datastore, used both for the main site (content,
  productshot auth/sessions) and split by client context in `src/lib/supabase/`.
- **Anthropic (Claude) API** — powers resume tailoring and productshot's news
  generation, via `src/lib/anthropic.ts`.
- **Google Gemini API** — powers the CarBecho/Inspector Co-Pilot chat, called
  directly from `src/app/api/inspector/route.ts` (no SDK wrapper). `GEMINI_API_KEY`.
- **Razorpay** — handbook payment checkout.
- **Resend** — transactional email (handbook delivery, notifications).
- **Vercel** — hosting/deploy target (see `vercel` sections implied by CI, `next.config.ts`).

## CarBecho / Inspector Co-Pilot

A field inspector's used-car checklist tool, unlisted (noindex, not in
sitemap/nav). Two entry points share one backend:

- **`src/app/inspector/`** — the original voice-only Co-Pilot: ask a question
  (text/voice/photo), get one answer, spoken back if wanted. Also carries an
  explainer above the tool linking to `/carbecho`. `history/` shows the shared
  findings log (search + severity/section/has-photo filters).
- **`src/app/carbecho/`** — the interactive flow: job list → verify & pair →
  200-point checklist (8 sections, 40 rows, Yes/No only — no N/A) → report.
  `CarBechoFlow.tsx` is the flow/checklist; `InspectionChat.tsx` is the chat
  sheet available from every row (text + voice + photo in one composer; a
  reply can write straight to the checklist via a one-tap Mark button).
- **`src/lib/inspector/`** — shared logic: `flow.ts` (SECTIONS/JOBS/palette +
  `resolveChecklistItem`, which fuzzy-matches a chat reply to a checklist row
  when there's no row-context to bind to), `prompt.ts` (brand/section
  constants + the Gemini system prompt), `store.ts` (writes findings to
  Supabase via the admin/service-role client — the anon key stays read-only).
- **`src/app/api/inspector/`** — the one route both surfaces call. Tries
  `gemini-2.5-flash` then falls back to `gemini-3.5-flash-lite` on 429/503
  (Gemini quota is per-model, so this also doubles the effective free-tier
  cap); a 400 fails fast since it's a request-shape bug, not a quota issue.
  `findings/route.ts` persists to the `inspection_findings` Supabase table
  (thumbnail only, not the full-size photo).

## Android apps

Three Gradle modules under one root build (`settings.gradle.kts`), sharing a
common library:

- **`usage-core/`** — shared library both apps depend on: fetches/tracks
  Claude usage or session data used to compute the widgets' bars/timers.
- **`reminder-app/`** — started as a general reminders app (alarm scheduling
  via `AlarmScheduler`/`AlarmService`/`AlarmReceiver`/`NotificationHelper`,
  local storage in `ReminderStore`, Supabase sync via `SyncManager`) and a
  journal feature (`Journal*` — entries, media, calendar view, location,
  Supabase sync). It has since grown an **Auto Scheduler**, a second
  distinct feature area for scheduling one-off/recurring outbound actions:
  - **`AutoTask`** (+ `AutoTaskStore`, `AutoTaskAdapter`, `AutoSchedulerActivity`,
    `EditAutoTaskActivity`) — a task list (Pending/Done/Failed tabs) that can
    schedule SMS, WhatsApp, Telegram, Email (modeled only), Reminder, Call, or
    Fake Call, one-off or recurring (Daily/Weekdays). Firing goes through
    `AutoTaskAlarmScheduler`/`AutoTaskAlarmReceiver`, with `AutoTaskFireRecorder`
    handling recurrence/retry bookkeeping shared across all three completion
    paths (sync dispatch, WhatsApp accessibility success, watchdog timeout).
    A task can opt into automatic retry-on-failure (`retryOnFailure`, up to 5
    attempts) or lock-screen retry (`AutoTaskLockRetryReceiver` polls every
    60s until unlocked rather than failing just for being locked).
  - **`ChatApp`/`ChatAppSender`** — generalized WhatsApp/Telegram sending via
    deep link (`wa.me` / `tg://resolve`) + `AutoTextAccessibilityService`
    driving the actual send, watched for completion by
    `AutoTextNotificationListenerService`.
  - **`RecipientList`/`RecipientListStore`/`RecipientListActivity`** and
    **`Template`/`TemplateStore`/`TemplateActivity`** — reusable recipient
    groups and message templates shared across scheduled tasks.
  - **Auto Reply** (`AutoReplySettings`, `AutoReplySettingsActivity`) — replies
    automatically to incoming WhatsApp/Telegram messages (picked up by
    `AutoTextNotificationListenerService`) and SMS (`SmsAutoReplyReceiver`,
    sent directly via `SmsManager` — no notification/accessibility dance
    needed there). Gating is shared across all three transports via
    `AutoReplyEngine`: a filter mode (Everyone vs. Specific people, via an
    allowed-senders list) with a separate always-wins ignored-senders list;
    per-sender custom reply rules (`AutoReplyRule`/`AutoReplyRuleStore`,
    edited via `AutoReplyRuleListActivity`/`EditAutoReplyRuleActivity`); a
    0–120s reply delay; a 1:1-vs-group toggle (off by default, WhatsApp/
    Telegram only); device-state gating (`AutoReplyConditions` — screen
    locked / charging / silent-DND / Bluetooth on, each independent and
    AND'd); and optionally replying to missed WhatsApp calls (detected
    heuristically from notification text). Telegram (`includeTelegram`) and
    SMS (`replyToSms`) are each off by default, matching the original
    WhatsApp-only behavior.
  - **Auto Forward** (`AutoForwardSettings`, `AutoForwardSettingsActivity`) —
    relays incoming WhatsApp (and Telegram, when Auto Reply's "Also watch
    Telegram" is on, since both features share the same listener) message
    text to a fixed number, also driven by `AutoTextNotificationListenerService`.
  - **Forward Call** (`ForwardCallSettings`, `ForwardCallSettingsActivity`,
    `ForwardCallReceiver`) — forwards a missed call's number as an SMS to a
    fixed number. Detection is heuristic (RINGING → IDLE without ever
    reaching OFFHOOK, the same pattern call-screening apps use, since
    Android has no distinct "missed call" broadcast of its own); the number
    itself comes from a `CallLog` query rather than the state-changed
    intent's own extra, which needs `READ_CALL_LOG` from Android 10 onward
    anyway.
  - **Call Auto Reply** (`CallReplySettings`, `CallReplySettingsActivity`,
    `CallReplyReceiver`) — texts the *caller* back once their call ends,
    instead of forwarding the number elsewhere. Reuses Forward Call's
    RINGING/OFFHOOK → IDLE heuristic; missed calls (never answered) and
    ended calls (answered then hung up) are each independently toggleable.
  - Recipient lists can also **import from a CSV or vCard file**
    (`RecipientImportParser`), not just one contact at a time via the
    system contact picker.
  - Custom repeat: `AutoTask.recurrence` has a `CUSTOM_DAYS` option on top
    of ONE_TIME/DAILY/WEEKDAYS, firing only on the days set in
    `AutoTask.customDays` (a day-of-week bitmask) — any subset of the week,
    not just Mon–Fri.
  - WHATSAPP/TELEGRAM tasks can carry a file **attachment**
    (`AutoTask.attachmentUri`, a persisted-permission `content://` URI).
    Since neither app's deep link supports pre-attaching media, an
    attached task skips the deep-link + accessibility-typed-send flow and
    hands off to the system share sheet instead, scoped to that app's
    package (`AutoTaskAlarmReceiver.sendAttachmentViaShareSheet`) — the
    recipient isn't pre-filled there, so the user picks the chat and taps
    send. SMS has no equivalent (no MMS API here), so it's WhatsApp/
    Telegram only.
  - **`AccountActivity`** — signatures and SMS-delay settings shared across
    the scheduler features, a full local backup/restore covering every
    Auto Scheduler data set (`BackupManager` — auto tasks, recipient
    lists, templates, auto-reply rules, and every settings screen, dumped
    generically via `SharedPreferences.getAll` so it doesn't need updating
    per new setting) on top of `MainActivity`'s existing reminders-only
    export, plus the installed app version (`versionName`/`versionCode`)
    at the bottom — the only place the app currently shows which build is
    installed. On top of that manual export, `backup_rules.xml` (API < 31)
    and `data_extraction_rules.xml` (API 31+) list the same files so
    Android's own auto-backup (Google account cloud backup, and
    device-to-device transfer) round-trips everything automatically on
    reinstall/new-device setup, without the user needing to remember to
    tap Backup first. `supabase_session` (the signed-in auth token) is
    deliberately excluded from both — it shouldn't silently restore onto
    a different device.
  - **`FakeCallActivity`**, **`ClaudeAlertsActivity`** — the Fake Call task
    type's ringing screen, and a small alerts/status surface.

  Two things worth knowing when touching this app: **versioning** —
  `versionCode` derives from `GITHUB_RUN_NUMBER` (always increasing on every
  CI build) rather than being hand-bumped, and `versionName` is bumped
  manually per release batch. And **CI/release** — `reminder-app.yml`
  builds a debug APK on every push/PR and publishes it to the
  `reminder-app-latest` GitHub Release on pushes to `master`.
- **`claude-limits-app/`** — a home-screen widget showing Claude subscription
  usage limits (5-hour session window + weekly cap) that rings an alarm when a
  window resets. No API exists for this data; see `claude-limits-app/README.md`
  for how it's obtained (browser session, refreshed in the background).

Both apps keep their original directory layout; only the Gradle build files
were lifted to the repo root so they can share `usage-core` without a source
move (see the comment in `settings.gradle.kts`).

## Conventions worth knowing

- **This is not the Next.js you know** (see `AGENTS.md`) — the vendored
  `next` package may diverge from upstream docs/conventions; check
  `node_modules/next/dist/docs/` before assuming familiar App Router behavior.
- Side projects (`projects/chladni-plate`, `projects/decision-dice`,
  `projects/stock-analyzer`) are self-contained pages/components, not
  separate apps — they render inside the main Next.js site.
- `productshot/` is effectively a second product sharing the same Next.js
  app and Supabase project, with its own auth flow (`src/lib/auth/`) — treat
  it as a distinct feature area when making auth/session changes.
