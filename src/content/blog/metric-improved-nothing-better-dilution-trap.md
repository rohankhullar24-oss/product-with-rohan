---
title: "Your Metric Improved and Nothing Got Better: The Product Dilution Trap"
description: "A conversion rate, an activation number, or a retention curve can improve in aggregate while the underlying product gets no better for anyone. Here's how to catch the dilution effect before it goes in the board deck."
date: "2026-09-19"
---

A PM I know shipped an onboarding redesign last year. Completion rate went from 58% to 76% in six weeks. The design team was thrilled, the metric was clean, and the number went straight into the quarterly review.

Three months later, Day-90 retention for the users who went through the new onboarding was statistically identical to the users who went through the old one. Not worse. Not better. Flat, to the second decimal place.

Nobody had done anything wrong. The redesign genuinely got more people through the flow. It's just that "got more people through the flow" and "made the product better" are not the same claim, and the gap between them is where a lot of product metrics quietly lie to you.

## The metric didn't lie. It diluted.

This is Simpson's paradox, and it shows up in product work more often than most PMs realize, usually without anyone naming it. The pattern: an aggregate metric moves in one direction while every meaningful segment inside it is flat or moving the other way, because the composition of who's in the metric changed underneath you.

Here's the mechanical version of what happened in the onboarding example. Before the redesign, the flow had a step that was mildly annoying and it filtered people. Not on purpose, but functionally: users with low intent to actually use the product tended to bail there. The users who made it through were, on average, higher-intent. That's why old-flow completers retained at whatever rate they retained.

The redesign removed friction. Good. But some of what it removed wasn't friction, it was signal. The users who now complete onboarding include everyone who would have completed it before, plus a new group who would have dropped off at the old step but sailed through the new one. That second group is, on average, lower-intent, because the thing that used to filter them out doesn't exist anymore.

Blend those two groups into one retention number and you get exactly what happened here: the original core cohort retains fine, the new marginal cohort retains poorly, and the average lands right back where it started. The aggregate says "no change." The truth is "the core got no worse, and we added a tail of users who were never going to stick around, and those two facts cancel out in the top-line number."

