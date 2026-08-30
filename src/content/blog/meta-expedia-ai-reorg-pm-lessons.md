---
title: "Meta Tried to Shrink Teams 60% and Build AI Pods. It Failed. Here's What Expedia Is Doing Differently."
description: "Meta scrapped its plan to replace teams with small AI-assisted pods after the productivity gains didn't show up. Expedia just started a version of the same bet. A framework for judging which one you're standing inside."
date: "2026-08-30"
---

Two companies made almost the same bet on AI-driven reorganization this year. One already pulled back. The other is mid-experiment right now.

Meta's [Project OT](https://tech.slashdot.org/story/26/08/27/0032219/how-metas-plan-to-replace-workers-with-ai-agents-fell-apart) was a year-long push to redesign how the company works around AI. The plan: take teams of 10 to 20 people and shrink some of them by as much as 60%, into 3 to 5 person "AI-assisted pods." Fewer management layers. Specialists pooled instead of siloed. Daily priorities partly set by "agent-assisted analysis" instead of a manager's judgment call. Two waves were planned, the first in May, the second in November.

The first wave happened. Meta cut about 10% of its workforce in May as part of it. The second wave didn't. Zuckerberg scrapped the November round after the AI tooling failed to produce the productivity gains the plan was built on, and after real internal pushback following the May cuts. The pods idea wasn't wrong on paper. It just didn't survive contact with actual teams doing actual work.

