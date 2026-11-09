# Open Gym (inside the Reminders app)

The "Open Gym" menu item opens [openGym](https://github.com/DuarteSantos8/openGym), an
open-source gym tracker, running entirely inside the app: no server, no account, the training
log stays on the phone.

## How it is put together

- `build.sh` fetches openGym at a pinned commit, applies `opengym.patch`, builds its phone
  flavour (`VITE_MOBILE=1`) and writes the bundle to `app/src/main/assets/opengym/`. Gradle runs
  it before every build (`buildOpenGym` in `app/build.gradle.kts`). The bundle is **not
  committed** (about 29 MB of generated JavaScript); it needs git, Node 22+ and npm on the
  build machine, which CI has.
- `OpenGymActivity` serves that folder to a WebView from a fixed `https://` origin and never
  touches the network for it.
- `host-bridge.js` is added to the bundle's `index.html`. It mirrors openGym's state to
  `files/opengym_state.json` (covered by the app's Android backup) and restores it when the
  WebView's own storage is empty.

To move to a newer openGym: change `OPENGYM_COMMIT` in `build.sh`, re-apply the patch by hand if
it no longer applies, and regenerate it with `git diff` from the patched checkout.

## What the patch changes

1. **A suggested session for every day** (`frontend/src/lib/daily-suggest.js`,
   `components/DailySuggestion.jsx`, one line in `views/Home.jsx`). On a day with nothing
   planned, Home shows a session for that weekday: Monday push, Tuesday pull, Wednesday legs,
   Thursday core and cardio, Friday upper body, Saturday lower body, Sunday recovery. The
   exercises rotate every calendar week, respect the active equipment profile, and Shuffle
   offers other options. "Start this workout" saves it as a routine pinned to today and starts
   it; "Plan my whole week like this" fills every empty weekday of the plan.
2. **No "this device or my server?" question on first launch** (`store/useStore.js`): hosted
   here it is always this device. Connecting to a server is still in openGym's Settings.
3. **Backup export through Android's "save to" picker** (`lib/mobile.js`), since there is no
   Capacitor shell to open the share sheet.

## What does not work here

There is no Capacitor native layer, so the parts of openGym that need one are inert: system
notifications for the rest timer and reminders, Health Connect, the watch apps, widgets, NFC,
the gym-arrival reminder, printing a plan as PDF, and the export that bundles photos and
videos. The in-app rest timer, sounds, logging, plans, stats and JSON/CSV export all work.

Exercise pictures and animations are missing on purpose (next section).

## Licences

- openGym is **AGPL-3.0-or-later**, Copyright (C) 2026 Duarte Santos. The APK ships a modified
  copy, so its complete corresponding source has to stay available: that is the pinned upstream
  commit plus `opengym.patch` in this public repository. The bundle carries `LICENSE.txt`,
  `NOTICE.md` and `SOURCE.txt` saying so. Keep this repository public, or publish the patch
  elsewhere, for as long as APKs containing it are distributed.
- The **exercise stills and animations** are not AGPL. Gym visual licenses them to openGym for
  use inside openGym only, and upstream's `NOTICE.md` forbids integrating them into another
  app. `build.sh` therefore never downloads them and the app shows openGym's placeholder
  instead. Bundling them would need a licence from gymvisual.com.
