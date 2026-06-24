---
title: "How Product Sense Actually Gets Evaluated in Interviews"
description: "CIRCLES, AARM, and Meta's 5-criteria rubric explained with real interview examples — plus how Meta's new AI round changes what's actually being graded."
date: "2026-06-24"
---

**TL;DR:** "Product sense" is the ability to assess a product, spot improvement opportunities, and reason through tradeoffs — and despite the jargon, most companies test it the same basic way: give you an open-ended product question and watch whether you find the right problem before jumping to solutions. CIRCLES (problem-structuring) and AARM (metrics) are the two frameworks worth actually learning. Meta's interview — the one that spread the format industry-wide since 2008 — now has a fourth, AI-specific round where you're scored on how well you collaborate with an AI tool, not on whether you can write clever prompts.

## Executive Summary

- **Product sense = hard skill, not personality.** It's specifically the ability to evaluate products, find improvement opportunities, and reason about tradeoffs — distinct from behavioral/soft-skill interviews.
- **Two frameworks do most of the real work**: CIRCLES (developed by Lewis Lin) for structuring product-design/improvement answers, and AARM for metrics questions. Other "named frameworks" you'll see online are often a given author's own structure dressed up as an acronym — useful, but not industry standard.
- **Most failures happen in the first two minutes**: jumping to a solution before identifying and prioritizing the actual problem is the single most cited mistake across sources.
- **Meta's classic 5-part rubric** (motivation/problem → audience → problem prioritization → creative solutions → design choices) has effectively become the industry template since the format originated there in 2008.
- **The AI shift is real and specific**: Meta added a fourth PM interview round, "Product Sense with AI," for senior/AI-focused roles — and it explicitly does NOT grade prompt-writing skill. It grades whether you treat AI as a thinking partner you push back on, not an oracle you defer to.

## Background / Context

"Product sense" interviews exist because resumes and take-home assignments don't reveal how someone actually thinks under ambiguity. The format — give a vague, often consumer-facing prompt ("How would you improve X?") and watch the reasoning unfold — is old (it reportedly originated at Meta around 2008) but has spread across the industry largely unchanged in structure, even as the questions themselves (and now, the tools candidates are allowed to use) have evolved.

## Key Findings

### What "product sense" actually means

- One widely cited definition: product sense is "the ability to assess products, identify improvement opportunities, and reason about them and their tradeoffs" — explicitly a hard skill being tested, not a soft/behavioral one.
- In practice, interviews split into two buckets: **strategy questions** (what problem does this solve, what are the key metrics, what's the competitive landscape) and **product improvement questions** (where's the friction, what feature would you build, how would you prioritize and validate it).

### CIRCLES: the framework worth learning for product-design questions

- CIRCLES was developed by Lewis Lin, author of the well-known PM interview prep book *Decode and Conquer*. It's a 7-step structure for answering "design/improve a product" questions:
  - **C**omprehend the situation
  - **I**dentify the customer
  - **R**eport customer needs
  - **C**ut, via prioritization
  - **L**ist solutions
  - **E**valuate trade-offs
  - **S**ummarize your recommendation
- Example application: asked "How would you improve Spotify's podcast experience?" — you'd first clarify scope (mobile? all users? discovery specifically?), then pick a customer segment (casual listeners vs. podcast power users), surface their actual pain point (discovery, not playback), only then brainstorm and prioritize solutions, and close with a clear recommendation and the tradeoff you accepted to get there.
- Caveat: a competing description of "CIRCLES" circulating online (Customers, Investigate, Requirements, Create, Launch, Evaluate, Study) does not hold up against the primary source — the Lewis Lin 7-step version above is the one actually attributed to its named creator.

### AARM: the framework for metrics questions specifically

- AARM stands for **Acquisition, Activation, Retention, Monetization** — a checklist for answering "what metrics would you track?" style questions, not a problem-structuring tool like CIRCLES.
- Example application: asked "What metrics would you track for a new in-app messaging feature?" — you'd walk through acquisition (are users discovering the feature), activation (do they send a first message), retention (do they keep using it weekly), and monetization (does it reduce churn or enable a paid tier) — giving a complete, lifecycle-aware answer instead of naming one metric in isolation.

### Meta's interview structure — the de facto industry template

- Meta's product-sense round reportedly originated the format back in 2008, and its structure has propagated across the industry since. Public examples of the actual prompts include "Improve ChatGPT," "How would you differentiate Reels from TikTok?," or "What's your favorite product, and how would you improve it?"
- The criteria interviewers are scoring against, as reverse-engineered from Meta's own framing: understanding the product's landscape and motivation (what problem, what business goal, what competitive alternatives exist), identifying the real audience and key ecosystem participants, identifying and prioritizing the actual problem before jumping to solutions, generating creative and genuinely novel solutions, and making deliberate, justified design choices.
- This lines up closely with what other sources independently describe as a two-part structure (strategy questions, then improvement questions) — different framings of largely the same underlying evaluation.

### The most common reasons candidates fail

- The single most consistently cited failure mode across sources: **jumping straight to solutions without first exploring and prioritizing the underlying problem.** Interviewers are explicitly watching for whether you resist this urge.
- Related failure patterns described across prep guides: treating "the user" as one monolithic person instead of identifying which specific segment and which ecosystem participants matter; proposing solutions the interviewer has clearly heard a hundred times before instead of something genuinely creative; and failing to make and defend a clear final recommendation (waffling between options instead of committing and explaining the tradeoff).

