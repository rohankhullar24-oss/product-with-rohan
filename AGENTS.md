<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Codebase map

Read `ARCHITECTURE.md` before exploring the codebase for the first time in a
session — it maps the web app's route/lib structure, the Android apps, and
which external services (Supabase, Anthropic, Razorpay, Resend) each area
depends on. Update it when you add or restructure a top-level area.

# Watch Sync works. Do not "fix" it.

`reminder-app/.../WatchSyncActivity.kt` talks to a Noise ColorFit Pulse 2 Max
over BLE. **As of 2026-09-07 this is verified working on real hardware**:
OS-level pairing, the vendor bind handshake, time sync, notifications to the
watch, battery read, and real-time heart rate all succeed.

Getting there took an unreasonable number of debugging sessions, most of them
spent on theories that were wrong. **If you are here because someone said the
watch won't pair, assume the code is right and start with the checklist
below.** Do not begin by rewriting the bind flow.

1. **Check which APK is installed.** Account screen → bottom → `versionCode`
   (= the CI run number that built it). Most of this feature's history was
   lost to testing against a build that didn't contain the fix. Neither the
   release date nor the asset date tells you what is in an APK.
2. **Read the app's own on-screen log, line by line.** The bug that consumed
   the whole investigation was plainly visible there for weeks: one command
   never received a reply. Reading that log is what solved it — not
   decompiling, not new instrumentation.
3. **Only then** read `reminder-app/WATCH_SYNC_PROTOCOL.md`, which documents
   the protocol, the root cause, and every theory that turned out to be wrong
   so you don't re-test them.

## Rules for this code — breaking any of these silently breaks pairing

- **Never queue a vendor command directly after one the watch must do real
  work for.** Chain it off that command's *reply*, never its write
  completion. The command queue serializes *our GATT writes*; it knows
  nothing about the watch's processing time. Violating this is what broke
  binding: cmd 48 was interrupting cmd 18, and the watch drops an interrupted
  command's reply outright.
- **Always `pushPendingResponse` for any command that gets a reply.** Without
  it there is no way to notice a command went unanswered.
- **A "busy" reply is data loss, not a retry annoyance.** It means an
  in-flight command was just dropped. Treat it as a send-sequencing bug.
- **Always `connectGatt(..., BluetoothDevice.TRANSPORT_LE)`.** The 3-arg
  overload means `TRANSPORT_AUTO`, and this watch is dual-mode.
- **Pairing is required.** Nothing works until the watch is OS-bonded.

Changes here need a hardware test before they are called done — there are no
unit tests for a BLE peripheral, and this sandbox has neither the watch nor a
local Android build. Say plainly when something is CI-compiled but unverified.
