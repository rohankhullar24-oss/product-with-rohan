---
title: "How to Sunset a Feature Without Burning the Users Who Still Depend on It"
description: "Killing a feature is a launch in reverse. Here is a working process for deciding what to cut, who to tell first, and how to move users somewhere better."
date: "2026-11-01"
---

Picture a Monday planning meeting. An engineer says the scheduled-reports feature broke again over the weekend. It has broken four times this year. It was built three years ago for one big customer, it touches the billing pipeline, and every new project that goes near that pipeline gets slower because of it.

Your analytics say 4 percent of accounts used it last month. Someone says the obvious thing: "Can we just turn it off?"

You can. The hard part is everything that comes after you say yes. The 4 percent will not experience this as a cleanup. They will experience it as you taking something away from them, and some of them built a Monday-morning routine on it.

Most PMs prepare for launches and improvise shutdowns. That is backwards. A shutdown has the same parts as a launch (a decision, a message, a rollout, a way to measure it), plus an audience that did not ask for the change. This post walks through the process I would use, in order.

## Start with a cost sheet, not a usage chart

Low usage is the reason people reach for first, and it is the weakest one on its own. A feature used by 4 percent of accounts might be 4 percent of your revenue, or 40 percent, or none. Usage tells you how many people touch the thing. It says nothing about what they pay, what they would do without it, or what it costs you to keep it.

Build a one-page sheet with two columns.

The keep side: how many accounts use it weekly, how much revenue those accounts represent, whether any of them are in your top tier, and whether the feature is a reason people bought. Sales and support will know the last one better than your dashboard does. Ask them directly.

The cost side: engineering hours per quarter on bugs and upkeep, support tickets it generates, the projects it slows down or blocks, and any security or compliance exposure it carries. Engineers tend to undercount the blocked-project cost because it never shows up as a ticket. Ask the team which roadmap items got harder because this feature exists. You will usually get a list on the spot.

If the cost side is mostly annoyance and the keep side includes your biggest accounts, the answer might be to keep it and fix it. If the cost side is large and the keep side is thin, you have a real case. Write down both sides before you form an opinion, because once you have the opinion you will read the numbers to match it.

## Find the people who actually depend on it

The headline number hides two very different groups. Some users clicked the feature once during onboarding and never came back. Others run a weekly process on it.

Split the 4 percent by frequency and by how recently they used it. Then pick ten accounts from the heavy end and look at what they do with it. Open their usage, read their support history, and if you can, call three of them. You are looking for one answer: what would you do if this disappeared on Friday?

You will hear three kinds of reply. "Probably nothing, I forgot we had it" is a user you can move quietly. "I would export it into a spreadsheet myself" is a user who needs an export tool. "I would have to look at other vendors" is the group that decides whether this shutdown is safe. If that last group is more than a handful of accounts, slow down.

A small note on sampling. The loudest users are not always the ones who depend on the feature most. A customer with a dedicated admin who files tickets all day is easy to find. A customer whose finance team quietly runs the report on the first of each month is the one who churns without a word. Pull usage logs, not just inboxes.

## Write the decision down

