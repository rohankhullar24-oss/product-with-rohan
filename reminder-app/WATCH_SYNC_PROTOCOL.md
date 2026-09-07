# Watch Sync: Noise ColorFit Pulse 2 Max protocol reference

Handoff document for the Watch Sync feature in `reminder-app/`. Everything here
was reverse-engineered by decompiling the real **NoiseFit** Android app (the
watch's official companion app) — not guessed. If you're picking this up in a
new chat with no memory of how we got here, this file is self-contained: it
tells you what's confirmed, what's implemented, what's still unknown, and
exactly how to find out more.

**This file now covers two unrelated watches.** Everything through "Full
Apricot command-id catalog" below is the Pulse 2 Max's `zhbraceletsdk`
protocol — read that first if that's the watch on hand, and see the warning
in `AGENTS.md` before touching its bind flow, which took many sessions to get
right. A second, different watch (**FireBoltt 100**) showed up later, speaking
a different vendor protocol ("DaFit") entirely — see "FireBoltt 100 (DaFit
protocol)" near the end of this file. Don't mix the two up: they use different
GATT services, different framing, and different command ids.

## TL;DR for a new session

- The watch is a **Noise ColorFit Pulse 2 Max**. It does **not** implement any
  standard Bluetooth GATT service (not Current Time Service, not Battery
  Service). Everything goes through one private vendor service.
- That vendor service is a real, documented (well — decompiled) **protobuf
  protocol**, not raw undocumented bytes. Every message type has exact field
  numbers we've read out of the vendor SDK's generated Java source.
- Implementation lives in
  `reminder-app/app/src/main/java/online/productwithrohan/reminders/WatchSyncActivity.kt`.
  It hand-encodes/decodes the protobuf wire format directly (no protobuf
  runtime dependency) since we only need a handful of fields.
- **Pairing and binding WORK.** Verified end to end on hardware 2026-09-07.
  The full cmd 16 → 17 → 18 → 48 sequence completes, cmd 18 gets its reply,
  and notifications, battery (91%) and real-time heart rate all respond. It
  took an unreasonable number of sessions to get here; the section below says
  exactly why so nobody re-derives it. **Read "The bug that cost the most:
  cmd 48 vs cmd 18" before touching the bind flow.**
- **Implemented and confirmed on hardware:** time sync, push-notification-to-
  watch, battery read, app-level device binding, real-time heart rate, and a
  remembered watch that auto-reconnects when the screen opens.
- **Not yet implemented:** steps / distance / calories / sleep / SpO2
  *history* — these go through a different, more complex "big data" chunked
  transfer (CHAR_03) that hasn't been fully reverse-engineered. See "What's
  NOT done yet" below.

## The bug that cost the most: cmd 48 vs cmd 18

**Read this before changing anything in the bind flow.** Several sessions were
spent on the wrong suspects — the cmd 18 token format, the Noise account user
ID, cmd 19, OS bond transport — because the real cause was a race we had
introduced ourselves, and the app had no instrumentation that could see it.

**The symptom:** the bind sequence completed with `bindCheckResult == SUCCESS`,
but a fresh cmd 16 always came back `bound=false`, forever.

**The cause:** `handleBindVerifyResponse` sent cmd 18 (the bind confirmation)
and then immediately queued cmd 48 (time sync), on the reasoning that "the
vendor command queue already serializes them". That reasoning is wrong. The
queue serializes **our GATT writes**; it knows nothing about how long the
**watch** takes to process a command. cmd 18 registered no pending response
and waited for nothing, so the queue drained the instant its chunk write
completed and cmd 48's header reached the watch mid-bind:

```
App-level bind confirmation sent (cmd 18...)
Sent to watch                            <- cmd 18 header
Watch accepted the command header — sending 1 packet(s).
Sent to watch                            <- cmd 18 chunk
Sent to watch                            <- cmd 48 header, immediately
Vendor cmd 48 busy — retry 1/5           <- watch still busy with cmd 18
```

cmd 16 and cmd 17 each completed `header → accepted → chunk → REPLY`. cmd 18
never did. Commit `624fa93` had **already** established the consequence —
*"the collision doesn't just cost a retry, it appears to make the watch drop
the interrupted command's reply outright"* — and applied the fix to cmd 16
only. So the one command whose entire job is to persist the bind was the one
being cut off, on every single attempt.

