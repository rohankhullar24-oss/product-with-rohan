# Reminders (Android)

A native Android app for reminders that **keep nagging you until you confirm them**.

## What it does

- **Reminder types**: one-time tasks, daily, weekly (pick days), monthly (pick day),
  and yearly (birthdays / anniversaries).
- **N times a day**: each reminder can fire at as many times of day as you want
  (e.g. a birthday at 08:00, 11:00, 15:00 and 19:00 — that's the "remind me
  4 times a day" setting).
- **Nagging**: when a reminder fires and you don't tap **Done ✓**, it re-notifies
  every 10/15/30/60/120 minutes (your choice per reminder) until you confirm.
  **Snooze 1h** quiets it for an hour.
- Tapping **Done** on a recurring reminder silences the rest of that day's slots
  and schedules the next occurrence. A one-time reminder is finished for good.
- Survives reboots, time changes and timezone changes (alarms are re-armed).
- All data stays **on the device** — no account, no server, works offline.
- **Survives uninstall**: reminders are included in Android's Google cloud
  backup and device-to-device transfer, and the ⋮ menu has manual
  **Export backup / Import backup** (a JSON file you can keep in Drive,
  Downloads, etc. and re-import after a reinstall or on a new phone).

## Tech

Kotlin, classic Views, `AlarmManager` exact alarms (`setExactAndAllowWhileIdle`),
manifest broadcast receivers, JSON-file persistence. minSdk 26 (Android 8.0),
targetSdk 34.

## Building

Open `reminder-app/` in Android Studio and run, or:

```bash
cd reminder-app
./gradlew assembleDebug
# APK at app/build/outputs/apk/debug/app-debug.apk
```

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
