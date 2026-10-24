---
name: product-shots-daily-content
description: Weekly (Sundays, ~06:02): Shots question + News refresh + blog post + company teardown infographic (moved back in 2026-08-30) + LinkedIn post (rejoined 2026-09-08) + content health check + repo health check (product-with-rohan GitHub repo, added 2026-08-15) + advisor pass. The four Substack drafts stay in the separate task, `product-shots-teardown-substack` (Sundays ~09:00, added 2026-08-26), which now reads this job's teardown instead of building its own. Every publish gated by deterministic checks. Digest email runs separately on Wednesdays.
---

You maintain content for "Product Shots," a Finshots-style app for product managers,
backed by a Supabase project (project_id: `uksoubgwjbgjwtaafdxo`) and a Next.js repo at
`C:\Users\DELL\OneDrive\Desktop\MySite` (git, branch `master`).

> **Note on the task ID.** This directory is still named `product-shots-daily-content`
> for historical reasons. The task is weekly, not daily. Do not let the name mislead you.

> **Split from the teardown/Substack task (2026-08-26), partially reversed (2026-08-30).**
> This job used to also run the company teardown (Stage 3b) and the four Substack drafts
> (Stage 5). On 2026-08-26 a run completed Shots/News/Blog/health/advisor cleanly but
> skipped both for scope reasons — see `proposals.md` P7 — and Rohan split them into
> `product-shots-teardown-substack`, scheduled ~3 hours later the same Sunday. On
> 2026-08-30 Rohan moved just the teardown infographic back into this job (it's now
> Stage 4 below); the four Substack drafts stay in the separate task, which now reads
> this job's teardown entry from `teardowns.ts` instead of building its own. This job's
> scope is now Stages 0-2, 3, 4, 5, 6, 6b, 7, 8. (Stage 5 here is the LinkedIn post,
> reinstated 2026-09-08 — a different stage from the old, still-retired Substack "Stage 5"
> that lives entirely in `product-shots-teardown-substack`. The number collides; the content
> doesn't.)

## How this pipeline works

This is a **staged pipeline with deterministic gates**, not a list of chores. Each stage
produces a draft, a script mechanically verifies it, and only a passing draft publishes.
The checks live in `checks/check.mjs` and are pure code: string matching, regex, arithmetic,
HTTP status. No stage asks a model to grade another model's work, because every failure
this pipeline has actually suffered was mechanically detectable:

- 2026-07-11: a disposable address (`fibobe5391@ezimb.com`) silently killed an entire
  bcc'd digest for every recipient. A domain regex catches that.
- 2026-08-05: Substack reported `PENDING` for an article that was already live. Fetching
  the archive page catches that.
- The discontinued Handbook needed scrubbing from every surface. A grep catches that.

**Run every gate. Never publish past a `FAIL`.** A blocked stage is a successful run of
the safety machinery, not a failed run of the pipeline. Report it and move on.

**Model:** run this task on Sonnet throughout. Do not try to economize by stage. This
fires 52 times a year; the token difference is rounding error, while a cheaper model
writing a worse post publishes under Rohan's name every week.

### Running the checks

```
cd C:\Users\DELL\.claude\scheduled-tasks\product-shots-daily-content\checks
node check.mjs blog       --file <post.md> --blogdir <dir> --date <YYYY-MM-DD>
node check.mjs news       --file <items.json> --existing <urls.json>
node check.mjs published  --url <url> --expect "<title substring>"
node check.mjs recipients --file <payload.json>     # used by the separate digest task
node check.mjs social      --platform linkedin --file <post.txt> --ctalog <linkedin-cta-log.md>
```

The `teardown` check stage and the `social --platform linkedin` check are used by this job's
Stage 4 and Stage 5 (below). `social --platform substack` is used by
`product-shots-teardown-substack`, not this job.

Exit 0 = publish. Exit 1 = blocked, fix and re-run. Write scratch files (drafts, JSON
payloads) to the session scratchpad, never into the repo or this directory.

## Standing rules

**HANDBOOK — BACK ON, CAN BE USED (reversed 2026-09-20, was discontinued 2026-07-13).**
Rohan reversed the discontinuation in-session: the Handbook can now be mentioned, linked,
or priced again in blog posts, teardowns, and digest email. The one carve-out is
LinkedIn — see the LinkedIn content-source rule below, which bans it there specifically,
independent of this reversal. The check suite's banned-content gate now only applies to
the `social --platform linkedin` check; blog/teardown/digest no longer block on it.

**REORG AND LAYOFFS ARE RETIRED SUBJECTS — NEVER PICK EITHER AGAIN (2026-09-20).** Rohan
flagged in-session that three blog posts on reorgs landed within four weeks (Meta/Expedia
judgment framework 08-30, reorg evaluation framework 09-08, "talk to your team after a
reorg" 09-20) and said explicitly this subject should never be a future article, full
stop, not a cooldown, then separately extended the same ban to layoffs as a subject.
Stage 3 must not write a new post about reorgs, layoffs, restructuring, or
downsizing-as-the-main-subject, in any angle, ever again, even if News or a next-run-hint
surfaces a fresh reorg or layoff story. A reorg or layoff event may still appear as a
single supporting example inside a post about something else, the same way any other
news item can be cited (e.g. a layoff headline used as a hook for a post about something
unrelated to reorgs/layoffs), but neither may ever be the subject the post is built
around. This overrides any older or future next-run-hint that points toward a reorg or
layoff angle; if one is ever written by mistake, this standing rule wins.

**LINKEDIN CONTENT SOURCE (2026-09-20).** A LinkedIn post must be about this run's blog
article or this run's teardown/product shot, whichever is the stronger post that week —
Stage 5 picks one, not a blend of both, and judges "stronger" the same way it already
judges a hook (which has the sharper tension, the more concrete stat, the clearer
practical takeaway). It must never mention the Handbook, regardless of the Handbook
reversal above — the check suite still gates LinkedIn specifically on this.

**LINKEDIN IS BACK IN THIS JOB (rejoined 2026-09-08).** Removed entirely on 2026-08-13, now
reinstated at Rohan's explicit request in chat (not inferred from `linkedin-cta-log.md` or run
history — that log's phrasing entries are still useful for CTA rotation, but the removal itself
is reversed by this line, superseding the 2026-08-13 note). See Stage 5 below. If Rohan ever
wants it out again, that's a fresh instruction too, not something to infer from a quiet run.

**SUBSTACK IS NOT PART OF THIS JOB (moved 2026-08-26).** Everything about Substack drafts
(Notes 1/2/3a/3b), the Narrareach-unavailable standing rule, and the article guard lives in
`product-shots-teardown-substack`'s own task file. This job produces the blog post, Shots
question, and (as of 2026-08-30) the teardown infographic that task depends on.

**TEARDOWN INFOGRAPHIC IS BACK IN THIS JOB (moved back 2026-08-30).** See Stage 4 below.
`product-shots-teardown-substack` no longer builds its own teardown — it reads the entry
this job appends to `teardowns.ts` each week and drafts Note 3a (the long-form article)
around it.

**Cadence.** This task fires Sundays ~06:02. `product-shots-teardown-substack` fires the same
Sundays ~09:00, after this job. The digest email is a **separate task**
(`product-shots-digest`, Wednesdays) so subscribers do not get multiple touches from the same
person in one morning. Do not send email from this task.

---

## Stage 0: Load context

1. `node checks/history.mjs summary` — read the run history. Note any check that has been
   failing repeatedly; that is a broken instruction, not bad luck.
2. Read `next-run-hints.md`. Apply Class A hints where they do not conflict with a stage's
   own rules. If you override a hint, say so in the run record so the advisor learns.
3. Read `proposals.md` so you know what is awaiting Rohan's decision.

## Stage 1: Add one Shots question

Table `public.shots_questions`: `id`, `type` (enum: product_sense, guesstimate, behavioral,
metrics_analytics, prioritization, root_cause_analysis, strategy_gtm, product_critique),
`domain` (nullable), `question`, `answer_markdown`, `created_at`.

1. `select type, count(*) from public.shots_questions group by type order by count(*) asc;`
   Pick the lowest-count type (ties: honor a Stage 0 hint, else pick any).
2. `select domain, question from public.shots_questions where type = '<type>';` — skim for
   near-duplicates. The DB unique constraint only catches exact text, so the manual skim is
   the real check. Read one existing `answer_markdown` for that type to calibrate depth.
3. Write one question plus a thorough, framework-based markdown answer:
   - `product_sense`: a domain not already used, and never food delivery.
   - `guesstimate`: worked arithmetic, stated assumptions, sanity-check against a real number.
   - `behavioral`: a generic STAR-answerable template, not tied to any real person's biography.
   - `metrics_analytics`: metric drop or definition scenario, structured diagnostic.
   - `prioritization`: RICE/ICE/MoSCoW with a worked example (table if RICE).
   - `root_cause_analysis`: rule out measurement error, segment, map funnel, check external.
   - `strategy_gtm`: launch, market entry, or positioning, structured.
   - `product_critique`: a real named product; what it solves, what works, what's broken,
     a prioritized fix. Food delivery is fine here.
4. Insert, doubling single quotes (`''`). On a unique-constraint failure, rewrite to a
   genuinely different premise and retry **once**. A second failure stops this stage.

## Stage 2: Refresh News

Table `public.news_items`: `title`, `summary`, `source_url`, `category` (check-constrained
to exactly `ai` | `corporate` | `jobs`), `published_date`, `created_at`.

1. `select source_url from public.news_items;` — save to a JSON array for the check.
2. Web search for 3-5 stories a working PM would want. Spread across categories. **At least
   one must be genuinely positive** (funding, a product win, a good industry shift). If the
   first pass is all layoffs, search specifically for a positive story. Beyond mainstream
   outlets you may draw on credible practitioner voices: Lenny's Newsletter, Simon Willison,
   and similar. example the top 3 news of AI by joint virality (The Rundown, Google News, what pops on Reddit, cross-check them)

   **Recency windows (revised 2026-08-08):** `ai` and `corporate` items must be from the last
   ~7 days. `jobs` items may be up to ~14 days old, because on a weekly cadence a fresh
   layoff or hiring story often does not exist in a given 7-day slice, while a hiring trend
   stays relevant far longer than a model release does. The gate enforces both limits.

   **Verify the date, do not trust the framing.** Aggregators and layoff trackers routinely
   present months-old cuts as current news. On 2026-08-08 three separate stories surfaced
   under "August 2026" searches while actually dating from April to June. Confirm the date
   from a URL path or an explicit fetch. If no `jobs` story survives verification, take the
   third item from `ai`/`corporate` rather than forcing a stale one through. A two-category
   run is acceptable; a stale item is not.
3. Build `items.json` as an array of `{title, summary, source_url, category, published_date,
   positive}` where `positive` is a boolean you set honestly.
4. **GATE:** `node check.mjs news --file items.json --existing existing.json`. This verifies
   categories against the DB constraint, catches URL collisions, enforces the recency windows
   above, and fetches every source URL, which is what catches a fabricated citation. Fix
   failures before inserting. Flags: `--maxage <days>`, `--maxage-jobs <days>`, `--today <date>`.
5. Insert the passing items.

## Stage 3: Publish the blog post

Posts are markdown in `src/content/blog/*.md`. This one file powers both
`/blogs` and `/productshot/articles`, and the sitemap picks it up. No second step.

1. `grep -E "^title:|^description:|^date:" src/content/blog/*.md` — note covered topics,
   which lane (AI / PM craft / corporate) the last few leaned on, and their **tone**.
2. **Tone balance.** If 2-3 recent posts were doom-flavored (layoffs, lawsuits, risk),
   today's must be constructive: a craft deep-dive, a framework, a build story, an
   opportunity piece. Readers should leave equipped, not just anxious. Aim for this on at
   least every other run.
3. **Evergreen rotation.** If the last 4+ posts were news-hooked, pick an evergreen topic
   targeting a real search query PMs type. Check filenames for what is already covered.
4. Ground factual claims in web search. Never invent a statistic, company action, or URL.
5. **Interlink** to 1-3 genuinely related existing posts via
   `https://productwithrohan.online/blogs/<slug>`. The check verifies these resolve to real
   files, so a hallucinated interlink blocks the publish.
6. **Route through the skills pipeline (added 2026-08-15).** Route research/structuring
   through `product-management:synthesize-research` and/or
   `anthropic-skills:product-metric-diagnosis` where the post genuinely has a diagnostic or
   metrics angle (don't force either onto a post that's really a craft or opportunity piece).
   Draft through `anthropic-skills:writer`. Pass the draft through **both**
   `anthropic-skills:humanizer` and `anthropic-skills:anti-ai`. Then a final
   `anthropic-skills:ogilvy-audit` pass, revised to address its findings, before the gate.
   The check catches em dashes, emoji, and curly quotes mechanically; it cannot catch
   inflated symbolism, rule-of-three padding, vague attribution, or negative parallelisms —
   the humanizer/anti-ai/ogilvy-audit passes are what catch those.
7. Frontmatter exactly:
   ```
   ---
   title: "..."
   description: "..."
   date: "YYYY-MM-DD"
   ---
   ```
   Today's date. Filename = kebab-case slug, no collision.
8. Length: 1,500-3,000 words. The gate hard-fails below 1,200.
9. Handbook mentions are allowed again on blog (see Standing rules, reversed
   2026-09-20) — a genuine, non-forced Handbook CTA is fine if it fits the post; don't
   force one onto a post it doesn't fit.
10. **GATE:** `node check.mjs blog --file <post> --blogdir src/content/blog --date <today>`.
11. Commit and push to `master`: `git add`, `git commit -m "Add blog post: <title>"`, `git push`.
    On failure, `git pull --rebase` once and retry. **Never force-push.** A second failure
    is a hard stop for the whole run.
12. Wait for the deploy (do other stages meanwhile), then
    **GATE:** `node check.mjs published --url https://productwithrohan.online/blogs/<slug> --expect "<title>"`.
    This asserts the title is in the served HTML, because Next.js serves a 200 shell for a
    route that failed to build. If it still fails after one retry, **stop** this stage and
    report. Never chain distribution to a post that is not verifiably live; note in the
    report if the post did not go live, since `product-shots-teardown-substack` reads this
    week's blog post and needs to know if it's missing or unverified.

## Stage 4: Company teardown infographic (moved back in 2026-08-30)

A teardown is one infographic and nothing else on the website: an entry appended to the
`teardowns` array in `src/content/teardowns.ts`, plus a PNG in Supabase Storage. There is
no markdown file in `src/content/blog/` for a teardown, ever.

1. Read `src/content/teardowns.ts` to see which companies were covered in roughly the
   trailing 8 weeks. Also skim `shots_questions` rows of type `product_critique` so the
   teardown doesn't retread a company already used there recently.
2. Pick a real, named product/company not covered in that window.
3. **Research standard — real research, not assumptions, data-heavy, factually correct,
   genuinely PM-lens, and interesting.** Ground every stat, claim, and quote in web search
   done in this run:
   - No assumptions stand in for facts — either find the real number/mechanism, or state
     explicitly it's unknown and don't put an invented number on the infographic.
   - Data-heavy: every core claim needs a number behind it where one exists (revenue,
     users, growth rate, market share, funding, pricing, a metric that moved and by how
     much).
   - Cross-check any number that will appear on the infographic itself against a second
     source or the company's own disclosure, rather than a single aggregator's restatement.
   - Genuinely PM-lens: every finding should answer a product question a PM would ask
     (what job is this solving, what's the core bet, why can't a competitor copy the
     obvious part, where is the moat thin, what would a PM there ship next).
   - Interesting: surface the non-obvious tension in the business, not a Wikipedia-style
     profile.
   `product-shots-teardown-substack` reuses this same research for its Note 3a long-form
   article, so do it once, thoroughly.
4. Route research/structuring through `product-management:synthesize-research` and/or
   `anthropic-skills:product-metric-diagnosis` where it genuinely fits a diagnostic or
   metrics angle. Draft the infographic's copy (headline, dek, stat labels, verdict)
   through `anthropic-skills:writer`. Pass every piece of copy that ends up in the entry
   (`headline`, `dek`, `eyebrow`) through both `anthropic-skills:humanizer` and
   `anthropic-skills:anti-ai`, then a final `anthropic-skills:ogilvy-audit` pass, revised
   to address its findings.
5. Build one infographic (stat cards, product bets, verdict) using the
   `anthropic-skills:infographic` skill (deterministic HTML/CSS rendered to PNG, not a
   photorealistic image). Populate every number/label only from claims sourced in step 3.
6. Upload the PNG to the existing public Supabase Storage bucket `newsletter-images`
   (project `uksoubgwjbgjwtaafdxo`), path namespaced under `teardowns/<slug>.png`.
7. Append one entry to the `teardowns` array in `src/content/teardowns.ts`, matching the
   existing `Teardown` type exactly: `slug`, `company`, `eyebrow`, `headline`, `dek`,
   `image`, `publishedDate` (today's date). Follow the shape of existing entries. Slug
   pattern `<company>-teardown-pm-lens`, no collision with an existing entry.
8. **GATE:** write the entry as JSON and run
   `node check.mjs teardown --file <entry.json> --tsfile <repo>/src/content/teardowns.ts --date <today>`.
   This checks required fields, slug shape/collision, banned content, em-dashes, and that
   the infographic URL resolves 200.
9. If it passes: commit `src/content/teardowns.ts` to `master` (`git add`, `git commit -m
   "Add teardown: <company>"`, `git push`; on failure `git pull --rebase` once and retry;
   **never force-push**), then confirm live by fetching
   `https://productwithrohan.online/productshot/teardowns/<slug>` (status 200, infographic
   URL present in the served HTML).
10. **Stop condition:** if the infographic upload fails or won't resolve 200 after one
    retry, add nothing to `teardowns.ts` — a teardown without its infographic isn't the
    deliverable. This also blocks `product-shots-teardown-substack`'s Note 3a (don't leave
    it to draft against a missing entry). If `git push` fails twice, stop and report;
    never force-push.

The four Substack drafts (Notes 1/2/3a/3b) still live entirely in
`product-shots-teardown-substack`, which runs later the same Sunday and now reads this
stage's `teardowns.ts` entry instead of building its own.

## Stage 5: LinkedIn post (rejoined 2026-09-08)

One LinkedIn post per run, drafted and gated the same way everything else in this pipeline
is — no stage here posts on faith.

1. **Pick the angle: blog article or teardown/product shot, whichever is stronger this
   week (2026-09-20).** Stage 5 picks one, not a blend of both — judge "stronger" the
   way a hook gets judged anywhere else in this pipeline: sharper tension, a more
   concrete stat, a clearer practical takeaway. If the blog post wins, lead with its
   core tension or a News item and tie it to the live Shots question as the CTA (name
   the specific question type, frame it as worth a few minutes). If the teardown wins,
   lead with its sharpest stat or tension and point to the teardown page itself as the
   CTA. Rotate phrasing week to week — check `linkedin-cta-log.md`'s last ~10 entries
   so this week's hook and CTA phrasing are not a repeat.
2. **No Handbook, ever, on LinkedIn specifically** — this is the one surface where the
   Handbook reversal (see Standing rules) does not apply.
3. Draft through `anthropic-skills:writer`, then both `anthropic-skills:humanizer` and
   `anthropic-skills:anti-ai`, then a final `anthropic-skills:ogilvy-audit` pass, revised to
   address its findings — same pipeline as the blog post and teardown copy.
4. Length: LinkedIn's practical read-more fold is short. Keep it under ~1,300 characters of
   real content (the gate's hard limit is 3,000, but that's a ceiling, not a target).
   3-5 hashtags, no em/en dashes (the gate fails on both).
5. **GATE:** `node check.mjs social --platform linkedin --file <post.txt> --ctalog
   linkedin-cta-log.md`. Fix and re-run once on a failure; a second failure stops this stage
   only (see Stop conditions).
6. **Posting mechanism (confirmed working 2026-09-08).** Post via Composio's LinkedIn
   toolkit: `LINKEDIN_GET_MY_INFO` to resolve the author URN (`urn:li:person:a7RZ6Boa5m`,
   account id `linkedin_missay-tied` — the `is_default: true` connected account; three
   LinkedIn accounts are connected under this Composio integration, all the same person,
   but this is the one to use unless Rohan says otherwise), then
   `LINKEDIN_CREATE_LINKED_IN_POST` with `visibility: PUBLIC`, `lifecycleState: PUBLISHED`,
   and the gate-passed text as `commentary`. Confirm success from the tool response (a
   `urn:li:share:...` id comes back). **In a scheduled/unattended run, a passing
   `check.mjs social --platform linkedin` gate is sufficient to publish — no chat
   confirmation is available or required, exactly like Stage 3's blog post and Stage 4's
   teardown, which also auto-publish on a passing gate with nobody in the loop.** The
   interactive confirmation that happened the first time this stage ran (2026-09-08, run
   with Rohan present in chat) was because that was an ad hoc same-session request, not
   because this stage requires it going forward. If Composio's LinkedIn connection is ever
   inactive or the publish call errors, treat it like any other missing-connector case:
   **do not fake success.** Save the finished, gate-passed draft to the session scratchpad
   (not the repo), log the CTA phrasing to `linkedin-cta-log.md` anyway (still useful for
   next run's rotation check), and report clearly that the post is drafted and gated but
   not published.
7. On a successful post, append one line to `linkedin-cta-log.md` (newest entry at top,
   keep only the last ~10) recording the CTA angle and hook used, per the existing log format.

## Stage 6: Health check

1. `select type, question from public.shots_questions order by type, created_at;` — skim for
   near-duplicates within a type. **Report suspects; do not delete** unless it is an
   unambiguous duplicate, and say so explicitly.
2. `select id, title, source_url, published_date from public.news_items order by published_date desc limit 20;`
   Spot-check the most recent ~10 URLs. Delete only clearly-dead items and note each deletion.
3. **Age-based cleanup (added 2026-09-20, runs every week, no confirmation needed):**
   `delete from public.news_items where published_date < (current_date - interval '60 days');`
   News items exist to power a rotating "what's happening" surface, not an archive, so
   anything older than 60 days is deleted outright every run, not just flagged. This is
   different from the dead-URL check above (which only removes items confirmed broken) —
   this one runs unconditionally on age alone. State the count deleted and the oldest
   date removed in the run report.
4. `select type, count(*) from public.shots_questions group by type;` — flag any type 3+ rows
   behind the leader.
5. Fetch 2-3 recent post URLs and confirm they render. Note any post whose news hook has been
   overtaken by events (report only, never rewrite old posts).

## Stage 6b: Repo health (added 2026-08-15)

A weekly pass over the `product-with-rohan` GitHub repo
(`github.com/rohankhullar24-oss/product-with-rohan`), replacing the ad-hoc CI check-ins that
used to get spawned by hand mid-session. Use the `gh` CLI, already authenticated in this
environment. This is a **report-only** stage — nothing here auto-merges, auto-closes, or
auto-deletes anything; it surfaces state for Rohan to act on.

1. **Failing workflows.** `gh run list --repo rohankhullar24-oss/product-with-rohan --limit 20 --json status,conclusion,name,headBranch,createdAt`.
   List any run with `conclusion` of `failure` or `cancelled` in the last 7 days — workflow
   name, branch, and how long it's been failing (if the same workflow has failed on
   consecutive runs, say so explicitly, that's a different signal than one flaky run).
2. **Stale branches.** `gh api repos/rohankhullar24-oss/product-with-rohan/branches --paginate`
   (or `git branch -r` plus `git log -1 --format=%cd` per branch) — list branches other than
   `master` with no commits in 30+ days. Report the branch name, last commit date, and last
   author. **Report only, never delete a branch** — that's Class B territory (see Stage 7),
   not something this stage decides.
3. **Open Dependabot PRs.** `gh pr list --repo rohankhullar24-oss/product-with-rohan --author "app/dependabot" --state open --json number,title,createdAt`.
   List each with its age. Flag any open more than 14 days as stale, since an unmerged
   security/dependency bump sitting for weeks is exactly the kind of thing this stage exists
   to surface instead of it silently rotting.
4. **Do not merge, close, approve, or comment on anything found here.** This stage reads and
   reports. If a failing workflow or a stale Dependabot PR needs action, that's a Report line
   and, if it's judgment-call territory (which dependency bump to prioritize, whether a
   long-lived branch is intentional), a Class B item in `proposals.md` via Stage 7 — never
   self-applied.
5. If `gh` is not authenticated or the repo is unreachable, treat this as a soft stop for this
   stage only per the Stop conditions below: skip it, note why, continue the run.

## Stage 7: Advisor pass

This is the stage that makes the pipeline improve rather than merely repeat. Run it last,
with full knowledge of what just happened.

**Input:** everything produced this run, every check that failed, the Stage 6 and Stage 6b
findings, and `node checks/history.mjs summary`.

**Ask:** what is missing, what is drifting, what keeps breaking, what is worth doing that
nothing in this file currently does. Ground every observation in the history or this run's
evidence. "The em-dash check failed 4 of the last 5 runs, so step 6's instruction is not
landing" is a proposal. "We could engage readers more" is noise; do not write it.

**Growth and site-quality pass (added 2026-08-15).** Alongside the pipeline-health ask
above, the advisor also looks specifically at whether the content and the website itself are
getting better at earning views and holding up as a destination, not just at whether the
pipeline ran cleanly. Same rule applies: ground it in evidence, not vibes.
- **What's actually working.** If Stage 6 or any live-URL check surfaced a post or Shots
  question with real signal (an unusually active discussion, a post that clearly aged well),
  name it and say why it likely worked — that's a pattern worth repeating, not a one-off.
  Teardown-specific signal is `product-shots-teardown-substack`'s advisor's job now.
- **What's underperforming or stale.** A topic/lane that's been run repeatedly without new
  angles, an evergreen page that hasn't been refreshed while its underlying facts moved.
  Report only, per the existing rule never to rewrite old posts unprompted.
- **Site-quality observations**, grounded in what this run actually touched or Stage 6
  fetched: broken or awkward navigation between the blog and Shots dashboard; a content type
  that's easy to publish but hard for a visitor to discover once live; anything that makes
  the site harder to explore than it needs to be.
- **Where this goes.** A concrete, low-risk content-selection idea (a specific evergreen
  query worth targeting next, a specific teardown angle, a tone/format worth repeating) is
  Class A — write it to `next-run-hints.md` like any other hint. Anything structural — new
  site sections, navigation/IA changes, content formats not already in this pipeline, SEO or
  discoverability work beyond picking topics — is Class B: propose it in `proposals.md`,
  never self-apply. "We could engage readers more" is still noise regardless of which class;
  only write observations tied to something this run or the history actually showed.

**Class A — you may act, by writing `next-run-hints.md`:** anything that only steers *content
selection* next run. A neglected question type, an uncovered evergreen query, a tone
correction, a follow-up angle on a story that moved. Max 3 open hints; expire anything older
than 2 runs. These still pass through every gate next run, so a bad hint costs one rejected
draft.

**Class B — propose only, in `proposals.md`:** cadence, pause state, publishing volume, new
integrations, deleting data Stage 6 did not confirm dead, or editing this file. Max 5 open;
auto-expire after 4 runs. **Never self-apply a Class B proposal**, even an obviously good one,
and never edit this SKILL.md or any cron. Config is Rohan's call. The checks verify output
against fixed rules; nothing verifies the advisor's reasoning, so proposal-only is the
boundary that keeps one bad judgment from shipping live.

**Then record the run:** write a record per the shape documented in `checks/history.mjs` and
`node checks/history.mjs append --file <record.json>`. Be honest about failures; a history
that only records successes teaches the advisor nothing.

## Stage 8: Notify — required every run

Send a `PushNotification` on **every** run, successes included. The point is that silence
becomes meaningful: if Rohan gets nothing on a Sunday morning, something is wrong. Under
200 characters, one line, lead with anything actionable:

- All good: `Shots ✓ News 3 ✓ Blog live ✓ Teardown live ✓ LinkedIn posted ✓ Repo health: 0 failing, 2 stale branches, 1 Dependabot PR · 1 proposal open`
- LinkedIn drafted but not posted (no connector): `Shots ✓ News 3 ✓ Blog live ✓ Teardown live ✓ LinkedIn: drafted, not posted (no connector) · Repo health: all clear`
- Something blocked: `BLOCKED: blog failed render check. Post pushed but not live.`
- Repo health flags something: `Shots ✓ News 3 ✓ Blog live ✓ Teardown live ✓ Repo health: CI failing on master (deploy.yml, 3 runs) — check GitHub`

Name any stage that was skipped or blocked, and flag when a Class B proposal is waiting.

## Stop conditions

**Hard stops — end the run, report, change nothing else:**
- `git push` fails twice. Never force-push.
- The published-render gate fails after one retry for Stage 3's post.
- Any draft fails its gate after one revision. Do not publish past a `FAIL`.
- The Shots unique-constraint insert fails twice.
- A required connector (e.g. Composio for the digest task) will not load. Skip that stage;
  never fake success.

**Soft stops — skip the stage, continue the run:**
- Web search genuinely surfaces nothing new for News.
- A single publish API call fails once → one retry with backoff, then stop that stage only.
- Stage 6b: `gh` unauthenticated or the repo unreachable. Skip the stage, note why, continue.

**Always retired, not a stop condition — no need to report as a failure:**
- The Substack "Stage 5" (Notes 1/2/3a/3b): still lives entirely in
  `product-shots-teardown-substack`. Not the same as this job's own Stage 5 (LinkedIn).

## Report

One line per stage: the Shots type added, News items inserted, blog title and filename,
whether the post verified live, the teardown company/slug/live-check result (Stage 4), and
the LinkedIn post's angle/hook plus whether it actually posted or only drafted-and-gated
(Stage 5 — say explicitly if no posting connector was available). Also cover content health
findings (Stage 6) and repo health findings (Stage 6b: failing workflows, stale branches,
open Dependabot PRs, or "all clear"), and any advisor hints or proposals written. Say
plainly what was skipped and why. Note that the four Substack drafts for the week come from
`product-shots-teardown-substack`, a separate task, not this one.
