---
title: "Product Metrics Every PM Should Know (And How Each One Can Mislead You)"
description: "Most PMs can define retention, activation, and DAU/MAU. Far fewer can say how each one breaks. A practical guide to the metrics that matter and the specific way each one will lie to you if you let it."
date: "2026-08-08"
---

Most metric guides for product managers are glossaries. They tell you that retention is the percentage of users who come back, that activation is the point where a user first gets value, that DAU over MAU gives you a stickiness ratio. All true, all useless on its own.

The problem is that nobody gets into trouble because they forgot a definition. They get into trouble because a number went up, everyone believed it, and it turned out the number was measuring something slightly different from what they thought. Metric literacy is mostly about knowing the failure mode of each metric, not the formula.

So this is a guide to the metrics worth tracking, organized around the specific way each one goes wrong.

## Retention, and why the aggregate number is almost always a lie

Retention is the closest thing product management has to a truth serum. If people come back on their own, you built something. If they don't, nothing else you measure matters very much.

The failure mode is that almost everyone looks at it wrong.

An aggregate retention number blends every user who ever signed up into one figure. That figure moves for reasons that have nothing to do with your product. If you ran a big marketing push last month, your aggregate retention drops, because a flood of low-intent users just entered the denominator. Your product didn't get worse. Your acquisition mix changed.

The fix is cohort analysis, and specifically looking at the shape of the curve rather than a single point on it. Take everyone who signed up in a given week, and track what percentage are still active at week one, week four, week twelve. Then do it again for the next week's signups, and the next.

What you're looking for is whether the curve flattens. A retention curve that declines and then goes flat means you have a real core of users who have integrated your product into their lives. A curve that keeps declining toward zero means you have a leaky bucket, and every user you acquire is a temporary rental. Those two products can post identical thirty-day retention numbers in a given month and be in completely different businesses.

The second thing to watch: retention should be measured against the natural frequency of the problem you solve. Daily retention is the right lens for a messaging app and a meaningless one for a tax filing product. Plenty of teams have panicked over weak daily numbers for products nobody should be using daily.

## Activation, and the trap of picking the event that correlates best

Activation is the moment a new user first experiences the thing your product is actually for. Getting this definition right matters more than almost any other measurement decision you'll make, because activation is what your entire onboarding gets optimized against.

Here is how teams get it wrong. Someone runs an analysis, finds that users who complete a particular action in their first week retain far better than users who don't, and declares that action the activation event. Onboarding then gets rebuilt to push everyone toward it.

The problem is that the analysis found a correlation and the team treated it as a lever. Users who invited three teammates in week one might retain better because inviting teammates creates value, in which case pushing invites will work. Or they might retain better because people who invite teammates were already committed, in which case the invite is a symptom of intent rather than a cause of retention. Push a lukewarm user through the same motion and you get an invite, not a retained user.

The test is whether the action plausibly delivers value on its own. Connecting a data source, importing your existing files, completing a first real task: those change what the product is worth to the user. Filling out a profile field usually doesn't, no matter how well it correlates.

A useful companion metric is time to first value. Not whether the user activated, but how long it took. This one is harder to game and it tends to expose onboarding problems that a binary activation rate hides.

## Engagement, and the DAU/MAU illusion

Daily actives over monthly actives is the standard stickiness ratio. A number near one means people use the product nearly every day. A number near zero point one means a typical monthly user shows up about three times.

Two things go wrong with it.

First, the ratio can improve while the business gets worse. If your monthly actives fall faster than your daily actives, because casual users churned out and only your hardcore base remains, the ratio climbs. On a dashboard that reads as a win. In reality you just lost the top of your funnel.

Second, and more common: engagement metrics tend to measure your product's ability to consume attention, which is not always the same as its ability to deliver value. For a social feed, time spent might genuinely track value. For a project management tool, a user spending more time in your product each week might mean the tool got harder to use.

