---
title: "Tokenization in the AI Era: What It Is, Why It's Expensive, and What's Breaking in 2026"
description: "Tokenization is the unglamorous foundation underneath every AI cost number, context window, and weird failure you've encountered. Token prices crashed, but bills are rising anyway — and there's a real 'tokenization tax' on non-English languages."
date: "2026-06-17"
---

**TL;DR:** Tokenization — the step that breaks text, images, and audio into the "tokens" an AI model actually processes — is the unglamorous foundation underneath every cost number, context window, and weird AI failure you've encountered. Token prices have crashed (up to 280x cheaper in two years), but usage has grown even faster, so bills are rising anyway. Non-English speakers pay a real "tokenization tax." And a growing body of expert opinion, led by Andrej Karpathy, argues that tokenization is the source of much of AI's strangest behavior — from miscounting letters in "strawberry" to outright security holes.

## Executive Summary

- **What it is**: tokenization converts any input — text, images, audio — into discrete units ("tokens") that are the actual currency a model computes on and that you're billed for. Modern tokenizers (BPE, SentencePiece, tiktoken) trade a bit of human readability for the ability to handle any language or input without ever hitting an "unknown word."
- **What's costing real money**: token prices have fallen up to 280x in two years, but total usage has grown so much faster (OpenAI alone processes ~15 billion tokens/minute as of April 2026) that company AI bills are still rising — sometimes tripling even as per-token costs collapse. Agentic and reasoning workflows are the main driver, consuming 5-30x (and in extreme cases up to 1000x) more tokens per task than a simple chat message.
- **What's overhyped/contested**: whether tokenization is a temporary engineering hack we'll soon delete (Karpathy's camp, plus Meta's Byte Latent Transformer research) or a "core design decision" that's here to stay (a January 2026 EACL paper pushing back on that assumption). As of mid-2026, every flagship commercial model — GPT, Claude, Gemini, Llama — still uses conventional subword tokenization; nothing tokenizer-free has shipped in production.
- **Where it's heading**: incremental fixes (bigger vocabularies, smarter multilingual handling, security-hardened tokenizers) rather than a clean break from tokenization — even as the research case for ditching it gets stronger.

## Background / Context

Every AI model you use — ChatGPT, Claude, Gemini — doesn't actually "read" your text the way you do. Before anything reaches the neural network, a tokenizer chops your input into pieces (tokens) and converts each piece into a number via a lookup table. "Hello, world!" might become `["Hello", ",", "world", "!"]`. A rough rule of thumb for English: 1 token ≈ 4 characters ≈ 0.75 words — and this is also the literal unit every major provider bills you by.

This sounds like a minor implementation detail. It isn't. Tokenization choices ripple into how much you pay, how long a conversation a model can hold in memory, why some languages cost more than others to use AI in, and why models do oddly dumb things like insisting 9.11 is bigger than 9.9.

## Key Findings

### How tokenizers actually work

