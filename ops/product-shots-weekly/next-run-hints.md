# Next-run hints

Written by the advisor stage at the end of each run. Read by Stage 1 (Shots question)
and Stage 3 (blog post) at the START of the next run, before they pick their topic.

These are Class A only: they steer *content selection* for the next run and nothing
else. They cannot change cadence, pause state, publishing volume, or this pipeline's
configuration. Anything a hint produces still goes through the full deterministic
check suite before it publishes, so a bad hint costs one rejected draft, not a bad
publish.

Rules the advisor must follow when writing this file:
- Maximum 3 open hints at a time. If there are already 3, replace the least useful
  one rather than appending a fourth.
- Every hint carries the run date it was written. Delete any hint older than 2 runs
  that has not been acted on: if it has not mattered in two weeks, it is noise.
- Hints are suggestions with reasons, not orders. A stage may ignore a hint if that
  run's own rules (type balance, tone balance, dedup) point elsewhere. Log it when
  that happens so the advisor can see its hint was overridden.

---

## Open hints

- **[2026-11-22] Question type: metrics_analytics and strategy_gtm are both at 7 rows, the other six types are at 6.** Stage 1 should pick among those six by oldest newest row (`select type, max(created_at) from public.shots_questions group by type order by 2 asc`). On 2026-11-22 the oldest is root_cause_analysis (last added 2026-09-20), then guesstimate and product_sense.

- **[2026-11-22] Blog lane: the last three posts were all hooked to AI stories (AI hiring proof, AI agent approval step, Signal and agentic AI).** Pick a craft subject with a non-AI news hook next (discovery, stakeholder alignment, roadmap trade-offs or a PM workflow). Avoid reorg, layoff and buyout subjects.

- **[2026-11-22] Teardown lane: Figma is done, and its 10-Q and quarterly releases were fetchable, so every figure rests on a primary source.** The three-quarter trend format (net dollar retention 139, 136, 131) made the tension easy to see. Next teardown: another company with a fetchable SEC filing or IR release, preferably a marketplace or fintech rather than software tooling. The last four were Spotify, Shopify, Zepto and Figma.

## Recently retired

- Question-type, non-AI blog and fetchable-filing teardown hints (2026-11-15): acted on 2026-11-22 (metrics_analytics question added, Signal principles post, Figma teardown from the 10-Q and releases). The blog hint was only half met: the subject was non-AI craft, but the news hook was AI-related, so it is restated above.

- Question-type tie, AI-acceptance-criteria blog and India quick-commerce teardown hints (2026-11-08): acted on 2026-11-15 (strategy_gtm question added, AI agent approval-step post with acceptance criteria, Zepto teardown).

- Behavioral, news-hooked blog and non-consumer-subscription teardown hints (2026-11-01): acted on 2026-11-08 (behavioral question added, CompTIA-hooked blog, Shopify teardown).

- Prioritization-trails hint, pairing hint and India-fintech teardown hint (2026-10-25): acted on or superseded 2026-11-01 (prioritization question added, Spotify teardown broke the India fintech run; the AI-eval pairing hint was not used because the lowest-count rule pointed elsewhere).

- Reorg/layoff-as-subject hint (2026-09-20): removed, not tracked as a hint anymore.
  Reorg and layoffs are now a permanent standing-rule exclusion in SKILL.md's Standing
  rules section, enforced there directly rather than depended on via hint memory.
- Same-event-across-categories dedup reminder (2026-08-13): folded into standard
  practice at this point — applied cleanly again this run (AIR/WeatherNext/Snowflake/
  Uber all distinct underlying events, no cross-category overlap) without needing the
  hint to prompt it. No longer tracked as an open hint.
- Teardown-surface duplication reminder (2026-08-15): out of scope for this job now that
  Stage 3b/teardown moved to `product-shots-teardown-substack` (split 2026-08-26). That
  task's own hints file, not this one, is the right place for it going forward.
- Substack-skip / Narrareach-subscription reminder (2026-08-13): superseded by the
  current SKILL.md standing rule (Narrareach unavailable, draft-only, no tool calls
  attempted). No longer an open question each run — nothing to act on.
- Jobs-recency verification reminder (2026-08-08): superseded by the staleness gate added
  to `check.mjs news` (P3, applied 2026-08-08). The gate now enforces this mechanically.
- Question-type tie-break reminder (2026-08-10 / 2026-08-13 / 2026-08-26): fully resolved
  this run — every type is now at an even 5 rows, see the new open hint above.
- Tone-balance reminder (2026-08-10): the last several regular posts (postmortem, PRD
  guide, decision memo, this run's AI-reorg framework piece) have all been constructive/
  equipping rather than doom-flavored, so this has not needed re-triggering since 08-13.
