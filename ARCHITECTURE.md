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
- **Razorpay** — handbook payment checkout.
- **Resend** — transactional email (handbook delivery, notifications).
- **Vercel** — hosting/deploy target (see `vercel` sections implied by CI, `next.config.ts`).

## Android apps

Three Gradle modules under one root build (`settings.gradle.kts`), sharing a
common library:

- **`usage-core/`** — shared library both apps depend on: fetches/tracks
  Claude usage or session data used to compute the widgets' bars/timers.
- **`reminder-app/`** — a general reminders app with alarm scheduling
  (`AlarmScheduler`, `AlarmService`, `AlarmReceiver`, `NotificationHelper`),
  local storage (`ReminderStore`), and Supabase sync (`SyncManager`).
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
