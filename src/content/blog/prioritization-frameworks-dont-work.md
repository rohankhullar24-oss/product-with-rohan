---
title: "Your RICE Score Isn't the Decision — It's the Excuse. Here's What Actually Prioritizes a Roadmap"
description: "RICE, ICE, and MoSCoW all promise to make prioritization objective. In practice they're theater layered on top of a decision that was already made politically. A practical look at why the frameworks fail and what replaces them."
date: "2026-08-01"
---

Every product team has run this meeting at least once: someone builds a RICE spreadsheet, everyone fills in their Reach, Impact, Confidence, and Effort estimates, the formula spits out a ranked list — and then the roadmap that ships bears almost no resemblance to that ranking. The HIPPO's pet feature is still at the top. The unsexy infrastructure work everyone privately knows matters is still at the bottom. The spreadsheet gets filed away, and the team quietly agrees not to mention that the numbers were fiction.

This isn't a failure of RICE specifically. It's what happens whenever a team asks a scoring framework to do a job it structurally cannot do: resolve a disagreement about values by disguising it as a disagreement about numbers. The frameworks aren't useless — but most teams are using them for the wrong part of the job, and that mismatch is why prioritization meetings keep feeling like theater even at companies that are otherwise disciplined and data-driven.

## Part 1: What the frameworks actually measure, and what they don't

Start with what RICE, ICE, and MoSCoW are good at, because the fix isn't "throw them out."

**RICE (Reach × Impact × Confidence ÷ Effort)** is a forecasting tool. It forces you to make explicit, checkable claims about how many users a feature touches, how much it moves the needle for each of them, how sure you are of that, and how expensive it is to build. That's genuinely valuable — it surfaces hidden assumptions and makes it possible to challenge a specific number instead of arguing in the abstract.

**ICE (Impact × Confidence × Ease)** is RICE's faster, blunter cousin — useful for triaging a large backlog quickly when precision doesn't matter yet, at the cost of losing the reach dimension entirely.

