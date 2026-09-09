---
title: "How to Judge a Proposed AI Reorg Before It Reaches Your Team"
description: "Coinbase, GitLab, PayPal, Meta, and Expedia have all restructured product orgs around AI capability in 2026, with wildly different results. A framework for telling a reorg that will work from one that won't, before you're the one living inside it."
date: "2026-09-08"
---

Coinbase cut 700 people and flattened to five layers below the CEO. GitLab cut 7% and broke its R&D org into roughly 60 small autonomous teams. PayPal announced in 2026 it will shed a fifth of its workforce over two to three years while centering the company on AI adoption. Meta tried to compress teams into small AI-assisted pods and rolled it back when the productivity gains didn't show up. Expedia is running a version of the same bet right now, having cut eight executives to reorganize around AI.

Five companies, one underlying move: shrink the org chart and bet that AI closes the gap. Two of them have already told us how it turned out. The other three are still finding out in public.

If you're a PM, this is no longer a story happening to other companies. Reorg proposals citing "AI leverage" or "flattening for the agentic era" are showing up in planning docs at a rate that makes it worth having a framework before the next one lands on your desk, rather than reacting to it in the room.

## Why the same bet produces opposite outcomes

Meta's failure and GitLab's apparent traction are not really about AI capability. They're about what each company was actually restructuring.

Meta's plan compressed established teams with existing scope into "AI-assisted pods," assuming AI tools would let three people do what eight used to do on the same roadmap. The productivity gains didn't materialize fast enough to cover the compression, and the plan was walked back. The mistake wasn't optimism about AI. It was treating AI-assisted output as a headcount multiplier applied uniformly across a team's existing responsibilities, rather than checking whether those responsibilities were actually the ones AI tools help with.

GitLab's reorganization did something narrower: it removed management layers and split R&D into small autonomous teams explicitly framed around agentic workflows, rather than assuming existing teams would simply produce more per person. That's a structural change to how work is coordinated, not a claim that AI output replaces a fixed multiple of human output. It's a smaller, more falsifiable bet, and it's the kind of change that survives contact with reality even if the AI productivity gains turn out to be modest.

Coinbase's move sits in between: a genuine flattening (five layers below the CEO/COO) combined with an explicit experiment in "one-person teams" merging engineering, design, and product. That's not "AI does the work of the people we cut." It's "we're testing a different unit of work entirely," with the org structure itself as the experiment. Whether that holds up is still an open question, but it's a different kind of claim than Meta's, and it should be evaluated differently.

The pattern: a reorg built on a *specific, checkable claim* about which tasks AI tools actually accelerate survives. A reorg built on a *general assumption* that AI makes people more productive, applied as a flat multiplier to a team's whole scope, does not.

## The framework: four questions before you accept the premise

When a reorg proposal lands citing AI leverage, don't start by asking whether the new org chart makes sense. Start by pressure-testing the claim underneath it.

**1. What specific task is AI supposed to accelerate, and is that the bottleneck?**

"AI makes the team more productive" is not a claim you can check. "AI cuts our spec-to-prototype time from four days to one" is. Ask the proposer to name the specific workflow step AI tooling changes, and then ask whether that step was actually the constraint on the team's output. A team whose bottleneck was cross-functional alignment, not spec-writing speed, gets nothing from an AI tool that only speeds up spec-writing, no matter how good the tool is. Meta's pods look like exactly this mismatch: AI-assisted drafting and prototyping got faster, but the pods still needed the same amount of stakeholder negotiation, QA, and edge-case handling that the removed headcount used to absorb.

**2. Is the org change reversible, and at what cost?**

GitLab's small-team restructuring and Coinbase's one-person-team experiment are both easier to partially unwind than Meta's approach, because they changed how work is coordinated rather than eliminating the people who did work AI can't yet do. If the plan on the table requires cutting a specific function to zero, ask what it costs to rebuild that function in six months if the AI assumption turns out to be wrong for that function specifically, even if it's right elsewhere. A reorg that's expensive to reverse needs a much higher bar of evidence before you accept it than one you could walk back in a quarter.

**3. Does the timeline match how the underlying capability actually improves?**

AI model and tooling capability has not moved in a straight line, and it hasn't moved at the same pace on every task. Coding assistance has improved faster than the kind of judgment-heavy synthesis a senior PM does when reconciling conflicting stakeholder priorities. A reorg plan that assumes uniform, continuous improvement across every task type is making a bet on the wrong shape of curve. Ask specifically: does this plan assume today's AI capability holds steady, or does it assume it keeps improving at the current rate on *every task this team does*? The second assumption is the riskier one, and it's the one that's easiest to smuggle into a deck without anyone noticing.

**4. Who absorbs the work AI doesn't actually do yet?**