- The dominant technique is **Byte Pair Encoding (BPE)**: start with individual characters/bytes, then repeatedly merge the most frequent adjacent pair into a new token, until you hit a target vocabulary size. It originated as a 1990s compression algorithm and was adapted for NLP in a 2016 paper that's now the field's canonical reference.
- **SentencePiece** (Google, 2018) takes a different approach — a probabilistic "unigram" model that picks the most likely way to split text — and was purpose-built so one tokenizer could handle 100+ languages without language-specific preprocessing. It powers Gemini/Gemma.
- **tiktoken** (OpenAI's tokenizer) works at the byte level: its base vocabulary is just the 256 possible byte values, so it can always encode any input — any language, emoji, or garbled text — by falling back to raw bytes if nothing else matches. On average, each token covers about 4 bytes of text.
- Vocabulary sizes vary a lot by model and have grown over time: GPT-4/3.5 used ~100,000 tokens; GPT-4o jumped to ~200,000; Llama 3 uses ~128,000 (up from 32,000 in Llama 2); Gemini/Gemma 3 uses ~256,000. Anthropic has never published Claude's vocabulary size — outside estimates put it around 65,000, though this is unconfirmed.
- Bigger vocabularies aren't free: they mean common phrases compress into fewer tokens (cheaper, more room in the context window), but they also bloat the model's parameter count, so labs balance vocabulary size against model size rather than growing it indefinitely.
- **Multimodal tokenization** has become standard practice, not just research: images are split into fixed-size patches (a 224×224 image becomes 196 patches in the classic Vision Transformer approach), and in production APIs like GPT-4o, image cost is literally calculated from patch/tile count (roughly 170 tokens per 512px tile). Audio gets converted into discrete tokens via neural codecs that compress a waveform into a sequence of "codebook" entries — Kyutai's Mimi codec, for example, compresses 16kHz audio down to about 12.5 token-frames per second, which is short enough to fit comfortably in an LLM's context window.

### Why tokenization is costing (and saving) real money

- Token prices have fallen dramatically: a GPT-3.5-equivalent model went from $20 per million tokens (Nov 2022) to $0.07 per million (Oct 2024) — a 280x drop in two years. GPT-4-level reasoning that cost ~$60 per million output tokens in early 2023 is available for $0.30-$0.75 per million by 2026.
- But the paradox is real: one analysis found token costs falling ~99.7% while a company's actual AI bill tripled — because cheaper tokens unlocked far more usage, especially through AI agents. OpenAI's own processing volume jumped from 6 billion to 15 billion tokens per minute between October 2025 and April 2026 — 2.5x in five months. Goldman Sachs forecasts a 24x increase in token consumption by 2030, driven by agentic AI.
- **Reasoning and agentic workloads are the multiplier.** Chain-of-thought reasoning and multi-step agent tool-calling consume 5-30x more tokens per task than a simple chat message (some extreme tool-calling loops reportedly hit up to 1000x). AT&T's internal token usage went from ~8 billion to 27 billion tokens/day after deploying multi-agent systems. By the end of 2025, reasoning models' share of all tokens processed industry-wide had crossed 50%, up from near-zero a year earlier.
- **Context windows have exploded** — roughly 20,000x growth from GPT-1's 512 tokens (2018) to Llama 4 Scout's 10 million tokens (2026) — enabling products to ingest whole codebases, full legal contracts, or long-running agent memory in a single pass. Several flagship models (Claude Opus, Gemini Pro) now offer 1M-token context at flat rates.
- **There's a documented "tokenization tax" on non-English languages.** A widely-cited 2023 study found some languages need up to 15x more tokens than English for equivalent content, because tokenizer vocabularies are built from training data dominated by English/Latin-script text. Using GPT-4o pricing as an example: the same content costs $2.90 per million words in English, but $4.73 in Hindi (a 63% premium) and $4.93 in Arabic (a 70% premium). This isn't a rounding error — it's a structural cost difference baked into how the tokenizer was trained, and it persists even in tokenizers explicitly designed to be multilingual.
- Companies have responded with several now-standard cost-control techniques: **prompt caching** (Anthropic cuts cached-input cost by 90%, OpenAI by 50%, Google by 75%), **batch APIs** (flat discounts of 25-50% for non-real-time requests), **model routing** (sending easy queries to cheap models, hard ones to frontier models — shown to cut overall token usage 37-46%), and **semantic caching** (matching new queries to similar cached ones, with one production case reporting a 90% cache-hit rate and 80% cost reduction). Stacking these techniques together is documented to deliver 47-80% total cost reduction.

### Real-world weirdness, costly surprises, and security holes

- **The "strawberry" problem**: models notoriously miscounted the letters in "strawberry" (saying 2 R's instead of 3) because the tokenizer splits it into chunks like "straw" + "berry" — the model never sees individual letters, only token IDs. OpenAI's reasoning model was even internally codenamed "Strawberry," a direct nod to fixing this exact class of failure through step-by-step reasoning rather than a single forward pass.
- **"9.11 vs 9.9"**: a separate but related embarrassment — multiple models confidently claimed 9.11 is bigger than 9.9, traced partly to how digits get split into tokens like "9", ".", "11" rather than being understood as decimal values. Researchers caution this is "tokenization plus" something else — a deeper pattern-matching issue — not tokenization in total isolation.
- **Glitch tokens**, the most famous being "SolidGoldMagikarp": a rare Reddit username that ended up in a tokenizer's vocabulary but was essentially untrained in the model itself, creating a "blind spot" where simply asking the model to repeat the word triggered bizarre, unrelated, or hostile outputs. This was first documented by independent researchers in early 2023 and has spawned a whole sub-field of detection research since.
- **Two real, recent pricing blowups for PMs to know**: Cursor (the AI coding tool) had to publicly apologize in July 2025 after quietly moving from a flat "500 requests/month" plan to a token-cost-based model that spiked some users' effective bills 20x+ once heavy agentic usage hit; refunds followed. GitHub Copilot's June 2026 move to token-based billing similarly blindsided developers — some projected bill increases of 10x-50x for agentic workflows (one scenario went from $29/month to $750/month), and the GitHub community thread announcing it got 958 downvotes against 24 upvotes.
- **Named companies that blew past their AI budgets in 2026**: Uber exhausted its entire annual AI coding budget by April after rolling out Claude Code (engineer adoption jumped from 32% to 84% in two months), with heavy users running up $500-2,000/month each. Priceline's AI coding tool contract renewal jumped 4-5x; one employee alone generated a $40,000 monthly token bill. One unnamed enterprise reportedly accumulated a $500 million bill after failing to set usage limits. A 2025 industry survey found 85% of companies missed their AI cost forecasts by more than 10%.
- **This is also a real security surface, not just a cost or quirk problem.** "TokenBreak" (disclosed June 2025) showed that single-character tweaks to a harmful prompt — like changing "instructions" to "finstructions" — can change how a tokenizer splits the text just enough to slip past a safety filter, while the underlying model still understands the intended (harmful) meaning perfectly. Separately, "adversarial tokenization" research (March 2025) showed the same trick works across multiple model families (Llama 3, Gemma 2, OLMo) by exploiting tokenizer-level segmentation differences, and other research has found "special token" exploits achieving jailbreak success rates as high as 96%.

### What's overhyped / contested

- **The debate over whether tokenization should be deleted entirely is real, current, and unresolved.** Andrej Karpathy — among the most-cited voices on this — has said: "Everyone should hope that we can throw away tokenization in LLMs," and that "a lot of weird behaviors and problems of LLMs actually trace back to tokenization." He frames it as an inelegant holdover from older NLP pipelines, not a deliberate design choice.
- **Counter to that, a January 2026 paper** ("Stop Taking Tokenizers for Granted," published at EACL 2026) argues the opposite: that tokenizer choice is a "core design decision" on par with model architecture, and that the field's habit of dismissing tokenizer differences as minor is wrong — measurable performance differences persist across tokenizer choices even at large model scale.
- **Tokenizer-free research is promising but not close to mainstream deployment.** Meta's Byte Latent Transformer (Dec 2024) processes raw bytes directly, dynamically allocating more compute to unpredictable stretches of text, and reportedly matches Llama 3 performance using up to 50% fewer inference FLOPs. MambaByte (2024) is a similar byte-level approach built on the Mamba architecture. Both are described by researchers as "feasible at scale" and "promising" — language that signals proof-of-concept, not production-ready. As of mid-2026, every flagship commercial model (GPT, Claude, Gemini, Llama) still ships with conventional subword tokenization.
- **The actual industry response so far is incremental, not revolutionary**: bigger vocabularies, better multilingual coverage, and tokenizer choices made partly for security reasons (e.g., Unigram tokenizers being immune to the TokenBreak exploit that hits BPE/WordPiece) — rather than the field abandoning tokenization altogether.

### Where things are heading

- Expect continued growth in vocabulary size and multilingual-aware tokenizer design as the main lever labs pull to address the "tokenization tax," rather than a wholesale architecture change.
- Watch the tokenizer-free research lineage (BLT, MambaByte, and newer adaptations like ByteFlow) — it's well-funded and active, and Meta's own research division is simultaneously the most vocal advocate for eliminating tokenization while its production Llama models still use conventional tokenizers. That tension is a useful signal: even the labs pushing tokenizer-free hardest haven't shipped it yet.
- Expect continued volatility in how AI products price themselves. The Cursor and GitHub Copilot pricing incidents are likely previews, not one-offs — as agentic and reasoning workloads keep pushing token consumption up faster than per-token prices fall, more products will face the same "our flat-rate plan didn't account for how token-hungry agents actually are" reckoning.
- Expect more "outcome-based" pricing experiments (e.g., Intercom charging $0.99 per resolved support ticket rather than per token or message) as companies try to decouple what customers pay from the internal token cost they can't fully predict or control.

## Implications for PMs / Practitioners

- **If your product has any agentic or reasoning features, budget for 5-30x the token consumption of a simple chat feature** — and stress-test your pricing model against that multiplier before launch, not after a Cursor- or Copilot-style backlash forces your hand.
- **Don't assume "tokens got cheaper" means "this feature got cheaper to run."** Falling per-token prices and rising total usage are pulling in opposite directions on your actual bill — model your cost projections on usage growth, not just published price drops.
- **If you have non-English-speaking users, check what they're actually paying in tokens for the same task.** A 60-70% cost premium for Hindi or Arabic users isn't a hypothetical — it's documented, current, and worth knowing before you set regional pricing or usage limits.
- **Treat "switching models" as a real migration cost, not a config change.** Different tokenizers mean different token counts for the same prompt, which can quietly break context-budget logic, cost estimates, and prompt engineering tuned for one vendor.
- **If you're evaluating AI safety/guardrail tooling, ask specifically how it handles tokenizer-level evasion** (TokenBreak-style attacks) — a classifier that looks robust on the model's own tokenizer can still be evaded with single-character tricks that exploit the tokenizer's segmentation.

## Sources

1. [Tokenization in LLMs — Medium](https://sagarpatil2000.medium.com/tokenization-in-llms-the-first-step-every-language-model-takes-before-understanding-anything-1d5f2c9c7e50)
2. [All You Need to Know About Tokenization in LLMs — Medium](https://medium.com/thedeephub/all-you-need-to-know-about-tokenization-in-llms-7a801302cf54)
3. [LLM Tokenization Explained — PromptCost.org](https://promptcost.org/en/blog/llm-tokenization-explained/)
4. [Understanding tokens — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/ai/conceptual/understanding-tokens)
5. [Byte-Pair Encoding For Beginners — Towards Data Science](https://towardsdatascience.com/byte-pair-encoding-for-beginners-708d4472c0c7/)
6. [Byte-Pair Encoding (BPE) — GeeksforGeeks](https://www.geeksforgeeks.org/nlp/byte-pair-encoding-bpe-in-nlp/)
7. [BPE tokenization — Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter6/5)
8. [Neural Machine Translation of Rare Words with Subword Units — ACL Anthology](https://aclanthology.org/P16-1162/)
9. [Neural Machine Translation of Rare Words with Subword Units — arXiv:1508.07909](https://arxiv.org/abs/1508.07909)
10. [SentencePiece Demystified — Towards Data Science](https://towardsdatascience.com/sentencepiece-tokenizer-demystified-d0a3aac19b15/)
11. [SentencePiece paper — arXiv:1808.06226](https://arxiv.org/pdf/1808.06226)
12. [google/sentencepiece — GitHub](https://github.com/google/sentencepiece)
13. [openai/tiktoken — GitHub](https://github.com/openai/tiktoken)
14. [Lossless Tokenizer via Byte-level BPE with Tiktoken — AI Bytes](https://benathi.github.io/blogs/2023-09/llm-tokenizer/)
15. [Between Words and Characters: A Brief History of Tokenization — arXiv:2112.10508](https://arxiv.org/abs/2112.10508)
16. [The Evolution of Tokenization — freeCodeCamp](https://www.freecodecamp.org/news/evolution-of-tokenization/)
17. [Rethinking Tokenization — arXiv:2403.00417](https://arxiv.org/pdf/2403.00417)
18. [ViT: An Image is Worth 16x16 Words — Medium](https://medium.com/@varunsivamani/vit-vision-transformer-58dad036ee12)
19. [Vision-enabled chat model concepts — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/gpt-with-vision)
20. [Neural audio codecs: how to get audio into LLMs — Kyutai](https://kyutai.org/codec-explainer)
21. [O200k_base tokenizer — Grokipedia](https://grokipedia.com/page/O200k_base_tokenizer)
22. [Understanding GPT tokenizers — Simon Willison](https://simonwillison.net/2023/Jun/8/gpt-tokenizers/)
23. [Introducing Meta Llama 3 — Meta AI](https://ai.meta.com/blog/meta-llama-3/)
24. [DeepSeek-V3 Technical Report — arXiv:2412.19437](https://arxiv.org/pdf/2412.19437)
25. [Dissecting Gemini's Tokenizer — Dejan.ai](https://dejan.ai/blog/gemini-toknizer/)
26. [Anthropic tokenizer reverse-engineering — GitHub](https://github.com/javirandor/anthropic-tokenizer)
27. [Anthropic Glossary](https://platform.claude.com/docs/en/docs/about-claude/glossary)
28. [Tokenization is Killing our Multilingual LLM Dream — Hugging Face](https://huggingface.co/blog/omarkamali/tokenization)
29. [AI API Pricing Comparison — IntuitionLabs](https://intuitionlabs.ai/articles/ai-api-pricing-comparison-grok-gemini-openai-claude)
30. [Claude API Pricing — CloudZero](https://www.cloudzero.com/blog/claude-api-pricing/)
31. [LLM Inference Price Trends — Epoch AI](https://epoch.ai/data-insights/llm-inference-price-trends)
32. [How Persistent is the Inference Cost Burden — Epoch AI](https://epoch.ai/gradient-updates/how-persistent-is-the-inference-cost-burden)
33. [AI Cost Report: Token Prices vs. AI Bill — NavyaAI](https://www.navyaai.com/reports/ai-cost-report-token-prices-vs-ai-bill)
34. [LLM Context Window Comparison — Morph](https://www.morphllm.com/llm-context-window-comparison)
35. [Language Model Tokenizers Introduce Unfairness Between Languages — arXiv:2305.15425](https://arxiv.org/pdf/2305.15425)
36. [Do All Languages Cost the Same? — arXiv:2305.13707](https://arxiv.org/pdf/2305.13707)
37. [Why Non-English Speakers Pay More for AI — Medium](https://medium.com/@craigtrim/why-non-english-speakers-pay-more-for-ai-eb6db7d5b67c)
38. [OpenAI Bests Google in Race for Consumer AI Token Consumption — PYMNTS](https://www.pymnts.com/artificial-intelligence-2/2025/openai-bests-google-in-race-for-consumer-ai-token-consumption/)
39. [100 Billion Tokens a Month — 1950.ai](https://www.1950.ai/post/100-billion-tokens-a-month-the-shocking-ai-spending-numbers-forcing-openai-to-rethink-cost-efficien)
40. [Token Tracker and Implications — Robonomics](https://robonomics.substack.com/p/token-tracker-and-implications)
41. [AI Agents Forecast to Boost Tech Cash Flow — Goldman Sachs](https://www.goldmansachs.com/insights/articles/ai-agents-forecast-to-boost-tech-cash-flow-as-usage-soars)
42. [Token Economics: The Atomic Unit of AI Value — FinOps Foundation](https://www.finops.org/insights/token-economics-the-atomic-unit-of-ai-value/)
43. [Prompt Caching Guide — TokenMix](https://tokenmix.ai/blog/prompt-caching-guide)
44. [Reduce LLM Cost and Latency — Maxim AI](https://www.getmaxim.ai/articles/reduce-llm-cost-and-latency-a-comprehensive-guide-for-2026/)
45. [Semantic Caching for LLMs — Maxim AI](https://www.getmaxim.ai/articles/semantic-caching-for-llms-cut-cost-and-latency-at-scale/)
46. [The Strawberry Problem — Hyperstack](https://www.hyperstack.cloud/blog/case-study/the-strawberry-problem-understanding-why-llms-misspell-common-words)
47. [Why LLMs Can't Count the R's in Strawberry — Arbisoft](https://arbisoft.com/blogs/why-ll-ms-can-t-count-the-r-s-in-strawberry-and-what-it-teaches-us)
48. [9.11 or 9.9, Which One is Higher — Towards Data Science](https://towardsdatascience.com/9-11-or-9-9-which-one-is-higher-6efbdbd6a025/)
49. [Why Do LLMs Struggle to Count Letters? — arXiv:2412.18626](https://arxiv.org/pdf/2412.18626)
50. [SolidGoldMagikarp and Other Glitch Tokens — kith.org](https://www.kith.org/words/2023/12/10/solidgoldmagikarp-and-other-glitch-tokens/)
51. [Glitch token — Wikipedia](https://en.wikipedia.org/wiki/Glitch_token)
52. [Cursor Apologizes for Unclear Pricing Changes — TechCrunch](https://techcrunch.com/2025/07/07/cursor-apologizes-for-unclear-pricing-changes-that-upset-users/)
53. [GitHub Copilot is Moving to Usage-Based Billing — GitHub Blog](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)
54. ["What a Joke" — GitHub Copilot Billing Backlash — TechCrunch](https://techcrunch.com/2026/05/30/what-a-joke-github-copilots-new-token-based-billing-spurs-consternation-among-devs/)
55. [The Token Bill Comes Due — TechCrunch](https://techcrunch.com/2026/06/05/the-token-bill-comes-due-inside-the-industry-scramble-to-manage-ais-runaway-costs/)
56. [AI Cost Crisis Hits Tech Giants — Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-cost-crisis-hits-tech-giants-as-employee-tokenmaxxing-backfires-agentic-ai-eats-up-to-1000x-more-tokens-than-standard-ai-sparks-corporate-pullback-at-microsoft-meta-and-amazon)
57. [Agentic AI Pricing Models — getmonetizely.com](https://www.getmonetizely.com/articles/agentic-ai-pricing-models-how-to-choose-between-token-task-and-outcomebased-pricing)
58. [Tokens and Tokenization — bearisland.dev](https://bearisland.dev/posts/tokens-and-tokenization/)
59. [continuedev/continue tokenizer mismatch issue — GitHub](https://github.com/continuedev/continue/issues/878)
60. [Karpathy's Guide to GPT Tokenizers — fast.ai](https://www.fast.ai/posts/2025-10-16-karpathy-tokenizers.html)
61. [Let's Build the GPT Tokenizer — lecture notes, GitHub](https://github.com/karpathy/minbpe/blob/master/lecture.md)
62. [MambaByte — arXiv:2401.13660](https://arxiv.org/abs/2401.13660)
63. [Byte Latent Transformer — arXiv:2412.09871](https://arxiv.org/pdf/2412.09871)
64. [Meta AI Introduces Byte Latent Transformer — MarkTechPost](https://www.marktechpost.com/2024/12/13/meta-ai-introduces-byte-latent-transformer-blt-a-tokenizer-free-model-that-scales-efficiently/)
65. [Meta's New BLT Architecture — VentureBeat](https://venturebeat.com/ai/metas-new-blt-architecture-replaces-tokens-to-make-llms-more-efficient-and-versatile)
66. [Why Your Next LLM Might Not Have A Tokenizer — Towards Data Science](https://towardsdatascience.com/why-your-next-llm-might-not-have-a-tokenizer/)
67. [Stop Taking Tokenizers for Granted — arXiv:2601.13260 / EACL 2026](https://www.arxiv.org/pdf/2601.13260)
68. [SolidGoldMagikarp II: Technical Details — LessWrong](https://www.lesswrong.com/posts/Ya9LzwEbfaAMY8ABo/solidgoldmagikarp-ii-technical-details-and-more-recent)
69. [GlitchProber — arXiv:2408.04905](https://arxiv.org/pdf/2408.04905)
70. [Adversarial Tokenization — arXiv:2503.02174](https://arxiv.org/pdf/2503.02174)
71. [TokenBreak attack — arXiv:2506.07948](https://arxiv.org/pdf/2506.07948)
72. [The TokenBreak Attack — HiddenLayer Research](https://www.hiddenlayer.com/research/the-tokenbreak-attack)
73. [New TokenBreak Attack Bypasses AI Guardrails — The Hacker News](https://thehackernews.com/2025/06/new-tokenbreak-attack-bypasses-ai.html)
74. [The Hidden Attack Surface in Every LLM — Towards AI](https://towardsai.net/p/machine-learning/the-hidden-attack-surface-in-every-llm-how-special-tokens-enable-96-jailbreak-success-rates)
75. [Token Counting Guide — Propel Code](https://www.propelcode.ai/blog/token-counting-tiktoken-anthropic-gemini-guide-2025)

**Note on sourcing**: pricing and token-consumption figures are volatile and several come from third-party aggregators citing primary data (Epoch AI, Goldman Sachs, FinOps Foundation) rather than vendor-published numbers directly — worth re-verifying before quoting any specific dollar figure publicly. A small number of model-version details (e.g. exact Claude tokenizer changes) rely on unofficial reverse-engineering since Anthropic hasn't published its tokenizer specifics.
