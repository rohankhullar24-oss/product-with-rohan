export type PMNotesData = {
  users: string;
  approach: string;
  metric: string;
  status?: string;
};

export type Project = {
  title: string;
  description: string;
  fullDescription?: string;
  tags: string[];
  href?: string;
  external?: boolean;
  linkLabel?: string;
  featured?: boolean;
  slug: string;
  pm: PMNotesData;
};

export const projects: Project[] = [
  {
    title: "Product Shots: Finshots for Product Managers",
    description:
      "Daily product management practice inspired by Finshots. Get bite-sized PM questions daily, curated news (AI, corporate, hiring), and weekly articles, all designed to sharpen your product thinking.",
    fullDescription:
      "Product Shots brings the Finshots approach to product management learning. The app combines three core features: (1) Daily rotating product-sense questions across 8 types (guesstimate, behavioral, prioritization, metrics, root cause, strategy, critique, analysis) with full written answers; (2) Curated PM-relevant news auto-pulled daily (AI, corporate, hiring); (3) Weekly articles from Rohan's blog on applied product thinking. Built with Next.js + Supabase, email-only authentication, and persistent sessions. Users can browse past questions via the archive and explore news by category. Features a Finshots-inspired UI with dark mode, sidebar navigation, and category filters. Deployed to Vercel with automated daily content generation.",
    tags: ["Side Project", "PM Tool", "Learning"],
    href: "/productshot/dashboard",
    external: false,
    linkLabel: "Open the live app →",
    featured: true,
    slug: "product-shots",
    pm: {
      users:
        "PMs and PM-track candidates who want daily deliberate practice instead of one-off interview cram sessions — mostly early-career and transitioning PMs.",
      approach:
        "Bite-sized daily questions across 8 PM-sense types, paired with curated industry news and weekly articles, so the habit forms around a few minutes a day rather than long study blocks.",
      metric:
        "Day-7 retention on daily question completion — the app only works if people come back the next day, not if they open it once.",
      status: "Live, in active use.",
    },
  },
  {
    title: "AI-Powered Document Verification for Merchant Onboarding",
    description:
      "Led the design and rollout of an AI-driven document-verification workflow for partner KYC, cutting manual verification effort by 60% while strengthening fraud and RBI compliance controls.",
    fullDescription:
      "I designed and implemented an AI-powered document verification system to automate merchant KYC (Know Your Customer) processes. Using machine learning for document classification and extraction, I reduced manual verification effort by 60%, improved compliance with RBI regulations, and built a more robust fraud detection system. This became a foundational component of the broader merchant onboarding revamp.",
    tags: ["Product Case Study", "AI/ML"],
    href: "/projects/ai-doc-verification",
    linkLabel: "View detailed case study →",
    featured: true,
    slug: "ai-doc-verification",
    pm: {
      users:
        "Retailer onboarding ops and compliance teams who were manually reviewing shop photos, plus the retailers whose applications waited on that review.",
      approach:
        "Replace a mostly-manual spot-check with an ML triage layer trained on two years of the company's own review calls, phased in circle by circle rather than switched on nationally.",
      metric:
        "Share of submissions auto-cleared without a human touch, without loosening the fraud/RBI KYC bar — tracked alongside the manual-review rejection rate to make sure triage wasn't just deferring bad cases.",
      status: "Shipped, live in production.",
    },
  },
  {
    title: "Reminders: The Android App That Won't Let You Forget",
    description:
      "A native Android app for birthdays, anniversaries and tasks that rings like an alarm clock, as many times a day as you want, and keeps coming back until you confirm you've actually done it.",
    fullDescription:
      "Most reminder apps fire one notification you swipe away and forget. Reminders is built around a single idea: it doesn't stop until you tap Done. Set a birthday, anniversary, bill, or habit, choose how many times a day it should reach you (four or five times on the day itself is the point), and it rings your alarm tone on loop with a full-screen Done/Snooze screen over the lock screen. Ignore it and it comes back every 30 minutes, at your choice of interval, indefinitely. Supports one-time, daily, weekly, monthly and yearly reminders, with exact alarms that survive reboots, time changes and timezone changes. Optional email sign-in syncs your reminders across devices so they're waiting on any phone you log into, plus automatic Google backup and manual export/import so nothing is lost if you reinstall. It also pairs with a Noise ColorFit Pulse 2 Max smartwatch over Bluetooth to push notifications to your wrist, read its battery and stream live heart rate — the watch speaks no standard Bluetooth services, so that runs on its private protocol, reverse-engineered from the official app. Built in Kotlin with AlarmManager exact alarms and a Supabase backend; APK built and published automatically on every commit.",
    tags: ["Side Project", "Android App", "AI-Built"],
    href: "https://github.com/rohankhullar24-oss/product-with-rohan/releases/download/reminder-app-latest/Reminders.apk",
    external: true,
    linkLabel: "Download the app →",
    featured: true,
    slug: "reminders-app",
    pm: {
      users:
        "People who already ignore normal reminder notifications — anyone who's missed a birthday, a bill, or a habit because one soft nudge wasn't enough.",
      approach:
        "Treat a reminder like an alarm, not a notification: it rings on loop, needs an explicit Done, and comes back every 30 minutes if ignored, with optional sync so reminders follow you across devices.",
      metric:
        "Percent of reminders actually marked Done vs. snoozed indefinitely or silently ignored — completion, not just notification delivery.",
      status: "Live on Android, in active development.",
    },
  },
  {
    title: "Lead-Generation & Assignment Tool",
    description:
      "Built a lead-generation and assignment tool that routes 25K leads/month into the onboarding funnel, and used activation-trend analysis to expand the retailer services catalog.",
    fullDescription:
      "Designed and launched a lead-generation and intelligent assignment tool that processes 25,000 leads monthly into the merchant onboarding pipeline. Used activation-trend analysis to identify untapped service opportunities (micro-ATM, biometric authentication) and expanded the retailer services catalog through third-party provider integrations. This tool became a key driver of merchant acquisition growth.",
    tags: ["Product Case Study"],
    href: "/projects/lead-gen-prd",
    linkLabel: "View detailed PRD →",
    featured: true,
    slug: "lead-gen-prd",
    pm: {
      users:
        "Field sales agents drowning in low-intent leads, and prospective retailers who wanted a faster path in than waiting for outbound contact.",
      approach:
        "Gate the funnel earlier (OTP + qualifying fields), route leads geographically to the right agent without a central dispatcher, then later add a refundable fee to filter intent further.",
      metric:
        "Lead-to-onboarding conversion, the PRD's own headline number: 17% baseline, 40% target.",
      status: "Shipped; now routes ~25K leads/month.",
    },
  },
  {
    title: "Individual & Sole Proprietorship Shopkeeper Onboarding Journey",
    description:
      "Reworked the onboarding flow end-to-end: face-auth, shop-photo fixes, UI cleanup, pre-filled business details, and API-based document verification to cut TAT. Raised conversion from 50% to 73%.",
    fullDescription:
      "The Aadhaar-based onboarding flow had several failure points: state mismatches, unclear category options, and success screens shown even after failures, all of which were dropping users before completion. I drove a set of fixes across the flow: face-authentication to replace a weak verification step, shop-photo capture fixes, general UI cleanup, pre-filling of business details to cut manual entry, and API-based verification of business documents to reduce turnaround time. Together these took conversion from 50% to 73%.",
    tags: ["Product Case Study"],
    featured: true,
    slug: "individual-onboarding-journey",
    pm: {
      users:
        "Individual and sole-proprietorship shopkeepers going through Aadhaar-based onboarding, and the ops team fielding the failures it caused.",
      approach:
        "Find and fix the flow's actual failure points one at a time instead of a full redesign: weak face verification, unclear category options, and success screens shown after failures.",
      metric:
        "End-to-end conversion through the onboarding flow — moved from 50% to 73%.",
      status: "Shipped.",
    },
  },
  {
    title: "RE-KYC Funnel Improvement",
    description:
      "Improved a broken re-KYC flow that was failing on nearly every screen, lifting conversion from 5% to 50% and cutting shop-photo rejections from 50% to 2%.",
    fullDescription:
      "The re-KYC flow was new and riddled with bugs: blank pages, generic errors, and a shop-photo review step rejecting half of all submissions. Most cases only completed after manual intervention from sales and support. I diagnosed the failure points across the journey, resolved the underlying issues, and re-stitched the flow so users could complete it unassisted. Conversion rose from 5% to 50%, and shop-photo rejections dropped from 50% to 2% through SOP changes and better visibility for the review team.",
    tags: ["Product Case Study"],
    href: "/projects/rekyc-funnel",
    featured: true,
    slug: "rekyc-funnel",
    pm: {
      users:
        "Existing retailers due for re-KYC, most of whom couldn't complete it without a support agent stepping in.",
      approach:
        "Diagnose failure points screen by screen in a flow that was new and breaking almost everywhere, then re-stitch it so it completes unassisted.",
      metric:
        "Unassisted completion rate (5% → 50%) and shop-photo rejection rate (50% → 2%) — the two numbers that showed whether people could actually get through without help.",
      status: "Shipped.",
    },
  },
  {
    title: "Journey: Journal Your Life, Plan Your Trips",
    description:
      "A journal and trip-itinerary planner that shares its account and data with the Reminders Android app — log an entry or plan a trip on your phone and it's there on the web too.",
    fullDescription:
      "Journey is the web counterpart to features already built into the Reminders Android app: free-form journal entries (with an optional place name) and trip itineraries (a trip plus a day-by-day list of stops with time, title, location and notes). It signs in with the same email-code login and reads/writes the exact same Supabase data the Android app syncs, so a journal entry or itinerary stop created on either platform shows up on the other. Built with Next.js and Supabase, directed end-to-end via Claude.",
    tags: ["Side Project", "Journal", "Travel Tool", "AI-Built"],
    href: "/journey",
    linkLabel: "Open Journey →",
    featured: true,
    slug: "journey",
    pm: {
      users:
        "People already using the Reminders Android app who want to journal or plan trips from a browser too, without a second account.",
      approach:
        "Build the web app to read/write the exact same Supabase rows the Android app already syncs, so it's a second surface, not a second product.",
      metric:
        "Cross-device usage — how often an entry created on one platform gets opened or continued on the other.",
      status: "Live.",
    },
  },
  {
    title: "IMS: End-to-End Device Ordering Platform",
    description:
      "Built and launched IMS, an end-to-end ordering platform now underpinning ~₹7 Cr in monthly GMV, letting retailers order devices (micro-ATMs, thermal printers, biometric devices, passbook printers, soundboxes, note-counting machines) directly through a self-serve flow.",
    fullDescription:
      "Led the launch of IMS (Inventory/Item Management System), a platform that took device ordering for retailers from a manual, offline process to a self-serve digital flow. Started with micro-ATM ordering, then expanded coverage to thermal printers, biometric devices, passbook printers, soundboxes, and note-counting machines. Also built employer registration into the flow and drove the security sign-off and compliance addendum work needed to get it fully live. The platform now underpins ~₹7 Cr in monthly GMV and is the backbone for how retailers procure the hardware they need to operate.",
    tags: ["Product Case Study"],
    featured: true,
    slug: "ims-device-ordering",
    pm: {
      users:
        "Retailers who previously ordered devices (micro-ATMs, printers, biometric hardware) through a manual, offline process.",
      approach:
        "Move ordering to a self-serve digital flow, starting with one device category and expanding coverage once the core flow, employer registration, and compliance sign-off were solid.",
      metric: "Monthly GMV flowing through the platform — currently ~₹7 Cr/month.",
      status: "Shipped, in production.",
    },
  },
  {
    title: "Retailer & Business KPI Visibility for Distributors",
    description:
      "A business-led initiative giving distributors visibility into business KPIs and retailer status, targeting retention of ~₹80 Cr out of ~₹200 Cr in at-risk retailer business.",
    fullDescription:
      "Started as a business-led initiative to give distributors visibility into the KPIs of the retailers and sub-distributors under them, since they had no way to track or push performance. I built downloadable KPI and status visibility, including flagging which retailers had gone inactive. Roughly 55-58K retailers (₹200 Cr in business) had gone dormant with no way for distributors to see it. Modeled to retain ~40% of at-risk retailers (~₹80 Cr in business) by closing the visibility gap.",
    tags: ["Product Case Study"],
    slug: "retailer-kpi-visibility",
    pm: {
      users:
        "Distributors managing retailers and sub-distributors underneath them, who had no way to see who was going inactive.",
      approach:
        "Give distributors downloadable KPI and status visibility, including an explicit flag for retailers who'd gone dormant, so they could act before the business was lost for good.",
      metric:
        "At-risk business retained — modeled at ~₹80 Cr out of ~₹200 Cr in dormant retailer business by closing the visibility gap.",
      status: "Shipped.",
    },
  },
  {
    title: "CarBecho: Used-Car Inspection Co-Pilot",
    description:
      "A field-inspector tool for used-car checklists. Voice, text, and photo answers get logged straight to a 200-point inspection via an AI co-pilot, no code written manually.",
    fullDescription:
      "CarBecho is an interactive inspection flow for used-car field inspectors: job list → verify & pair → a 200-point checklist (8 sections, 40 rows, Yes/No only) → report. An AI chat co-pilot (Gemini) is available from every row, accepting text, voice, or photo answers and fuzzy-matching replies straight onto the checklist row with a one-tap Mark button. A companion voice-only mode lets an inspector just ask a question and get a spoken answer. Findings feed a shared log with search and severity/section/photo filters. Built with Next.js and Supabase, directed end-to-end via Claude.",
    tags: ["Side Project", "AI-Built"],
    href: "/carbecho",
    slug: "carbecho",
    pm: {
      users:
        "Field inspectors running used-car inspections who need to log a 200-point checklist quickly, often one-handed or mid-conversation with the seller.",
      approach:
        "Let an AI co-pilot take voice, text, or photo answers and fuzzy-match them straight onto the right checklist row, instead of forcing manual taps through every field.",
      metric:
        "Time to complete a full 200-point inspection, and the share of answers the co-pilot matches correctly without manual correction.",
      status: "Live prototype.",
    },
  },
  {
    title: "Prototype Merchant App",
    description:
      "A working merchant-facing app prototype built entirely with Claude, no code written manually. Demonstrates how product thinking translates directly into a functional UI.",
    fullDescription:
      "Built a fully functional merchant-facing mobile app prototype using Claude without writing any code manually. The prototype demonstrates core merchant workflows including transaction history, settlement tracking, and merchant profile management. It showcases how clear product thinking and detailed specifications can be directly translated into a working UI/UX experience.",
    tags: ["Side Project", "AI-Built"],
    href: "https://claude.ai/public/artifacts/3cbc7699-4172-43fd-9aad-a97f1f3634da",
    external: true,
    slug: "prototype-merchant-app",
    pm: {
      users:
        "Anyone evaluating whether Claude can turn a product spec directly into a working UI — internal stakeholders more than end users.",
      approach:
        "Write the merchant-app spec in enough detail that Claude could build the working prototype directly, with no manual coding step in between.",
      metric:
        "Fidelity between the spec and the shipped prototype — how much of the intended behavior survived translation without a developer in the loop.",
      status: "Prototype, not in production use.",
    },
  },
  {
    title: "Indian Stock Analyzer",
    description:
      "A fundamental analysis tool for Indian stocks with comprehensive metrics (P/E, ROE, debt ratios, profit margins) and AI-powered scoring to help identify investment opportunities. Analyzes 8+ major Indian stocks with detailed financial insights.",
    fullDescription:
      "Built an interactive stock analysis platform for Indian equities that uses fundamental metrics to score and rank stocks. The tool evaluates companies across 7 key financial dimensions (P/E ratio, ROE, debt-to-equity, revenue growth, profit margin, liquidity, and ROA), generating a composite investment score (0-100). Features include detailed metric breakdowns, trend analysis, investment ratings (Strong Buy to Avoid), and sector comparisons. Covers blue-chip stocks like Reliance, TCS, Infosys, and HDFC. Designed as an educational tool to help retail investors understand fundamental analysis without requiring financial expertise.",
    tags: ["Side Project", "Finance Tool"],
    href: "/projects/stock-analyzer",
    slug: "stock-analyzer",
    pm: {
      users:
        "Retail investors who want to sanity-check a stock's fundamentals without already knowing how to read a balance sheet.",
      approach:
        "Score stocks across 7 standard fundamental metrics into one composite 0–100 score and a plain-language rating, so the output reads as a verdict, not a spreadsheet.",
      metric:
        "Whether a user's self-reported confidence in a fundamental call goes up after seeing the score — the tool only earns its keep if it actually demystifies the numbers.",
      status: "Prototype.",
    },
  },
  {
    title: "Decision Dice",
    description:
      "A lightweight tool for beating analysis paralysis: enter the options you're torn between, answer a couple of quick questions about your priorities, and get a ranked recommendation with a one-line rationale.",
    fullDescription:
      "Decision Dice solves the problem of analysis paralysis by systematically evaluating your options against your stated priorities. The tool uses a simple questionnaire approach to understand what matters most to you, then applies weighted scoring to provide a clear recommendation. It's available at /projects/decision-dice with a fully interactive interface.",
    tags: ["Side Project", "Tool"],
    href: "/projects/decision-dice",
    slug: "decision-dice",
    pm: {
      users:
        "Anyone stuck between two or three options and going in circles — the tool is built around indecision itself, not a specific domain.",
      approach:
        "Turn vague priorities into a short questionnaire, then apply weighted scoring so the recommendation is explainable, not a coin flip.",
      metric:
        "Whether people who get a recommendation actually go with it — repeat use on the same decision would be a sign the tool isn't trusted yet.",
      status: "Live.",
    },
  },
  {
    title: "The Chladni Plate: A Physics Toy You Have to Tune",
    description:
      "An interactive simulation of the 1787 experiment where sand on a vibrating steel plate arranges itself into geometric figures. Hunt the dial for 21 hidden resonances, and hear each one as its own musical interval.",
    fullDescription:
      "In 1787 Ernst Chladni sprinkled sand on a metal plate and bowed the edge. At most frequencies nothing happens. At a resonance, the grains flee the parts that are shaking and pile up along the lines that stay perfectly still: a different geometric figure at every resonant frequency. This is that experiment, simulated honestly: 22,000 grains each take a random hop every frame, hop harder where the plate moves more, and only keep the hop if they land somewhere calmer. Nothing draws the pattern. The pattern is what's left over once the grains stop moving. Twenty-one resonances are hidden between 100 and 2200 Hz, and the plate only responds near one, so finding them is the game. Each figure you land on gets logged in a register with a tick mark on the dial so you can return to it. It is also audible: pitch follows the dial and loudness follows the plate's real response, so the tone goes quiet between resonances and blooms about nine times louder as a figure forms. Each figure carries its own interval, derived from the same two whole numbers that determine its shape: 2,1 is an octave, 3,2 a fifth, 4,3 a fourth, and the crowded high modes come out dissonant. Built as a canvas simulation with a cosine lookup table, Metropolis-style acceptance, and a Web Audio voice, holding 60fps in a browser tab.",
    tags: ["Side Project", "AI-Built"],
    href: "/projects/chladni-plate",
    linkLabel: "Open the plate →",
    slug: "chladni-plate",
    pm: {
      users:
        "People curious about physics or generative art who'll spend a few minutes hunting for a hidden pattern, not students needing a rigorous teaching tool.",
      approach:
        "Simulate the real physics (22,000 grains, Metropolis-style acceptance) instead of drawing pre-baked figures, so the shapes are actually earned by tuning the dial.",
      metric:
        "Time on page and how many of the 21 resonances a visitor finds before leaving — a proxy for whether the hunt is actually fun.",
      status: "Live.",
    },
  },
  {
    title: "Free AI Course Platform",
    description:
      "A work-in-progress interactive course platform teaching Applied AI concepts. Features 6 weeks of curriculum, video lessons, downloadable starter code, and progress tracking. Currently a prototype being built in public.",
    fullDescription:
      "Building an interactive course platform to teach Applied AI concepts from first principles. The platform features a 6-week curriculum covering LLMs, autonomous agents, ML models, RAG systems, production deployment, and AI capstone projects. Each week includes structured lessons, hands-on project briefs, downloadable Python starter code, and progress tracking. Currently live as a prototype, videos and expanded content coming soon. Designed to be a practical, hands-on introduction to AI engineering.",
    tags: ["Side Project", "WIP", "AI Education"],
    href: "/course",
    slug: "free-ai-course",
    pm: {
      users:
        "People who want a practical, hands-on introduction to applied AI/agents without a heavyweight bootcamp commitment.",
      approach:
        "Ship a 6-week curriculum in public, prototype-first, rather than waiting for every video and starter file to be finished before launching.",
      metric:
        "Week-over-week completion — how many people who start week 1 are still there by week 6.",
      status: "Work in progress.",
    },
  },
  {
    title: "This Portfolio Site: Built with AI, No Code Written",
    description:
      "Designed and shipped this entire site (Next.js + Tailwind) by directing Claude end-to-end, from spec and content to layout, styling, and deployment, without writing a single line of code myself.",
    fullDescription:
      "This entire portfolio site was built without writing any code myself. I used Claude to design the spec, create the layout, implement styling with Tailwind, and deploy to Vercel. This demonstrates how product managers can leverage AI to ship functional products independently, from concept to production: a hands-on look at how PMs can use AI to ship product themselves.",
    tags: ["Side Project", "AI-Built"],
    slug: "portfolio-site",
    pm: {
      users:
        "Recruiters, hiring managers, and other PMs sizing up whether I can actually ship, not just talk about product.",
      approach:
        "Direct Claude through the entire build, spec to deploy, and let the site itself be the proof rather than just claiming \"AI-built\" in a bullet point.",
      metric:
        "Whether a visitor actually opens a project's detail page and reads it, not just bounces off the hero — a proxy for whether the work is landing.",
      status: "Live.",
    },
  },
];
