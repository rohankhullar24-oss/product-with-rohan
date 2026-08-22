# Graph Report - product-with-rohan  (2026-08-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1181 nodes · 2010 edges · 89 communities (69 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f2604ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- JournalEditActivity
- Store
- NotificationManager
- dependencies
- DateInvite.tsx
- Reminder
- app/page.tsx
- MainActivity
- JournalAdapter
- EditReminderActivity
- getAllPosts
- compilerOptions
- JournalEntry
- productshot/MainActivity.kt
- JournalSuggestionsActivity
- devDependencies
- ResetAlarmScheduler
- build_handbook.py
- createClient
- UsageWidgetProvider
- content.py
- manifest.json
- database.ts
- SupabaseClient
- JournalMediaStore
- fetch-posts.ts
- FetchResult
- AlarmScheduler
- DecisionDice.tsx
- route.tsx
- AccountActivity
- app/layout.tsx
- HttpOutcome
- teardowns/[slug]/page.tsx
- AlarmRingActivity
- ChladniPlate.tsx
- shots-client.tsx
- AlarmRingActivity
- LocationListener
- createClient
- ClaudeAlertsActivity
- productshot/articles/[slug]/page.tsx
- login/page.tsx
- news-client.tsx
- app.py
- AlarmReceiver.kt
- NotificationActionReceiver.kt
- proxy.ts
- razorpay.d.ts
- ResetAlarmReceiver.kt
- stock-analyzer/page.tsx
- Context
- android-app/gradlew
- gradlew
- finalize_manifest.py
- FilesPage
- resume-builder/page.tsx
- unsubscribe/page.tsx
- Endpoints.kt
- convert_to_pdf.py
- course/dashboard/page.tsx
- course/layout.tsx
- [id]/page.tsx
- handbook/page.tsx
- privacy/page.tsx
- refund-policy/page.tsx
- terms/page.tsx
- ContentCard.tsx
- HandbookCheckout
- Rfc3339
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `JournalEditActivity` - 40 edges
2. `Store` - 25 edges
3. `Reminder` - 25 edges
4. `EditReminderActivity` - 23 edges
5. `createClient()` - 19 edges
6. `SupabaseClient` - 17 edges
7. `UsageWidgetProvider` - 16 edges
8. `compilerOptions` - 16 edges
9. `getAllPosts()` - 15 edges
10. `build_document()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ClaudeAlertsActivity` --references--> `Store`  [EXTRACTED]
  reminder-app/app/src/main/java/online/productwithrohan/reminders/ClaudeAlertsActivity.kt → usage-core/src/main/java/online/productwithrohan/usagecore/Store.kt
- `MainActivity` --references--> `Store`  [EXTRACTED]
  claude-limits-app/app/src/main/java/online/productwithrohan/claudelimits/ui/MainActivity.kt → usage-core/src/main/java/online/productwithrohan/usagecore/Store.kt
- `NewsPage()` --calls--> `createPublicClient()`  [EXTRACTED]
  src/app/productshot/news/page.tsx → src/lib/supabase/public.ts
- `JournalEditActivity` --references--> `JournalEntry`  [EXTRACTED]
  reminder-app/app/src/main/java/online/productwithrohan/reminders/JournalEditActivity.kt → reminder-app/app/src/main/java/online/productwithrohan/reminders/JournalEntry.kt
- `LoginActivity` --references--> `Store`  [EXTRACTED]
  usage-core/src/main/java/online/productwithrohan/usagecore/LoginActivity.kt → usage-core/src/main/java/online/productwithrohan/usagecore/Store.kt

## Import Cycles
- None detected.

## Communities (89 total, 20 thin omitted)

### Community 0 - "JournalEditActivity"
Cohesion: 0.07
Nodes (23): ImageButton, MediaRecorder, AlarmService, Context, IBinder, Intent, MediaPlayer, Notification (+15 more)

### Community 1 - "Store"
Cohesion: 0.05
Nodes (28): AppCompatActivity, Bundle, MainActivity, SharedPreferences, AlarmService, Context, IBinder, Intent (+20 more)

