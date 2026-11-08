---
title: "AI Hiring Is Up, but Few Postings Ask for Proof. Here Is How a PM Builds It Anyway."
description: "Tech hiring picked up in October and AI job postings keep climbing. Only a small share of AI postings ask for a shipped system. Here is a six-step way for a PM to build that proof."
date: "2026-11-08"
---

Some good news for a change. On November 6, CompTIA published its read of the October jobs data, and it was better than most people expected. The tech industry added about 7,200 jobs. IT occupations across the whole economy added about 26,000. The IT unemployment rate sat at 2.8 percent, against 4.1 percent for the country overall. And active job postings that ask for AI skills reached 366,322, up 6.2 percent from September, with demand for specialized AI positions up 9.8 percent. You can read the [full CompTIA release](https://www.prnewswire.com/news-releases/tech-employment-gains-momentum-in-october-comptia-analysis-finds-302932161.html) yourself.

One month of data proves little. But if you are a PM who has been reading the layoff headlines all year, it is worth sitting with the other half of the picture: companies are hiring for AI work, in volume.

There is a second number I want to put next to it, and it changes what you should do about the first.

## The gap inside the hiring boom

A Boston consulting firm called ColabContent read 5,721 US job postings from LinkedIn public listings and Google Jobs, collected between September 2 and October 6, 2026. Of those, 652 postings from 440 companies were for "AI specialist" roles. Sixty percent of them mentioned AI. Twenty-six percent asked for proof of results. And only 4 percent asked for evidence that the candidate had built, shipped or deployed an AI system. The [ColabContent release](https://www.abnewswire.com/pressreleases/ai-hiring-report-2026-4-percent-of-652-ai-specialist-job-postings-ask-for-evidence-of-a-shipped-ai-system_844322.html) has the method.

Two cautions before I use this. The sample is AI specialist postings, not product manager postings, and the release does not say whether PM roles were included. And a company that does not write "must have shipped an AI system" in a posting still may care about it a great deal in the interview. Postings are a thin signal.

So here is my reading, and it is an opinion, not a finding. Most companies are hiring for AI faster than they have worked out how to test for it. That leaves the candidate with an opening. If the posting does not ask for proof, the first person who walks in with proof stands out, because the interviewer has no checklist to compare it against. They just remember it.

I wrote last June about [a PM market that is recovering on paper but harder to break into](https://productwithrohan.online/blogs/pm-industry-state-report). This is the practical follow-up: what to build so you are not one more résumé with "AI" in the skills line.

## What counts as proof

Proof is not a certificate and it is not a prototype you made in an afternoon. A hiring manager who has seen forty "I built a chatbot" demos will not remember number forty-one.

Proof is a small AI feature that real people used, with numbers about what happened and an honest account of what broke. That is it. Four things have to be true:

1. A real person, not you, used it.
2. You can say how you decided it was good enough to show them.
3. You can say what the numbers were afterward.
4. You can describe one thing that went wrong and what you did.

If you can answer those four in two minutes, out loud, you are ahead of most of the candidates in the pile. Here is how to get there in about a month of evenings.

## Step 1: Pick a problem that is boring and yours

Do not pick "an AI assistant for X." Pick a task that someone does every week, that annoys them, and that you can watch them do. Sorting inbound support emails by urgency. Turning messy meeting notes into a list of decisions. Drafting the first reply to a common customer question.

The test is whether you can name the person and the task in one sentence: "Priya spends forty minutes every Monday sorting renewal emails." If you cannot, the idea is too big. A narrow problem is easier to measure, and measuring is the whole point.

Your own job is often the best source. If you work at a company, look for a task on your team that nobody owns. If you do not, a volunteer group, a friend's small business or a local club will do. You need an actual user and an actual task. You do not need an audience.

## Step 2: Write the spec before you touch a tool

Write one page. What goes in, what should come out, and what a wrong answer looks like. The last part matters most. For the renewal emails, a wrong answer might be marking an angry customer as low urgency. Say that is the failure you fear most, and say why.

This is the step most people skip, and it is the step interviewers probe. When they ask "how did you decide it worked?" the answer lives in this page. I covered the same idea for choosing between models in [A New AI Model Ships Every Week](https://productwithrohan.online/blogs/choose-ai-model-for-your-product-pm-eval-test-set): the PM who wrote the test first can defend the decision later.

## Step 3: Build a test set of 30 real examples

Collect thirty real examples of the task, anonymized, with the answer you would want for each. Thirty is enough to catch embarrassing mistakes and small enough to label by hand in an evening. Include a handful of ugly ones: the email with three questions in it, the note written in half sentences, the case where the right answer is "send this to a human."

Now run whatever tool you are using against the set and score it. Keep the scores. You will want the first run, the fifth run and the last one.

## Step 4: Ship it to five people

Not a hundred. Five. Put it in front of the person from Step 1 and four others who do the same task. Sit with them for the first session if you can. Watch where they hesitate, where they ignore the output, and where they quietly fix it before using it.

That last behavior is gold. Every time a user edits the AI's answer, they are telling you what the model got wrong. Write each edit down. Those edits become new test examples.

If you are building with the AI-assisted tools that let PMs prototype fast, good. That is the opportunity I described in [The PMs Winning Right Now Aren't the Ones Worried About AI](https://productwithrohan.online/blogs/pm-as-builder-ai-tools-opportunity). Just do not stop at the prototype. A prototype nobody used is a screenshot.

## Step 5: Measure two things, honestly

Pick the two numbers that match your spec. For the renewal emails: how often did the urgency label match what Priya would have chosen, and how many minutes did Monday take afterward?

Report them as they are. "Matched Priya on 24 of 30 test emails and 31 of 36 live ones" is a fine result. So is "matched on 19 of 30, and here is why I stopped." A hiring manager reading a story where everything went perfectly will assume you are leaving something out. A story with a real miss sounds like someone who has done the job.

Keep a failure log as you go: date, what happened, what you changed. Three honest entries beat a polished success paragraph.

## Step 6: Write the one-page case

When the month is over, write one page. Use this shape:

- The person and the task, in one sentence.
- What you built and what you chose not to build.
- How you decided it was good enough (point to the spec and the test set).
- The two numbers, before and after.
- The failure that taught you the most, and the change you made.
- What you would do next if you had another month.

Put it where a recruiter can open it in one click. Then practice the two-minute spoken version until it sounds like talking, not reciting. The page gets you the call. The spoken version gets you through the loop.

## What to leave out

A few things make this weaker, and people add them out of nerves.

Skip the architecture diagram unless you built the architecture. Skip claims about "AI transformation." Skip the model name as the headline; interviewers care about your decision more than your tool. And do not inflate the user count. Five real users who changed your mind are worth more than a signup page with a hundred names on it.

## Why this works even when postings do not ask for it

Go back to the numbers. Twenty-six percent of AI specialist postings asked for proof of results. Four percent asked for a shipped system. The other three quarters are still going to interview someone, and in that room the question "tell me about something you shipped" will come up whether or not the posting said so. Hiring managers do not need a line in the posting to be impressed by a straight answer.

And if hiring keeps growing the way October suggests, more candidates will be chasing the same roles with the same skills line. A one-page case with real numbers is a small, cheap way to be the person the interviewer remembers.

You will not control the market. You can control whether, when it asks what you have shipped, you have an answer with numbers in it.

## Go deeper

If you want a structured way to practice the questions that come after the case study, the PM Handbook has five volumes and 337 pages of frameworks and worked answers, and it is at [productwithrohan.online/handbook](https://productwithrohan.online/handbook).
