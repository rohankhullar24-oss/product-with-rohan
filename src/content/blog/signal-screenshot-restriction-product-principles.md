---
title: "Signal Gave Up a Feature to Keep a Promise. Here Is How to Write Product Principles That Can Say No."
description: "Signal is restricting screenshots in its mobile apps to protect a privacy guarantee. It is a clean case study in what a product principle is for, and a four-test method for writing ones that change real roadmap decisions."
date: "2026-11-22"
---

Signal announced that it is restricting screenshots in its Android and iOS apps. Users can switch the restriction off, but Signal's president, Meredith Whittaker, said doing so would "break our privacy guarantees." She called the step "incomplete," because it does not "address other more sneaky ways AI agents could potentially access application data." TechCrunch [reported it on November 21](https://techcrunch.com/2026/11/21/signal-restricts-mobile-screenshots-as-it-confronts-existential-threat-of-ai-surveillance/).

I am not going to argue about AI and privacy here. I want to use the decision as a case study in something every PM gets asked to produce and almost nobody does well: a product principle that actually decides things.

Most teams have a principles slide. "Delight our users." "Move fast." "Be customer obsessed." Put one of those into a prioritization meeting and watch what happens. Nothing. Nobody has ever lost an argument to "delight our users."

Signal's decision shows what the real thing looks like.

## What Signal actually did

