---
title: "The Product Decision Memo: How to Make a Call People Can Actually Revisit"
description: "A practical template for product decision memos that makes assumptions, trade-offs, and follow-up work visible without turning every roadmap call into a meeting."
date: "2026-08-09"
---

Most product decisions are documented after the decision has already become hard to change. A slide says what shipped. A ticket says what somebody built. Neither tells a new teammate why the team chose this path, what alternatives it rejected, or what would make the decision look wrong six weeks later.

That gap costs more than people expect. Teams reopen old arguments because the reasoning disappeared. Someone treats a tentative assumption as a fact. A feature looks unsuccessful because nobody recorded the narrow outcome it was meant to improve. Then the next decision starts with memory, confidence, and the loudest person in the room.

A decision memo is a small antidote. It is not a strategy document, a requirements document, or a polished announcement. It is a short record of a choice while the reasoning is still available. The useful version is plain enough that a colleague can read it in five minutes and specific enough that they can challenge it later.

## Start with the decision, not the backstory

Open with one sentence that says what is being decided and when it takes effect.

"We will launch the new onboarding flow to self-serve teams first and delay the enterprise version until we have evidence that the core flow improves activation."

This sounds obvious, but many memos begin with a long account of the market, research, or organizational history. Context matters, but a reader should know the call before they know the route to it. Otherwise every comment becomes a request for more context and the decision itself stays fuzzy.

Name the decision owner as well. Ownership is not a claim that one person knows everything. It tells the team who will make the call when evidence conflicts or time runs out. Product work often needs broad input and a single accountable choice.

## Describe the problem in user terms

Write two or three sentences about the user problem, the affected segment, and the consequence of leaving it alone. Avoid a solution in this section. "Users need an AI assistant" is a proposal disguised as a problem. "New users abandon setup when they cannot tell which data source to connect first" is a problem you can investigate.

The distinction prevents a common failure: the team spends weeks debating implementation before agreeing that the problem is important. It also creates room for alternatives. If the problem is unclear, the right decision may be research rather than delivery.

Use evidence, but label its strength. A support-theme count, a usability study with five participants, and a controlled experiment are not interchangeable. The goal is not to make weak evidence sound strong. It is to give readers an honest picture of what the decision rests on.

## Put options on the page before recommending one

The memo should list the realistic choices. Usually that means two to four options, including doing nothing for now. Each option needs the upside, the cost, the major risk, and the condition that would change your mind.

For an onboarding problem, options might be: simplify the first screen, add guided setup for every new user, offer a human-assisted setup to a narrow segment, or keep the current flow while measuring where users leave. These are different bets. A table is often the fastest way to make the trade-offs legible.

| Option | Expected benefit | Cost or risk | What would change the call |
| --- | --- | --- | --- |
| Simplify the first screen | Faster test and lower engineering cost | May not address data-source uncertainty | Research shows users understand the next step but cannot finish connection |
| Guided setup | Could solve the full journey | More build time and harder to reverse | A small prototype lifts completion enough to justify the cost |
| Assisted setup for a segment | High learning value | Does not scale as the final experience | Demand is too low to learn from or the segment needs a self-serve path |
| Wait and measure | Avoids premature work | Leaves current friction in place | Evidence shows the drop-off is material and persistent |

You do not need fake precision. A score can help compare options, but it cannot make an uncertain forecast certain. In [the piece on why prioritization frameworks don't work](https://productwithrohan.online/blogs/prioritization-frameworks-dont-work), I argued that a framework is only useful when it exposes judgment rather than hiding it. The same is true here. If a cost estimate is rough, say it is rough.

## State the assumptions that carry the decision

The most valuable sentence in a memo is often the one that begins, "This depends on..." A decision can be sensible today and still be wrong after a key assumption changes. Recording assumptions turns later disagreement into a useful check instead of a replay of the original meeting.

For example: this plan assumes the onboarding drop-off is caused by uncertainty rather than a technical error; the self-serve segment represents enough volume to learn quickly; and the team can ship the simplified flow without delaying reliability work. Each assumption should be testable or at least observable.

Do not hide an assumption because it sounds uncomfortable. If an enterprise contract is driving the timeline, name it. If the team has not spoken to a user segment, name that too. A clean memo is not one with no uncertainty. It is one where uncertainty has an owner and a next step.

## Make success and harm measurable

Every recommendation should include a result you expect and a guardrail you will watch. The expected result should connect to the user problem. For onboarding, that might be the percentage of new teams that connect a data source and complete a first meaningful task within seven days.

The guardrail asks how the team could appear successful while making the product worse. A shorter onboarding flow might lift completion while producing more poorly configured accounts. Watch support contacts, error rates, or early retention alongside the primary measure.

This is the discipline behind [product metrics that can mislead you](https://productwithrohan.online/blogs/product-metrics-every-pm-should-know). A metric is a decision tool only when you know what it misses. The memo gives that question a home before results arrive and incentives start to pull the story in one direction.

Include a review date. "We will revisit this after four weeks or after 500 eligible teams, whichever comes later" is much stronger than "we will monitor performance." It tells people when the decision can be reopened and prevents a temporary choice from becoming permanent through neglect.

## Separate dissent from delay

Good memos invite disagreement, but they should not turn every objection into a veto. Give reviewers a clear way to respond: challenge the problem definition, identify missing evidence, point out a risk, or propose a better option. Comments that only restate a preference should not derail a time-sensitive call.

When dissent remains, write it down briefly. "Sales believes the enterprise version should ship first because two prospects asked for it. We are not choosing that route because the requested workflow is not yet proven across the broader segment." This protects the relationship. The concern was heard, the response is visible, and nobody has to pretend consensus existed.

The same skill shows up in the [guide to saying no without burning trust](https://productwithrohan.online/blogs/pm-skill-of-saying-no). A durable no explains the trade-off and offers a next checkpoint. It does not disappear behind a vague backlog status.

## Keep the format short enough to use

For most product calls, a memo can fit on one or two pages:

1. Decision, owner, and date.
2. User problem and evidence.
3. Options considered and recommendation.
4. Assumptions, risks, and dissent.
5. Success measure, guardrail, and review date.

Link to research, designs, and detailed estimates instead of pasting them into the memo. The memo is the map, not the warehouse. A reader who needs detail can follow the links; a reader who needs to understand the call gets there quickly.

The aim is not to create paperwork. It is to make learning compound. Six months later, the team should be able to see what it believed, what it tried, and whether the result supported the belief. That record improves the next decision more reliably than a longer meeting ever will.
