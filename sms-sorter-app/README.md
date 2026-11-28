# SMS Sorter

An Android SMS app that sorts your inbox for you. It's built to replace Microsoft SMS Organizer,
which is being retired on 17 January 2027.

Everything runs on the phone. No messages leave the device.

## What it does

| Area | Feature |
|---|---|
| **Messages** | Tabs for **Personal**, **Transactions**, **Promotions** and **Starred**, with an unread dot on each tab. Search covers all messages. |
| **Sorting** | Uses the TRAI sender suffix: `-P` goes to Promotions; `-S`, `-T` and `-G` go to Transactions. Phone numbers go to Personal. Older headers without a suffix are sorted by their text (OTP, credited, bill, offer, % off …). |
| **Starred** | Star any message from the conversation view (tap the star, or long-press the bubble). **Starred messages survive deletes.** Deleting a conversation removes everything except its starred messages, unless you turn on *Delete starred messages* in the delete dialog. |
| **Delete** | Long-press to select conversations, or select all, then delete. |
| **OTPs** | Shows a one-tap **Copy 482913** button on OTP messages. |
| **Reminders** | Finds bill due dates (mobile, credit card, utilities) and IRCTC train journeys in your messages. *Upcoming* and *History* tabs; *Mark paid* moves an item to History. |
| **Finance** | Money in and money out per month, the accounts and cards seen in bank messages, and a list of transactions. |
| **Default SMS app** | Receive with notifications (promotions go to a silent channel), reply, compose, and "respond via message" for calls. |

## Project layout

```
sms-sorter-app/
├── core/   Pure Kotlin: classifier, OTP / transaction / bill / train / date parsers, delete rules.
│           No Android dependency, so it is unit tested on the JVM.
└── app/    Android app (Kotlin + Jetpack Compose, Material 3, minSdk 29 / Android 10).
```

## Install

Download **[SmsSorter.apk](https://github.com/rohankhullar24-oss/product-with-rohan/releases/download/sms-sorter-app-latest/SmsSorter.apk)** on your phone and open it. CI builds it on every push to `master` (`.github/workflows/sms-sorter-app.yml`); the app's `versionCode` is the CI run number.

## Build it yourself

You need Android Studio (Ladybug or newer) or the Android SDK with platform 35.

1. Open the `sms-sorter-app/` folder (not the repo root: it is its own Gradle build) in Android Studio and let Gradle sync.
2. Plug in your phone with USB debugging on, then press **Run**.
   From the command line: `./gradlew :app:installDebug`
3. On first launch, allow SMS access, then tap **Set** on the banner to make SMS Sorter your default SMS app.
   Android only lets the default SMS app delete messages, mark them read, and receive new ones.

To switch back, go to Settings → Apps → Default apps → SMS app.

> Before 17 Jan 2027, use SMS Organizer's backup to keep anything you care about.
> SMS Sorter reads the phone's own SMS store, so your existing messages show up right away.
> Stars and reminders from SMS Organizer don't carry over.

## Running the tests

```
./gradlew -PcoreOnly :core:test
```

`-PcoreOnly` skips the Android module, so the parser tests run on any machine with a JDK.
The test cases are real-world formats: SBI salary NEFT credits, Income Tax TDS notices,
Airtel postpaid bills, ICICI card statements, IRCTC tickets, UPI debits and OTPs.

## Not done yet

- MMS (picture messages) are received by the system but not shown.
- Manual reminders (the "+" button) and pinned conversations.
- Backup and export of stars and reminders.
- Bank-specific parsing beyond the common formats. Add a test in `core/src/test` when a message is misread.
