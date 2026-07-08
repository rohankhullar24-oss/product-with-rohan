# -*- coding: utf-8 -*-
"""
Static written content for The Product Manager Handbook: front matter,
back matter (appendices, glossary), and volume descriptions.

Content blocks use a small shared format so build_handbook.py can emit them
with the same machinery used for the merged chapter content:

    {'type': 'p', 'style': <style name>, 'runs': [{'text': str, 'bold': bool}, ...]}
    {'type': 'tbl', 'rows': [[cell_text, ...], ...]}

Helper functions below (H1, H2, H3, N, BUL, BUL2, NUM, CODE, IQ, TBL) build
these dicts so the prose below stays readable.
"""

def H1(text):
    return {'type': 'p', 'style': 'Heading 1', 'runs': [{'text': text, 'bold': False}]}

def H2(text):
    return {'type': 'p', 'style': 'Heading 2', 'runs': [{'text': text, 'bold': False}]}

def H3(text):
    return {'type': 'p', 'style': 'Heading 3', 'runs': [{'text': text, 'bold': False}]}

def N(text, bold=False):
    return {'type': 'p', 'style': 'Normal', 'runs': [{'text': text, 'bold': bold}]}

def BUL(text):
    return {'type': 'p', 'style': 'List Bullet', 'runs': [{'text': text, 'bold': False}]}

def BUL2(text):
    return {'type': 'p', 'style': 'List Bullet 2', 'runs': [{'text': text, 'bold': False}]}

def NUM(text):
    return {'type': 'p', 'style': 'List Number', 'runs': [{'text': text, 'bold': False}]}

def IQ(text):
    return {'type': 'p', 'style': 'Intense Quote', 'runs': [{'text': text, 'bold': False}]}

def CODE_BLOCK(text):
    """One or more lines of monospaced code, each its own 'Code' paragraph."""
    return [{'type': 'p', 'style': 'Code', 'runs': [{'text': line, 'bold': False}]}
            for line in text.strip('\n').split('\n')]

def BOLD_ITEM(bold_lead, rest):
    """A bullet whose leading phrase is bold, e.g. '**Term** — definition'."""
    return {'type': 'p', 'style': 'List Bullet',
            'runs': [{'text': bold_lead, 'bold': True}, {'text': rest, 'bold': False}]}

def GLOSS_ITEM(term, definition):
    return {'type': 'p', 'style': 'Normal',
            'runs': [{'text': term + '. ', 'bold': True}, {'text': definition, 'bold': False}]}

def TBL(rows):
    return {'type': 'tbl', 'rows': rows}


# ---------------------------------------------------------------------------
# Volume metadata
# ---------------------------------------------------------------------------

VOLUME_META = [
    {
        "roman": "I",
        "title": "Product Management Foundations",
        "short_desc": "The core discipline of product management — the PM mindset, customer "
                       "research, prioritization, strategy, metrics, roadmaps, stakeholder "
                       "management, PRDs, launches, and the operating habits that separate good "
                       "PMs from great ones.",
        "intro": [
            N("Volume I lays the foundation every product manager needs, regardless of "
              "industry or company stage. It covers the mindset, responsibilities, and core "
              "workflows of the PM role — from understanding customers and prioritizing "
              "ruthlessly to writing PRDs, running launches, and building a repeatable "
              "operating system for the job."),
            N("Master this volume first. Every later volume in this handbook — product "
              "sense, execution, AI product management, and interview preparation — "
              "assumes the foundations covered here."),
        ],
    },
    {
        "roman": "II",
        "title": "Product Sense",
        "short_desc": "A practical, case-study-driven training ground for product sense and "
                       "product thinking, built around a structured framework plus more than "
                       "twenty worked case studies and executive-level mock interviews.",
        "intro": [
            N("Volume II builds product sense — the judgment that lets a PM look at an "
              "unfamiliar product and reason about what to improve and why — through a "
              "repeatable framework and over twenty fully worked case studies spanning "
              "consumer apps, B2B platforms, AI products, and crisis scenarios."),
            N("It closes with executive mock interviews, a master framework recap, one hundred "
              "rapid-fire practice prompts, and a capstone simulation, making it as useful for "
              "interview preparation as it is for sharpening day-to-day product judgment."),
        ],
    },
    {
        "roman": "III",
        "title": "Product Execution",
        "short_desc": "The operational backbone of shipping product — discovery and "
                       "validation, prioritization, PRDs, agile delivery, analytics, "
                       "experimentation, launches, and cross-functional leadership.",
        "intro": [
            N("Volume III goes deep on the mechanics of shipping: validating problems before "
              "committing engineering time, writing PRDs and user stories that hold up under "
              "scrutiny, running sprints and managing a backlog, instrumenting products "
              "properly, and running experiments that produce trustworthy answers."),
            N("It closes with real end-to-end execution case studies and an executive mock "
              "interview focused on execution judgment rather than product sense."),
        ],
    },
    {
        "roman": "IV",
        "title": "AI Product Management",
        "short_desc": "A ground-up guide to building AI-native products — LLM fundamentals, "
                       "prompt engineering, RAG, agents, MCP and tool use, evaluation, safety "
                       "and governance, cost optimization, and real AI product case studies.",
        "intro": [
            N("Volume IV treats building with AI as its own discipline rather than a bolted-on "
              "chapter. It starts from LLM fundamentals a PM actually needs, moves through "
              "prompt engineering, retrieval-augmented generation, agents and multi-agent "
              "systems, and the Model Context Protocol, and then covers the unglamorous but "
              "essential parts: evaluation, safety, governance, and cost."),
            N("It closes with AI product case studies, AI-specific PRD and technical spec "
              "guidance, executive AI product interviews, and a capstone project."),
        ],
    },
    {
        "roman": "V",
        "title": "Company Interview Guides",
        "short_desc": "Company-specific interview playbooks for Google, Meta, Amazon, "
                       "Microsoft, Atlassian, Stripe, Airbnb, Uber, Revolut, CRED, PhonePe, "
                       "Razorpay, Flipkart, and Meesho, capped with a full mock interview "
                       "marathon.",
        "intro": [
            N("Volume V is a company-by-company interview playbook. Each chapter covers what a "
              "specific company's PM interview loop actually tests, how to prepare for it, and "
              "the kinds of questions candidates report seeing — from global technology "
              "companies to leading Indian fintech and consumer platforms."),
            N("The volume closes with a comprehensive mock interview marathon that strings "
              "multiple rounds together, the way a real onsite loop would."),
        ],
    },
]


