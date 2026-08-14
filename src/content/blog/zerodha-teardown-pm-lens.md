---
title: "Zerodha Never Sold Trading. It Sold the Absence of a Salesperson."
description: "India's largest stockbroker built a ₹8,847 crore business with zero venture capital and no distributor commissions, by treating the absence of a sales incentive as the entire product. A PM teardown of Zerodha's moat, its ecosystem, and where it's now losing ground to Groww."
date: "2026-08-15"
category: "teardown"
---

Zerodha is India's largest stockbroker by revenue and profit, built by two brothers in Bengaluru with ten lakh rupees of personal capital and zero outside investors. In FY25 it posted revenue of Rs 8,847 crore and net profit of Rs 4,237 crore, and its founders, Nithin and Nikhil Kamath, each drew Rs 96 crore in compensation the same year profit fell 23% on regulatory changes to derivatives trading. No venture round, no IPO, no distributor network. For a category where every competitor was built on commission-driven sales agents, that's the whole story in one paragraph.

## What it's actually solving for

Stockbroking in India before Zerodha ran on percentage-based commissions and a network of agents whose income depended on how much you traded, not on how well you did. That's a structural conflict of interest: the person advising you profits from your activity, not your outcome. Zerodha's founding bet was that if you removed the commission-based salesperson entirely and replaced them with a flat fee and a good app, a large enough segment of self-directed traders would take the deal, even with zero advice.

That bet required Zerodha to solve two very different problems for two very different users. Active traders needed an execution platform that didn't choke during the ten minutes a day when volatility actually happens. First-time investors needed a way to learn what they were doing without paying someone to tell them, since Zerodha explicitly wasn't going to have that someone.

It also required a revenue model that could survive without the cross-subsidy every commission broker relied on. A commission broker makes more money the more you trade, badly or well, so it can absorb a lot of unprofitable small accounts by riding the volume of its whales. A flat-fee broker doesn't get that luxury: every account has to be roughly self-sustaining on its own, because there's no percentage cut scaling up with account size to cover the difference. That's a harder unit-economics problem to solve than it looks from the outside, and it's a large part of why so many "we'll go flat-fee too" competitors either quietly raised prices later or subsidized the model with a much larger balance sheet than Zerodha ever had.

## The core product bets

Kite is the trading terminal, built in-house rather than licensed from a vendor, which let Zerodha tune it specifically for the reliability problem that broke every competitor: staying up when the market moves fast and everyone hits the buy button at once. Flat-fee pricing, zero brokerage on equity delivery and a flat Rs 20 or 0.03% (whichever is lower) on other trades, made the unit economics predictable regardless of trade size, which is what let Zerodha undercut commission-based brokers without going broke on small accounts.

Varsity, a free investing education platform with more than 60 modules, exists because Zerodha removed the one thing that used to explain the market to a new investor: the agent. If nobody is going to walk a first-time trader through what a P/E ratio means, the platform has to. Coin, the commission-free direct mutual fund platform, extends the same logic from stocks to funds. Rainmatter, the fintech seed fund, is the least visible bet but arguably the most important one long-term: rather than build every adjacent product itself, Zerodha funds smaller fintech startups that plug into its ecosystem, effectively outsourcing feature velocity to founders with more focused mandates than an internal team would have.

## The moat, and why it's not just "cheap"

The obvious read is that Zerodha's moat is price. It isn't, not anymore. Groww now runs equity delivery at zero brokerage too, and multiple discount brokers copied the flat-fee model years ago. What's actually hard to copy is the trust built over more than a decade of staying up during exactly the moments competitors went down, plus an education platform with a decade-long head start that turned "explain the market for free" into a genuine brand asset rather than a marketing line. A new entrant can match the pricing on day one. Matching a reliability reputation built through fifteen years of market crashes and flash-crash days, or an education library with the organic search authority Varsity has built, takes years even with unlimited funding, because both are earned through repetition, not bought.

## The head-to-head that actually matters

Groww has overtaken Zerodha on active client count, roughly 13 million to Zerodha's 7.9 million by FY25, which looks like a loss until you look at what each company optimized for. Groww built for first-time-investor anxiety: a simpler interface, more hand-holding, an onboarding flow productgrowth.in's own comparison called meaningfully friendlier for a first-time user. Zerodha built for cost-anxiety and execution trust among people who already know what they're doing. Different jobs-to-be-done produce different growth curves, and a raw user-count comparison flattens that distinction in a way that makes for a worse headline than it does an accurate one.

The uncomfortable part for Zerodha is that "cost-anxious, already-informed trader" is a shrinking share of new entrants to the market. Every year, a larger fraction of new demat accounts belong to people opening their first one, which is exactly the segment Groww optimized for and Zerodha didn't. Winning the user you built for and losing share of the users entering the category is a genuinely different problem than losing on product quality, and it needs a genuinely different fix.

It's also a reminder that a product built around removing friction for an expert user can become, without anyone deciding it should, unfriendly to the exact beginner the category increasingly runs on. Kite's density of information, the charting tools, the order types, the terminology assumed on first load, is a feature for someone who already knows what an order book is. For someone who doesn't, it reads as a wall. Zerodha didn't get less good at its original job. The job the market rewards most just moved, and moved toward the segment its own interface was never designed to welcome.

## What's visibly under-served

Zerodha's own numbers make the gap explicit: revenue down 11.5% and profit down 23% in FY25, driven by regulatory tightening on F&O trading, the exact segment the flat-fee, execution-first model was built to serve best. A business this reliant on active-trader volume was always going to be exposed when regulation deliberately makes that volume harder to generate, and there's limited public evidence Zerodha has a comparably strong answer for the calmer, education-led onboarding that's winning the next cohort of first-time investors.

If I were a PM on that team, the fix isn't matching Groww's UI. It's making Varsity, the one asset a decade of competitors haven't replicated, into the actual first-touch product experience for new investors instead of a reference library they might stumble into after signing up. Right now Varsity and Kite are separate destinations connected mostly by a shared login. A new investor's first session should start inside the education flow, with the trading terminal introduced progressively as their Varsity modules unlock real trading confidence, not handed to them cold on day one the way an already-informed trader would want it. That turns Zerodha's most defensible asset into the onboarding wedge for exactly the segment it's currently losing, instead of leaving it as a side project next to the terminal.

![Zerodha teardown infographic](https://uksoubgwjbgjwtaafdxo.supabase.co/storage/v1/object/public/newsletter-images/teardowns/zerodha-teardown-pm-lens.png)

Zerodha proved a decade ago that removing the salesperson could be a product strategy, not just a pricing gimmick. The next test is whether the same instinct, replacing a human explanation with a better-designed one, can be pointed at onboarding as convincingly as it was once pointed at pricing. It's the same underlying discipline behind any real [prioritization](https://productwithrohan.online/blogs/prioritization-frameworks-dont-work) call: knowing which asset actually earned its lead, and refusing to spend the next roadmap cycle defending a moat that's already gone.
