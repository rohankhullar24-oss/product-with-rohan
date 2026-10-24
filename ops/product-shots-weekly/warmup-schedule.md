# Sending-domain warm-up schedule

Tracks progress warming up `productwithrohan.online` as a bulk-sending domain on Resend. The digest email (Job 5) must never blast its full recipient list in one burst — it sends in small batches, staggered across the day, with the per-run batch cap ramping up over time as the domain builds sender reputation.

**Warm-up start date: 2026-07-12**

## Ramp table

Compute `days_since_start = today − warmup_start_date`. Use the row matching that range to pick `batch_size` (max recipients per individual send) and `gap_minutes` (minimum spacing between batch sends, via Resend's `scheduled_at`).

| days_since_start | batch_size (max recipients/send) | gap_minutes between batches |
|---|---|---|
| 0–6   (week 1) | 5  | 180 (3h) |
| 7–13  (week 2) | 10 | 120 (2h) |
| 14–20 (week 3) | 20 | 90       |
| 21–27 (week 4) | 30 | 60       |
| 28+   (fully warmed up) | 40 | 45 |

Even once fully warmed up (28+ days), keep sending in capped, staggered batches rather than one bulk blast — this is a permanent sending practice, not just a temporary ramp.

## How to use this file

Each time Job 5 actually sends (not skips), after a successful send:
1. Leave `warmup_start_date` unchanged — it never resets as long as sends stay roughly on cadence.
2. No other bookkeeping needed here; `email-log.md` tracks send history/dates. This file only holds the ramp math.

If there's ever a long gap with no sends (e.g. 30+ days idle), reset `warmup_start_date` to today before resuming, since sender reputation decays with inactivity.
