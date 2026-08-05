---
title: "A Court Just Ruled Your Users' AI Agents Can Visit Your Product Without Asking You First"
description: "The Ninth Circuit sided with Perplexity over Amazon, ruling that it's the user, not the AI agent, who legally 'accesses' a website. For any PM building a product other companies' agents might visit, that's not a footnote, it's a roadmap input."
date: "2026-08-05"
---

Amazon spent over a year trying to keep Perplexity's Comet browser off its site. This week, a Ninth Circuit panel told Amazon no, and the reasoning it used matters a lot more than the outcome.

The case was Amazon v. Perplexity, and on paper it looked like a fight between two companies. In practice, it's the first real appellate answer to a question that's been sitting unresolved under nearly every agentic AI product built in the last two years: when an AI agent acts on a website on a user's behalf, who is legally doing the "accessing"? The agent, or the person who told it to go do something?

## What actually happened

Perplexity's Comet browser includes a shopping assistant that can navigate Amazon, compare products, and complete purchases on a user's behalf. Amazon sued, arguing this violated the Computer Fraud and Abuse Act (CFAA), the federal law originally written to prosecute computer hacking, plus a California equivalent. In March, a district court judge agreed with Amazon and issued an injunction blocking Comet from operating on Amazon at all.

Perplexity appealed. Oral arguments happened in June, and this week the Ninth Circuit vacated the injunction. Circuit Judge Milan Smith, writing for the panel, rejected Amazon's core framing: it's the user, not Perplexity, who accesses Amazon's servers under the CFAA. Comet, the court found, simply receives screenshots that the user's own browser already captured, then acts on the user's instructions. The court was candid about how unsettled the ground is here, noting there's "little to no existing caselaw directly dealing with how to ascribe responsibility for AI agents," and warned that an injunction "would impair consumer choice and needlessly limit development of a nascent technology."

That last line is the one worth sitting with. A federal appeals court just weighed in, explicitly, on the side of not letting incumbents use decades-old computer fraud law to wall off their sites from a new category of software.

## Why this is a PM problem, not just a legal one

If you build a consumer-facing product with any transactional surface, checkout, booking, account management, a search result, this ruling changes what "who's allowed on our site" means going forward. Blocking scrapers and bots has always been standard practice: rate limiting, CAPTCHAs, terms-of-service bans, and in Amazon's case, a lawsuit. The CFAA was the sharpest tool in that kit, the one with actual federal teeth. This ruling just blunted it for a whole category of tools, at least in the Ninth Circuit, at least for now.

That has a few direct implications worth putting on a roadmap review rather than filing away as legal trivia:

**Your funnel is no longer guaranteed to have a human at the other end.** If your conversion metrics, your merchandising, your upsell logic, or your fraud detection assume a person is clicking through screens in the order you designed, that assumption is getting less safe every quarter. An agent optimizing on a user's behalf might skip your recommendation carousel entirely, go straight to the cheapest matching SKU, and never see the cross-sell you spent a quarter building.

**"Just block it in the ToS" is a weaker lever than it was.** Terms of service and technical blocking still matter, and companies will keep using them. But the legal fallback of "we can sue them off our platform" just got harder to rely on for a large category of agent behavior, at least until this either gets appealed further or Congress or state legislatures write something more specific than a 1986 anti-hacking statute.

**If you're building on top of someone else's platform**, the flip side applies. Anthropic, OpenAI, Perplexity, and every startup building agentic shopping, booking, or research tools just got a more favorable read on their ability to operate against third-party sites without explicit partnership agreements. That's a green light worth factoring into build-vs-partner decisions if agentic commerce is anywhere on your roadmap.

**Your analytics need a "was this a bot" answer that isn't a guess.** Distinguishing agent traffic from human traffic is about to matter for a lot more than fraud scoring. If a meaningful share of your checkout traffic six months from now is agent-driven, your growth team is going to want to know that before finance asks why conversion metrics moved without an obvious cause.

## The part that's still unresolved

This is one circuit, one panel, on one narrow question of federal statutory interpretation. It doesn't settle whether agentic tools can be blocked through other means, contract law, state-level unfair competition claims, or plain old technical countermeasures. Amazon can still try to make Comet's life difficult through engineering rather than litigation, and probably will. Other circuits could rule differently if a similar case comes up elsewhere, and the CFAA question could eventually reach the Supreme Court if enough appellate courts split.

But the direction of travel is now clearer than it was a week ago. Courts appear more inclined to treat "a person authorized an AI agent to act for them" as legally equivalent to the person acting directly, not as an automatic violation just because the client software wasn't a conventional browser. If that view holds, the practical effect is that platforms will increasingly compete on making their product genuinely better to use as an agent target (clean structured data, reliable APIs, predictable page structure) rather than relying on legal threats to keep agents out entirely.

## What to actually do about it

Most PM teams don't need to overreact to a single ruling. But this is a reasonable prompt to ask three concrete questions in your next planning cycle:

First, does anything in our funnel silently assume a human is behind every session, in a way that would misfire or leave money on the table if an agent were driving instead? Second, if agent traffic on our surface grew from negligible to meaningful over the next year, would we know, and would that be a problem worth solving now versus later? Third, if a competitor's agent tooling gets meaningfully better access to sites like ours as a category, does that change anything about how we think about our own moat, our own API strategy, or our own willingness to build first-party agent integrations rather than waiting to get scraped.

None of those require a rewrite of your Q3 roadmap. They do require someone on the team to have actually thought about the answer before it shows up as a support ticket, a fraud alert, or a board question.

## Sources

1. [Ninth Circuit Vacates Amazon's CFAA Injunction Against Perplexity's Comet Browser](https://www.tftc.io/ninth-circuit-cfaa-amazon-perplexity-comet-browser-ruling)
2. [Amazon Vs. Perplexity: The CFAA Case That Decides Whether AI Agents Can Visit Your Website](https://www.searchenginejournal.com/amazon-vs-perplexity-the-cfaa-case-that-decides-whether-ai-agents-can-visit-your-website/575499/)
3. [Appeals Court Agrees with EFF that Building a Web Browser Doesn't Violate the CFAA](https://www.eff.org/deeplinks/2026/08/appeals-court-agrees-eff-building-web-browser-doesnt-violate-cfaa)
4. [Court Clears Perplexity's Comet AI to Shop Amazon Without Permission](https://easternherald.com/2026/08/05/perplexity-comet-amazon-ninth-circuit-ruling/)
