# Advisor proposals — needs human approval

Class B proposals. These are things the advisor thinks would improve the system but
is NOT allowed to do on its own: anything touching cadence, pause state, publishing
volume, new integrations, deletion of data the health check did not already confirm
dead, or edits to SKILL.md itself.

Each one is surfaced in the run notification. Rohan approves or rejects by editing
the `status:` line here, or just by telling Claude in a session. Nothing in this file
takes effect until its status reads `approved`.

Why the split exists: the deterministic checks verify output against fixed rules. The
advisor generates new judgment with nothing upstream verifying its reasoning. Giving
it config or publish authority means one bad judgment call ships live with nobody in
the loop. Giving it proposal-only authority means a bad call costs a line in this file.

Status values: `open` | `approved` | `rejected` | `expired`

Expiry: any proposal still `open` after 4 runs is auto-marked `expired` by the next
advisor pass and moved to the archive below. Stale proposals accumulating unread is
the main way a self-improving loop drifts, so the cap is enforced, not optional.
Maximum 5 `open` proposals at once; the advisor must not add a sixth.

---

## Open

### P13 — 27 non-master branches have had no commit in 30+ days, and three draft PRs are 30+ days old
`status: open`

Stage 6b on 2026-10-25 found 35 non-master branches, 27 with no commit in 30+ days (oldest 56 days: `claude/remove-invalid-car-photo-qco2jv`, `claude/rekyc-funnel-artifact-nnzl9x`, `claude/hyperverge-internal-ml-tool-n61w8f`). Open PRs #67, #112 and #119 are all drafts, 30+ days old. None are Dependabot. This is a larger pile than the three branches P8 cleaned up on 2026-08-30.

Proposed: Rohan decides which of these are finished, superseded or abandoned, the same way P8 was handled (check each against master before deleting). Not self-applied: this stage is report-only and never deletes branches.

### P12 — Stage 6's 60-day news delete is blocked in unattended cloud runs; decide how it should run
`status: open`

Raised 2026-10-25. Two cloud runs that day could not apply the age cleanup (1 row, `published_date` 2026-08-25, Emerald AI). The first was denied by the auto-mode classifier, the second timed out on a Supabase connector permission prompt nobody could answer. SKILL.md says no confirmation is needed, but the connector still asks. The row is now past 60 days and will stay until someone deletes it.

Proposed: either Rohan pre-approves `execute_sql` DELETE on `news_items` for this task in the connector settings, or Stage 6 step 3 is dropped from cloud runs and done on the laptop. Not self-applied: it is a permission and scope change.

### P11 — Move this pipeline from a local scheduled task to a cloud routine, so it doesn't depend on Rohan's machine being on
`status: open`

Raised in-session 2026-09-20 (not by the advisor — Rohan asked directly whether this
could run online instead of on his computer). He asked to bank the decision here so a
future advisor pass raises it again, rather than building it same-session.

