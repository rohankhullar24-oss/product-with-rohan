---
title: "Two Funding Rounds, One Week Apart, Tell You Where the Build Layer Is Headed"
description: "Databricks raised $5 billion and Lovable raised $400 million in the same week, at valuations that treat AI tooling as core infrastructure rather than a nice-to-have. Here's what that capital signal means for how PMs should think about build versus buy in 2026."
date: "2026-08-15"
---

In the same week, two very different companies closed very large rounds. Databricks raised $5 billion at a $190 billion valuation, after investors reportedly pushed for a bigger check than the $1 billion the company originally asked for. Two days later, the Swedish "vibe-coding" startup Lovable raised $400 million at $13.3 billion, more than doubling its valuation from eight months earlier.

Neither round is really about either company. Read together, they're a signal about where investors think the value in software is moving, and that signal has a direct answer for a question a lot of product teams are quietly avoiding: should we still be building most of our own tooling, or should we be buying the platform underneath it?

## The pattern underneath both rounds

Databricks and Lovable sit at opposite ends of the same stack. Databricks is infrastructure for people who already know how to build: it processes data, runs AI agent workloads, and now houses a serverless Postgres product built specifically for agents that read and write structured data on their own. Lovable is the opposite end, a tool that lets someone with no engineering background describe an app in plain language and get a working product.

What they have in common is where the capital is going inside each round. Databricks is funneling its new $5 billion into Lakebase, Genie, and Unity AI Gateway, three products aimed at making it easier for an organization to run AI agents against its own data without a bespoke engineering effort for each one. Lovable is scaling headcount by 50% specifically to keep up with a revenue run rate approaching $600 million, most of it from teams that would previously have hired a contractor or waited for an internal engineering slot.

Both companies are selling the same underlying thing: the ability to skip the part of building software that used to require a specialized team. Investors are treating that ability as infrastructure-grade, not tool-grade. A $190 billion valuation and a more-than-doubled valuation in eight months are not bets on a feature. They're bets on a layer of the stack becoming as durable and necessary as the cloud itself.

## What "build versus buy" used to mean

For most of the last decade, build-versus-buy was a scoping exercise. You'd ask whether a capability was core to your differentiation (build it) or a commodity everyone needs (buy it), then weigh total cost of ownership, integration risk, and how much control you'd give up either way. The framework assumed building was expensive and slow, so you reserved it for the things that mattered most.

That assumption is what's cracking. When a non-engineer can describe a working internal tool and have it running the same afternoon, "build" stops being the expensive, slow option in every case. It's still expensive and slow for a genuinely novel, high-stakes system. It's fast and cheap for the internal dashboard, the one-off automation, the prototype you'd have previously deprioritized for two quarters because engineering had a backlog.

That changes what belongs on each side of the framework. A lot of things that used to default to "buy" because building them wasn't worth an engineer's time now default to "just build it, this afternoon, with the PM or the ops lead doing it directly." And a lot of things that used to default to "build, because it's core" now have a legitimate buy case, because a platform vendor like Databricks can maintain the agent infrastructure underneath your product better than a five-person team bolted onto your roadmap ever could.

## Where this actually shows up on a roadmap

Internal tooling stops competing for engineering time. If your ops or support team needs a workflow tool, a reporting dashboard, or a lightweight approval system, that request used to sit in a backlog behind customer-facing work indefinitely, because no PM could justify pulling an engineer off the roadmap for it. Now it's something a non-engineer can plausibly finish in a day, using tooling like Lovable's. The PM's job shifts from deciding whether to build it to reviewing what got built and deciding whether it's safe to keep running.

The agent-infrastructure layer becomes a genuine buy decision instead of a build-versus-wait one. If your product roadmap includes AI agents that need to read and write against your own data reliably, the honest comparison isn't "build this ourselves versus not have it." It's "build this ourselves versus buy the layer that companies with far more resources than us are spending billions to get right." Databricks is betting that most companies will conclude the second option is better, even for something that touches their core product. Worth weighing before your team spends two quarters reinventing agent memory and data access from scratch.

And "prototype fast" gets a new floor. Teams have said "let's prototype it fast" for years, but fast used to mean a design mockup or a rough demo, not something a stakeholder could actually click through with real logic behind it. When the floor for a working prototype drops to hours instead of sprints, so does the cost of testing an idea with a real stakeholder before committing engineering resources. More ideas get a real test before they get a real budget.

## The failure mode to watch for

None of this means engineering discipline stops mattering. It means the discipline moves later in the process instead of disappearing. The tools that make a working prototype fast are, by design, not optimized for the things that matter once something has real users and real data: access control, error handling at the edges, what happens when an upstream API changes, and whether the thing was ever meant to survive contact with a second team using it differently than the first.

The realistic failure mode isn't "PMs start building everything themselves and it's a disaster." It's quieter than that: a tool that started as a weekend prototype for one team's internal workflow gets used by three more teams over six months, nobody formally adopts it, and it becomes a dependency nobody signed off on and nobody is responsible for maintaining. That's not a new problem, shadow IT has existed since the first person built a spreadsheet macro, but the speed at which something can go from prototype to load-bearing has changed, and most teams don't have a review trigger tuned to that new speed.

The fix is not "slow the tools down." It's building a lightweight adoption gate: any prototype that a second team starts relying on gets a real owner, a data-handling review, and a decision about whether it graduates into supported infrastructure or gets rebuilt properly. That gate needs to trigger on usage, not on how the thing was originally built, because by the time a self-built tool matters enough to break something, the fact that it started as a five-minute prototype is no longer relevant to how much damage it can do.

## The actual takeaway

Two funding rounds in one week don't prove a trend by themselves, but they're a useful forcing function for a question every product team should be asking anyway: which parts of our roadmap are still genuinely worth an engineer's time, and which have quietly become fast enough to prototype without one? The honest answer for most teams is that the split has moved more than their process has caught up to. The PMs getting the most out of this moment aren't the ones treating every new AI-tooling headline as a reason to panic about their own job security. They're the ones updating their build-versus-buy framework to match what's actually true now, and building the review discipline to catch the tools that quietly become critical before something breaks.

If you want to sharpen the muscle this piece is really about, judging when a fast build is the right call and when it needs real engineering behind it, that's close to what a good [prioritization](https://productwithrohan.online/blogs/prioritization-frameworks-dont-work) or [strategy](https://productwithrohan.online/blogs/pm-as-builder-ai-tools-opportunity) decision comes down to under time pressure. It's also exactly the kind of judgment [Product Shots](https://productwithrohan.online/productshot) practice questions are built to sharpen, one worked scenario at a time.