This is not a hypothetical. [Mixpanel has documented](https://mixpanel.com/blog/avoiding-data-fallacies-and-biases-simpsons-paradox-and-the-importance-of-segmenting-data/) the same shape of trap in raw engagement data, where a feature looks flat or even negative in aggregate but is actually working in every individual segment once you split the population correctly, and the reverse case, where a feature looks fine in aggregate while a specific segment is quietly getting worse. The FP&A world has a name for this too: they'll tell you a company's total margin improved while every single product line's margin fell, because the product mix shifted toward the lower-margin lines and dragged less weight than you'd expect. Same mechanism, different spreadsheet.

## Why your dashboard won't catch this on its own

Most product dashboards are built to answer "did the number go up," not "did the composition of the population behind the number change." That's not a tooling failure so much as a default. Aggregates are what get reported because they're simple, and simple numbers travel well in a board deck. Nobody puts a cohort-by-cohort breakdown on slide 4.

The failure mode is specifically dangerous because it doesn't look like a failure. A stale or broken metric usually announces itself: a dashboard goes flat, a number drops to zero, someone notices a tracking event stopped firing. A diluted metric does the opposite. It looks completely healthy. It moves in the direction everyone wants. It survives a casual glance from a VP scanning fifteen metrics before a meeting. The only way to catch it is to go looking on purpose, before you've already told leadership the story you want the number to tell.

## How to check for dilution before you trust an aggregate

**Segment before you celebrate.** Whenever a top-line metric moves, cut it by whatever dimension is most likely to have changed alongside it: new vs. existing users, platform, acquisition channel, geography, or (for a change like onboarding) whether the user would have converted under the old flow or only converts under the new one. If the metric moves the same direction in every segment, you have a real effect. If it flattens or reverses in any segment, you've found composition doing the work instead of the product.

**Isolate the incremental population.** This is the specific move that catches onboarding-style dilution. Don't compare "everyone who completed under the new flow" to "everyone who completed under the old flow." Compare the users who complete under *both* flows (the ones who would have gotten through either way) against the users who complete only under the new one. If the incremental group retains meaningfully worse than the stable group, your redesign widened the funnel with users the old flow was correctly screening out. That's worth knowing before you scale the change to a bigger population, because you're not just improving onboarding, you're changing who your onboarding lets in.

**Ask what the metric used to be a proxy for.** Old-flow completion rate wasn't retention, but it was correlated with retention, because the friction it removed happened to correlate with intent. Once you change the flow, that correlation can break without the metric telling you. Any time a proxy metric moves and you don't independently verify the thing it was standing in for, you're trusting a relationship you haven't re-tested.

**Check the denominator, not just the numerator.** A lot of dilution hides in a shrinking or growing base. If signups fell 30% in the same window that activation rate rose from 52% to 68%, that's not automatically good news, because a smaller, more self-selected pool of signups can produce a higher activation rate on its own, with the product doing nothing differently. Whenever a rate improves, check whether the population it's a rate *of* changed size or composition first.

**Give the win to the metric it actually moved, not the one you wanted it to move.** This is the part that's uncomfortable in a room with a design team that shipped real work. If the redesign compressed time-to-first-value, reduced early drop-off, or cut support tickets during onboarding, those are genuine improvements and worth reporting as exactly what they are. What you shouldn't do is borrow credibility from Day-90 retention when the segmented data shows the redesign isn't the thing driving it. Claiming the wrong win doesn't just misrepresent this quarter, it also means nobody goes looking for the actual reason retention is flat, which is a different and probably more important problem sitting one layer downstream.

## The version of this that doesn't involve onboarding

Dilution shows up anywhere a change reshapes who's included in a rate, not just in funnel redesigns. A pricing change that removes a plan tier can raise average revenue per user while total revenue falls, because the users who leave were disproportionately low-value and their departure inflates the average of who's left. A support team that closes tickets faster on a new triage system can show improved resolution-time metrics while customer satisfaction with support stays flat or drops, if the new system is closing easy tickets faster and letting hard ones sit exactly as long as before, just diluted into a better-looking average. A marketing channel that "improves" in conversion rate after a targeting change might just be reaching fewer, more pre-qualified people, not converting the same population better.

The common thread in all of these: something changed the population behind the metric, and the aggregate metric has no way to tell you that on its own. It just reports the blended result and lets you assume the blend is uniform.

## What this changes about how you review metrics

None of this argues against shipping the redesign, cutting the pricing tier, or changing the triage system. It argues against trusting a single aggregate number to tell you whether any of those changes worked, especially the ones you're emotionally or politically invested in being wins.

The practical habit worth building: any time a metric moves and you're about to attribute the movement to a specific change, ask what population that metric is drawn from, and whether that population is the same population it was drawn from before the change. If the answer is "roughly the same people, just behaving differently," the movement is probably real. If the answer is "a meaningfully different mix of people," you need to segment before you believe it. That one question, asked before the number goes in the deck instead of after someone else asks it in the meeting, is the difference between diagnosing a real result and getting embarrassed by a fake one in front of your VP.

If you want to practice the diagnostic muscle this piece is describing, this week's [Product Sense Shots question](https://productwithrohan.online/productshot) walks through almost this exact scenario: an onboarding completion jump with flat Day-90 retention, and the segmentation steps to figure out which one is telling the truth. For the deeper mechanics of why the individual metrics you're tracking each have their own specific ways of misleading you, see [Product Metrics Every PM Should Know](https://productwithrohan.online/blogs/product-metrics-every-pm-should-know). And if the number in question came out of a genuine regression rather than a composition shift, [How to Run a Product Postmortem That Actually Changes What You Ship Next](https://productwithrohan.online/blogs/how-to-run-a-product-postmortem) covers the process for tracing it to a real root cause instead of a plausible-sounding one.

Aggregates are convenient. They're also the easiest place in a metrics review for a genuinely false story to hide in plain sight, wearing the shape of good news.
