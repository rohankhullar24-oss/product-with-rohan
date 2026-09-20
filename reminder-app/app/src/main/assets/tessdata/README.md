# eng.traineddata is fetched at build time, not vendored here

OCR (`OcrScanActivity`) needs Tesseract's English trained-data file at
`eng.traineddata` in this directory. It's a ~4 MB binary (the "fast" model —
see below) and isn't committed here — this repo doesn't vendor large binary
assets that can be fetched at build/setup time instead.

The `downloadTessdata` Gradle task in `reminder-app/app/build.gradle.kts`
fetches it automatically as a `preBuild` dependency, so a normal
`./gradlew :reminder-app:assembleDebug` (or the `reminder-app.yml` CI
workflow) needs no manual step. The task is a no-op once the file already
exists, so it only ever downloads once per checkout.

If you're building somewhere without internet access, or the automatic
download fails, fetch it manually from Tesseract's official `tessdata_fast`
repo and place it here:

https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata

(`tessdata_fast` trades a little accuracy for a much smaller file than the
main `tessdata` repo's `eng.traineddata` — either works with Tesseract4Android
4.9.0, since both are v4 trained-data files.)

Without this file, `OcrScanActivity` still runs, but shows
`ocr_language_missing` instead of recognizing text — it fails gracefully
rather than crashing.