[Expedia Group](https://skift.com/2026/08/20/expedia-cuts-eight-executives-as-it-reorganizes-around-ai/) is now running a live version of a similar bet. The company cut at least eight VPs and SVPs across payments, fraud and risk, and self-service tools, and is reorganizing its roughly 8,000-person Product and Technology group into small, brand-embedded AI squads. Chief Product Officer Shilpa Ranganathan and CTO Ramana Thumu told staff that work that used to take weeks now happens in hours. AI and data platforms are being centralized under a new Chief AI and Data Officer, while day-to-day product ownership is being pushed down and out to the brand-level squads.

Same underlying wager: smaller teams, AI doing more of the volume work, fewer layers between decision and execution. One company already found the edges of that bet and backed off part of it. The other is finding out right now. If you're a PM anywhere near a reorg that rhymes with either of these, the interesting question isn't "is this the future." It's "what makes the difference between Meta's version and whatever Expedia ends up with."

## What actually broke at Meta

Start with what Project OT got wrong, because the failure is more instructive than the ambition.

**The tooling gains were modeled, not measured.** A pod of 3 people replacing a team of 10 to 20 only works if AI is genuinely absorbing the work the missing 7 to 17 people used to do. Meta built the org chart around an assumption about what AI tools could do, then found out in practice that the assumption was ahead of the tooling. That's a specific, avoidable failure mode: designing the structure first and hoping the capability catches up, instead of confirming the capability and then right-sizing the structure to it.

**Cutting management layers isn't the same as redesigning decision rights.** A pod with fewer managers doesn't automatically produce faster decisions. It just means someone still has to decide who has authority over what, and if that question isn't answered explicitly, a "flat" pod either stalls waiting for input that used to come from a manager, or someone informally re-creates the hierarchy anyway, just without the title or the accountability that came with it.

**The trust cost showed up before the productivity gain did.** Meta had already run layoffs in May. Asking the surviving employees to then operate as smaller, more exposed pods, with less management support, landed as a second cut rather than a redesign. Pushback wasn't abstract discomfort with change. It was a rational response to being asked to do more with less backup, on the strength of a productivity story that hadn't yet proven out.

Put together: Project OT tried to change the shape of the org and the amount of AI-assisted work happening inside it, at the same time, off an unverified assumption, right after a round of cuts had already spent whatever trust was available. Any one of those alone is manageable. Stacked, they were not.

## What Expedia is doing structurally different

Expedia's version isn't identical, and the differences are the part worth studying.

**Squads are embedded under individual brands, not floating as a horizontal AI layer.** Meta's pods were a structural overlay applied across teams generally. Expedia's squads sit inside specific brands, closer to the actual product surface and the actual user, with a narrower and more concrete mandate than "be a small AI-augmented team." A pod with a brand and a product to own has a built-in test of whether it's working: does the product get better. A pod defined only by its size and its AI-assistance level doesn't have that test built in.

**AI and data are centralized even as product ownership decentralizes.** This is the detail worth sitting with. Expedia isn't asking every small squad to also build and maintain its own AI capability. That gets centralized under one Chief AI and Data Officer, so individual squads consume a shared platform rather than each reinventing infrastructure at a fraction of the scale needed to do it well. What decentralizes is product decision-making: who decides what ships to a given brand's users. That's a cleaner split than Meta's, where "agent-assisted analysis" partly informing daily priorities blurred the line between infrastructure and judgment.

**The org chart follows a specific claim about speed, not a specific claim about headcount.** Ranganathan and Thumu's framing was about cycle time. Work that took weeks now takes hours. That's a testable claim tied to output, not an assumption about how much of a person's job an AI tool can absorb. It's still a bet, and it's still early. But it's a different kind of bet than Meta's, and a PM inside Expedia's version has a much clearer thing to point to if it's not working: is cycle time actually dropping, brand by brand, or not.

None of this guarantees Expedia's version succeeds where Meta's didn't. It's mid-experiment. But the structural choices already visible, brand-embedded squads with a concrete product mandate, centralized AI infrastructure instead of DIY-per-pod, a speed claim you can actually measure, are exactly the things Meta's plan was missing.

## A framework for judging the reorg you're inside

If your company floats a version of this, either one you're being asked to lead or one you're being folded into, here's what to check before deciding whether it's Meta's mistake or Expedia's bet.

Start with whether the AI capability claim is measured or assumed. Has anyone actually measured what the tooling can currently do for a team this size doing this specific work, or is the org chart built on what it's assumed to be able to do by the time the reorg lands? Meta's failure mode was designing the structure around a capability that hadn't been verified yet. If nobody in the room can point to a concrete measurement, you're looking at the same gap.

Next, check whether decision rights are explicit or just implied by "fewer managers." A smaller team with fewer layers needs an actual answer to "who decides X" for every X that used to route through a manager. "The pod will figure it out" isn't a plan. It's a delayed re-creation of hierarchy under worse conditions, and it's worth asking for the real decision map before you agree to lead or join one.

Then look at infrastructure. Is it centralized, or is every small unit expected to build its own? Expedia centralized AI and data under one function so squads consume shared capability instead of each reinventing it. If your version asks every pod to also stand up and maintain its own tooling, that's a much heavier lift hiding inside what looks like a leaner structure. Find out who owns the platform layer before you worry about who owns the product layer.

There should also be a real metric this is supposed to move, one you can actually watch change. Expedia's leaders pointed to cycle time: work that took weeks now happens in hours. Whatever the equivalent claim is at your company, it needs to be something concrete, not a general sense that things feel faster. "There isn't a specific metric, we'll know it when we see it" is closer to Meta's unmeasured productivity story than to a testable claim.

Last, ask whether this follows a round of cuts, and whether that cost has been priced in. People asked to operate leaner right after layoffs are doing so from a position of reduced trust, whether or not anyone says that out loud. That doesn't make the reorg wrong. It means the plan needs to account for that cost directly instead of assuming goodwill will carry the transition, which is roughly what happened at Meta.

A few early warning signs it's failing the way Meta's did: the promised tooling gains keep getting pushed to "next quarter." People in pods quietly recreate informal hierarchy because nobody actually resolved who decides what. Small units spend real time building their own tooling instead of using shared infrastructure. Nobody can point to the metric that's supposed to be moving. Two or more of those at once, and you're not looking at an early version of Expedia's bet. You're looking at a later stage of Meta's.

## The actual skill this is testing

The AI-agents-transforming-PM-roles conversation has mostly been about what AI can do for an individual product manager's own output. This is a different and, right now, less discussed question: what happens to product organizations themselves when leadership bets the org chart on AI capability that may or may not be there yet. [Salesforce's own numbers](https://productwithrohan.online/blogs/salesforce-agentforce-layoffs-pm-signal) tell a version of this from the enterprise-buyer side, agentic AI revenue climbing fast even as headcount decisions get made in the same breath. The pattern shows up on both sides of the table: the tooling story and the org-design story move together, and neither one is fully settled yet.

The judgment question for individual PMs is closely related to [why judgment itself is becoming the scarcer skill as AI absorbs more routine output](https://productwithrohan.online/blogs/pm-judgment-scarce-skill-ai-era). A pod structure is, in effect, betting that judgment can be exercised by fewer people with more AI assistance. Whether that's true depends entirely on whether the six checks above actually hold, not on whether the pitch sounds compelling in a town hall.

If you're evaluating a reorg that looks like either of these, the honest move isn't to assume it will go Meta's way or Expedia's way. It's to ask the six questions above out loud, in the room, before agreeing to lead a pod or reorganize a team around one. Companies that skip that step are the ones that find out the hard way, months later, that the org chart was built on a capability claim nobody had actually checked.