### The 2025-2026 shift: AI is now part of the test, not just the topic

- Meta has added a fourth round to its final PM interview loop called **"Product Sense with AI,"** appearing primarily for senior IC (IC6+) and people-manager (M1/M2) roles, particularly ones focused on AI work.
- Format: you get a standard product-sense case (motivation, segmentation, solution narrowing — same structure as the classic round) but you're expected to actively use AI tools while answering, including "vibe coding" — using AI as a collaborative builder to prototype ideas rather than just describe them verbally.
- **The critical, counter-intuitive finding**: Meta explicitly does not grade prompt-writing skill. The bar is whether you treat the AI as a thinking partner you challenge and synthesize with your own judgment — pushing back on its suggestions, asking it clarifying questions — rather than accepting its first output. Candidates who treat the AI as an oracle reportedly score worse than candidates who interrogate it.
- Practical prep approach recommended in the source material: answer the product-sense question yourself first, in full, then separately ask an AI tool the same question section-by-section, and compare your reasoning against its output to find your own blind spots — rather than leaning on AI from the first minute of prep.

## Implications for PMs / Practitioners

- **Learn CIRCLES and AARM specifically — skip memorizing every acronym you find online.** Many "frameworks" circulating in PM interview content are a given author's personal structure repackaged as an acronym; CIRCLES (Lewis Lin) and AARM are the two with a clear, attributable origin and consistent definition across independent sources.
- **Practice catching yourself before you propose a solution.** Since "jumped to solutions too fast" is the most repeated failure mode across every source in this research, the single highest-leverage prep habit is deliberately pausing after hearing the prompt to name the problem and the target segment out loud before suggesting anything.
- **If you're interviewing for a senior or AI-focused PM role, prepare to be watched using AI, not just asked about it.** Meta's new round rewards visible critical engagement with AI output — disagreeing with it, refining it, catching its mistakes — over fluent prompting. That's a different skill than "knowing AI tools," and worth rehearsing specifically.
- **If you're the one interviewing candidates**, Meta's five-criteria structure (motivation → audience → problem prioritization → creative solutions → design choices) is a reasonable, well-tested rubric to borrow if you don't already have a structured one — it's effectively become the industry default rather than a Meta-specific quirk.

## Sources

1. [The Definitive Guide to Mastering Product Sense — Lenny's Newsletter](https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering)
2. [Interviewing Product Managers for Product Sense — Jefago, Medium](https://jefago.medium.com/interviewing-product-managers-for-product-sense-64a8a38171fb)
3. [CIRCLES Framework Guide — Product School](https://productschool.com/blog/skills/circles-framework-guide)
4. [Top Interview Frameworks for PM Roles: CIRCLES, AARM, and More — Jobaaj Learnings](https://www.jobaajlearnings.com/blog/top-interview-frameworks-for-pm-roles-circles-aarm-and-more)
5. [Jobs To Be Done for Product Managers — Mind the Product](https://www.mindtheproduct.com/jobs-to-be-done-for-product-managers/)
6. [What the Product Sense Interview Is Evaluating: Evidence from Meta — Aakash Gupta, Medium](https://aakashgupta.medium.com/what-the-product-sense-interview-is-evaluating-f290fb2b4885)
7. [Meta's 5 Criteria for the Product Sense Interview — Aakash Gupta, LinkedIn](https://www.linkedin.com/posts/aagupta_i-found-metas-5-criteria-for-the-product-activity-7202163956516278273-updi)
8. [Meta Product Sense with AI Interview Guide — Prepfully](https://prepfully.com/interview-guides/meta-pm-product-sense-with-ai)
9. [Meta Product Sense with AI Interviews — IGotAnOffer](https://igotanoffer.com/en/advice/meta-product-sense-ai-interview)
10. [Product Sense Interview Prep (2026 Guide) — Exponent](https://www.tryexponent.com/blog/product-sense-interview)
11. [Unpacking Meta's New PM Interview: Product Sense with AI — Maven](https://maven.com/p/45cea7/unpacking-meta-s-new-pm-interview-product-sense-with-ai)
12. [The AI Product Sense Interview Guide — Aakash Gupta](https://www.news.aakashg.com/p/ai-product-sense-guide)
13. [What Is the AARM Framework and How Is It Used by Business Analysts and Product Managers? — ModernAnalyst](https://www.modernanalyst.com/Careers/InterviewQuestions/tabid/128/ID/5350/What-is-the-AARM-Framework-and-how-is-used-by-Business-Analysts-and-Product-Managers.aspx)
14. [Beyond the Buzzwords: Demystifying the AARM Method in Product Management — Oreate AI Blog](https://www.oreateai.com/blog/beyond-the-buzzwords-demystifying-the-aarm-method-in-product-management/c5a9aa21b9c33728219b599877bbc785)

**Note on sourcing**: the alternate "CIRCLES = Customers, Investigate, Requirements, Create, Launch, Evaluate, Study" definition found on one site (Jobaaj Learnings) was checked against the framework's named originator (Lewis Lin) and does not match — treat that version as incorrect rather than a legitimate variant. A JTBD "job story" template format (a specific sentence structure for articulating customer needs) appeared in one source but couldn't be independently corroborated, so it's omitted from the findings above rather than presented as confirmed. Two claims about exact wording of Meta's "five criteria" come from secondary reporting (Aakash Gupta's analysis) rather than an official Meta source, since Meta does not publish its internal interview rubric — treat the specific five-criteria wording as a well-regarded outside reconstruction, not an official document.
