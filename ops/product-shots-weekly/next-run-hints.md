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

- **[2026-11-01] `behavioral` is now the only question type at 5 rows; every other type is at 6.** Next run should pick `behavioral` under Stage 1's lowest-count rule.

- **[2026-11-01] Blog lane: the last three posts were an evergreen metrics piece, an AI-model eval piece and this run's feature-sunset craft piece, all constructive.** A news-hooked post is due next. Pick a verified positive story from News (fetch the primary source first) and avoid reorg, layoff and buyout subjects. A good evergreen alternative: how to write acceptance criteria for an AI feature.

- **[2026-11-01] Teardown lane: three of the last four non-India picks were consumer subscription or freemium products (Duolingo, Canva, Spotify).** Next teardown could be a B2B SaaS, a marketplace or an India consumer non-fintech product (for example a quick-commerce or edtech company), so the page does not read as one business model.

## Recently retired

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