The mobile restriction is not new thinking. Signal already blocks screenshots in its Windows app by default. In May 2025 it added a "Screen security" setting to Signal Desktop on Windows 11. The setting was [switched on by default](https://signal.org/blog/signal-doesnt-recall/) and kept Microsoft Recall from capturing chats. Signal's own post said "Microsoft has simply given us no other option."

That 2025 post also owned the cost. Signal wrote that screen readers and magnification software may not work correctly while the setting is on. Anyone who needs it off can switch it off under Settings, Privacy, Screen security, after a warning and a confirmation.

Read that again as a PM. A feature that works for everyone, screenshots, was taken away from everyone by default. Among the people affected were users who rely on screen readers or magnification, exactly the group a thoughtful product team does not want to hurt. Signal shipped it anyway, wrote down who pays, and built the exit.

Now look at the reason Whittaker gave this week. Operating systems that integrate agentic AI, she wrote, "are undermining Signal's ability to independently guarantee privacy." The principle is in that sentence. Signal does not promise privacy as a slogan. It promises to be able to guarantee privacy by itself, without trusting the platform underneath. Once you define the principle that precisely, screenshots stop being a convenience feature and become a hole in the guarantee.

That is a principle doing its job. It took a debate that could have lasted a quarter ("but users like screenshots") and ended it, because the answer was already written down.

## A principle is a decision you made before the argument started

Here is the working definition I use. A product principle is a pre-committed answer to an argument you already know your team will have.

You will argue about speed versus polish. You will argue about whether to add a growth hack that works but makes the product feel pushy. You will argue about whether to build for the biggest customer or the broadest one. A principle is what you decided about that argument on a calm day, so that you do not relitigate it on a stressed one.

AWS's enterprise strategy team defines a tenet as ["an organisational belief that accelerates decision-making."](https://aws.amazon.com/blogs/enterprise-strategy/tenets-supercharging-decision-making) The useful part is the verb. It accelerates. If a principle does not make the meeting shorter, it is decoration.

## Four tests for a principle

When someone hands me a list of principles, I run four tests. A line that fails any one of them gets rewritten or dropped.

**Test 1: Can a reasonable team believe the opposite?**

The AWS post puts it directly: "a tenet needs to have an opposite which could be acceptable to an organisation." Their example of a non-tenet is "We should not build unsecure software." Nobody argues for the opposite, so the line settles nothing.

Run your list through this. "We build high-quality products" fails. Nobody ships a principle that says "we build low-quality products." "Be user-friendly" fails for the same reason.

The GOV.UK design principles have several lines that pass. "Do less" has an obvious defensible opposite, which is do more. "Do the hard work to make it simple" is explained on the [government's own principles page](https://www.gov.uk/guidance/government-design-principles) with the sentence "It's usually more and harder work to make things simple, but it's the right thing to do." That is a stance. A team could reasonably choose the cheaper, messier path, and the principle says they should not.

**Test 2: Does it name who pays?**

Signal's 2025 post named the screen reader users. That is the tell of a principle with teeth. If you cannot finish the sentence "We will do X, even when it costs Y," the principle has not met a real trade-off yet.

Write the Y. Make it specific. "Even when it costs us some conversion on the pricing page" is a Y. "Even when it is hard" is not.

**Test 3: Does it break a tie?**

The AWS post says a good tenet acts "as a tie breaker in decisions." It also warns that "there will typically be tensions between tenets," and recommends no more than seven, listed in descending priority. Its own example pairs "We optimise for speed" with "We continue to drive the cost of transactions down as we scale." Those two will collide, and the ordering is what tells the team which one wins on the day.

If your principles are an unordered bag, the loudest person in the room becomes the ordering. Rank them. Put the rank on the slide.

**Test 4: Does it say how it ends?**

This is the one most teams skip. Every principle needs an override path, and the override should be hard enough that people think twice.

Signal's version is a user setting that can be turned off behind a warning and a confirmation. Whittaker also called the new mobile step "incomplete" in the same announcement. A company that admits where its own principle stops working is easier to trust than one that claims perfect coverage.

The AWS post makes a similar point about attitude: "These aren't holy debates; they are objective considerations." A principle you cannot revisit turns into dogma, and dogma gets quietly ignored.

## A 45-minute exercise to write one

You do not need an offsite. You need a whiteboard and five recent arguments.

1. Pull the last five product decisions that took more than one meeting. Pricing page changes, a feature cut, a default setting, a launch date fight, anything where smart people disagreed.
2. For each one, write down what each side was protecting. Not what they wanted. What value they were guarding. One side usually protects speed or revenue. The other protects trust, simplicity or a promise made to customers.
3. Look for the value that keeps losing, or the one that keeps winning by raw seniority instead of by argument. That is the principle your team already has and has never written down.
4. Write it in one sentence in the form "We will X, even when it costs Y."
5. Run the four tests. Fix whatever fails.
6. Name an owner. One person, not a committee, who is allowed to say "this violates the principle" in a review.

Here is a made-up example, to show the shape. Imagine a B2B invoicing app. Its team keeps arguing about whether the total price should appear before or after the customer enters card details. Sales wants it later, because late reveals convert better in a test. Support hears the angry emails. The value that keeps losing is trust at the moment of payment. The principle becomes: "We show the full amount a customer will pay before they commit, even when it lowers conversion on the pricing page." It has an opposite a reasonable company could pick. It names who pays, here the growth team. It breaks ties. And the override is explicit: the growth lead can request an exception, in writing, once a quarter.

I invented that company. Do not copy the line. Steal the structure.

## Using it in the room

A principle earns its place in three specific moments.

**Prioritization.** I wrote earlier that [your RICE score is not the decision](https://productwithrohan.online/blogs/prioritization-frameworks-dont-work), it is the excuse. Principles are the other half of that argument. A score ranks the options that survive. A principle removes options before ranking starts. Treat it as a veto, not another column in the spreadsheet.

**The decision memo.** If your team writes [product decision memos](https://productwithrohan.online/blogs/how-to-write-product-decision-memo), add one line: which principle applied, and did it win or lose. When a principle loses, write the reason. Six months later, the log of lost arguments is the most honest view of what the company actually values.

**Saying no.** Refusing a feature request from a senior stakeholder is hard, and [the skill of saying no without burning trust](https://productwithrohan.online/blogs/pm-skill-of-saying-no) gets much easier when the no is not personal. "We decided before this request existed that we would not do this, and here is the principle" lands differently from "I do not think it is a good idea."

## How to know yours is working

Count. Over the last quarter, how many times did a principle change a decision? Not appear in a deck. Change a decision. A feature cut, a default flipped, a launch moved.

If the answer is zero, the principle is wallpaper. If the answer is more than a handful, check the opposite problem, which is a principle so broad that it justifies anything after the fact.

Three failure patterns show up again and again.

The first is length. GOV.UK lists eleven principles and AWS suggests no more than seven. For a four-person product team, anything past five is more than people will remember.

The second is audience. Principles that only ever get used to reject other people's ideas breed resentment. Apply them to your own work first, and publish the times your own proposal lost.

The third is silence about cost. A principle with no named loser invites everyone to assume they are the winner, and they find out they are not at the worst moment.

## What I would do on Monday

Pick one argument your team keeps having. Write down what each side is protecting. Draft the sentence, "We will X, even when it costs Y." Show it to the person who loses most often under it and ask whether the Y is honest.

Signal's version fits in one line: it promises to be able to guarantee privacy on its own, and it accepted what that costs screenshot users. A promise you can state in a line, and a willingness to name who pays. That is the whole job.

## Go deeper

If you want more frameworks like this one for working PMs, the Product with Rohan Handbook has 337 pages across five volumes. Take a look at [productwithrohan.online/handbook](https://productwithrohan.online/handbook).