# ---------------------------------------------------------------------------
# Front matter
# ---------------------------------------------------------------------------

BOOK_TITLE = "The Product Manager Handbook"
BOOK_SUBTITLE = "A Complete Guide from Foundations to AI-Native Product Leadership"
BOOK_BYLINE = "Rohan Khullar"
BOOK_EDITION = "2026 Edition"

DEDICATION = [
    N("To every product manager still figuring it out —"),
    N("and to the users whose problems make the work worth doing."),
]
# Note: placeholder dedication — Rohan may want to personalize this (e.g. name a
# mentor, team, or family member) before publishing.

COPYRIGHT_BLOCKS = [
    N("© 2026 Rohan Khullar. All rights reserved."),
    N(""),
    N("This handbook is provided for informational and educational purposes only. It "
      "reflects the author's personal views and professional experience and does not "
      "constitute professional, legal, or financial advice. While every effort has been "
      "made to ensure accuracy at the time of writing, the product management field "
      "evolves quickly, and the contents may be revised or updated in future editions "
      "without notice. No warranty, express or implied, is made as to the completeness, "
      "reliability, or fitness of this material for any particular purpose."),
    N(""),
    N("For questions, feedback, or permission requests, contact the author via "
      "productwithrohan.online."),
]

FOREWORD_BLOCKS = [
    N("I wrote this handbook because I couldn't find the book I needed when I needed it."),
    N("When I moved from performance marketing into product management, I read dozens of "
      "blog posts, half a dozen frameworks books, and every “how I think about "
      "prioritization” thread I could find. Each piece was useful in isolation, but "
      "nothing connected the foundations to the judgment calls — the actual "
      "“what do I do on a Tuesday when three stakeholders disagree and the data is "
      "ambiguous” moments that make up most of the job."),
    N("Product management has also changed under my feet over the past few years. I started "
      "by owning workflows for people, and increasingly I'm owning workflows that involve AI "
      "making decisions alongside people — verification systems, support copilots, agents "
      "that take real actions. The core discipline hasn't changed: understand the problem, "
      "decide what matters, ship, measure, repeat. But the surface area has grown, and I "
      "wanted a single reference that treated AI product management as a first-class citizen "
      "rather than a bolted-on chapter."),
    N("This handbook is my attempt to write the book I wished existed: foundations that hold "
      "up across industries, a structured way to build product sense through worked case "
      "studies, the operational mechanics of execution, a serious treatment of building with "
      "AI, and — because so many PMs reading this are also job hunting — "
      "company-specific interview preparation drawn from how real interview loops are "
      "actually run."),
    N("None of this is theoretical. It's shaped by four years of owning a merchant lifecycle "
      "platform used by more than 600,000 partners, by every roadmap review that didn't go "
      "the way I planned, and by the frameworks that actually held up under pressure versus "
      "the ones that only looked good in a slide deck."),
    N("I hope it saves you some of the time it took me to learn this the slow way."),
    N("— Rohan Khullar", bold=False),
]

PREFACE_BLOCKS = [
    H3("Who This Book Is For"),
    N("This handbook is for product managers at every stage — from someone about to write "
      "their first PRD to a senior PM preparing for a director-level interview loop. It's "
      "written for people working across consumer apps, B2B SaaS, marketplaces, fintech, "
      "healthcare, and increasingly AI-native products, because the underlying discipline of "
      "product management transfers across all of them even when the surface details don't."),
    H3("How This Book Is Organized"),
    N("The handbook is split into five volumes that build on each other but can also be read "
      "independently:"),
    BUL("Volume I — Product Management Foundations covers the core discipline: the PM "
        "mindset, customer research, prioritization, strategy, metrics, roadmaps, stakeholder "
        "management, PRDs, launches, and feedback loops."),
    BUL("Volume II — Product Sense builds judgment through a structured framework and more "
        "than twenty worked case studies, from improving a calendar app to executive-level "
        "crisis-response simulations."),
    BUL("Volume III — Product Execution goes deep on the mechanics of shipping: discovery, "
        "agile delivery, analytics, experimentation, and cross-functional leadership."),
    BUL("Volume IV — AI Product Management treats building with AI as its own discipline "
        "— LLMs, prompt engineering, RAG, agents, evaluation, safety, and cost."),
    BUL("Volume V — Company Interview Guides gives company-specific playbooks for some of "
        "the most competitive PM interview loops in the industry, from Google and Meta to "
        "Razorpay and Flipkart."),
    H3("What Makes This Different"),
    N("Most PM resources pick a lane: frameworks, or case studies, or interview prep, or AI. "
      "This handbook tries to hold all four together, because in practice they aren't "
      "separate skills — the same prioritization instinct that helps you triage a backlog "
      "is the one an interviewer is testing when they ask you to redesign a ride-hailing app. "
      "Appendices, a glossary, and an index at the back are designed to make this a reference "
      "you keep coming back to, not just a book you read once."),
]

HOW_TO_USE_BLOCKS = [
    N("This handbook is organized into five volumes, each covering a distinct facet of product "
      "management — foundations, product sense, execution, AI product management, and "
      "company-specific interview preparation. You can read it start to finish, or jump "
      "directly to the volume most relevant to what you're working on right now; each chapter "
      "is written to stand largely on its own."),
    N("At the back of the book you'll find:"),
    BOLD_ITEM("Appendices (A–H). ", "a compact reference library — 100 PM frameworks, "
              "PRD and roadmap templates, a KPI library, SQL cheat sheets, an AI prompt "
              "library, interview checklists, and resume-writing guidance."),
    BOLD_ITEM("Glossary. ", "definitions for the key terms and frameworks used throughout the "
              "handbook, alphabetized for quick lookup."),
    BOLD_ITEM("Index. ", "page references for roughly sixty of the most important terms and "
              "frameworks, so you can jump straight to where a concept is discussed."),
    H3("A Note on the Table of Contents and Index"),
    N("Both are generated using Word's automatic field system, which means page numbers are "
      "calculated by Word (or a compatible viewer) rather than typed in by hand. If you open "
      "the .docx file and the Table of Contents or Index looks out of date — for example, "
      "after you've added your own notes and the pagination has shifted — select the "
      "whole document (Ctrl+A) and press F9, or right-click the Table of Contents and choose "
      "“Update Field,” to refresh both. The PDF version included alongside this file "
      "already has these fields resolved to final page numbers."),
]