### Community 2 - "NotificationManager"
Cohesion: 0.12
Nodes (11): ContentCheckWorker, CoroutineWorker, JSONObject, Result, NotificationManager, Context, NotificationHelper, AlertEvaluator (+3 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (45): @anthropic-ai/sdk, ecc-universal, framer-motion, gray-matter, lucide-react, next, @next/third-parties, dependencies (+37 more)

### Community 4 - "DateInvite.tsx"
Cohesion: 0.08
Nodes (29): POST(), POST(), FILES, FileType, GET(), isFileType(), FILES, POST() (+21 more)

### Community 5 - "Reminder"
Cohesion: 0.11
Nodes (15): JSONArray, JSONObject, Reminder, ReminderType, DAILY, MONTHLY, ONE_TIME, WEEKLY (+7 more)

### Community 6 - "app/page.tsx"
Cohesion: 0.08
Nodes (26): metadata, About(), certifications, education, highlights, stats, AnimatedCounter(), AnimatedCounterProps (+18 more)

### Community 7 - "MainActivity"
Cohesion: 0.09
Nodes (18): MaterialSwitch, AppCompatActivity, Bundle, Menu, MenuItem, TextView, MainActivity, Holder (+10 more)

### Community 8 - "JournalAdapter"
Cohesion: 0.09
Nodes (17): JournalActivity, BiometricPrompt, AppCompatActivity, Bundle, Menu, MenuItem, TextView, Holder (+9 more)

### Community 9 - "EditReminderActivity"
Cohesion: 0.12
Nodes (13): AdapterView, LinearLayout, RadioGroup, EditReminderActivity, AdapterView, AdapterView, AdapterView, AppCompatActivity (+5 more)

### Community 10 - "getAllPosts"
Cohesion: 0.12
Nodes (23): corsHeaders(), GET(), OPTIONS(), corsHeaders(), GET(), OPTIONS(), ArticlesPage(), metadata (+15 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (29): decision-dice-app, dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+21 more)

### Community 12 - "JournalEntry"
Cohesion: 0.15
Nodes (9): JournalEntry, JSONObject, JournalStore, Context, EncryptedFile, JournalSyncManager, changed, Context (+1 more)

### Community 13 - "productshot/MainActivity.kt"
Cohesion: 0.14
Nodes (15): isInAppHost(), isSupabaseDownloadUrl(), AppCompatActivity, Bundle, Intent, Uri, WebView, WebViewClient (+7 more)

### Community 14 - "JournalSuggestionsActivity"
Cohesion: 0.14
Nodes (13): Bitmap, ContentResolver, Holder, JournalSuggestionsActivity, AppCompatActivity, Bundle, RecyclerView, TextView (+5 more)

### Community 15 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+17 more)

### Community 16 - "ResetAlarmScheduler"
Cohesion: 0.17
Nodes (10): BootReceiver, BroadcastReceiver, Context, Intent, Context, RefreshScheduler, AlarmManager, Context (+2 more)

### Community 17 - "build_handbook.py"
Cohesion: 0.15
Nodes (25): add_field(), add_page_field(), add_xe_field(), apply_margins(), build_back_matter(), build_document(), build_front_matter(), chapter_num() (+17 more)

### Community 18 - "createClient"
Cohesion: 0.12
Nodes (15): Article, ArticlesClient(), Bookmark, Props, BookmarkedItem, BookmarksPage(), CONTENT_TYPE_LABELS, dynamic (+7 more)

### Community 19 - "UsageWidgetProvider"
Cohesion: 0.18
Nodes (12): AppWidgetManager, AppWidgetProvider, BootReceiver, BroadcastReceiver, Context, Intent, IntArray, RemoteViews (+4 more)

### Community 20 - "content.py"
Cohesion: 0.21
Nodes (17): BOLD_ITEM(), build_appendix_a(), build_appendix_b(), build_appendix_c(), build_appendix_d(), build_appendix_e(), build_appendix_f(), build_appendix_g() (+9 more)

### Community 21 - "manifest.json"
Cohesion: 0.09
Nodes (21): Appendix A: 100 PM Frameworks, Appendix B: PRD Templates, Appendix C: Roadmap Templates, Appendix D: KPI Library, Appendix E: SQL Cheat Sheets, Appendix F: AI Prompt Library, Appendix G: Interview Checklists, Appendix H: Resume Templates (+13 more)

### Community 22 - "database.ts"
Cohesion: 0.14
Nodes (16): CONTENT_MODEL, createAnthropicClient(), GeneratedNewsItem, generateNewsItems(), NEWS_SCHEMA, GeneratedShot, generateShotQuestion(), SHOT_QUESTION_SCHEMA (+8 more)

### Community 23 - "SupabaseClient"
Cohesion: 0.31
Nodes (3): Context, JSONObject, SupabaseClient

### Community 24 - "JournalMediaStore"
Cohesion: 0.31
Nodes (6): ByteArray, MasterKey, JournalMediaStore, Context, EncryptedFile, Uri

### Community 25 - "fetch-posts.ts"
Cohesion: 0.18
Nodes (11): dynamic, GET(), ArticlesPage(), metadata, revalidate, GuestBanner(), DashboardPage(), revalidate (+3 more)

### Community 26 - "FetchResult"
Cohesion: 0.23
Nodes (8): CoroutineWorker, Result, RefreshWorker, FetchResult, NeedsLogin, Soft, Success, UsageRepository

### Community 27 - "AlarmScheduler"
Cohesion: 0.37
Nodes (4): AlarmScheduler, AlarmManager, Context, PendingIntent

### Community 28 - "DecisionDice.tsx"
Cohesion: 0.15
Nodes (9): metadata, Criterion, CRITERION_LABELS, DecisionDice(), computeResults(), ENERGY_LABELS, hashString(), RankedOption (+1 more)

### Community 29 - "route.tsx"
Cohesion: 0.22
Nodes (10): dynamic, maxDuration, POST(), extractResumeText(), ResumePdf(), styles, RESUME_SCHEMA, TailoredResume (+2 more)

### Community 30 - "AccountActivity"
Cohesion: 0.32
Nodes (6): AccountActivity, AppCompatActivity, Bundle, EditText, TextView, View

### Community 31 - "app/layout.tsx"
Cohesion: 0.18
Nodes (8): geistMono, geistSans, metadata, StructuredData(), Theme, ThemeContext, ThemeContextType, ThemeProvider()

### Community 32 - "HttpOutcome"
Cohesion: 0.32
Nodes (7): HttpsURLConnection, Body, Challenged, Failed, HttpOutcome, Unauthorized, UsageClient

### Community 33 - "teardowns/[slug]/page.tsx"
Cohesion: 0.27
Nodes (9): metadata, TeardownsPage(), generateMetadata(), generateStaticParams(), TeardownPage(), getTeardown(), getTeardowns(), Teardown (+1 more)

### Community 34 - "AlarmRingActivity"
Cohesion: 0.33
Nodes (4): AlarmRingActivity, AppCompatActivity, Bundle, Intent

### Community 35 - "ChladniPlate.tsx"
Cohesion: 0.22
Nodes (8): metadata, ActiveMode, ChladniPlate(), Mode, MODES, partialRatio(), TBL, Voice

### Community 36 - "shots-client.tsx"
Cohesion: 0.29
Nodes (7): revalidate, ShotsPage(), Bookmark, Props, ShotsClient(), createPublicClient(), ShotQuestion

### Community 37 - "AlarmRingActivity"
Cohesion: 0.36
Nodes (4): AlarmRingActivity, AppCompatActivity, Bundle, Intent

### Community 38 - "LocationListener"
Cohesion: 0.42
Nodes (4): Location, JournalLocation, LocationListener, Context

### Community 39 - "createClient"
Cohesion: 0.39
Nodes (5): POST(), GET(), dynamic, ProductShotHome(), createClient()

### Community 40 - "ClaudeAlertsActivity"
Cohesion: 0.23
Nodes (5): ClaudeAlertsActivity, SeekBar, AppCompatActivity, Bundle, TextView

### Community 41 - "productshot/articles/[slug]/page.tsx"
Cohesion: 0.39
Nodes (5): ArticlePage(), generateMetadata(), Markdown(), ShotReveal(), getArticle()

### Community 42 - "login/page.tsx"
Cohesion: 0.29
Nodes (4): CALLBACK_ERROR_MESSAGES, describeCallbackError(), dynamic, LoginForm()

### Community 43 - "news-client.tsx"
Cohesion: 0.32
Nodes (6): Bookmark, NewsClient(), Props, NewsPage(), revalidate, NewsItem

### Community 44 - "app.py"
Cohesion: 0.33
Nodes (6): create_chatbot(), demo_mode(), get_system_prompt(), Demonstration mode - shows sample conversation without requiring API key.…, Create the system prompt for the chatbot. This defines the chatbot's role and…, Main chatbot function that handles the conversation loop.

### Community 45 - "AlarmReceiver.kt"
Cohesion: 0.52
Nodes (4): AlarmReceiver, BroadcastReceiver, Context, Intent

### Community 46 - "NotificationActionReceiver.kt"
Cohesion: 0.53
Nodes (4): BroadcastReceiver, Context, Intent, NotificationActionReceiver

### Community 47 - "proxy.ts"
Cohesion: 0.47
Nodes (4): PROTECTED_PREFIXES, updateSession(), config, proxy()

### Community 48 - "razorpay.d.ts"
Cohesion: 0.33
Nodes (5): RazorpayFailureResponse, RazorpayInstance, RazorpayOptions, RazorpayPaymentResponse, Window

### Community 49 - "ResetAlarmReceiver.kt"
Cohesion: 0.53
Nodes (4): BroadcastReceiver, Context, Intent, ResetAlarmReceiver

### Community 52 - "android-app/gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 53 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 54 - "finalize_manifest.py"
Cohesion: 0.83
Nodes (3): get_pdf_page_count(), human_size(), main()

### Community 55 - "FilesPage"
Cohesion: 0.67
Nodes (3): FilesPage(), handleUpload(), refreshCurrentFile()

## Knowledge Gaps
- **203 isolated node(s):** `Post`, `PostFrontmatter`, `PostWithContent`, `Article`, `Bookmark` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Store` to `HttpOutcome`, `NotificationManager`, `MainActivity`, `ClaudeAlertsActivity`, `ResetAlarmScheduler`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `JournalEntry` connect `JournalEntry` to `JournalAdapter`, `JournalEditActivity`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Reminder` connect `Reminder` to `JournalEditActivity`, `NotificationManager`, `MainActivity`, `EditReminderActivity`, `AlarmReceiver.kt`, `AlarmScheduler`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `Post`, `PostFrontmatter`, `PostWithContent` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `JournalEditActivity` be split into smaller, more focused modules?**
  _Cohesion score 0.073224043715847 - nodes in this community are weakly interconnected._
- **Should `Store` be split into smaller, more focused modules?**
  _Cohesion score 0.054274084124830396 - nodes in this community are weakly interconnected._
- **Should `NotificationManager` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._