Once the sheet and the calls are done, put the decision in a short memo: what you are removing, the evidence on both sides, who is affected, what you will offer them, and the date. I wrote about a format that holds up when people revisit decisions in [The Product Decision Memo](https://productwithrohan.online/blogs/how-to-write-product-decision-memo). The reason to write it now is practical. Within a month, someone senior will ask why you killed the thing, and "I remember we looked at the numbers" is a weak answer next to a document with the numbers in it.

Get engineering, support, sales, and whoever owns billing to read it before it goes anywhere else. Each of them will find a problem you did not see. Support will tell you which customers have it written into a contract. Sales will tell you which renewals are open this quarter. You want those surprises in a review, not in a customer's reply to your announcement.

## Choose how hard the landing is

Shutting something off is not one action. It is a ladder, and you can stop on any rung.

First rung: stop promoting it. Remove it from onboarding, pricing pages, and sales decks. No new users find it.

Second rung: close it to new accounts. Existing users keep it, new ones cannot turn it on. This stops the problem from growing while you plan the next steps.

Third rung: freeze it. No new features, bug fixes only, and say so publicly.

Fourth rung: read-only. Users can see and export their data but cannot create anything new.

Fifth rung: full removal.

Many teams jump from the first rung to the fifth because the fifth is what they wanted. The middle rungs buy you something real. Each one shrinks the affected group before the final cut, and each one gives you a signal. If closing the feature to new accounts produces no complaints from sales, that tells you something. If freezing it triggers a flurry of tickets from one industry, that tells you something too.

## Give people a real runway

How long should the notice be? There is no universal number, but there are two checks.

The first is the cycle of the work the feature supports. If users run a report monthly, a three-week notice might give them exactly one chance to adapt. If it is quarterly, they need more than a quarter. Match the notice to the slowest real use of the feature.

The second is contracts. Enterprise customers may have the feature in an agreement. Your legal and account teams need to know before the date is set, not after.

For a sense of scale from a well-known case: [Google announced in March 2013](https://techcrunch.com/2013/03/13/rip-google-reader/) that it would close Google Reader on July 1 of that year, a notice of a little under four months. Google also offered a way to export subscriptions. People still complained loudly, and alternative readers scrambled to absorb the traffic. The lesson is not that four months is the right number. It is that even a decent runway and an export tool do not stop people from being upset about something they used every day. Plan for the upset. You cannot plan it away.

## Build the exit before you announce the exit

The worst version of a shutdown announcement says "we are removing X" and nothing else. The user's first thought is "and what do I do now?" If you do not have an answer, you have just given them a problem and a deadline.

Before you send anything, make sure these exist:

An export that works. Test it with a real account, including a large one. A CSV export that times out at 10,000 rows is not an export.

A replacement path. This might be a different feature in your product, a partner integration, or a plain-language guide to doing the job another way. If you are recommending a competitor's tool, say so. Users will find it anyway, and they will remember who was straight with them.

A named person. Heavy users should have someone to contact. For your top accounts, that is their account manager with a short brief. For everyone else, it is a support macro and a help page that agree with each other.

If the replacement is not ready, move the date. A shutdown with no alternative is a churn event with a calendar invite.

## Write the announcement like a user would want to read it

Keep it short and put the facts first. A structure that works:

What is changing, in one sentence, with the date. Why, in two sentences, in terms the user cares about ("so we can put our engineering time into X" is fine if it is true). What they need to do, in numbered steps. Where to get help.

Skip the language that pretends the loss is a gift. "We are excited to streamline your experience" is the sentence that gets quoted back to you in angry replies. People do not mind bad news nearly as much as they mind being spun.

Send it through the channels your users actually read. In-app banners, email to the admins of affected accounts, and a help-center page. Then send a reminder at the halfway point and one week out. A single announcement is read by a fraction of the people it was meant for.

One more point on timing: tell your own team first, then your biggest affected customers one to one, then everyone else. A top account that learns about the shutdown from a mass email will feel it as a slight, even when the decision is reasonable.

## Watch the right numbers during the wind-down

You are now running a rollout in reverse, so measure it like one. [Product Metrics Every PM Should Know](https://productwithrohan.online/blogs/product-metrics-every-pm-should-know) covers how each metric can mislead you, which matters here, because a few of them will move for reasons unrelated to the shutdown.

Track the migration directly: how many affected accounts have exported, adopted the replacement, or opened a ticket about it. Track the counter-metrics: churn and downgrade rates among affected accounts compared with a similar group that does not use the feature, and support volume per week. And track the adjacent behavior, because a user who loses one feature sometimes uses the whole product less.

Set a trigger in advance. For example: if more than 10 of the top 50 affected accounts have neither migrated nor responded by two weeks before the date, you extend the deadline for them. Deciding that now, in writing, saves you from improvising it under pressure in week eleven.

## Finish the job by deleting the code

This is where many shutdowns quietly fail. The feature is gone from the interface, but the code, the database tables, the feature flags, the background jobs, and the alert rules stay behind. Six months later a new engineer finds it and wonders if it is safe to touch.

Put the cleanup on the roadmap with an owner and a date, before you announce the shutdown. The point of the whole exercise was to free up engineering time and remove a drag on the system. If the code stays, you paid the full price of the shutdown and kept the cost you were trying to shed.

Include a short retrospective too: what you expected versus what happened on churn, tickets, and migration. Next time someone asks "can we just turn it off?", you will have your own data to answer with.

## When someone asks you to bring it back

It will happen. A large customer will ask, or a senior person will relay a complaint. Treat it as new information, not as a referendum on your judgment. Go back to the cost sheet and ask whether anything has changed: is the customer bigger than you thought, is the replacement worse than expected?

Most of the time, nothing has changed except the discomfort, and the right answer is to hold the line politely and offer help with the migration. That is a skill of its own, and I covered it in [The PM Skill of Saying No](https://productwithrohan.online/blogs/pm-skill-of-saying-no). Occasionally the request exposes a real gap, and you should say so, restore a narrow version of the capability, and tell everyone what you learned.

## A checklist to take into your next shutdown

Before the decision: a two-column cost sheet, ten heavy users sampled, three calls made, the decision memo reviewed by engineering, support, sales, and billing.

Before the announcement: the export tested, the replacement path written, a named contact for top accounts, the date checked against contracts and the slowest real use cycle.

After the announcement: reminders scheduled, a migration dashboard live, a pre-agreed extension trigger, and a cleanup ticket with an owner.

Go back to that Monday meeting. If you can say "yes, we can turn it off, on this date, with this export, and here is the person calling our top twelve accounts," you have not just killed a feature. You have shown the 4 percent that you can be trusted with the other 96.