ABOUT_AUTHOR_BLOCKS = [
    N("Rohan Khullar is a Product Manager in B2B fintech, currently at Airtel Payments Bank, "
      "where he owns the product strategy and roadmap for a merchant and retailer lifecycle "
      "platform serving more than 600,000 partners and processing roughly ₹7 crore in "
      "monthly GMV. He led the funnel redesign that lifted partner onboarding conversion from "
      "50% to 73%, and the automation effort that cut onboarding turnaround from three days to "
      "fifteen minutes."),
    N("His work sits at the intersection of platform thinking, compliance-heavy fintech "
      "infrastructure, and AI-assisted operations — including building AI-powered document "
      "verification that cut manual review effort by 60% while strengthening fraud and "
      "compliance controls aligned with RBI requirements."),
    N("Rohan holds an MBA in International Business from the Delhi School of Economics, "
      "University of Delhi, and is based in Gurugram, India. He writes and builds "
      "“Product with Rohan” as a way of sharing what four years of owning a "
      "high-stakes B2B platform has taught him about product management — foundations, "
      "product sense, execution, and increasingly, what it means to build products with AI in "
      "the loop."),
    N("Read more of his work at productwithrohan.online."),
]


# ---------------------------------------------------------------------------
# Appendix A — 100 PM Frameworks
# ---------------------------------------------------------------------------

_FRAMEWORKS = {
    "Strategy": [
        ("Vision Statement", "Articulates the long-term aspirational future state a product is working toward."),
        ("North Star Metric", "A single metric that best captures the core value a product delivers to customers."),
        ("SWOT Analysis", "Evaluates Strengths, Weaknesses, Opportunities, and Threats to inform strategic choices."),
        ("Porter's Five Forces", "Assesses competitive intensity in a market via suppliers, buyers, rivals, substitutes, and new entrants."),
        ("Blue Ocean Strategy", "Seeks uncontested market space rather than competing head-on in a saturated market."),
        ("Business Model Canvas", "A one-page framework mapping value proposition, customers, channels, revenue, and cost structure."),
        ("Lean Canvas", "A startup-focused adaptation of the Business Model Canvas emphasizing problem, solution, and unfair advantage."),
        ("Value Proposition Canvas", "Maps customer jobs, pains, and gains against a product's pain relievers and gain creators."),
        ("Playing to Win", "Roger Martin's strategy framework built around five cascading choices, from winning aspiration to management systems."),
        ("Ansoff Matrix", "Frames growth options across existing/new products and existing/new markets."),
        ("Crossing the Chasm", "Explains why products succeed with early adopters but stall before reaching the mainstream majority."),
        ("Diffusion of Innovation", "Models how new products spread through innovators, early adopters, early/late majority, and laggards."),
        ("Three Horizons Model", "Balances near-term core business with emerging and future growth bets."),
        ("Jobs to Be Done (JTBD)", "Frames products as being “hired” by customers to make progress on a specific job."),
        ("Competitive Positioning Map", "Plots competitors along two key attributes to identify strategic white space."),
        ("Working Backwards", "Amazon's practice of writing the press release and FAQ before building, to clarify customer value first."),
        ("Flywheel Model", "Identifies self-reinforcing loops where each component of a business accelerates the others."),
    ],
    "Prioritization": [
        ("RICE Score", "Prioritizes by Reach × Impact × Confidence ÷ Effort."),
        ("MoSCoW", "Sorts requirements into Must-have, Should-have, Could-have, and Won't-have."),
        ("Kano Model", "Classifies features as basic, performance, or delight based on customer satisfaction impact."),
        ("ICE Score", "A lightweight scoring method using Impact, Confidence, and Ease."),
        ("Cost of Delay", "Quantifies the economic impact of delaying a piece of work."),
        ("WSJF (Weighted Shortest Job First)", "Prioritizes by dividing cost of delay by job duration or size."),
        ("Eisenhower Matrix", "Sorts tasks by urgency and importance into four quadrants."),
        ("Value vs. Effort Matrix", "Plots initiatives on value delivered against effort required to identify quick wins."),
        ("Opportunity Scoring", "Prioritizes opportunities where importance is high but current satisfaction is low."),
        ("Buy a Feature", "A collaborative prioritization exercise where stakeholders “spend” a limited budget on features."),
        ("100-Dollar Test", "Stakeholders allocate a fixed number of points across competing priorities to reveal true preference."),
        ("Story Mapping", "Lays user stories along a narrative backbone to identify a minimum viable release slice."),
        ("Weighted Scoring Model", "Prioritizes items against multiple custom-weighted criteria."),
        ("Now-Next-Later", "Groups roadmap items by time horizon rather than fixed dates."),
        ("Theme-Based Prioritization", "Organizes work around strategic themes rather than individual feature requests."),
        ("Feature Bucketing", "Groups requests into must-haves, delighters, and differentiators for a release."),
        ("Stack Ranking", "Forces a strict ordinal ranking of competing initiatives to resolve ties."),
    ],
    "Discovery": [
        ("JTBD Interviews", "Structured interviews uncovering the underlying job customers hire a product to do."),
        ("Opportunity Solution Tree", "Maps a desired outcome to the opportunities and solutions that could drive it."),
        ("Continuous Discovery", "A weekly-touchpoint practice (popularized by Teresa Torres) that keeps discovery ongoing rather than episodic."),
        ("CIRCLES Method", "A structured approach — Comprehend, Identify, Report, Cut, List, Evaluate, Summarize — for product design questions."),
        ("Five Whys", "Repeatedly asks “why” to trace a symptom back to its root cause."),
        ("Empathy Mapping", "Captures what a user says, thinks, feels, and does to build shared understanding."),
        ("Customer Journey Mapping", "Visualizes every touchpoint a customer has with a product across their experience."),
        ("Assumption Mapping", "Plots assumptions by importance and evidence to decide what to test first."),
        ("Concierge MVP", "Manually delivers a service to validate demand before building automation."),
        ("Wizard of Oz Testing", "Simulates a feature with a human behind the scenes to test demand before building it."),
        ("Fake Door Testing", "Measures demand for an unbuilt feature via a clickable but non-functional entry point."),
        ("Card Sorting", "Has users group and label content to inform information architecture."),
        ("Contextual Inquiry", "Observes users in their natural environment to surface unspoken needs."),
        ("Diary Studies", "Has users log behavior and feelings over time to reveal patterns a single interview would miss."),
        ("Design Thinking", "A human-centered process: Empathize, Define, Ideate, Prototype, Test."),
        ("Double Diamond", "Diverges then converges twice — once to define the right problem, once to define the right solution."),
        ("Problem Statement Framework", "Frames a discovery effort around user, need, and insight to keep teams aligned on the problem."),
    ],
    "Metrics": [
        ("North Star Metric", "The single metric that best reflects the core value delivered to customers."),
        ("AARRR (Pirate Metrics)", "Tracks Acquisition, Activation, Retention, Referral, and Revenue across the funnel."),
        ("HEART Framework", "Measures Happiness, Engagement, Adoption, Retention, and Task success for UX quality."),
        ("OKRs (Objectives and Key Results)", "Pairs qualitative objectives with measurable key results."),
        ("SMART Goals", "Defines goals that are Specific, Measurable, Achievable, Relevant, and Time-bound."),
        ("Net Promoter Score (NPS)", "Measures likelihood to recommend on a 0–10 scale, net of detractors."),
        ("Customer Satisfaction Score (CSAT)", "Measures satisfaction with a specific interaction or feature."),
        ("Customer Effort Score (CES)", "Measures how much effort a customer had to expend to get something done."),
        ("Cohort Retention Analysis", "Tracks how groups of users acquired at the same time behave over subsequent periods."),
        ("RFM Analysis", "Segments customers by Recency, Frequency, and Monetary value."),
        ("Funnel Analysis", "Measures the conversion rate at each step of a multi-step user flow."),
        ("Unit Economics", "Evaluates the profitability of a single customer or transaction."),
        ("LTV:CAC Ratio", "Compares customer lifetime value to the cost of acquiring that customer."),
        ("DAU/MAU Ratio", "Measures stickiness by comparing daily to monthly active users."),
        ("Activation Rate", "The share of new users who reach a defined “aha moment” milestone."),
        ("Magic Number", "A SaaS efficiency metric relating new ARR to prior-period sales and marketing spend."),
        ("Rule of 40", "A SaaS health check requiring growth rate plus profit margin to exceed 40%."),
    ],
    "Execution": [
        ("Scrum", "An iterative framework organizing work into fixed-length sprints with defined ceremonies."),
        ("Kanban", "Visualizes work-in-progress on a board to limit WIP and improve flow."),
        ("Sprint Planning", "A ceremony where a team commits to a scoped, prioritized slice of the backlog."),
        ("Definition of Done", "A shared checklist defining when a piece of work is truly complete."),
        ("Acceptance Criteria", "The specific conditions a user story must satisfy to be accepted."),
        ("Behavior-Driven Development (BDD)", "Specifies acceptance criteria as Given-When-Then scenarios."),
        ("User Story Format", "Frames requirements as “As a [user], I want [goal], so that [benefit].”"),
        ("RACI Matrix", "Clarifies who is Responsible, Accountable, Consulted, and Informed on a decision."),
        ("PRD (Product Requirements Document)", "Documents the problem, goals, and requirements for a piece of work."),
        ("Retrospective (Start-Stop-Continue)", "A recurring team reflection on what to start, stop, and continue doing."),
        ("A/B Testing", "Compares two variants against a control to measure the causal impact of a change."),
        ("Feature Flags", "Toggle functionality on or off for specific users without a new deployment."),
        ("Post-Launch Review", "A structured review of what happened after a launch against its original goals."),
        ("Blameless Postmortem", "Reviews an incident or failure focused on systemic causes rather than individual blame."),
        ("Definition of Ready", "A checklist confirming a backlog item has enough clarity to be worked on."),
        ("Change Management (ADKAR)", "Guides individuals through Awareness, Desire, Knowledge, Ability, and Reinforcement during change."),
    ],
    "AI": [
        ("RAG (Retrieval-Augmented Generation)", "Grounds LLM outputs in retrieved external documents to improve accuracy."),
        ("Prompt Engineering", "The practice of designing inputs to reliably elicit desired LLM outputs."),
        ("Chain-of-Thought Prompting", "Asks a model to reason step by step before producing a final answer."),
        ("Few-Shot Prompting", "Provides a small number of examples in the prompt to guide model behavior."),
        ("Fine-Tuning", "Further trains a base model on domain-specific data to specialize its behavior."),
        ("Human-in-the-Loop (HITL)", "Keeps a human reviewer in the workflow for high-stakes or low-confidence AI decisions."),
        ("Agentic AI", "Systems where an AI plans and takes multi-step actions toward a goal with limited supervision."),
        ("Multi-Agent Systems", "Architectures where multiple specialized AI agents collaborate to complete a task."),
        ("Model Context Protocol (MCP)", "A standard for connecting AI models to external tools and data sources."),
        ("Tool Use / Function Calling", "Lets an LLM invoke external functions or APIs as part of generating a response."),
        ("Evaluation Frameworks (Evals)", "A systematic way of measuring AI model quality against defined criteria."),
        ("Guardrails", "Constraints placed on an AI system's inputs or outputs to prevent unsafe or off-scope behavior."),
        ("Hallucination", "When an AI model generates confident but factually incorrect or fabricated output."),
        ("Model Drift", "The degradation of model performance over time as real-world data diverges from training data."),
        ("AI Cost Optimization", "Manages the cost-per-inference trade-offs of model choice, context length, and caching."),
        ("AI Governance", "The policies and oversight structures ensuring AI systems are used safely, fairly, and compliantly."),
    ],
}