Ask what number would go up if your product got worse in a specific way. If more time spent, more sessions, or more clicks would result from added friction, then that metric is not measuring what you want. This is the same discipline as the one I wrote about in [the piece on why prioritization frameworks don't work](https://productwithrohan.online/blogs/prioritization-frameworks-dont-work): the number is only as good as the judgment behind what you chose to count.

## The north star, and why most teams pick a vanity metric and call it strategy

A north star metric is supposed to be the single number that best captures the value your product delivers to users, such that growing it grows the business.

Most north stars fail one half of that sentence. Teams pick something that grows the business but doesn't represent user value (revenue, signups, page views), or something that represents user value but has no path to the business.

A workable north star has three properties. It reflects something the user actually wanted. It moves when the product improves and stalls when it doesn't. And it leads revenue rather than lagging it, so you find out you're winning before the invoices confirm it.

The reason this matters is organizational rather than analytical. Whatever number leadership repeats in every meeting becomes the thing hundreds of decisions quietly optimize toward. Pick a number that can be moved by degrading the user experience, and over a few quarters, it will be.

The failure mode here is subtle: a north star gives a team enormous confidence. It feels rigorous. That confidence is only earned if the number is a genuine proxy for value, and nothing about the ritual of having a north star checks whether it is.

## Guardrail metrics, the ones nobody tracks until it's too late

Every optimization has a cost that shows up somewhere other than the metric you're optimizing. Guardrail metrics are the ones you watch to catch that cost early.

If you're pushing activation, watch thirty-day retention of activated users, because an aggressive onboarding flow can manufacture activations that don't survive. If you're pushing conversion, watch refund and cancellation rates. If you're pushing engagement, watch support ticket volume and uninstall rate.

The pattern: for whatever you're driving up, ask what a cynical version of your team could do to move that number in a way that damages the business, then measure that thing too. You will not be doing it deliberately. You'll be doing it by accident, three experiments in, because every individual decision looked reasonable.

Guardrails are also the cheapest insurance in product management. They cost one dashboard and they routinely catch problems that would otherwise take a quarter to surface.

## Counting, estimating, and knowing which one you're doing

One skill that sits underneath all of this is knowing when you have a real number and when you have an estimate wearing a number's clothes.

Plenty of the figures in a product review are derived: market size, addressable users, projected impact of a feature. These are estimates, and estimates are fine. What causes damage is estimates that get quoted a few times, lose their assumptions along the way, and end up in a board deck as fact. The number that started as "if we assume roughly thirty percent of users in this segment have the problem" becomes "thirty percent of users have the problem" within about two meetings.

The habit worth building is stating the assumption every time you state the number, for as long as it takes for people to stop asking. It sounds pedantic. It prevents a specific and very common failure where a whole roadmap rests on a figure nobody can trace. If you want practice at building and defending estimates properly, the [guesstimate framework post](https://productwithrohan.online/blogs/how-to-answer-guesstimate-questions) covers the mechanics.

## What to actually do with this

If you're setting up measurement for a product from scratch, a workable starting set is smaller than most people expect:

One activation metric, defined as an action that plausibly delivers value rather than the one that correlates best. One retention metric, measured by cohort, at a frequency that matches how often your users genuinely have the problem. One engagement metric, chosen so that it would not improve if the product got worse. One revenue or unit economics metric. And two or three guardrails covering the ways each of those could be gamed.

That's it. Six to eight numbers. Most teams track thirty and can't tell you what any of them would need to do to change a decision.

The test for whether a metric earns its place is simple and slightly uncomfortable: if this number moved twenty percent in either direction, would we do anything differently? If the honest answer is no, you're not measuring, you're decorating. Cut it.

None of this is difficult analysis. It's mostly the discipline of asking what a number would look like if you were wrong, which is a habit rather than a technique, and one that stays valuable regardless of how much of the analysis itself gets automated. I wrote more about that shift in [the piece on judgment as the scarce PM skill](https://productwithrohan.online/blogs/pm-judgment-scarce-skill-ai-era). Tools have gotten very good at producing numbers. Deciding which ones deserve to influence a decision is still the job.
