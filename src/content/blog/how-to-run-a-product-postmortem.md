---
title: "How to Run a Product Postmortem That Actually Changes What You Ship Next"
description: "Most postmortems produce a document nobody rereads and an action item nobody owns. A practical structure for running one that changes the next roadmap, not just the last one."
date: "2026-08-26"
---

A feature launches, the numbers come in soft, and someone schedules a postmortem. Twelve people join a call. Everyone agrees the timeline was tight, the spec had gaps, and communication could have been better. A doc gets written. Three action items get logged in a tracker nobody opens again. Six months later, the same team ships a different feature the same way and gets surprised by the same failure mode.

This is not a facilitation problem. It is a structural one. Most postmortems are built to produce closure, not change. They ask "what happened" and stop there, when the harder and more useful question is "what would have to be true for this not to happen again, and are we actually willing to make that true."

Here is a structure that produces the second kind of postmortem, built from watching a lot of the first kind fail.

## Start with the number, not the narrative

Before anyone speaks, write down the specific gap between what was expected and what happened. Not "the launch underperformed." A number: activation was projected at 34% and landed at 19%. Retention curve flattened two weeks earlier than the comparable cohort. Support tickets ran 4x forecast in week one.

This matters because a room full of people will default to narrative before data if you let them. Narrative is comfortable. It lets everyone contribute an opinion and nobody has to be wrong. A number forces the conversation to explain a specific gap rather than vibes about how the launch "felt."

If you don't have the number, that is itself the finding. A team that cannot state precisely how a launch missed cannot run a real postmortem yet; it can only run a bonding exercise. Go get the number first, even if it takes another week.

## Separate the decision from the outcome

The single most common failure in a postmortem is judging a decision by its outcome. If the launch missed, the instinct is to find whichever decision looks worst in hindsight and treat it as the root cause. This is backwards, and it teaches the org the wrong lesson.

A decision can be well-made and still produce a bad outcome, because the world is probabilistic and information was incomplete at the time. Ask two separate questions:

1. **Was the outcome bad?** Yes, clearly: the number says so.
2. **Was the decision bad, given what was known when it was made?** This requires reconstructing what the team actually knew at decision time, not what is obvious now.

A launch date moved up under pressure from a competitor announcement might have been the correct call given the information available, even though it produced a rushed QA pass and a rough launch. The fix in that case is not "never move dates under pressure," which is too broad and will calcify into a rule nobody follows anyway. The fix is narrower: build a faster QA path for compressed timelines, or set an explicit floor below which a date will not move regardless of external pressure.

Conflating decision quality with outcome quality produces postmortems that punish good judgment when luck ran badly, and that teaches people to hedge every future decision instead of making sharp calls.

## Map the failure to a layer, not a person

Every miss traces back to one of a small number of layers, and naming the layer changes what kind of fix you look for:

- **Signal layer.** The data that should have caught this either didn't exist, wasn't trusted, or wasn't looked at. Fix: instrument the gap, or change who reviews the dashboard before launch.
- **Decision layer.** The right data existed, but the team weighed it wrong or optimized for the wrong outcome. Fix: change the decision process, meaning who has veto power, what the go/no-go criteria are, what evidence bar has to be cleared.
- **Execution layer.** The plan was sound, but the build or rollout diverged from it: scope crept, QA got compressed, an edge case in production didn't match the spec. Fix: process changes to protect execution fidelity, like separating "must ship" from "nice to have" earlier.
- **Environment layer.** Something outside the team's control shifted: a platform policy changed, a competitor moved first, an external dependency broke. Fix: usually not a process change at all, but a monitoring change so the shift gets caught faster next time.

Most real misses are a combination: a signal problem that let a bad decision go unchallenged, compounded by execution slippage under time pressure. Naming all the layers that contributed, instead of settling on one, is what keeps the postmortem from turning into a search for a single villain. It also keeps the fix proportionate: a signal-layer problem needs a dashboard, not a new approval committee.

## Write the counterfactual test before you write the action items

This is the step most postmortems skip, and it is the one that actually determines whether anything changes. For each proposed action item, write down the specific scenario in which it would have prevented this exact miss. If you cannot write that sentence, the action item is theater.

"Improve cross-team communication" fails this test. It is too vague to falsify, which means it is also too vague to actually change behavior. "Require the growth team to review projected activation numbers against the last three comparable launches before a date is locked" passes the test, because you can point to this launch and say: had that review existed, someone would have flagged that 34% was optimistic against a base rate of 22% for similar features, and the projection, or the launch scope, would likely have been adjusted before the number became public inside the company.

Run this test on every item before it goes in the doc. Most postmortems generate five to seven action items because that feels thorough. Run the counterfactual test and you will usually find one or two survive, and those are the ones worth fighting for resourcing on. A shorter list that people actually implement beats a longer list that becomes a graveyard in the project tracker.

## Assign the fix to a person, a date, and a place it will be checked

An action item with no owner is a wish. An action item with an owner but no date is a low-priority wish. Every surviving item needs:

- A named owner, not a team. "Growth team" will not implement anything; a person will.
- A date by which the fix exists, not "next quarter" as a placeholder for "eventually."
- A place where its existence gets verified before the next launch of the same type: a checklist item, a required field in a launch template, a gate in the release process. If the fix lives only in the postmortem doc, it will not survive contact with the next deadline crunch.

This is the difference between a postmortem that produces institutional learning and one that produces a well-written document. The document is not the deliverable. The changed process is the deliverable, and the document is just the record of why the process changed.

## Bring the pattern forward, not just the incident

A single postmortem tells you about one launch. The real leverage comes from tracking postmortems over time and asking which layer keeps showing up. If three of your last five misses trace back to the signal layer (data that existed but wasn't trusted or wasn't looked at before a go/no-go call), that is not five separate incidents. That is one systemic gap in how your org makes decisions, and it deserves a fix at the process level, not five isolated action items scattered across five different docs.

This is also where a postmortem becomes genuinely useful for prioritization, tying back to the same discipline behind [why RICE and MoSCoW alone don't settle real prioritization fights](https://productwithrohan.online/blogs/prioritization-frameworks-dont-work): a scoring framework tells you what to build next, but a pattern across postmortems tells you what capability you're missing that keeps making every launch riskier than it needs to be. Fixing that capability is sometimes the highest-leverage thing on the roadmap, even though no single postmortem will say so on its own; only the pattern across several will.

## The metric hygiene that makes this possible

None of this works if the underlying metrics are unreliable, which is the same trap covered in [the ways core PM metrics quietly mislead you](https://productwithrohan.online/blogs/product-metrics-every-pm-should-know). If activation is defined differently in the postmortem than it was in the original launch projection, or if retention is measured against a shifting cohort window, you will spend the whole session litigating definitions instead of learning anything. Lock the metric definitions before the launch, not during the postmortem. By the time you're in the room asking what went wrong, it is too late to agree on what "wrong" even means.

## What a good postmortem actually looks like from the outside

You will not always be in the room. Here is how to tell, from the outcome, whether a team is running real postmortems or performing them:

Ask someone six months later what changed as a result of the last postmortem in their area. If they can name a specific process change (a new gate, a new required review, a new dashboard someone actually checks), the postmortem worked. If they can only recall that "we talked through what happened" and maybe point to a doc, it didn't, no matter how thorough the doc looked at the time.

That test is uncomfortable to apply to your own team, which is exactly why it is worth applying. A postmortem that cannot pass it was not a waste of the meeting time so much as a waste of the chance to fix something before it repeats. In most orgs it will repeat, quietly, until someone finally writes down the number instead of the narrative.