**The fix (#99):** cmd 18 is registered via `pushPendingResponse` and handled
by `handleBindResultResponse`, which is what triggers time sync. cmd 48 can no
longer reach the watch mid-bind. A 6s grace-period fallback still sends time
sync if the watch never answers cmd 18. cmd 48 is registered on the FIFO too.

**Proof it worked**, first time in the whole investigation:
```
Watch reply (raw): 08 12 A0 06 00
Vendor response: commandId=18 source=pending-request poppedPending=18
Watch answered the bind confirmation (cmd 18) — bind settled, sending time sync now.
```
`08 12 A0 06 00` is `SEWear{ id:18, field 100: 0 }` — the same success shape as
cmd 48's `08 30 A0 06 00`.

**Rules that follow from this, for any new command:**
1. **Never queue a command directly after one that expects the watch to do
   real work.** Chain it off the first one's *reply*, not its write completion.
2. **Always `pushPendingResponse` for anything that gets a reply.** cmd 18 and
   cmd 48 were both missing from the FIFO, which is why cmd 48's own reply
   logged as `source=unsolicited poppedPending=-1` — and why nothing could
   detect that cmd 18 was never answered.
3. **A "busy" reply is not a retry annoyance, it is data loss.** It means an
   in-flight command just got dropped. Treat it as a bug in send sequencing,
   not something the busy-retry mechanism handles for you.

### Other things this investigation got wrong, recorded so they aren't repeated

- **"GATT works fine without bonding."** An earlier revision of this doc said
  the watch doesn't gate its characteristics behind encryption. False:
  reported on hardware, nothing works until the watch is paired. The likely
  mechanism is that the CCCD write enabling CHAR_01 notifications needs an
  encrypted link. See "Pairing — two separate layers".
- **`connectGatt()` transport.** The 3-arg overload means `TRANSPORT_AUTO`,
  which on this dual-mode watch (it also does Bluetooth Calling over classic
  BR/EDR) can leave Android negotiating the wrong transport. Always pass
  `BluetoothDevice.TRANSPORT_LE`.
- **"cmd 17 requires a user tap."** It does not. The reply arrives immediately
  and carries device metadata (model `30006`, MAC, `10005`, short and full
  names). Whatever makes this watch show its own confirmation UI, we have
  never sent it. cmd 17 is a device-info exchange.
- **The bind flag gates nothing.** `sendTestNotification`,
  `requestVendorBattery` and `toggleRealTimeHeartRate` never read
  `bindConfirmed`. Time was spent building instrumentation to measure a flag
  that controlled no feature — see PR #95, which was reverted wholesale.
- **Duplicate connects.** `connectingDeviceAddress` is cleared at
  `STATE_CONNECTED`, so it only ever guarded the in-flight window; a re-fired
  selection opened a second `connectGatt` and tore down the live one. A
  hardware log showed three full connect cycles before services were
  discovered once. `connectedDeviceAddress` now guards the connected case.

## Which build are you running?

This is the first thing to check when "nothing works", and it burned a lot of
time before anyone checked it. There are **two** APK releases, and for most of
early September 2026 neither of them could talk to the watch:

| Release | Built from | Trap |
|---|---|---|
| `reminder-app-latest` | `master`, on push | Sounds like the one you want, and its APK *was* freshly rebuilt — but only ever from `master`, which lagged two PRs behind. Through 2026-09-06 it served #93's code, predating #94's fix for commands never being delivered at all. |
| `reminder-app-preview` | any branch push/PR | Current with the branch work, but through 2026-09-07 it carried #95's debugging experiment, which **deliberately disconnected the watch ~2.5s after a successful bind**. |

So the app appeared totally dead on one build and appeared to connect-then-drop
on the other, for two completely unrelated reasons. Neither was a protocol bug.

Note the shape of the `-latest` trap, because a release date will not reveal
it: the GitHub Release's `published_at` stays pinned to when the *tag* was
first created (2026-07-26 here), while CI replaces the APK asset in place on
every push to `master`. So the release page can look ancient while serving a
day-old build, or look freshly updated while serving code that is two merges
behind the actual work. **Neither the release date nor the asset date tells you
what's in the APK — only `versionCode` does.**

**How to tell which build is on the phone:** the Account screen shows
`versionName`/`versionCode` at the bottom — the only place the app surfaces
this. `versionCode` is the `GITHUB_RUN_NUMBER` of the CI run that built it, so
it maps 1:1 onto a workflow run (and therefore a commit) in
`.github/workflows/reminder-app.yml`'s run history.

**Lesson worth keeping:** before debugging watch behaviour, confirm the phone
is running the commit you think it is. A protocol theory tested against the
wrong APK produces confident, worthless conclusions.

## How this was derived (repeatable if you need more)

1. User extracted the installed NoiseFit APK from their phone (via an "APK
   Extractor" app) and pulled out its `classes*.dex` files (APKs are zips;
   the dex files are the actual bytecode, everything else is assets/images
   that don't matter for protocol work).
2. Decompiled with **jadx** (`jadx -d out --no-res classes*.dex`) — produces
   readable-ish Java. The vendor SDK's own class/method names are NOT
   obfuscated (only some unrelated app code is), so this reads almost like
   real source.
3. Found the SDK is `com.zhapp.ble.*` (repackaged as `com.zjw.zhbraceletsdk`
   in some contexts) — a white-label Chinese smartwatch BLE SDK. The app also
   bundles an unrelated `com.crrepa.ble.*` SDK (CRRepa) for other watch
   models Noise sells — **don't confuse the two**; this watch uses the
   `zhapp`/`zh` one.
4. Key files to re-read if you need more detail than this doc has:
   - `com/zhapp/ble/ControlBleTools.java` — the public API surface. Every
     method logs its own name via `BleLogger.d("ControlBleTools", "methodName()...")`,
     and immediately below that log line you'll find
     `ParsingStateManager.addSendCmdStateListener(<CMD_ID>, ...)` — that's
     how to find a feature's numeric command id.
   - `com/zhapp/ble/a.java` — the payload builder. It's one abstract class
     `a` (top-level, ~4-space indented methods) with ONE nested class
     `a.C0474a` (~8-space indented methods) inside it. **The outer class `a`
     is the "Apricot" protocol** (what this watch uses); **`a.C0474a` is a
     different protocol variant ("Berry", used by other watch models)** —
     don't mix them up. A call site like `a.a(178, ...)` means "outer class,
     ignore anything inside C0474a with a matching-looking signature";
     `a.C0474a.a(9, 2, ...)` means the nested one. jadx's indentation is
     reliable for telling them apart even when naive brace-counting isn't.
   - `com/zh/ble/wear/protobuf/*.java` (e.g. `WearProtos.java`,
     `SystemTimeProtos.java`, `NotificationProtos.java`, `DeviceProtos.java`,
     `FitnessProtos.java`, `SportingProtos.java`) — the actual generated
     protobuf message classes. Field numbers are `public static final int
     X_FIELD_NUMBER = N` constants; wire type/encoding is confirmed by
     reading each message's `writeTo(CodedOutputStream)` method (look for
     `writeUInt32`/`writeSInt32`/`writeBool`/`writeString`/`writeMessage`).
     **Don't trust the field name alone — always check `writeTo` for the
     real wire type**, e.g. `offset` looks like a plain int but is actually
     zigzag-encoded (`writeSInt32`).
   - `com/zhapp/ble/BluetoothService.java` — the actual BLE plumbing: which
     characteristic each protobuf message gets written to / read from, and
     the multi-packet reassembly logic for large responses.

If you need to go deeper (e.g. the steps/HR history protocol below), ask the
user for the NoiseFit APK's dex files again and repeat this process — the
decompiled source itself is NOT committed to this repo (it's ~100MB+ and not
worth bloating the repo with someone else's proprietary binary); this
document is the durable artifact instead.

## BLE surface (confirmed on real hardware + decompiled source)

- Service: `16186f00-0000-1000-8000-00807f9b34fb`
- `16186f01` — **CHAR_01**: notify channel, watch → phone. Standard
  command *replies* land here (see framing below).
- `16186f02` — **CHAR_02**: write channel, phone → watch. Every command
  (time sync, notifications, requests like "get battery") is written here.
- `16186f03` — **CHAR_03**: the "big data" channel (historical fitness
  data, OTA, etc.) — different, more complex framing than CHAR_01. Not
  implemented yet.
- `16186f04`, `16186f05` — seen in the GATT dump, used for other things
  (Alexa data, OTA) per the decompiled source. Not investigated.

### Write framing (phone → watch, CHAR_02)

Every write is: **2-byte little-endian packet index**, then the payload
chunk. For a single-packet message (anything that fits under MTU-2 bytes,
true for every message we've implemented so far): `[0x01, 0x00] + payload`.
Larger payloads get split into `ceil(len / (mtu-2))` chunks, each prefixed
with its 1-based index (`com.zhapp.ble.a.a(byte[] chunk, int packetIndex)` in
the decompiled source, called from `BluetoothService`'s send loop). We
haven't needed multi-packet writes yet — everything we send so far is tiny.

### Read framing (watch → phone, CHAR_01) — confirmed, implemented

Decompiled from `BluetoothService.i(byte[])`. On receiving a notification on
CHAR_01:

1. **Header packet**: first 4 bytes are all `0x00`, followed by a 2-byte
   little-endian **packet count**. On receiving this, the phone must write a
   fixed 6-byte ACK back to CHAR_01: `[0, 0, 1, 1, 0, 0]` (this is
   `com.zhapp.ble.a.d()` in the decompiled source) — this tells the watch
   "ready, send the data".
2. **Data packets**: 2-byte little-endian **1-based packet index**, then the
   payload chunk for that index.
3. Once all packets for the expected count have arrived, write another fixed
   6-byte ACK: `[0, 0, 1, 0, 0, 0]` (outer-class `com.zhapp.ble.a.a()` — note:
   this is a *different* zero-arg overload of the same-named method, not a
   typo) — tells the watch "all received".
4. Concatenate all packet payloads **in index order** → that byte array is a
   serialized `SEWear` protobuf message. Parse it.

This exact flow is implemented in `WatchSyncActivity.handleVendorResponsePacket()`.

### The `SEWear` envelope

Every message in both directions is wrapped in one top-level message:

```
SEWear {
  id = 1            (uint32, required — the command id, e.g. 48 for setTime)
  <payload>         (oneof, one of the fields below — field number IS the routing key)
}
```

Confirmed `payload` field numbers (from `WearProtos.SEWear.writeTo`):

| Field # | Name | Message type |
|---|---|---|
| 2 | (quick int) | plain uint32, not a message |
| 3 | bindAccount | `BindAccountProtos.SEBindAccount` |
| 4 | device | `DeviceProtos.SEDevice` |
| 5 | systemTime | `SystemTimeProtos.SESystemTime` |
| 6 | userSettings | `UserProfilesProtos.SEUserSettings` |
| 7 | watchFace | `WatchFaceProtos.SEWatchFace` |
| 8 | sporting | `SportingProtos.SESporting` |
| 9 | fitness | `FitnessProtos.SEFitness` |
| 10 | weather | `WeatherProtos.SEWeather` |
| 11 | largeFile | `LargeFileProtos.SELargeFile` |
| 12 | microFunction | `MicroFunctionProtos.SEMicroFunction` |
| 13 | notification | `NotificationProtos.SENotification` |
| ... | (more exist — bleConnectParmeterConfig, factory, aleax, etc.) | see `WearProtos.java` for the rest if needed |

## Confirmed message specs (implemented and shipped)

### Time sync — cmd id **48**

```
SEWear{ id: 48, systemTime: SESystemTime{ timeSet: SETimeSet{
  timestamp: <unix seconds>       // field 1, uint32, plain varint
  offset:    <quarter-hours>      // field 2, sint32, ZIGZAG varint — not plain!
  timeFormat: <bool, optional>    // field 3, bool — we don't set this
} } }
```
`SESystemTime.timeSet` is field 1 (message). `offset` = timezone offset in
units of 15 minutes (`totalOffsetMinutes / 15`), sign preserved, zigzag-encoded.

### Push notification to watch — cmd id **179**

```
SEWear{ id: 179, notification: SENotification{ appNotification: SEAppNotification{
  appName: <string>       // field 1
  pageName: <string>      // field 2 — we don't set this
  title: <string>         // field 3
  text: <string>          // field 4
  tickerText: <string>    // field 5 — we don't set this
} } }
```
`SENotification.appNotification` is field 2 (message). All string fields are
plain `writeString` (length-delimited UTF-8).

There's also a **system notification** variant (calls/missed calls), cmd id
**178**, message `SESystemNotification` (fields: `phoneNumber`,
`contactsInfo`, `messageText`, `type` enum `CALL`/`MISS_CALL`/`MESSAGE`) at
`SENotification.systemNotification` — not implemented, same pattern applies
if needed.

### Battery read — cmd id **33** (request/response round trip)

Request: `SEWear{ id: 33 }` — no payload, just the id field.

Response (arrives via the CHAR_01 framing above):
```
SEWear{ device: SEDevice{ deviceBatteryStatus: SEDeviceBatteryStatus{
  capacity: <uint32 percent>      // field 1, plain varint
  chargeStatus: <enum>            // field 2 — not decoded
} } }
```
`SEDevice.deviceBatteryStatus` is field 2 (message). `SEWear.device` is field 4.

### Pairing — two separate layers, both required

Confirmed on real hardware: the watch only shows itself as visibly "paired"
when **both** of these happen. Neither one alone is enough.

**Layer 1 — OS-level Bluetooth bonding.** Standard Android API, nothing
vendor-specific: `BluetoothDevice.createBond()`. This is what makes the
watch display its native **"Pair with this device?"** confirmation on its
own screen (checkmark/X) — the user must physically confirm it there.
Listen for `BluetoothDevice.ACTION_BOND_STATE_CHANGED` to track
`BOND_BONDING` → `BOND_BONDED`.

**This layer is not optional, and an earlier revision of this doc was wrong
to imply otherwise.** It used to claim GATT reads/writes "work fine without
bonding (it doesn't gate its characteristics behind encryption)". Reported on
hardware 2026-09-07: until the watch is paired, **nothing happens at all** —
no responses to any command. The most likely mechanism is that the CCCD write
enabling CHAR_01 notifications requires an encrypted link, so unbonded it
appears to succeed while the watch never sends a single notification, which
presents to the user as a totally dead app. That is also consistent with #94's
"silent notification-registration failure blocking all responses".

Treat pairing as the first thing to get right, not a cosmetic extra.

**Transport matters.** Use `connectGatt(context, autoConnect, callback,
BluetoothDevice.TRANSPORT_LE)` — the 4-arg overload, public since API 23 — not
the 3-arg one, which defaults to `TRANSPORT_AUTO`. This watch is dual-mode (it
also does Bluetooth Calling over classic BR/EDR), so AUTO can leave Android
negotiating the classic transport for a device that was only ever found by BLE
scan, and a `createBond()` that follows then bonds over that same wrong
transport. Symptom: "pairing failed" on the watch's own screen.

**Timing matters**: `createBond()` must be called only after GATT actually
reaches `STATE_CONNECTED` (in `onConnectionStateChange`), not right after
firing `connectGatt()`. Calling it while a `connectGatt()` is still in
flight is a known-flaky pattern on Android's BLE stack — on some devices it
silently no-ops or transitions straight to `BOND_BONDED` without the watch
ever showing its own confirmation prompt, which reads to the user as "the
app says paired but the watch doesn't agree." Symptom seen on real
hardware; fixed by moving the `requestBondIfNeeded()` call from
`onDeviceSelected()` into `onConnectionStateChange`'s `STATE_CONNECTED`
branch.

Real app orchestration reference: `com.noise.wear.bt.BTHelper` also calls
`createBond`, but via reflection with an explicit transport argument
(`createBond(int transport)`, transport=1/BR-EDR) — that class is for
**Bluetooth Calling (HFP audio) pairing**, a different feature, and uses
classic Bluetooth discovery (`BluetoothAdapter.startDiscovery()`/
`ACTION_FOUND`) rather than BLE scanning. Don't confuse the two — Watch
Sync uses the plain public `createBond()` (transport auto-detected),
matching the data-sync pairing flow, not the calling one.

**Layer 2 — app-level "device binding"** — cmd 16 + cmd 18. This is
`com.zhapp.ble`'s own concept, separate from OS bonding, and is what
`com.noisefit_zhsdk.handler.ZhConnectHandler` (the real app's connect
handler for this exact watch family) actually does:

```
Request:  SEWear{ id: 16 }                                    — requestDeviceBindState
Response: SEWear{ bindAccount: SEBindAccount{ bindCheck: SEBindCheck{
            bindCheckResult: <enum>   // field 3 — THIS is the gating field, not bindRandomKey
          } } }
```
`SEBindCheckResult`: `SUCCESS=0`, `REFUSE=1`, `OVER_TIME=2`,
`VERIFICATION_FAILED=3`. If and only if `bindCheckResult == SUCCESS`, the
real app generates its **own random token locally** — `UUID.randomUUID()
+ Random(10,10000) + userId`, then `.substring(30)` — it is NOT derived
from anything the watch sent — and confirms with:

```
SEWear{ id: 18, bindAccount: SEBindAccount{ bindResult: SEBindResult{
  bindResultType: SUCCESS(0)      // field 1, enum SEBindResultType
  userId: <locally-generated token>  // field 2, string
  phoneType: ANDROID(0)           // field 3, enum SEPhoneType (ANDROID=0, IOS=1)
} } }
```
`SEBindAccount.bindResult` is field 3. Cmd **17** ("bindDevice") is a red
herring for this step — the real app only ever calls it with a `null`
string argument (it's used to *kick off* the cmd-16 check internally, not
to confirm anything) — an earlier version of this doc/implementation
incorrectly had cmd 17 echoing the response's `bindRandomKey` field back;
that was never confirmed against real consumer code and has been replaced
with the above, which is.

### The bind-persistence question — RESOLVED (#99)

**Historical.** Kept because the elimination work below is still valid and
saves anyone re-doing it — but the answer is at the top of this document:
cmd 48 was interrupting cmd 18, so the bind confirmation never completed. See
"The bug that cost the most: cmd 48 vs cmd 18".

The symptom was: the cmd 16 → 17 → 18 sequence completes with
`bindCheckResult == SUCCESS`, but a fresh cmd 16 afterwards still answers
`bound=false` — even across a clean disconnect/reconnect under a stable OS
bond, and even using the real Noise account user ID in cmd 18's token. The
official NoiseFit app binds this same watch successfully, so the watch was
fine and our reimplementation was missing something. It was.

**Ruled out, each by reading decompiled source or by a hardware log:**
- cmd 16/17/18 payload construction — byte-for-byte matches the SDK's own
  builders (`a.java`'s `J0`, `a(int)`, `d(int,String)`).
- The cmd 18 token formula (`UUID` + `Random(10,10000)` + `userId`, then
  `.substring(30)`) — matches `ZhConnectHandler.T()` exactly.
- cmd 19 (`verifyUserId`) as the missing step — it is only ever called from
  `h0()`, cmd 16's `bound=true` branch, to replay an already-stored token on
  reconnect. It is never called after a fresh cmd 18. The official app's own
  `h0()` false-branch has *no* recovery path: it calls the situation
  "bindstatus failed" and disconnects. The real app would hit the same dead
  end in this exact scenario.
- OS-level bond instability — was a genuine confound for one round (a
  reconnect triggered a spurious `createBond()`); fixed by the
  `connectingDeviceAddress` guard and by handling `BOND_BONDING` separately
  from `BOND_NONE`. Verified on hardware: the bond survives
  disconnect/reconnect.

**Critically: `bindConfirmed` gates no feature.** `sendTestNotification`,
`requestVendorBattery` and `toggleRealTimeHeartRate` never read it. A watch
answering `bound=false` still accepts notifications, battery reads and
real-time heart rate. Several sessions were spent building instrumentation to
measure this flag before anyone checked whether it controlled anything. It
does not. Treat it as a curiosity, not a blocker.

**What actually solved it — and the lesson.** Not more source-reading. The
answer came from reading the app's **own hardware log line by line** and
noticing that cmd 18 was the only command in the sequence that never got a
reply. Every ruled-out item above was found by decompiling; the actual bug was
visible in a log we had been generating for weeks.

A BLE HCI snoop log was the planned next step and was never needed. Recorded
in case a future protocol question genuinely warrants it: enable Developer
Options → "Bluetooth HCI snoop log", clear NoiseFit's app data so the bind is
genuinely first-time, bind with the real app, then force a reconnect so one
capture holds both. Pull it with `adb bugreport` — the log is at
`FS/data/misc/bluetooth/logs/btsnoop_hci.log` inside the zip, and `/data/misc`
isn't readable without root, which is why the bugreport route is the reliable
one — then diff the real app's over-the-air bytes against ours.

**Before reaching for that, re-read the app's own log first.** It is cheap, it
is already there, and it is what cracked this.

> The decompiled SDK is **not** stored anywhere durable. It lived in a session
> scratchpad (all 18 `classes*.dex` from the NoiseFit APK, plus a ~491MB jadx
> decompile) that is wiped between sessions. Reproducing any of the above means
> re-extracting the APK and re-running `jadx` — see "How this was derived".

## What's NOT done yet: steps / heart rate / sleep history

This is the big remaining piece and it's genuinely more work — don't
under-scope it in a future session.

**Why it's harder:** there is no simple "get today's step count" command.
Fitness data (`FitnessProtos.SEFitness`, field 9 of `SEWear`) is a large
oneof covering ~30+ data types (`SEDailyData`, `SEContinuousHeartRateData`,
`SESleepData`, `SEOfflineBloodOxygenData`, etc. — see `FitnessProtos.java`
for the full list). The relevant request commands
(`getDailyDataById`=113, `getDailyHistoryData`=112, and similar) go through
**CHAR_03**, not CHAR_01, which has its **own, different** multi-packet
framing (decompiled from `BluetoothService.k(byte[])` — similar header/ACK
shape but distinct field offsets and a `SportParsing` class on the receiving
end that we have not read closely). On top of that:
- `SEDailyData`'s fields (`stepsData`, `caloriesData`, `distanceData`, etc.)
  are frequency-encoded arrays (hourly/bucketed), not flat totals — the
  encoding scheme for those bytes hasn't been decoded.
- The exact request payload for `getDailyDataById`/`getDailyHistoryData`
  (date range? day id? a `FitnessTypeId` list?) hasn't been confirmed by
  reading `ControlBleTools.java`'s call sites for those methods in full.

### Real-time heart rate — cmd id **731**, implemented and shipped

Confirmed by decompiling a later NoiseFit build than the rest of this doc —
that build ships the vendor SDK's actual generated protobuf classes (not
hand-obfuscated wrappers), so these field numbers are read straight out of
`SettingMenuProtos.java`'s `_FIELD_NUMBER` constants and `writeTo()` methods,
not guessed:

```
Enable/disable request:
SEWear{ id: 731, settingMenu: SESettingMenu{ realTimeHeartRateSettings: SERealTimeHeartRateSettings{
  switch:   <bool>            // field 1, writeBool
  frequency: <uint32 seconds> // field 2, writeUInt32 — how often the watch samples
  overtime:  <uint32 seconds> // field 3, writeUInt32 — auto-shutoff, 0 = disabled
} } }
```
`SEWear.settingMenu` is field **15**; `SESettingMenu.realTimeHeartRateSettings`
is field **38**. `SESettingMenu` is itself a big oneof (same shape as `SEWear`)
covering ~40 different settings — don't confuse `realTimeHeartRateSettings`
(38, the request) with `realTimeHeartRateData` (39, the response, below).

Once enabled, the watch pushes readings **unsolicited** over CHAR_01 (no
request/response correlation — it just arrives whenever a new reading is
ready, using the same header/ACK/reassembly framing already implemented for
battery/bind), as:
```
SEWear{ settingMenu: SESettingMenu{ realTimeHeartRateData: SERealTimeHeartRateData{
  timestamp: <uint32>      // field 1, writeUInt32
  value:     <uint32 bpm>  // field 2, writeUInt32
} } }
```
`SESettingMenu.realTimeHeartRateData` is field **39**. This matches the SDK's
own `RealTimeHeartRateCallback.onDataResult(long timestamp, int value)`
signature exactly (`com.zhapp.ble.callback.RealTimeHeartRateCallback`),
confirming the field mapping.

Note: the exact runtime dispatch code that routes an incoming `SEWear` to
this callback (inside `com.zhapp.ble.parsing.BleParsing`) could **not** be
decompiled — it's one giant generated `run()` method and jadx hits an
internal `RegionMakerVisitor` error on it (visible as `JADX ERROR` comments
in the decompiled output). That's a decompiler limitation on the dispatcher,
not uncertainty about the message shape: the field numbers and wire types
above come directly from the generated protobuf message classes themselves
(`SettingMenuProtos.java`), which decompiled cleanly and are a much more
reliable source than reverse-engineering the dispatcher would have been
anyway. Implemented in `WatchSyncActivity.toggleRealTimeHeartRate()` /
`handlePossibleRealTimeHeartRate()`.

**Recommended next step for steps/distance/calories**: still CHAR_03 — see
above. Don't guess the request payload shape; if picking this up, ask for a
fresh NoiseFit APK extract (see "How this was derived" above) and decompile
**all** `classes*.dex` files including any that look unrelated — the vendor
SDK's own code (`com.zhapp.ble.*`, `com.zh.ble.wear.protobuf.*`) turned out
to live in specific dex files (in the build analyzed here: `classes9.dex`
for `com.zhapp.ble`, `classes8.dex` for `com.zh.ble.wear.protobuf`) that
aren't predictable in advance — a class referenced via `import` in one dex
can be *defined* in a completely different one thanks to how D8/R8 splits
multidex output, so a partial dex extract can silently be missing the one
file that actually matters.

## Full Apricot command-id catalog

Extracted from `ControlBleTools.java` by scripting: for every public method,
find its `BleLogger.d("ControlBleTools", "methodName()...")` line and the
`ParsingStateManager.addSendCmdStateListener(<ID>, ...)` call in the same
method body. `-` means no id found by this heuristic (getter-only methods,
internal methods, or methods that don't go through the standard dispatch).
The Berry-protocol column (`protocolType/subId`) is included for cross-
reference but NOT relevant to this watch — ignore it unless working on the
"other watch" (Day Fit) mentioned in earlier handoff notes, which may use
Berry instead.

Re-run the extraction yourself if this list goes stale (new dex files,
different app version):
```python
import re
text = open("ControlBleTools.java", encoding="utf-8", errors="ignore").read()
pattern = re.compile(r'BleLogger\.d\("ControlBleTools",\s*"(\w+)\(\)')
apricot_id = re.compile(r'addSendCmdStateListener\((\d+),')
berry_call = re.compile(r'writeBerryCmd\(a\.C0474a\.\w+\((\d+),\s*(\d+)')
matches = list(pattern.finditer(text))
for i, m in enumerate(matches):
    name = m.group(1)
    chunk = text[m.start(): matches[i+1].start() if i+1 < len(matches) else len(text)]
    aid = apricot_id.search(chunk)
    bid = berry_call.search(chunk)
    print(name, aid.group(1) if aid else '-', f"{bid.group(1)}/{bid.group(2)}" if bid else '-')
```

Apricot cmd id (this watch's protocol) for commands relevant to likely next
features — full ~315-entry list is reproducible via the script above, so only
the high-value subset is kept here to avoid this doc rotting into a wall of
IDs nobody reads:

| Feature | Method | Apricot cmd id |
|---|---|---|
| Time sync | `setTime` | 48 |
| Time format (12/24h) | `setTimeFormat` | 49 |
| Push app notification | `sendAppNotification` | 179 |
| Push system notification (call/SMS) | `sendSystemNotification` | 178 |
| Get battery | `getDeviceBattery` | 33 |
| Get device info (model/firmware) | `getDeviceInfo` | 32 |
| Find my watch | `sendFindWear` | 161 |
| Enable real-time HR | `setRealTimeHeartRateConfig` | 731 |
| Get real-time HR config | `getRealTimeHeartRateConfig` | 730 |
| Realtime data switch | `realTimeDataSwitch` | 164 |
| Get today's sport status (session state, NOT step totals) | `getSportStatus` | 96 |
| Get daily history data (steps etc., needs CHAR_03) | `getDailyHistoryData` | 112 |
| Get daily data by id (needs CHAR_03) | `getDailyDataById` | 113 |
| Set contact list | `setContactList` | 185 |
| Set language | `setLanguage` | 64 |
| Set user profile (height/weight/etc.) | `setUserProfile` | 68 |
| Do-not-disturb mode | `setDoNotDisturbMode` | 230 |
| Weather push | `sendWeatherDailyForecast` / `sendWeatherPreHour` | 129 / 128 |
| Music info sync | `syncMusicInfo` | 195 |
| Watch face list | `getWatchFaceList` | 80 |

## Implementation status in this repo

- `reminder-app/app/src/main/java/online/productwithrohan/reminders/WatchSyncActivity.kt`
  — all of the above, plus BLE scan (with the Android 12+ `neverForLocation`
  fix), QR fallback, standard-CTS path (unused by this watch but kept for
  watches that do speak standard Bluetooth).
- `reminder-app/app/src/main/res/layout/activity_watch_sync.xml` — UI:
  scan/QR buttons, device list, "Send test notification", "Read battery
  (vendor protocol)", and "Start/Stop" heart-rate buttons, scrolling log.
- `reminder-app/app/src/main/res/values/strings.xml` — all `watch_sync_*`
  strings.
- `reminder-app/app/src/main/AndroidManifest.xml` — BLE permissions incl.
  `neverForLocation` flag on `BLUETOOTH_SCAN`.

PRs so far (all on `rohankhullar24-oss/product-with-rohan`): #81–83 (initial
feature + QR + the "0 devices" scan bug fix), #84 (Location-toggle scan fix),
#85 (characteristic property logging), #86 (vendor time-sync + notifications +
battery), #87–91 (write-without-response fix, device-binding handshake, GATT op
queue, real OS-level pairing, bind confirmation fix), #92–93 (bind-token
format, GATT race conditions, real-time heart rate, pairing-prompt timing).

Then the stall, worth recording because it cost the most time:

- **#94** — the actual root cause of "nothing works": commands were never
  delivered at all. Sending a command is *not* writing its bytes to CHAR_02;
  it needs the real header/READY_FOR_DATA/chunk handshake (see "Write
  framing"). Also fixed a silent notification-registration failure that
  blocked every response, chained commands off real chunk-write completion,
  and stopped cmd 48 racing cmd 16.
- **#95** — a debugging-only experiment that deliberately disconnected the
  watch ~2.5s after binding, to measure bind persistence across a reconnect.
- Both sat as **stacked drafts and never merged**, so `reminder-app-latest`
  kept rebuilding from a `master` that had none of #94's fixes. See "Which
  build are you running?".
- **#96** — landed #94's transport fixes and #95's bond-lifecycle hardening on
  `master`, and deleted the persistence experiment (the self-inflicted
  disconnect, its auto-reconnect, the dedicated cmd 16 response routing, and
  the orphaned log strings). First build where the app simply connects and
  stays connected.
- **#97** — corrected this doc's claim that `reminder-app-latest` had been
  serving a build from 2026-07-26. It hadn't: `published_at` is pinned to tag
  creation while the asset is replaced in place. Only `versionCode` identifies
  what is in an APK.
- **#98** — `connectGatt` over `TRANSPORT_LE` instead of `TRANSPORT_AUTO`, and
  bond-failure diagnostics (transition direction + `UNBOND_REASON_*` code).
  Also reverted an earlier mistake in the same PR that had made OS bonding
  opt-in on the strength of this doc's wrong "works fine without bonding"
  claim.
- **#99 — the fix.** Stopped cmd 48 interrupting cmd 18. See "The bug that
  cost the most" at the top. Verified on hardware: cmd 18 answered, bind
  settled, notifications / battery 91% / heart rate all working.
- **#100** — the screen now remembers the synced watch and reconnects to it on
  open (`watch_sync` prefs, `getRemoteDevice(mac)`, no scan), with a "Sync a
  different watch" action. Before this, `WatchSyncActivity` had no persistence
  of any kind, so every visit meant re-finding the watch among ~50 unnamed
  advertisers — which reads to a user as "the app forgot my watch".

**Convention note:** the branch-reuse convention referenced by earlier
revisions of this doc is what produced the stacked-draft stall. Prefer
branching from `master` and merging promptly, so the release named "latest"
actually is.

**Debugging note, the most transferable thing here:** the bug that consumed
this investigation was visible in the app's own on-screen log the whole time.
It was found by reading that log line by line and asking which command didn't
get a reply — not by decompiling, and not by any new instrumentation. When
this feature misbehaves, read the log first.

## FireBoltt 100 (DaFit protocol) — a different watch, a different protocol

A second watch, unrelated to the Pulse 2 Max above, was connected in a later
session (2026-09-07): a **FireBoltt 100** (MAC `F3:CC:26:CF:B9:10`, name
"FireBoltt 100" over BLE). Its GATT dump doesn't have the Pulse 2 Max's
`16186f00` vendor service at all — this is a completely different watch
family requiring its own protocol work, not a case of the same watch
behaving differently.

**Status: implemented, UNVERIFIED ON HARDWARE.** Unlike everything above,
this was not derived by decompiling this watch's own companion app (no
FireBoltt APK was available in the sandbox this was built in, which also has
no phone and no watch to test against). Instead it's built directly from a
real, independent, open-source (AGPLv3) reverse-engineering of the same
protocol family: **Gadgetbridge**'s DaFit device support
(`github.com/krzys-h/Gadgetbridge-MT863`, `dafit` branch —
`service/devices/dafit/{DaFitPacket,DaFitPacketIn,DaFitPacketOut,
DaFitDeviceSupport}.java` and `devices/dafit/DaFitConstants.java`). That
project's own comments describe reverse-engineering the "DaFit" Android app
(package `com.crrepa.band.dafit`) — CRRepa, the same vendor SDK the decompiled
NoiseFit app bundles (unused) for Noise's *other* watch models, per "How this
was derived" above. So this is confirmed to be a real, working implementation
of *some* watch in this protocol family — just not confirmed to be *this*
watch's exact firmware revision.

**Why this watch is confidently in the DaFit family, not a guess:** its GATT
dump matches Gadgetbridge's DaFitConstants almost exactly, including a detail
that's otherwise inexplicable — an extra service `0000fee7` with
characteristics `0000fea1` (read, notify) and `0000fec9` (read), which
DaFitConstants' own comment calls "another custom service ... not mentioned
anywhere in the official app". Real, unrelated code independently seeing the
same undocumented service on a different watch is strong corroboration, not
coincidence.

### GATT surface

- Service `0000feea-...` — the DaFit command service.
  - `0000fee1` — `DATA_STEPS`: read/notify. Doubles as the live pedometer
    characteristic and the "sync past data" response shape:
    `{distance:uint24, steps:uint24, calories:uint24}` (byte order within each
    field not specified by DaFitConstants; implemented as little-endian to
    match every other multi-byte field in this protocol except the time-sync
    timestamp below).
  - `0000fee2` — `DATA_OUT`: write-no-response. Commands, phone → watch.
  - `0000fee3` — `DATA_IN`: notify. Command replies, watch → phone.
  - `0000fee5`, `0000fee6` — `DATA_SPECIAL_1`/`DATA_SPECIAL_2`, write-no-
    response. DaFitConstants marks these `(*)` — referenced in the decompiled
    app but never observed responding on the watch Gadgetbridge's author had.
    Not used here.
- Service `0000fee7-...` — undocumented even in DaFitConstants (see above).
  Characteristics `0000fea1` (read, notify) and `0000fec9` (read). Not used.
- Standard `0000180f` Battery Service and `0000180a` Device Information — both
  present on this watch and already handled by `WatchSyncActivity`'s existing
  standard-BLE-service code path (confirmed working on this exact watch: the
  log showed a real battery percentage). No DaFit-specific code needed for
  battery.
- No standard Current Time Service (`00001805`) — same situation as the Pulse
  2 Max, hence the vendor time-sync command below.
- Notably **no app-level bind handshake** in this protocol family, unlike the
  Pulse 2 Max's cmd 16/17/18 dance — Gadgetbridge's DaFit support pairs via
  OS-level Bluetooth bonding alone (already implemented and shared by both
  watches in `WatchSyncActivity`) and starts sending commands right after.

### Packet framing

Every command, in both directions, is one frame:

```
byte 0-1: 0xFE, 0xEA                          (fixed header)
byte 2:   16                                  (MTU==20 framing; every command
                                                sent from this screen is small
                                                enough that this always
                                                applies — the MTU-negotiated
                                                variant, byte2 = 32 + length
                                                high byte, is implemented for
                                                parsing incoming replies but
                                                never produced when sending)
byte 3:   packet length & 0xFF                (whole-packet length, header
                                                included)
byte 4:   command type
byte 5+:  payload
```

No checksum/CRC in this framing (confirmed by reading `DaFitPacketOut`/
`DaFitPacketIn` directly — they build/parse exactly the bytes above, nothing
more). A gist covering a *different* watch in a related-looking family
(`gist.github.com/kabbi/854a541c1a32e15fb0dfa3338f4ee4a9`, Umidigy uWatch2)
describes an extra CRC-16 on top of the same `FE EA` header — that's a
different protocol *version* this watch may or may not use; not implemented,
since the actual Gadgetbridge DaFit source (the more directly-applicable
reference, corroborated by the `0000fee7` service match above) shows none.
Worth checking first if commands appear to reach the watch but never take
effect.

Larger payloads fragment across multiple GATT writes (`DaFitPacketOut`
implements this), but every command this screen sends is well under one MTU,
so `WatchSyncActivity`'s `buildDaFitPacket`/`writeDaFitRaw` only implement the
single-frame case. `handleDaFitDataIn` (parsing replies) does implement the
multi-fragment reassembly, since a reply could in principle be longer.

### Confirmed-by-source command: time sync — cmd id **49**

```
payload = { (time >> 24) & 0xFF, (time >> 16) & 0xFF, (time >> 8) & 0xFF,
            time & 0xFF, 8 }
```

The timestamp is **big-endian** — unlike essentially every other multi-byte
field in this protocol family, which is little-endian. This isn't a guess:
DaFitConstants' own comment spells out the shift order (`time >> 24, time >>
16, time >> 8, time`), matching only a big-endian encoding. The trailing
constant byte `8`'s meaning isn't explained by DaFitConstants either, and is
sent as-is rather than guessed at.

**The timestamp itself needs an unusual conversion.** DaFitConstants states
outright: "The watch stores all dates in GMT+8 time zone with seconds
resolution", and its `LocalTimeToWatchTime()` helper converts by taking the
*wall-clock* date/time fields (whatever the phone's local zone is) and
re-reading them back out as if they were already GMT+8 — producing an epoch
second that's deliberately "wrong" relative to true UTC, by exactly the
phone's own zone offset, because that's what the watch's firmware expects on
the wire. `WatchSyncActivity.dafitWatchTimestamp()` mirrors this exactly.
Skipping this conversion (sending a plain `System.currentTimeMillis() / 1000`)
would very likely still "work" in the sense of the watch accepting the write,
but show the wrong clock time on-screen for anyone not in GMT+8.

### What's NOT implemented

Everything else in `DaFitConstants` — alarms, notifications, weather push,
step goal, sleep/heart-rate history (`CMD_QUERY_LAST_DYNAMIC_RATE`,
`CMD_SYNC_PAST_SLEEP_AND_STEP`, etc.), user profile, watch face, do-not-
disturb, and so on. The full command table (with the same-shape caveats
Gadgetbridge's own author noted — `(*)` = only statically reverse-engineered,
never confirmed responding; `(?)` = not checked at all) is in
`DaFitConstants.java` at the URL above if a future session needs to add one of
these. `sendTestNotification` (the existing "push a test notification"
button) is still wired to the Pulse 2 Max's zhapp cmd 179 only — it does
nothing on a DaFit-family watch. `CMD_SEND_MESSAGE` (65) is the DaFit
equivalent if that's wanted next.

### Next step, if this needs to go further

The most valuable thing a future session with the actual FireBoltt phone app
installed could do is repeat "How this was derived" above against the real
**Fire-Boltt companion app's** APK (rather than relying on a different,
though closely-matching, watch's reverse-engineering) — that would move this
from "confirmed against a real open-source implementation of this protocol
family" to "confirmed against this exact watch's own app", the same bar the
Pulse 2 Max section above cleared. Absent that, **test on real hardware
before trusting any of this** — verify the watch's clock actually changes
after a time-sync write, and that the steps/distance/calories numbers read
back match what the watch's own screen shows.
