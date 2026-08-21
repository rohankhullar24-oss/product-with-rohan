# Reminders (Android)

A native Android app for reminders that **keep nagging you until you confirm them**.

## What it does

- **Reminder types**: one-time tasks, daily, weekly (pick days), monthly (pick day),
  and yearly (birthdays / anniversaries).
- **N times a day**: each reminder can fire at as many times of day as you want
  (e.g. a birthday at 08:00, 11:00, 15:00 and 19:00 — that's the "remind me
  4 times a day" setting).
- **Rings like an alarm clock** (default): at the reminder time the phone plays
  the alarm ringtone on loop, vibrates, and shows a full-screen Done/Snooze
  screen over the lock screen — it keeps ringing until you respond. Each
  reminder can instead be set to a quiet notification.
- **Nagging**: when a reminder fires and you don't tap **Done ✓**, it re-notifies
  every 10/15/30/60/120 minutes (your choice per reminder) until you confirm.
  **Snooze** quiets it for that same interval and labels itself accordingly
  ("Snooze 30m"), so it never contradicts the interval you picked.
- Tapping **Done** on a recurring reminder silences the rest of that day's slots
  and schedules the next occurrence. A one-time reminder is finished for good.
- Survives reboots, time changes and timezone changes (alarms are re-armed).
- **Optional sign-in with cloud sync** (⋮ → Account & sync): email OTP login
  (Supabase). Signed in, your reminders sync across devices — log in on any
  phone and they're there, merged last-write-wins, with deletions propagated.
  Without an account everything still works fully offline and on-device.
- **Journal** (⋮ → Journal): write down free-form thoughts, locked behind
  your device's biometric or screen-lock credential every time you open it.
  Entries are encrypted at rest on-device and follow the same offline-first
  sync as reminders — saved locally even when signed out, and merged to the
  cloud (separately from reminders) when signed in.
  - **Card feed**: each entry shows as a card with a photo thumbnail (if any),
    a text snippet, the date, and small badges for video/audio/location.
  - **Rich entries**: attach a photo or video (camera or gallery), record a
    voice memo in-app, and/or tag the entry with your current location
    (reverse-geocoded to a place name where possible). All attachments are
    encrypted at rest, same as the entry text.
  - **Calendar view** (Journal's own ⋮ → Calendar): jump straight to whatever
    was written on a given day.
  - **Suggestions**: a tray of recent photos from your device and a
    "use current location" shortcut, so an entry doesn't have to start from a
    blank page. (Apple Journal's version also suggests workouts and
    now-playing songs — there's no fitness/music data source in this app to
    draw those from, so only photos and location are offered.)
  - Attachments are device-local only — they don't yet travel through cloud
    sync to a second device, only the entry's text/location does.
- **Survives uninstall**: reminders are included in Android's Google cloud
  backup and device-to-device transfer, and the ⋮ menu has manual
  **Export backup / Import backup** (a JSON file you can keep in Drive,
  Downloads, etc. and re-import after a reinstall or on a new phone).

## Tech

Kotlin, classic Views, `AlarmManager` exact alarms (`setExactAndAllowWhileIdle`),
manifest broadcast receivers, JSON-file persistence. minSdk 26 (Android 8.0),
targetSdk 34.

## Building

Open the repository root in Android Studio and run, or:

```bash
./gradlew :reminder-app:assembleDebug
# APK at reminder-app/app/build/outputs/apk/debug/app-debug.apk
```

This app, `claude-limits-app/` and the shared `usage-core/` library are one Gradle build rooted at
the repository, so the wrapper lives at the root and tasks are module-qualified.

CI builds the APK automatically on every push touching `reminder-app/`
(GitHub Actions → "Build Reminder App APK" → artifact `reminders-debug-apk`).
Download the artifact, unzip, copy `app-debug.apk` to your phone and install
(you'll need to allow installs from unknown sources).

## First-run permissions

1. Allow **notifications** when prompted (Android 13+).
2. If the app shows a red banner about **exact alarms**, tap it and enable
   "Alarms & reminders" — otherwise Android may delay reminders.
3. For the most reliable nagging, exclude the app from battery optimisation
   (Settings → Apps → Reminders → Battery → Unrestricted).