This is the question Meta's plan skipped. Every AI-assisted pod still needed someone to catch the edge cases, negotiate with stakeholders who wanted different things, and own the decision when the tool's output was plausible but wrong. If the reorg proposal doesn't name who does that work after the cut, the answer defaults to "whoever's left," and that's how a flattened team quietly turns into a burned-out one. Ask the proposer to walk through a real recent example from the team's actual backlog and show, task by task, who does each part of it post-reorg. If they can't, the plan hasn't been stress-tested against the team's real work, only against a generic description of it.

## Running the framework on PayPal's bet

PayPal is the least resolved of the five, which makes it the most useful one to practice on. The plan: cut roughly a fifth of the workforce over two to three years, centered on AI adoption and organizational simplification. Here's what the four questions pull out of a plan like that.

On question one, a multi-year, company-wide cut citing "AI adoption" broadly is closer to Meta's flat-multiplier claim than GitLab's narrow one. The specific tasks AI is supposed to accelerate aren't named at the company level in the public plan, which is itself the finding: if you were the PM inside a specific function at PayPal, your first move would be to force that claim down to your team's actual workflow before accepting the target headcount reduction attached to it.

On question two, a two-to-three-year runway is unusual, and it cuts both ways. It gives PayPal more room to course-correct than Meta had, since the cuts aren't happening all at once. But it also means the company is committing to a multi-year trajectory based on today's read of AI capability, which question three already flags as the riskier kind of bet.

On question three, the timeline itself is the tell. A plan that unfolds over multiple years is implicitly betting that AI capability keeps improving at a rate that closes whatever gap exists between today's tooling and the target headcount. It's betting that on every function being cut, not just the easy ones. That's a lot of curves to get right at once, and PayPal's plan doesn't appear to distinguish between functions where that bet is safer (routine transaction processing, tier-one support) and functions where it isn't (fraud judgment calls, enterprise partnership negotiation).

On question four, this is the open question that will decide whether PayPal ends up closer to GitLab or closer to Meta. Nothing in the public plan says who catches the edge cases in the functions being trimmed. That's not a criticism of PayPal specifically. It's the same gap in nearly every reorg announcement of this kind, because naming who absorbs the residual work is the least flattering slide in the deck and the first one to get cut.

The point of running the framework on a company you don't work for isn't to grade PayPal's homework. It's to notice that the same four questions that would help you evaluate a reorg proposal on your own team also tell you, from the outside, which of these five bets is likely to need a public correction eighteen months from now the way Meta's did.

## Raising this without becoming the person who blocks everything

There's a real risk in walking into a reorg conversation with four pointed questions: you read as the person opposed to change, and the questions stop landing. Two things keep that from happening.

First, ask the questions before the room, not in it. Send them to the proposer as a short doc a day ahead, framed as "here's what I'd want to be able to answer before I present this to my team," not as a challenge. Most people proposing a reorg have not been asked to make the AI-leverage claim specific, and the private version of that conversation goes very differently than the public one.

Second, come with your own answer to question four. If you can walk in already knowing who on your team would absorb the edge cases under the proposed structure, and what that means for their workload, you've turned an objection into a planning input. That's the difference between "I don't think this works" and "here's what needs to be true for this to work, and here's the gap." The second version gets you a seat in the next version of the conversation. The first one gets you left out of it.

## What to do with the answers

If a reorg proposal survives all four questions, that's not proof it will work. It's evidence the bet is specific enough to fail cleanly and be corrected, which is the property GitLab's and Coinbase's approaches share and Meta's lacked. If it fails one or more, you now have something more useful than a bad feeling: a named, specific gap you can put in front of the person proposing the change, before the org chart moves and not after.

The uncomfortable part of this framework is that it works just as well pointed at your own instincts. If you're the one proposing to flatten your team around an AI tool, run your own plan through these four questions before you pitch it. The version of you that a skeptical VP or a nervous engineering counterpart will interrogate should not be meeting these questions for the first time in that room.

One more thing worth saying plainly: none of this is an argument against restructuring around AI capability. GitLab and Coinbase are both making that bet right now, in public, with real consequences if it goes wrong. The framework isn't a reason to say no. It's a way to tell, before the fact, whether a specific proposal looks like GitLab's bet or Meta's, because those two bets already had different outcomes and there's no reason your team should have to relearn that difference the hard way.

If you want the fuller picture of how Meta's rollback and Expedia's live version of the same bet compare, [that comparison is here](https://productwithrohan.online/blogs/meta-expedia-ai-reorg-pm-lessons). And if the part of your job this reorg conversation is really testing is your judgment rather than your headcount, [this is the argument for why that's the skill that doesn't get automated away](https://productwithrohan.online/blogs/pm-judgment-scarce-skill-ai-era).
