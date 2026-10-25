---
title: "A New AI Model Ships Every Week. Here's How a PM Decides Which One Your Product Should Use."
description: "Recursive's Flint and Canva's Craft landed within a day of each other this week. Neither tells you which model to pick. A short eval you write yourself does."
date: "2026-10-25"
---

Two model launches landed within a day of each other this week, and each one makes a different pitch.

On October 21, [Recursive released Flint](https://techcrunch.com/2026/10/21/recursive-launches-flint-a-laptop-coding-model-it-says-was-largely-built-by-ai/), a free coding model that runs on a laptop. It has 40 billion parameters but uses only 2.5 billion at a time, ships under the Apache 2.0 license, and Recursive says its own automated research system helped build it in under four months. On October 22, [Canva released Craft](https://www.thurrott.com/a-i/343158/canva-releases-its-first-ai-model-for-images), its first image model, trained from scratch on millions of Canva templates. It debuted fourth on DesignArena, behind three OpenAI models.

If you own an AI feature, your inbox now has two messages in it. Someone on engineering says "should we try Flint?" Someone on design says "Canva has its own model now, are we behind?"

You will get a message like that every week for the rest of your career. The PMs who handle it well do not read more launch posts. They have a small, boring test that turns "which model is best" into "which model is best at our job."

This post is that test.

## The leaderboard answers a question you are not asking

Look at what each launch actually claims. Recursive says Flint beat other models under 50 billion parameters on SWE-Bench Verified, and that only one model scored higher across its own six-test average. Canva says Craft ranks fourth on DesignArena.

Those are real numbers, and they are also numbers about somebody else's tasks. SWE-Bench Verified measures whether a model can fix issues in open-source code repositories. DesignArena ranks images people prefer in head-to-head comparisons. Neither knows what your users type into your product, what your latency budget is, or what a bad answer costs you.

Recursive is straightforward about this, to its credit. It says Flint needs more guidance than the large paid coding assistants and recommends breaking big tasks into smaller steps. That one sentence matters more to a PM than the benchmark. A model that needs smaller steps changes your product design, your prompt layer, and probably your support load.

A leaderboard tells you a model is good. It cannot tell you it is good for you.

## What a PM-sized eval looks like

You do not need a research team. You need an afternoon, a spreadsheet, and the willingness to look at real outputs.

**Step one: collect 50 real inputs.** Pull them from production logs, support tickets, or the prototype your team already tested. Include the ugly ones: the misspelled query, the pasted wall of text, the request that is half in another language. If you have no logs yet, write 50 yourself based on user interviews. Fifty is enough to see a pattern and small enough to read by hand.

**Step two: write down what "good" means before you see any output.** One line per dimension. For a coding assistant that might be "the change compiles, touches only the files it should, and explains itself in two sentences." For an image feature it might be "the text in the image is spelled correctly and the result can be edited afterward." The Canva launch is a nice example here: editable output and accurate text rendering are product requirements that a general photo-quality score does not capture.

**Step three: run every candidate on the same 50 inputs.** Include your current model as the baseline. Hide which model produced which output when you grade, even if that just means shuffling a column. People rate the model they expect to win more kindly.

**Step four: grade pass or fail, not 1 to 10.** Scores of 7 versus 8 start arguments. Pass or fail against your own written definition ends them. Add a third column for "failed badly," meaning wrong in a way a user would notice or a lawyer would care about.

**Step five: price the failures.** A model that passes 92 percent of the time and fails quietly is a different product from one that passes 88 percent and fails loudly with an error the user can retry. Count both.

That is the whole method. It will take longer to schedule the meeting about it than to run it.

## Four things the eval will tell you that the launch post will not

**Whether the cheaper model is good enough.** This is the question behind Flint. A model that runs on a laptop and costs nothing per call is attractive if your users are developers who care about keeping code private. It is a poor fit if your users are non-technical and need the assistant to take a vague request and run with it. Your 50 inputs will show which group you are building for.

**Whether a specialized model beats a general one on your task.** Canva trained Craft on its own library of human-made templates, so it should be good at layouts, text, and editable structure, and the company says exactly that. Whether it beats a stronger general model on your use case is an empirical question. If your product turns text into on-brand marketing graphics, Craft is worth a test. If it turns photos into other photos, probably not.

**Where the failures cluster.** The overall pass rate hides the useful part. You might find that a model handles 45 of your 50 inputs well and falls apart on the five that involve long documents. That is a routing decision: use the cheap model for most traffic and send the long ones elsewhere. You only see that if you read the failures.

**How much of your product is prompt glue.** If swapping the model forces you to rewrite half your prompts, you have learned something about switching cost before you signed anything. Teams that skip this step find out later, at the worst time. If that risk is new to you, our earlier posts on [open-weight models and vendor lock-in](https://productwithrohan.online/blogs/open-weight-ai-models-vendor-lock-in-2026) and [what a vendor's IPO means for teams built on it](https://productwithrohan.online/blogs/anthropic-ipo-vendor-dependency-risk-for-pms) cover the dependency side.

## A worked example with made-up numbers

Say you run product for an invoicing tool, and you are weighing a cheaper model for the feature that drafts follow-up emails to late-paying customers. Your current model is the baseline. The numbers below are invented to show the shape of the exercise, not to describe a real model.

You collect 50 real late-payment cases and define "pass" in one sentence: the email names the right invoice, states the correct amount and due date, and sounds firm without sounding hostile. You run both models and shuffle the outputs before you grade.

The baseline passes 45. The cheaper model passes 42. Then you read the failures. All three of the extra misses are emails where the invoice amount appeared in a table the model had to read. The cheaper model got the tone right every time and the number wrong three times.

Now the decision is concrete. A wrong amount in a payment reminder is a "failed badly" case, because it makes you look careless to a customer who already owes you money. So you do not switch wholesale. You pull the amount out of the table with ordinary code, hand it to the model as plain text, and rerun. If the cheaper model now passes 45, you have a pilot with a clear reason behind it. If it does not, you have saved yourself a bad launch and a few awkward customer calls.

Notice what drove the result: reading the failures, not the pass rate. The headline gap was three emails. The insight was where those three came from.

## Make the eval a habit, not a project

A one-time bake-off goes stale in a month. The version that pays off is small and permanent.

Keep the 50 inputs in a shared file with an owner. When a launch gets forwarded to you, the answer to "should we try it?" becomes "run it on the set and tell me the pass rate." That turns a debate into a Tuesday task, and it protects the team from hype in both directions. It also protects you from your own enthusiasm, which for most PMs is the bigger risk.

Add three or four new inputs every time a real user complaint comes in. After a quarter your set reflects what actually goes wrong in your product, and that is worth more than any public benchmark. Pair it with the same discipline you apply to dashboards: decide the pass definition first, then look. If you want a refresher on how a good-looking number can mislead you, [product metrics every PM should know](https://productwithrohan.online/blogs/product-metrics-every-pm-should-know) is a good companion to this one.

Two cautions. First, do not tune your prompts on the same 50 inputs you use to grade, or you will be proud of a model that has memorized your test. Keep ten aside that nobody tunes against. Second, rerun the baseline each time. Your current model may have changed under you, and a fair comparison needs today's numbers for both sides.

## What to say in the meeting

Next time someone forwards a launch, here is a response that works in most rooms:

"Interesting. Here is our test set and our pass definition. Can you run it on the new model by Thursday? If it beats our current pass rate or matches it at a lower cost, we'll scope a pilot."

It is polite. It does not dismiss the idea, and it does not hand the decision to whoever tweeted the loudest screenshot.

The launch posts will keep coming. Flint and Craft are good examples of how different the pitches have become: one is about running small and private, the other about being trained on a narrow, high-quality library. Both are plausible choices for somebody. Your 50 inputs decide whether that somebody is you.