def build_appendix_a():
    blocks = [
        H2("Appendix A: 100 PM Frameworks"),
        N("A quick-reference library of the frameworks named throughout this handbook, "
          "supplemented with other well-known frameworks every PM should recognize, grouped "
          "by the kind of decision they help with."),
    ]
    for category, items in _FRAMEWORKS.items():
        blocks.append(H3(f"{category} ({len(items)})"))
        for name, desc in items:
            blocks.append(BOLD_ITEM(name + " — ", desc))
    return blocks


# ---------------------------------------------------------------------------
# Appendix B — PRD Templates
# ---------------------------------------------------------------------------

def build_appendix_b():
    return [
        H2("Appendix B: PRD Templates"),
        N("Two outline templates: a full PRD for cross-functional, multi-sprint work, and a "
          "lightweight one-pager for smaller, well-scoped changes."),
        H3("Template 1: Standard PRD"),
        NUM("Problem — what user or business problem are we solving, and how do we know it's real?"),
        NUM("Goals and Non-Goals — what success looks like, and what is explicitly out of scope."),
        NUM("User Stories — the key flows, written as As a / I want / so that."),
        NUM("Success Metrics — the primary metric that moves and the guardrail metrics that must not regress."),
        NUM("Design — UX flows, wireframes or links to design files, and key states (empty, loading, error)."),
        NUM("Technical Considerations — dependencies, data model changes, performance and scale notes."),
        NUM("Risks and Open Questions — what could go wrong, what's still unresolved, who owns resolving it."),
        NUM("Timeline — milestones, target launch date, and what's needed from each function to hit it."),
        H3("Template 2: One-Pager PRD (Lightweight)"),
        NUM("Problem (2–3 sentences)"),
        NUM("Proposed Solution (2–3 sentences)"),
        NUM("Success Metric (one primary metric)"),
        NUM("Scope Cut Line (what's explicitly NOT included in v1)"),
        NUM("Owner and Target Date"),
    ]


