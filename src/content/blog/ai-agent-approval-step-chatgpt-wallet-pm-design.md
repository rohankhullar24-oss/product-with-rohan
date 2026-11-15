---
title: "ChatGPT Wallet Makes You Approve Every Purchase. Here Is How to Design the Approval Step for Your Own AI Agent"
description: "OpenAI launched an agent wallet that asks users to approve each purchase. A guide for PMs on when an AI agent should ask, when it should act, and the acceptance criteria to write first."
date: "2026-11-15"
---

On Friday, OpenAI launched ChatGPT Wallet, which lets its "dots" agents buy things for you. Most of the coverage dwelt on the payments plumbing. I stopped at one line: every purchase needs a Face ID or fingerprint check, and each approval leaves a record of what the user authorized the agent to buy.

That is a product decision. OpenAI could have let the agent spend freely from day one. It put a person in front of every transaction at launch, and it says it plans to let users set spending limits, purchase categories and time periods so some purchases can be pre-approved later.

If you build any feature where an agent acts for a user, you will hit the same question. When does it ask, and when does it just act? This post gives you a way to answer it for your own product, plus the acceptance criteria to write before engineering starts.

## What OpenAI actually shipped

The facts below come from [TechCrunch's coverage](https://techcrunch.com/2026/11/13/chatgpts-new-wallet-lets-ai-agents-shop-and-check-out-for-you/) and a [write-up of OpenAI's announcement](https://ppc.land/openai-hands-its-ai-agents-a-wallet-without-the-real-card-number-in-it/).

Wallet is open to a limited number of U.S. ChatGPT Pro subscribers who are 18 or older and hold a U.S.-issued Visa, Mastercard or American Express card. A user adds a card once, then asks a dot to help with a purchase. Before checkout the user sees the items, the total and the payment card, and approves with a security check such as Face ID or a fingerprint. A payment token stands in for the real card details, so neither the dot nor the merchant sees them. The dot does pass along what the merchant needs to fulfill the order, such as a shipping address and contact information.

OpenAI says each approval creates a clear record of the purchase the user authorized, and that users keep card rewards and dispute protections. It also describes a later step: spending limits, category and time-period settings, and pre-approved purchases with what it calls enhanced safeguards. No date was given.

On the merchant side, OpenAI's Commerce Partner Playbook warns that retailers' risk systems may still flag legitimate agent purchases. TechCrunch reports that some retailers block agents outright, with Amazon the largest it names, and that DoorDash and Uber have reported low numbers of orders placed by AI agents.

My reading, and it is only a reading: launch with a person in the loop, collect evidence, then loosen the rules. That sequence is worth copying, and the rest of this post shows how.

## Think of autonomy as a ladder, not a switch

Teams often frame this as "should the agent be autonomous, yes or no?" That hides four different designs.

1. Suggest. The agent proposes, and the user does the action somewhere else.
2. Ask each time. The agent prepares everything, and the user approves every action. Wallet launched here.
3. Act within bounds. The user sets limits in advance. The agent acts inside them and asks outside them. This is the step OpenAI described as coming.
4. Act and report. The agent acts and tells the user afterward. Reserve this for things that are cheap and easy to undo.

The useful question is which rung each action belongs on, because one product usually needs several. An agent that reschedules a meeting and an agent that issues a refund should not sit on the same rung.

Three questions place an action.

Can it be undone, and how cheaply? A card purchase has a dispute path, though it costs the user time. A sent email cannot be unsent. A deleted file might be recoverable for 30 days or not at all.

What does a wrong one cost? A $12 reorder of something the user buys every month carries a different risk from a $1,200 flight. Cost includes embarrassment and lost trust as well as money.

Does the agent know what this user would want? The tenth identical reorder is well understood. The first purchase of a new kind is a guess.

List your agent's ten most likely actions in a table, with those three questions as columns. Actions that are reversible, cheap and familiar can climb the ladder. Any action that fails one of the three stays on rung two until you have evidence. The table also gives engineering, legal and design one thing to argue about instead of three.

## What the approval screen has to carry

Wallet's approval screen shows the items, the total and the card. That is a good minimum. Your own screen should always show four things.

First, what will happen, in exact terms. "Book the 6:40 pm flight to Delhi for Priya Shah" beats "Complete booking." The name is an example, but the specificity is the point.

Second, what it costs: money, time, or access the agent will use.

Third, what it will use or share, such as a card, an address or a contact list. Wallet's dot passes along shipping and contact details, and a user should be able to see that.

Fourth, how to undo it, or a plain statement that it cannot be undone.

A fifth item is easy to miss: what changed since the user asked. Research from PYMNTS on agentic payments notes that an agent may act on an instruction given [hours, days or weeks earlier](https://pymnts.com/news/artificial-intelligence/2026/visa-and-mastercard-put-tokens-in-charge-of-ai-commerce). The user's original yes covered the world as it looked then. If the price moved from $84 to $109 in the meantime, that yes does not stretch to cover it, so say so on the screen: "You asked for this on Tuesday at $84. It is now $109."

My recommended rule is that any gap between what was approved and what is about to happen, above a threshold you set, sends the action back for a fresh approval.

## Design for the tired approver

Approval steps fail quietly. If an agent asks 40 times a week and 39 of those requests are routine, the 40th gets tapped through with the rest. Anyone who has dismissed a cookie banner without reading it knows the pattern. I have no data on how Wallet users behave, since it launched this week, so treat this as a design risk to plan for, not a finding.

Four responses work in most products.

Make routine approvals light and unusual ones heavy. A single tap for a repeat purchase at a known merchant. A biometric check, or a longer pause, for a new merchant or a higher amount.

Make the unusual look unusual. Highlight what differs from last time: a new address, a higher total, a different payment method.

Let users move routine actions up the ladder, within bounds. That is what spending limits and category settings are for. They remove the approvals nobody reads so the ones that matter stand out.

Keep a record people can review. Wallet creates one per approval. A user who can scan last month's actions in a single list has more reason to trust the next approval.

## Write acceptance criteria before you build

A feature like this needs rules a tester can pass or fail. Here is a set for a hypothetical agent that rebooks a traveler's flights after a delay. The thresholds are illustrations. Tune them for your product.

1. The agent never completes a paid action without an approval event tied to that exact action: items, amount and destination.
2. The approval screen shows all five elements above. Test it with 20 sample actions, including edge cases such as a partial refund, a currency change and a missing address.
3. If the cost at execution exceeds the approved amount by more than 5 percent, the action stops and asks again.
4. An approval expires after 15 minutes. A standing permission expires after a period the user chose.
5. Every approval writes a record with who approved, what was shown, the amount and the time. Support can pull it up in under a minute.
6. A user can revoke a standing permission in two taps, and revocation also cancels queued actions that depend on it.
7. If the agent cannot complete an action, it tells the user what happened and confirms that nothing was charged or changed.
8. Any attempt to act outside the user's bounds is blocked, logged and counted.

Items 3, 4 and 7 are easy to leave out of a first spec, and each maps to a support ticket you do not want: a surprise charge, a stale approval, a silent failure.

I wrote about turning vague behavior into testable cases in [How to Choose an AI Model for Your Product](https://productwithrohan.online/blogs/choose-ai-model-for-your-product-pm-eval-test-set), and the same test-set habit applies here. Build 30 cases, including the nasty ones, before launch. For getting engineers to read the criteria at all, see [The PRD Template Is Not the Problem](https://productwithrohan.online/blogs/how-to-write-a-prd-engineers-actually-read).

## Measure whether the ladder is working

Five numbers tell you whether the approval design is doing its job.

Approval rate is the share of proposed actions the user approves. A very low rate means the agent is proposing things nobody wants. A very high one can mean good proposals or rubber-stamping, and this number alone cannot tell you which.

Edit rate is the share of actions the user changes before approving. Some edits are a healthy sign, because they mean people are reading the screen.

Time to approve is the median number of seconds from screen to tap. If routine and unusual actions both clear in one second, nobody is reading.

Reversal rate is the share of approved actions later refunded, cancelled or disputed. This is the number that shows whether approvals were informed.

Out-of-bounds attempts per 1,000 actions shows how often the agent tried to go beyond what the user allowed. It should fall as you tune the agent.

None of these is safe to read alone. A 98 percent approval rate looks like success until a rising reversal rate shows up beside it. I covered that kind of trap in [Product Metrics Every PM Should Know](https://productwithrohan.online/blogs/product-metrics-every-pm-should-know).

You also need a rule for moving a user up the ladder. A simple one: offer a higher rung for an action type only after the user has approved ten in a row with no edits and no reversals, then let the user choose it. Never promote anyone silently. The decision belongs to the user, and the evidence only tells you when to ask.

## The merchant and support side

Two details from the launch coverage matter for anyone building agents that touch other companies' systems.

OpenAI's own guidance says retailers' risk systems may flag legitimate agent purchases, which can lead to declines or cancellations. Some of your agent's failures will come from systems you do not control, so design the declined state on purpose. Say what happened, say that nothing was charged, and offer a next step.

The approval record also does a second job. Wallet keeps card dispute protections, and a record of exactly what the user saw and approved should help when a purchase is disputed. If your product handles money, build that record into the support tooling and not only the audit log.

Adoption matters too. In PYMNTS and Worldpay research cited in that same article, 45 percent of consumers said they were comfortable letting AI agents complete purchases for them. Some 95 percent had at least one concern, and about half said they would trust agents more if fraud protections were clearly established. That is survey data about consumers in general, not about Wallet users. It still suggests that for cautious people, a visible approval step is a reason to try the product at all.

## A checklist for your next agent feature

Before you design, list the ten most likely actions and score each on reversibility, cost of a wrong one, and how well the agent knows the user's intent. Assign each a rung.

Before you build, write the eight acceptance criteria in your own terms and assemble a 30-case test set that includes price changes, expired approvals and declined payments.

Before you launch, start every paid action on rung two, with a record per approval and a revoke path that takes two taps.

After you launch, watch approval rate, edit rate, time to approve, reversal rate and out-of-bounds attempts together. Offer a higher rung only when the numbers support it and the user agrees.

Wallet started at rung two and has said that rung three comes later. Whatever your agent does, decide now which rung each action starts on, and write down what evidence would move it.

## Go deeper

If you want a structured way to practice the product-sense and strategy questions behind decisions like when an agent should ask and when it should act, the PM Handbook has five volumes and 337 pages of frameworks and worked answers, and it is at [productwithrohan.online/handbook](https://productwithrohan.online/handbook).
