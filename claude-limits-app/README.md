# Claude Limits (Android)

A home-screen widget showing your Claude subscription limits, which **rings like an alarm
clock when a window resets**.

## What it does

- **Widget on the home screen**: the 5-hour session window and the weekly cap as two bars,
  each with a percentage, a countdown, and the wall-clock reset time.
- **Rings on reset**: at each rollover the phone plays the alarm ringtone on loop, vibrates,
  and shows a full-screen Dismiss screen over the lock screen — the same alarm stack as the
  Reminders app in this repo.
- **No computer needed, ever.** You sign in to claude.ai inside the app; the session lives on
  the phone.
- **Refreshes every 15 minutes** in the background, plus a tap-to-refresh button on the widget.
- Survives reboots, time changes and timezone changes — the alarms are re-armed.

## Setup

1. Install the APK and open the app.
2. Tap **Sign in** and log in to claude.ai in the window that appears.
3. Add the **Claude Limits** widget to your home screen.

That's it. There is no token to copy and nothing to run on a computer.

### Permissions worth granting

1. Allow **notifications** when prompted (Android 13+).
2. If the app shows a red banner about **exact alarms**, tap it and enable "Alarms & reminders" —
   otherwise Android may fire the reset alarm late.
3. For the freshest numbers, exclude the app from battery optimisation
   (Settings → Apps → Claude Limits → Battery → Unrestricted). This affects how current the
   widget looks, not whether the alarm rings — reset alarms are exact either way.

## How it gets the numbers

Anthropic publishes **no API for subscription usage limits**. The documented `anthropic-ratelimit-*`
headers describe API-key rate limits, which are a different thing entirely, and requests for an
official endpoint have been closed without one.

So this app reads the same data the usage page in the browser does: it replays
`GET /api/organizations/{org}/usage` on claude.ai with the session cookies harvested from the
in-app WebView login, and parses the `five_hour` and `seven_day` windows out of the response.

**This is undocumented and can break without notice.** When it does, the widget keeps showing the
last good reading with its age rather than blanking, and drops to "Tap to sign in" if the session
is actually dead.

### Known failure mode

Cloudflare's clearance cookie is tied to your network path and browser agent, so it can be
invalidated by switching between Wi-Fi and cellular. The app handles this by re-solving the
challenge silently in a background WebView and retrying once; you should only be asked to sign in
again when the session itself expires.

## Tech

Kotlin, classic Views, `HttpsURLConnection` + `org.json` — the same dependency-light approach as
`reminder-app/`. Background refresh via WorkManager, reset alarms via `AlarmManager`
(`setExactAndAllowWhileIdle`), session cookies in Keystore-backed `EncryptedSharedPreferences`
with `allowBackup="false"`. minSdk 26 (Android 8.0), targetSdk 34.

## Building

Open `claude-limits-app/` in Android Studio and run, or:

```bash
cd claude-limits-app
./gradlew assembleDebug
# APK at app/build/outputs/apk/debug/app-debug.apk
```

CI builds the APK on every push touching `claude-limits-app/`
(GitHub Actions → "Build Claude Limits APK" → artifact `claude-limits-debug-apk`).
Pushes to `master` also publish `ClaudeLimits.apk` to a rolling prerelease you can download
straight from the phone.

## Credit

The approach — WebView cookie harvest plus the internal usage endpoint — follows what
[utaysi/claude-usage-widget](https://github.com/utaysi/claude-usage-widget) and
[G-biggy/claude-pulse-android](https://github.com/G-biggy/claude-pulse-android) worked out.
This is an independent implementation; the reset alarms are the part those don't have.