# ---------------------------------------------------------------------------
# Appendix C — Roadmap Templates
# ---------------------------------------------------------------------------

def build_appendix_c():
    return [
        H2("Appendix C: Roadmap Templates"),
        H3("Now / Next / Later"),
        N("Groups roadmap items into three horizons instead of fixed dates: Now (in active "
          "development, committed), Next (validated and queued, not yet started), and Later "
          "(directionally likely, not yet validated). Best when priorities shift often and "
          "date commitments would be misleading."),
        H3("Theme-Based Roadmap"),
        N("Organizes the roadmap around 3–6 strategic themes (e.g. “Reduce onboarding "
          "friction,” “Expand platform APIs”) rather than a flat list of features. "
          "Each theme carries its own success metric, so stakeholders see the intent behind the "
          "work, not just a list of deliverables."),
        H3("Outcome-Based Roadmap"),
        N("Frames each roadmap row as a measurable outcome (“Increase onboarding conversion "
          "from 50% to 65%”) rather than an output (“Ship new onboarding flow”), "
          "leaving the team room to choose the best solution rather than being locked into a "
          "predetermined feature."),
    ]


# ---------------------------------------------------------------------------
# Appendix D — KPI Library
# ---------------------------------------------------------------------------

_KPI_LIBRARY = {
    "Acquisition": [
        ("Website/App Visitors", "Total unique visitors in a period."),
        ("Cost per Acquisition (CPA)", "Total acquisition spend ÷ new customers acquired."),
        ("Customer Acquisition Cost (CAC)", "Fully loaded sales and marketing cost ÷ new customers acquired."),
        ("Signup Conversion Rate", "Signups ÷ visitors, expressed as a percentage."),
        ("Channel Mix", "Share of new users originating from each acquisition channel."),
    ],
    "Activation": [
        ("Activation Rate", "Share of signups who complete a defined “aha moment” action."),
        ("Time to First Value (TTFV)", "Median time between signup and the first meaningful value moment."),
        ("Onboarding Completion Rate", "Users who complete onboarding ÷ users who start it."),
        ("Setup Drop-off Rate", "Share of users who abandon onboarding at each step."),
    ],
    "Retention": [
        ("D1 / D7 / D30 Retention", "Share of a cohort still active 1, 7, or 30 days after signup."),
        ("Churn Rate", "Customers lost in a period ÷ customers at the start of the period."),
        ("DAU/MAU Ratio", "Daily active users ÷ monthly active users — a stickiness measure."),
        ("Net Revenue Retention (NRR)", "Revenue from existing customers this period (incl. expansion, minus churn) ÷ revenue from the same customers last period."),
    ],
    "Referral": [
        ("Net Promoter Score (NPS)", "% Promoters − % Detractors, from a 0–10 recommendation survey."),
        ("Viral Coefficient (K-factor)", "Average number of new users each existing user brings in."),
        ("Referral Conversion Rate", "Referred signups ÷ referral invites sent."),
    ],
    "Revenue": [
        ("Monthly Recurring Revenue (MRR)", "Predictable subscription revenue normalized to a monthly figure."),
        ("Annual Recurring Revenue (ARR)", "MRR × 12, used for annual planning and valuation."),
        ("Average Revenue per User (ARPU)", "Total revenue ÷ total active users in a period."),
        ("Customer Lifetime Value (LTV)", "Average revenue per customer × expected customer lifetime."),
        ("LTV:CAC Ratio", "Customer lifetime value ÷ acquisition cost; 3:1 or higher is a common healthy benchmark."),
    ],
    "Engagement, NPS & CSAT": [
        ("Daily/Monthly Active Users (DAU/MAU)", "Unique users performing a core action in a day or month."),
        ("Session Frequency", "Average number of sessions per active user in a period."),
        ("Feature Adoption Rate", "Users who use a given feature ÷ users eligible to use it."),
        ("Customer Satisfaction Score (CSAT)", "Average satisfaction rating (typically 1–5) after a specific interaction."),
        ("Customer Effort Score (CES)", "Average reported effort (typically 1–7) required to complete a task."),
    ],
}

def build_appendix_d():
    blocks = [
        H2("Appendix D: KPI Library"),
        N("Common product and business metrics, grouped by the AARRR funnel stage they measure, "
          "plus a general engagement/satisfaction group."),
    ]
    for group, items in _KPI_LIBRARY.items():
        blocks.append(H3(group))
        for name, formula in items:
            blocks.append(BOLD_ITEM(name + " — ", formula))
    return blocks


# ---------------------------------------------------------------------------
# Appendix E — SQL Cheat Sheets
# ---------------------------------------------------------------------------

def build_appendix_e():
    blocks = [
        H2("Appendix E: SQL Cheat Sheets"),
        N("Common analytical query patterns a PM should be able to read, adapt, and sanity-check "
          "when working with a data analyst or writing ad hoc queries directly."),
        H3("Funnel Conversion"),
    ]
    blocks += CODE_BLOCK("""
SELECT
  step,
  COUNT(DISTINCT user_id) AS users_reached,
  COUNT(DISTINCT user_id) * 1.0
    / FIRST_VALUE(COUNT(DISTINCT user_id)) OVER (ORDER BY step) AS pct_of_step_1
FROM funnel_events
WHERE event_date BETWEEN :start_date AND :end_date
GROUP BY step
ORDER BY step;
""")
    blocks.append(H3("Retention Cohort"))
    blocks += CODE_BLOCK("""
SELECT
  DATE_TRUNC('week', signup_date) AS cohort_week,
  DATEDIFF('week', signup_date, activity_date) AS week_number,
  COUNT(DISTINCT user_id) AS active_users
FROM user_activity
GROUP BY 1, 2
ORDER BY 1, 2;
""")
    blocks.append(H3("DAU / MAU (Stickiness)"))
    blocks += CODE_BLOCK("""
SELECT
  activity_date,
  COUNT(DISTINCT user_id) AS dau,
  COUNT(DISTINCT user_id) OVER (
    ORDER BY activity_date
    RANGE BETWEEN INTERVAL '29 days' PRECEDING AND CURRENT ROW
  ) AS mau_trailing_30d
FROM daily_active_users
ORDER BY activity_date;
""")
    blocks.append(H3("Top-N per Group"))
    blocks += CODE_BLOCK("""
SELECT *
FROM (
  SELECT
    category,
    product_id,
    revenue,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
  FROM product_revenue
) ranked
WHERE rnk <= 5;
""")
    blocks.append(H3("Window Functions: Running Total & Rank"))
    blocks += CODE_BLOCK("""
SELECT
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER (ORDER BY order_date) AS running_total,
  RANK() OVER (ORDER BY daily_revenue DESC) AS revenue_rank
FROM daily_revenue_summary
ORDER BY order_date;
""")
    return blocks