**MoSCoW (Must have, Should have, Could have, Won't have)** isn't a scoring framework at all — it's a negotiation format. It doesn't rank anything; it forces a binary classification that's genuinely useful for scope-cutting inside an already-committed initiative (what ships in v1 vs. v2), but it says nothing about which initiatives deserve a v1 in the first place.

What none of these frameworks do — and this is the part every team quietly discovers the hard way — is resolve *disagreement about the inputs themselves*. RICE doesn't tell you whether "Impact" should be measured in revenue, retention, or strategic optionality. It doesn't tell you whose Confidence estimate to trust when the sales lead says 90% and the engineer says 40%. It doesn't tell you how to weigh a feature that helps 10,000 users a little against one that helps 50 enterprise accounts a lot. Every one of those is a values judgment, and the framework just launders it into an apparently neutral number.

## Part 2: Why the numbers get gamed — and why that's rational, not dysfunctional

The standard explanation for why prioritization scores get gamed is "politics" or "bad actors inflating their pet project's numbers." That framing makes the fix sound like a discipline problem — get everyone to estimate honestly — and that fix never works, because the incentive to inflate isn't a character flaw. It's a structural feature of asking people to score their own proposals on dimensions with no external check.

Think about what you're actually asking a stakeholder to do when you hand them a RICE template: estimate the Reach, Impact, and Confidence of *their own idea*, using numbers nobody will audit, that directly determine whether their idea gets built. You've built a system where the rational move is optimistic estimation, and then you're surprised when every proposal that reaches the scoring stage clusters suspiciously near the top of the ranking. This is the same failure mode as letting a team grade its own performance review — not a discipline gap, a design flaw.

The fix isn't better honesty. It's removing the person with the incentive from the estimation step, or at minimum requiring every input above a certain threshold to cite a source that isn't "I believe." "Reach: 40,000 users" backed by a query against the actual user table is a fundamentally different claim than "Reach: 40,000 users" typed into a spreadsheet cell from memory — same number, completely different epistemic status, and a good facilitator treats them differently even though the framework treats them identically.

## Part 3: What's actually driving the decision underneath the spreadsheet

If the score isn't the real decision mechanism, what is? In most organizations, roadmap decisions actually run on three inputs the framework never captures, and naming them explicitly does more for prioritization quality than any amount of formula refinement.

**Strategic sequencing, not just per-item score.** RICE scores each item in isolation, but almost no roadmap decision is actually isolated — building feature A this quarter changes the Reach and Effort numbers for feature B next quarter (a shared component gets built, a partner integration becomes possible, a segment gets validated). A team that scores items independently and stack-ranks them will systematically undervalue anything that's a *prerequisite* for a bigger future bet, because its standalone score looks mediocre. The fix is scoring bets as sequences, not units — "does this open a path we'd otherwise not have" is a real input that belongs in the conversation even though no framework has a column for it.

**Who owns the risk if it's wrong.** A framework treats a confident bet and a risky bet with the same expected value as equivalent. Organizations don't, and shouldn't — a portfolio of ten features with identical expected value but wildly different variance is a different roadmap depending on how much risk the business can currently absorb. Early-stage teams should skew toward higher-variance, higher-ceiling bets; teams protecting an existing revenue base should skew conservative even when the math says otherwise. This is a real, legitimate override of the raw score, not a corruption of it — but it only works if it's said out loud ("we're deliberately picking the lower-scored, lower-variance option because we can't afford another miss this quarter") rather than smuggled in silently by fudging the Confidence number.

**Who has to live with the decision politically.** This is the input every framework pretends doesn't exist, and pretending it doesn't exist is exactly what makes prioritization meetings feel dishonest. If Sales has been promised a capability for a renewal, that's a real cost of saying no — not a "cost" in the RICE sense, but a real organizational cost that a purely analytical model will never capture and shouldn't be expected to. The mistake isn't that this input exists; it's refusing to name it and instead trying to reverse-engineer a RICE score that produces the politically necessary outcome, which is how you end up with a spreadsheet nobody trusts.

## Part 4: A structure that keeps the framework honest

None of this means abandon RICE — it means using it for a narrower, more honest job, and building an explicit second layer on top of it for everything it can't do.

**Step 1 — Score with RICE, but source every number.** Every Reach and Impact figure should cite where it came from (a query, a past experiment, a comparable feature's actual performance) or be explicitly flagged as an unvalidated guess. Unsourced guesses aren't disqualifying, but they should visibly look different from validated numbers in the sheet, so the group can weight them accordingly instead of averaging blind confidence with earned confidence.

**Step 2 — Have someone other than the proposer do the scoring, or at least the sanity-check pass.** This single change removes most of the optimism bias without requiring anyone to be more honest than they naturally are.

**Step 3 — Rank by RICE score, then explicitly discuss the three inputs it can't see:** sequencing value, risk portfolio fit, and political cost of a no. This should be a short, named conversation — five to ten minutes per contested item — not a silent renegotiation that happens after the meeting in hallway conversations. Write down the override and the reason next to the score, so six months from now when someone asks "why did we build the lower-scored thing," there's an actual answer instead of institutional memory.

**Step 4 — Track the gap between predicted and actual RICE inputs after ship.** Go back three months after a feature ships and check: was the actual Reach anywhere close to the estimate? This is the step almost no team does, and it's the only mechanism that improves estimation quality over time — without it, the same stakeholders make the same optimistic guesses every single quarter with zero accountability, because nobody ever closes the loop.

## The real point

A prioritization framework's job is to make the *inputs* to a decision explicit and checkable — not to make the decision for you. The moment a team starts treating the output number as the decision itself, they've outsourced a judgment call to a spreadsheet that has no idea what a judgment call even is, and the predictable result is a ranking nobody actually believes, quietly overridden by whoever has the most leverage in the room. The teams that get real value out of RICE aren't the ones with the most rigorous scoring — they're the ones who use the score to structure the conversation, then have the harder conversation about sequencing, risk, and politics out loud instead of pretending the formula already had the answer.
