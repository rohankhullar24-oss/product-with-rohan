# Watch Sync: Noise ColorFit Pulse 2 Max protocol reference

Handoff document for the Watch Sync feature in `reminder-app/`. Everything here
was reverse-engineered by decompiling the real **NoiseFit** Android app (the
watch's official companion app) — not guessed. If you're picking this up in a
new chat with no memory of how we got here, this file is self-contained: it
tells you what's confirmed, what's implemented, what's still unknown, and
exactly how to find out more.

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
- **Working today:** time sync, push-notification-to-watch, battery read.
- **Not yet implemented:** steps / heart-rate / sleep / SpO2 history — these
  go through a different, more complex "big data" chunked transfer that
  hasn't been fully reverse-engineered. See "What's NOT done yet" below.

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

Real-time heart rate is a separate, probably-simpler path: enable via
`setRealTimeHeartRateConfig` (cmd 731) / `realTimeDataSwitch` (cmd 164),
after which the watch is expected to push continuous readings
(`SEContinuousHeartRateData`, field 6 of `SEFitness`) — likely over CHAR_01
using the same framing we already have working, but this hasn't been
tried against real hardware.

**Recommended next step**: pick ONE of these (real-time HR is probably the
better first target — reuses the CHAR_01 framing we already have proven
working, no CHAR_03 needed) and read `ControlBleTools.java` +
`BluetoothService.java` closely for that exact path before writing code,
the same way we did for time-sync/notifications/battery above. Don't guess
the request payload shape — find the exact call site and read the builder.

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
  scan/QR buttons, device list, "Send test notification" and "Read battery
  (vendor protocol)" buttons, scrolling log.
- `reminder-app/app/src/main/res/values/strings.xml` — all `watch_sync_*`
  strings.
- `reminder-app/app/src/main/AndroidManifest.xml` — BLE permissions incl.
  `neverForLocation` flag on `BLUETOOTH_SCAN`.

PRs so far (all on `rohankhullar24-oss/product-with-rohan`, branch
`claude/watch-not-found-egf4vs`, reused per this repo's branch-reuse
convention — see AGENTS.md/session history if that convention needs
re-deriving): #81–83 (initial feature + QR + the "0 devices" scan bug fix),
#84 (Location-toggle scan fix), #85 (characteristic property logging), #86
(vendor time-sync + notifications + battery — the work this doc describes).