# ---------------------------------------------------------------------------
# Appendix F — AI Prompt Library
# ---------------------------------------------------------------------------

_PROMPT_LIBRARY = {
    "PRD Drafting": [
        "Draft a one-page PRD for [feature], including problem, goals/non-goals, user stories, "
        "success metrics, and key risks. Assume the audience is engineering and design leads.",
        "Given this problem statement: [paste], write three alternative solution approaches with "
        "trade-offs, then recommend one with reasoning.",
        "Review this PRD draft for gaps: missing edge cases, unclear success metrics, or vague "
        "requirements. List issues as a checklist.",
        "Turn these rough meeting notes into a structured PRD outline with headings for problem, "
        "goals, scope, and open questions.",
        "Write acceptance criteria in Given-When-Then format for this user story: [paste].",
        "Summarize this 10-page PRD into a 5-bullet executive summary for a steering committee.",
    ],
    "Competitive Analysis": [
        "Compare [Product A] and [Product B] across pricing, core features, and target segment "
        "in a table.",
        "Given these competitor release notes over the last quarter, identify 3 strategic themes "
        "in where they're investing.",
        "Act as a skeptical analyst: what are three ways [Competitor]'s new feature could fail to "
        "deliver on its stated value proposition?",
        "Draft a positioning statement for our product against [Competitor] for a sales enablement doc.",
        "Summarize the top 5 recurring complaints about [Competitor] from these review excerpts: [paste].",
    ],
    "Research Synthesis": [
        "Cluster these 40 user interview quotes into 4-6 themes, with a representative quote for each.",
        "From this survey's open-text responses, extract the top 10 verbatim pain points ranked by frequency.",
        "Summarize this usability test recording transcript into: what worked, what didn't, and "
        "recommended next steps.",
        "Given these support tickets, identify which are one-off issues versus signals of a "
        "systemic product gap.",
        "Turn this raw research summary into a one-page insight brief for a stakeholder who wasn't in the session.",
    ],
    "Roadmap Prioritization": [
        "Score these 8 initiatives using RICE, given the following reach/impact/confidence/effort "
        "estimates, and rank them.",
        "Given this list of feature requests and their requester counts, group them into MoSCoW buckets "
        "with a one-line rationale each.",
        "Act as a skeptical VP of Engineering: poke holes in this roadmap's sequencing and flag any "
        "hidden dependencies.",
        "Convert this list of outputs (features) into outcome-based roadmap statements with a target metric each.",
        "Write a one-paragraph justification for why [Initiative A] should be prioritized over "
        "[Initiative B] this quarter, for a stakeholder update.",
    ],
    "Interview Preparation": [
        "Ask me a product sense interview question about [product category], then critique my answer "
        "using the CIRCLES method.",
        "Give me a behavioral interview question about a time I influenced without authority, and "
        "outline a strong STAR-format answer structure.",
        "Simulate a hiring manager for a Senior PM role at [Company]. Ask me 3 follow-up questions "
        "based on this answer: [paste].",
        "Review this project bullet for my resume and rewrite it using Action + What + Metric + Impact.",
        "Generate 5 clarifying questions a strong candidate would ask before answering this product "
        "design prompt: [paste].",
        "Critique this mock interview transcript and identify where my structure broke down.",
    ],
}

def build_appendix_f():
    blocks = [
        H2("Appendix F: AI Prompt Library"),
        N("A categorized set of prompts for using LLMs as a PM tool — replace bracketed "
          "placeholders with your specifics, and treat every output as a first draft that still "
          "needs your judgment applied."),
    ]
    for category, prompts in _PROMPT_LIBRARY.items():
        blocks.append(H3(category))
        for p in prompts:
            blocks.append(BUL(p))
    return blocks


# ---------------------------------------------------------------------------
# Appendix G — Interview Checklists
# ---------------------------------------------------------------------------

def build_appendix_g():
    return [
        H2("Appendix G: Interview Checklists"),
        H3("Pre-Interview Checklist"),
        BUL("Research the company's product, recent launches, and public strategy commentary."),
        BUL("Identify the interview loop format (product sense, execution, strategy, behavioral, "
            "technical) and practice each round separately."),
        BUL("Prepare 3–5 STAR-format stories covering: conflict, failure, influence without "
            "authority, and a metric you moved."),
        BUL("Prepare 2–3 thoughtful questions for each interviewer, tailored to their role."),
        BUL("Review your own resume bullets — be ready to go two levels deeper on every metric you claim."),
        H3("During-Interview Checklist"),
        BUL("Restate the question in your own words before answering, to confirm scope."),
        BUL("Ask clarifying questions before diving into a solution — especially for product "
            "sense and design prompts."),
        BUL("Structure your answer out loud (“I'll cover users, then problems, then a "
            "recommendation”) so the interviewer can follow your reasoning."),
        BUL("State assumptions explicitly rather than silently assuming context."),
        BUL("Watch the clock — leave time to reach a clear recommendation, not just analysis."),
        H3("Post-Interview Checklist"),
        BUL("Send a concise thank-you note within 24 hours, referencing a specific discussion point."),
        BUL("Write down every question you were asked while it's fresh, for future preparation."),
        BUL("Note what you'd answer differently — treat every interview as a practice rep."),
        BUL("Follow up with the recruiter on timeline if you haven't heard back by the date they gave you."),
    ]


# ---------------------------------------------------------------------------
# Appendix H — Resume Templates
# ---------------------------------------------------------------------------