Today this task only fires while Rohan's Windows machine and the Claude desktop app are
running (it's a local `mcp__scheduled-tasks` entry, cron `0 6 * * 0`). Anthropic's cloud
routines (`RemoteTrigger`) are a real alternative: a routine can now point at both
`product-with-rohan` (the website, to publish into) and the newly created
`product-shots-scheduled-tasks` repo (this run's SKILL.md/check.mjs, now on GitHub) as
git sources, so the cloud agent reads the actual pipeline instructions instead of a
hand-copied prompt.

Three real gaps surfaced when scoping this, not yet resolved:
1. **MCP connectors** — this session couldn't see what's connected on Rohan's claude.ai
   account (cloud routines only use claude.ai connectors, not local Claude Code MCP like
   the Supabase project or Composio). Workaround for Supabase specifically: plain `curl`
   against the REST API with the public anon key works fine (used successfully this run
   for the teardown image upload), so DB reads/writes don't strictly need an MCP
   connector. `gh` CLI for Stage 6b's repo-health check likely has no auth in a cloud
   sandbox unless a GitHub connector is attached — would need to soft-skip that stage,
   same as the existing "gh unauthenticated" stop condition, unless Rohan connects one.
2. **Infographic PNG rendering** (Stage 4) needs a headless-browser toolchain — unverified
   whether the cloud sandbox has it. Untested; would need a real dry run to know.
3. Two visually-identical "Default" cloud environments exist on the account and Rohan
   hasn't picked one yet; also needs to reconfirm the schedule (proposed: Sundays 00:32
   UTC = 06:02 IST, i.e. the same time as today's local cron, just cloud-hosted).

Proposed: next advisor pass should ask Rohan whether he wants to proceed, and if so,
walk through environment choice, schedule confirmation, and a first dry-run cloud
routine (potentially LinkedIn/Substack still separate) before cutting over the local
task entirely — don't retire the local `mcp__scheduled-tasks` entry until a cloud run has
actually succeeded end-to-end once. Not self-applied: this is a cadence/infrastructure
decision, squarely Class B, and Rohan explicitly asked for it to wait for a future
conversation rather than being built now.

**How to actually do it, next time this comes up (so it isn't rediscovered from scratch):**

1. Load the tool: `ToolSearch select:RemoteTrigger` (deferred every session).
2. Ask Rohan to pick one of the two "Default" cloud environments (`env_01M1FyiPHFNS5MTMnNZQY7Hq`
   or `env_0125KPeSq3NMYyx2jGNvsojR` as of 2026-09-20 — re-check with
   `RemoteTrigger {action:"list"}` first since IDs/options may have changed) and confirm
   the schedule (proposed default: `cron_expression: "32 0 * * 0"` = Sundays 06:02 IST).
3. Create body shape (fill in the environment id and confirmed cron):
   ```json
   {
     "name": "product-shots-daily-content-cloud",
     "cron_expression": "32 0 * * 0",
     "enabled": true,
     "job_config": {
       "ccr": {
         "environment_id": "<chosen env id>",
         "session_context": {
           "model": "claude-sonnet-5",
           "sources": [
             {"git_repository": {"url": "https://github.com/rohankhullar24-oss/product-with-rohan"}},
             {"git_repository": {"url": "https://github.com/rohankhullar24-oss/product-shots-scheduled-tasks"}}
           ],
           "allowed_tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebSearch"]
         },
         "events": [{"data": {
           "uuid": "<fresh lowercase v4 uuid>",
           "session_id": "",
           "type": "user",
           "parent_tool_use_id": null,
           "message": {"role": "user", "content": "Read product-shots-daily-content/SKILL.md from the product-shots-scheduled-tasks checkout and run this week's pipeline against the product-with-rohan checkout, exactly as written there. Report results the same way that SKILL.md's own Report section specifies."}
         }}]
       }
     }
   }
   ```
4. Gap workarounds to build into the SKILL.md (or the cloud-specific prompt) before
   relying on this:
   - **Supabase without MCP:** use `curl` against
     `https://uksoubgwjbgjwtaafdxo.supabase.co/rest/v1/<table>` and
     `.../storage/v1/object/...` with header
     `apikey: sb_publishable_dH2y1LiNPbzsXedGva3hjQ_iKgSlMvV` (public anon key, safe to
     embed — confirmed working this run for both the news-item insert pattern and the
     teardown PNG upload).
   - **`gh` CLI / repo health (Stage 6b):** test with `gh auth status` at the top of that
     stage; if unauthenticated, soft-skip exactly like the existing stop condition
     ("Stage 6b: `gh` unauthenticated... skip the stage, note why, continue") rather than
     failing the whole run. A GitHub claude.ai connector, if Rohan connects one, may fix
     this — untested.
   - **Infographic PNG rendering (Stage 4):** before trusting this stage, do one manual
     dry run in a fresh cloud session to check whether
     `anthropic-skills:infographic`'s `scripts/setup_renderer.sh` /
     `scripts/render.py` work in that sandbox (headless Chromium install). If it can't
     render, Stage 4 should hit its existing stop condition ("add nothing to
     `teardowns.ts`") rather than skip silently.
5. Do not delete or disable the local `mcp__scheduled-tasks` entry until a cloud run has
   completed Stages 1-4 successfully at least once — keep both live in parallel for the
   first 1-2 weeks as a safety net, then ask Rohan whether to disable the local one.

### P9 — `published/reachable` has failed in 3 of the last 7 runs; consider a longer/backoff wait before the Stage 3 gate
`status: open`

`node checks/history.mjs summary` shows the `published/reachable` check has failed in
3 of the last 7 runs — the single most failure-prone check in the whole suite. This
run itself passed on the first try for both Stage 3's blog post and Stage 4's teardown
page, so it isn't a hard block every time, but a 3/7 failure rate on the same check is
exactly the pattern Stage 7's own instructions call out as a signal the instruction (a
single check with one retry, no explicit wait) isn't landing, not bad luck.

Likely cause: the SKILL.md instruction is "wait for the deploy (do other stages
meanwhile), then GATE," with no minimum wait or backoff specified, so the actual delay
before the first check attempt depends on how much other-stage work happened to fill
the time that run — this run happened to have Stage 4's teardown work fill several
minutes before the Stage 3 recheck, which may be why it passed cleanly.

Proposed: either (a) add an explicit minimum wait (e.g. 90-120s) before the first
`published --url` attempt regardless of what else ran, or (b) change the retry from a
single immediate retry to a short backoff-and-retry (e.g. wait 60s, retry once more
before declaring the hard stop). Not self-applied because it's a change to the check
suite's timing behavior, which alters what blocks a publish — Class B territory, same
category as P3's staleness-check change.

### P7 — Stage 3b (teardown) and Stage 5 (Substack) were skipped this run for scope/time reasons, not a check or connector failure
`status: approved and applied 2026-08-26`

**Applied same day, directly by Rohan in-session** (not the usual next-run advisor cycle,
since he was already looking at the run). He confirmed the split rather than waiting to see
if it recurred: created a new scheduled task, `product-shots-teardown-substack`
(`C:\Users\DELL\.claude\scheduled-tasks\product-shots-teardown-substack\SKILL.md`), Sundays
09:00, ~3 hours after this job. It owns the teardown and all four Substack drafts, reads
this job's most recent blog post and Shots question at Step 0, and shares this job's
`checks/` directory and `substack-cta-log.md` rather than duplicating them. This job's
SKILL.md was trimmed to Stages 0-2, 3, 6, 6b, 7, 8 and no longer mentions Substack/teardown
except as pointers to the new task.

Original proposal text below, preserved for history.
`status: open` (original)

On 2026-08-26 this run completed Stage 1 (question), Stage 2 (news), Stage 3 (blog,
gated and verified live), Stage 6, and Stage 6b cleanly, but did not attempt Stage 3b's
infographic teardown or Stage 5's four Substack drafts at all. This is different from
every prior skip on record: it wasn't a hard stop (no gate failure, no missing
connector), it was a judgment call to prioritize the core Shots/News/Blog loop within
the session's available time rather than run the full pipeline shallowly.

This is a one-time observation, not yet a pattern, so nothing to fix in SKILL.md today.
Proposed: if a future run's history shows Stage 3b or Stage 5 skipped for this same
reason more than once, that is a signal the pipeline as specified no longer fits in a
single run's practical budget, and Rohan should decide whether to split it across two
scheduled runs (e.g. Shots/News/Blog on the current cadence, Teardown/Substack on a
staggered cadence) rather than keep asking one run to do all of it. Not self-applied
because splitting the pipeline is a cadence/scope decision, squarely Class B.

### P6 — SKILL.md's Stage 3b spec is stale relative to the site's actual teardown surface
`status: closed and applied 2026-08-30`

Stage 3b as originally written described the teardown as a blog markdown post with an
embedded infographic, and nothing else, never mentioning the dedicated
`/productshot/teardowns` page (`src/content/teardowns.ts`) the repo grew around
2026-08-13, which is the surface Rohan actually promoted.

**Resolved same day, directly by Rohan in-session**, alongside moving the teardown
infographic stage from `product-shots-teardown-substack` back into this job as Stage 4.
The rewritten Stage 4 answers every open question this proposal raised: the teardown is
now specified as `teardowns.ts`-only — "an entry appended to the `teardowns` array in
`src/content/teardowns.ts`, plus a PNG in Supabase Storage. There is no markdown file in
`src/content/blog/` for a teardown, ever." The blog-post half was dropped entirely rather
than kept as a second surface to maintain; `product-shots-teardown-substack`'s Note 3a
(the long-form article) is Substack-only content, not a second website surface, so it
doesn't reintroduce the duplication this proposal flagged.

Original proposal text below, preserved for history.
`status: open` (original)

Stage 3b as written describes the teardown as a blog markdown post with an embedded
infographic, and nothing else. Sometime around 2026-08-13, the repo grew a dedicated
`/productshot/teardowns` page backed by `src/content/teardowns.ts` (a small typed array
of `{slug, company, eyebrow, headline, dek, image, publishedDate}`), separate from the
blog post system, per the "Add Teardowns section to Product Shots" and "Remove incorrect
Urban Company teardown" commits. That page is now the feature Rohan actually promoted
(it was briefly in the bottom nav, then pulled back to hamburger-menu-only "until the
content pipeline is solid enough"), but SKILL.md's Stage 3b never mentions it.

This run produced the blog post exactly as Stage 3b specifies, and additionally added a
matching entry to `teardowns.ts` by hand so the new Zerodha teardown shows up on the
real page, since skipping that felt worse than a small unrequested addition. Not
self-applying a SKILL.md edit, since this is a real content-model decision (should every
future teardown update both surfaces? should Stage 3b's checklist include a `teardowns.ts`
step? does the blog-post version still need to exist at all, or was it superseded?) that's
Rohan's call, not something to infer.

Proposed: Rohan decide whether Stage 3b should be rewritten to explicitly cover both
surfaces (or drop the blog-post half if the dedicated page is meant to replace it), and
SKILL.md updated accordingly.

### P5 — Narrareach subscription appears inactive, blocking Stage 5 entirely
`status: superseded 2026-08-15`

Fully accounted for by the current SKILL.md standing rule (Narrareach unavailable,
Stage 5 is draft-only, no tool calls attempted at all). Nothing left to check or decide;
moved out of the active open list so it stops taking a slot. Original text preserved
below for history.
`status: open` (original)

On 2026-08-13, `schedule_note` failed immediately with "An active Narrareach subscription
is required to use MCP tools" — not a scheduling-time rejection like P4, but a hard refusal
before any note content was sent. Per the hard-stop rule ("a required connector will not
load, skip that stage, never fake success"), Stage 5 was skipped entirely this run: no
Substack Note was posted, and 5c verification/article-guard were not run since nothing was
scheduled to verify. This is the second run in the recent window with a Substack skip
(history: substack ok 2/3 before this run), and unlike P4's timing quirk, this looks like an
account/billing state rather than a clock issue.

Proposed: Rohan check the Narrareach account directly (subscription/billing status) outside
this pipeline. Not self-applied because diagnosing or working around a connector auth/billing
failure is outside what a run can safely do, and retrying blindly risks masking a real lapse.

### P4 — Narrareach/Substack scheduling clock appears offset from real time
`status: superseded 2026-08-15`

Fully accounted for by the current SKILL.md standing rule: this job makes zero
Narrareach calls right now, so there is no scheduling timestamp to be offset. Moved out
of the active list; original text preserved below for history.
`status: open` (original)

Stage 5's instruction is to schedule the Note 5-6 minutes ahead of the current local time.
On 2026-08-10, `schedule_note` rejected `scheduledFor` values 5, 10, and 20+ minutes ahead
of the session's own read of current time (via `date` in `Asia/Kolkata`) with "scheduledFor
must be in the future," but accepted a same-day time roughly 12+ hours out and a next-day
time without issue. This suggests either the session's local clock read was stale, or the
Narrareach/Substack backend is evaluating "now" against a different clock than the one the
skill instructions assume. The run was not blocked (the note scheduled fine once pushed out
far enough), but the "5-6 minutes ahead" guidance in SKILL.md did not work as written this
run.

Proposed: next time this happens, capture the exact rejected and accepted timestamps plus
whatever timestamp the connector itself will disclose (if any), and either fix the guidance
to schedule further ahead by default, or file it upstream with Narrareach if it is a backend
clock issue. Not self-applied because it may mean editing the SKILL.md timing instructions,
which is Rohan's call.

## Decided / archived

### P8 — Three `product-with-rohan` branches are 30+ days stale with no open PR against them
`status: closed and applied 2026-08-30`

Stage 6b's 2026-08-30 pass found 12 non-`master` branches. Three have had no commits in
30+ days: `claude/blogs-section-vnebpu` (last commit 2026-06-27, ~64 days, author Claude),
`claude/domain-hosting-requirements-8fkvpb` (last commit 2026-07-04, ~57 days, author
Claude), and `claude/android-reminder-app-u8z8la` (last commit 2026-07-26, ~35 days,
author Claude). None have an open PR. The other 9 branches are all within the last ~12
days and look like normal in-flight work.

**Resolved same day, directly by Rohan in-session** (not the usual next-run advisor
cycle). Each branch was checked against current `master` before any action:
- `claude/android-reminder-app-u8z8la` — its one commit ("Stop the date resetting to
  1 Jan in the reminder editor") was already merged to master via PR #48
  (`dd42ff9`). Diff against master was empty. Superseded, not abandoned.
- `claude/blogs-section-vnebpu` — its one commit (Product Discovery Agent blog post) was
  already published to master separately (`001329e`), same content with only a minor
  description/date/formatting difference. Superseded, not abandoned.
- `claude/domain-hosting-requirements-8fkvpb` — branched ~57 days ago; master has grown
  enormously since (new Android apps, `/productshot` routes, teardowns, dozens of blog
  posts). Merging it as-is would have deleted ~25,121 lines added since it diverged.
  Confirmed dangerous to merge, not safe to fast-track; whatever was genuinely useful in
  its 8 commits (dark/light mode fixes, SEO work, `/articles` route) is presumed already
  superseded by later work, consistent with the other two branches.

All three deleted from the remote (`git push origin --delete ...`), confirmed successful.
Local `master` was never touched by any merge attempt (one conflicted merge attempt on
the android branch was cleanly aborted before this decision, per the check above), so the
site build was not put at risk by this cleanup.

### P1 — Allow a longer recency window for `jobs` news items
`status: approved and applied 2026-08-08`

Stage 2 asks for 3-5 stories from roughly the last 7 days, spread across `ai`, `corporate`,
and `jobs`. On a weekly cadence that is hard for `jobs` specifically: this run found zero
fresh, date-verifiable jobs stories in the Aug 1-8 window, after rejecting Coinbase (May/June),
Nike (April) and a PM hiring report (16 June), all of which appeared in "August 2026" search
results. The run shipped 2 `ai` + 1 `corporate` instead.

Proposed: allow `jobs` items up to ~14 days old while keeping `ai`/`corporate` at ~7, since
hiring and layoff stories stay relevant longer than a model release does. Alternative: drop
the implicit expectation of one item per category and accept two-category runs as normal.

**Applied:** Stage 2 of SKILL.md now documents a 7-day window for `ai`/`corporate` and 14 days
for `jobs`, plus an explicit instruction to verify dates rather than trust aggregator framing.
`check.mjs news` enforces both limits.

### P2 — Fix the source URL on the Robinhood news item
`status: approved and applied 2026-08-08`

Row `9e356bb6-4d85-46ea-b410-6a889fcbd770` ("Robinhood to Give Retail Investors Access to
Startups Like SpaceX and Stripe") has `source_url` = `https://robinhood.com/us/en/stocks/SPCX/`,
which is a stock quote page, not an article about the story the summary describes. It returns
200, so neither the link check nor the health check flags it. I inserted this myself earlier
in the 2026-08-08 session and it should have been a news article.

Proposed: replace the URL with a real article on the Y Combinator access vehicle, or delete the
row. Not self-applied because Stage 6 did not confirm it dead, and the advisor is not permitted
to edit data on its own judgement.

**Applied:** row updated to the PYMNTS article on Robinhood Ventures Fund II, with a rewritten
summary carrying the real detail (NYSE listing 13 Aug, ~80 holdings, $200M target, 2/20 fees,
fund shares rather than shares in the underlying startups) and `published_date` corrected to
2026-08-05. New URL verified 200.

### P3 — Add a staleness check to `check.mjs news`
`status: approved and applied 2026-08-08`

The news gate currently validates category, URL collisions, field presence, date *format*, and
that the URL resolves. It does not check whether `published_date` is actually recent. Three
stale stories nearly reached the insert this run purely because aggregator framing presented
them as current; only manual date verification caught them.

Proposed: fail the gate when `published_date` is older than a configurable threshold (default 7
days, or 14 if P1 is approved), and warn when it is in the future. This is a code change to the
check suite, which alters what blocks a publish, so it needs approval rather than self-application.

**Applied:** category-aware staleness limits in `check.mjs news` (7 days for `ai`/`corporate`,
14 for `jobs`), overridable via `--maxage`, `--maxage-jobs`, `--today`. Future-dated items also
fail. Verified against the three stories that fooled the 2026-08-08 search results: all three
now blocked at 57, 107 and 53 days. Regression-tested against that run's real items, which
still pass.