def build_appendix_h():
    return [
        H2("Appendix H: Resume Templates"),
        H3("PM Resume Outline"),
        NUM("Header — name, title, email, phone, LinkedIn, portfolio link."),
        NUM("Summary (optional, 1–2 lines) — years of experience, domain, and a headline outcome."),
        NUM("Experience — reverse chronological; 3–5 bullets per role, each using the "
            "Action + What + Metric + Impact formula."),
        NUM("Projects (if early career or portfolio-relevant) — title, your role, outcome."),
        NUM("Skills — grouped (e.g. Strategy, Analytics, Tools) rather than a flat keyword list."),
        NUM("Education — degree, institution, year; certifications if relevant to the role."),
        H3("Bullet-Writing Formula: Action + What + Metric + Impact"),
        N("Start with a strong action verb, state what you did, quantify it, and close with why it "
          "mattered to the business or user."),
        BOLD_ITEM("Before: ", "“Responsible for onboarding flow for merchants.”"),
        BOLD_ITEM("After: ", "“Redesigned merchant onboarding flow (Action + What), lifting "
                  "conversion from 50% to 73% and cutting turnaround from 3 days to 15 minutes "
                  "(Metric), directly increasing active merchant supply on the platform (Impact).”"),
    ]


# ---------------------------------------------------------------------------
# Glossary
# ---------------------------------------------------------------------------
# ~100 terms pulled from across the 93 chapters (frameworks, metrics, AI/ML and
# fintech vocabulary that actually appears in the source material), alphabetized.

INDEX_TERMS = [
    "A/B Testing", "Acceptance Criteria", "Activation Rate", "Agile", "AI Agent",
    "BDD (Behavior-Driven Development)", "CAC (Customer Acquisition Cost)", "Churn",
    "Compliance", "Content Moderation", "Conversion Rate", "Cost of Delay",
    "CSAT (Customer Satisfaction Score)", "Discovery", "Embedding", "Engagement",
    "Execution", "Experimentation", "Feature Flag", "Fine-Tuning", "Funnel",
    "Go-to-Market (GTM)", "Guardrails", "Hallucination", "HITL (Human-in-the-Loop)",
    "ICE Score", "Inference", "Instrumentation", "JTBD (Jobs to Be Done)",
    "KPI (Key Performance Indicator)", "Large Language Model (LLM)", "Latency",
    "Launch Plan", "LTV (Lifetime Value)", "MCP (Model Context Protocol)",
    "Monetization", "MoSCoW", "MVP (Minimum Viable Product)", "North Star Metric",
    "NPS (Net Promoter Score)", "Onboarding", "PMF (Product-Market Fit)", "Postmortem",
    "PRD (Product Requirements Document)", "Product Analytics", "Product Sense",
    "Product Strategy", "Product Vision", "Prompt Engineering",
    "RAG (Retrieval-Augmented Generation)", "Retention", "Retrospective", "RICE Score",
    "Roadmap", "Scrum", "Sprint", "Sprint Planning", "Stakeholder Management",
    "Token", "User Story",
]
# 60 key terms/framework names, each verified to occur verbatim (case-insensitively,
# allowing space/hyphen variation) in the merged chapter body — see build_handbook.py's
# insert_index_entries() for how first-occurrence XE fields are placed.

GLOSSARY_TERMS = [
    ("A/B Testing", "Comparing two variants of a product experience against each other (or a control) to measure the causal effect of a change."),
    ("Acceptance Criteria", "The specific, testable conditions a user story must satisfy before it is considered complete."),
    ("Activation Rate", "The share of new users who reach a defined early value milestone after signing up."),
    ("Agile", "An iterative approach to software delivery emphasizing short cycles, working software, and adapting to change over following a fixed plan."),
    ("AI Agent", "A software system that uses an AI model to perceive context, decide on actions, and execute multi-step tasks with limited human supervision."),
    ("AI Governance", "The policies, oversight, and controls that ensure AI systems are used safely, fairly, and in compliance with relevant regulations."),
    ("Anti-Pattern", "A commonly repeated practice that looks reasonable on the surface but reliably produces poor outcomes."),
    ("BDD (Behavior-Driven Development)", "A practice of writing acceptance criteria as Given-When-Then scenarios so requirements are unambiguous and testable."),
    ("Bias (Model)", "A systematic skew in an AI model's outputs, often traceable to imbalances in its training data."),
    ("Backlog", "The prioritized list of work a product team has not yet started."),
    ("CAC (Customer Acquisition Cost)", "The fully loaded cost of acquiring one new paying customer."),
    ("Chain-of-Thought Prompting", "Prompting an LLM to reason step by step before giving a final answer, which often improves accuracy on complex tasks."),
    ("Churn", "The rate at which customers stop using or paying for a product over a given period."),
    ("Cohort Analysis", "Studying how a group of users acquired at the same time behaves over subsequent periods, to isolate trends from noise."),
    ("Compliance", "Adherence to relevant legal and regulatory requirements, especially significant in regulated industries like fintech and healthcare."),
    ("Content Moderation", "The process of reviewing and acting on user-generated content that may violate platform policy."),
    ("Context Window", "The maximum amount of text (measured in tokens) an LLM can consider at once when generating a response."),
    ("Conversion Rate", "The share of users who complete a desired action out of those who had the opportunity to."),
    ("Cost of Delay", "A quantified estimate of the value lost by not shipping a piece of work sooner."),
    ("Cross-Functional Team", "A team combining people from different functions (e.g. product, engineering, design, data) working toward a shared goal."),
    ("CSAT (Customer Satisfaction Score)", "A metric capturing how satisfied a customer was with a specific interaction or feature."),
    ("Customer Journey Map", "A visualization of every touchpoint and emotion a customer experiences while interacting with a product."),
    ("Definition of Done", "A shared, explicit checklist a team uses to agree a piece of work is truly complete."),
    ("Discovery", "The process of learning what problem to solve and validating a solution direction before committing to build."),
    ("Embedding", "A numerical vector representation of text (or other data) that captures semantic meaning, used to power search and retrieval."),
    ("Engagement", "A measure of how actively and frequently users interact with a product."),
    ("Evaluation Framework (Evals)", "A systematic method for measuring the quality, safety, or accuracy of an AI system's outputs against defined criteria."),
    ("Execution", "The operational discipline of turning a validated plan into shipped, working product."),
    ("Experimentation", "The practice of testing hypotheses about product changes using controlled comparisons, most commonly A/B tests."),
    ("Explainability", "The degree to which an AI system's decisions or outputs can be understood and justified by a human."),
    ("Feature Flag", "A mechanism to turn a piece of functionality on or off for specific users without deploying new code."),
    ("Few-Shot Prompting", "Providing a small number of examples inside a prompt to steer an LLM's output format or behavior."),
    ("Fine-Tuning", "Further training a pre-trained AI model on domain-specific data to specialize its behavior for a particular use case."),
    ("Funnel", "A sequence of steps a user moves through toward a goal, with some drop-off expected at every step."),
    ("Go-to-Market (GTM)", "The coordinated plan for how a product will be launched, positioned, priced, and distributed to customers."),
    ("Growth Loop", "A self-reinforcing mechanism where an action taken by existing users brings in or reactivates other users."),
    ("Guardrails", "Constraints placed around an AI system's inputs or outputs to keep it operating safely and within scope."),
    ("Hallucination", "When an AI model produces confident-sounding output that is factually incorrect or entirely fabricated."),
    ("HITL (Human-in-the-Loop)", "A workflow design that keeps a human reviewer involved for high-stakes or low-confidence automated decisions."),
    ("ICE Score", "A lightweight prioritization score combining Impact, Confidence, and Ease."),
    ("Inference", "The process of an AI model producing an output in response to a given input, as opposed to training."),
    ("Instrumentation", "The engineering work of adding event tracking to a product so its usage can be measured."),
    ("JTBD (Jobs to Be Done)", "A framework that frames customers as “hiring” a product to make progress on a specific job or goal."),
    ("Kano Model", "A framework classifying features as basic, performance, or delighter based on their effect on customer satisfaction."),
    ("KPI (Key Performance Indicator)", "A quantifiable metric used to track progress toward a specific business or product goal."),
    ("Large Language Model (LLM)", "A machine learning model trained on vast amounts of text, capable of understanding and generating natural language."),
    ("Latency", "The time delay between a request being made and a response being returned, critical for AI product responsiveness."),
    ("Launch Plan", "The coordinated set of activities and owners required to bring a product or feature to market."),
    ("LTV (Lifetime Value)", "The total revenue a business expects to earn from a customer over the duration of their relationship."),
    ("MCP (Model Context Protocol)", "An open standard that lets AI models connect to external tools, data sources, and applications in a consistent way."),
    ("Model Drift", "The gradual degradation of an AI model's performance as real-world data diverges from the data it was trained on."),
    ("Monetization", "The strategy and mechanisms by which a product converts usage or value delivered into revenue."),
    ("MoSCoW", "A prioritization technique that sorts requirements into Must-have, Should-have, Could-have, and Won't-have."),
    ("MVP (Minimum Viable Product)", "The smallest version of a product that can be released to test a core hypothesis with real users."),
    ("Multi-Agent System", "An AI architecture in which multiple specialized agents collaborate, each handling part of a larger task."),
    ("North Star Metric", "The single metric an organization treats as the best proxy for the core value it delivers to customers."),
    ("NPS (Net Promoter Score)", "A loyalty metric derived from asking customers how likely they are to recommend a product, on a 0–10 scale."),
    ("Onboarding", "The process of guiding a new user from signup to experiencing a product's core value."),
    ("Outcome-Based Roadmap", "A roadmap format that states each initiative as a measurable result rather than a feature to be built."),
    ("PMF (Product-Market Fit)", "The point at which a product satisfies strong market demand, typically evidenced by organic growth and high retention."),
    ("Postmortem", "A structured review of an incident or failure, focused on root causes and systemic fixes rather than blame."),
    ("PRD (Product Requirements Document)", "A document that captures the problem, goals, scope, and requirements for a piece of product work."),
    ("Product Analytics", "The practice of measuring and analyzing how users interact with a product to inform decisions."),
    ("Product Sense", "The judgment and pattern-recognition that lets a PM reason about what to build and why, even in an unfamiliar domain."),
    ("Product Strategy", "The set of choices about where to compete, how to win, and what to prioritize to achieve a product vision."),
    ("Product Vision", "A concise statement of the long-term future a product is working toward."),
    ("Prompt Engineering", "The practice of designing and refining inputs to reliably elicit a desired response from an AI model."),
    ("RACI Matrix", "A framework clarifying who is Responsible, Accountable, Consulted, and Informed for a decision or task."),
    ("RAG (Retrieval-Augmented Generation)", "An AI architecture that retrieves relevant external documents and feeds them into an LLM's context to ground its answers."),
    ("RBI (Reserve Bank of India)", "India's central bank and financial regulator, whose guidelines shape compliance requirements for fintech products in India."),
    ("Retention", "The degree to which users continue to use a product over time rather than churning."),
    ("Retrospective", "A recurring team ritual reflecting on what to start, stop, and continue doing."),
    ("RICE Score", "A prioritization method scoring initiatives by Reach × Impact × Confidence ÷ Effort."),
    ("Roadmap", "A visual plan communicating a product's priorities and direction over a given time horizon."),
    ("Root Cause Analysis", "A structured technique for tracing an observed problem back to its underlying cause, often via repeated “why” questions."),
    ("Scope Creep", "The uncontrolled expansion of a project's requirements after work has already begun."),
    ("Scrum", "An agile framework organizing work into fixed-length sprints with defined roles and ceremonies."),
    ("Sprint", "A fixed, short time period (commonly one to two weeks) during which a defined set of work is completed."),
    ("Sprint Planning", "The ceremony at the start of a sprint where a team commits to the scope of work it will deliver."),
    ("Stakeholder Management", "The practice of aligning and influencing the people who have interest in or influence over a product's direction."),
    ("Standup (Daily Standup)", "A brief daily team sync focused on progress, plans, and blockers."),
    ("Story Map", "A visual arrangement of user stories along a narrative backbone, used to plan releases."),
    ("Technical Debt", "The implied cost of future rework created by choosing a quick or expedient solution today."),
    ("Temperature", "A parameter controlling the randomness of an LLM's output; lower values produce more deterministic responses."),
    ("Token", "A unit of text (roughly a word or word-fragment) that LLMs process and are billed by."),
    ("Tool Use", "An LLM's ability to call external functions, APIs, or tools as part of producing a response."),
    ("Unit Economics", "The direct revenues and costs associated with a single customer or transaction."),
    ("Usability Testing", "Observing real users attempting tasks with a product to identify points of confusion or friction."),
    ("User Persona", "A composite, research-informed archetype representing a key segment of a product's users."),
    ("User Research", "The systematic study of user needs, behaviors, and motivations to inform product decisions."),
    ("User Story", "A short description of a requirement from the perspective of the person who benefits from it."),
    ("Value Proposition", "A clear statement of the unique value a product delivers to a specific customer segment."),
    ("WSJF (Weighted Shortest Job First)", "A prioritization method dividing an item's cost of delay by its size to favor high-value, low-effort work."),
    ("Zero-Shot Prompting", "Asking an LLM to complete a task with no prior examples in the prompt, relying solely on the instructions given."),
]
