# Works Enabler — implementation status (handoff)

Written 2026-09-20, at the end of the session that built Phase 1, and updated
same day once everything was actually committed and pushed (commit `16b04a3`,
on top of the earlier WIP scaffolding commit `0f9d0c1`). If you're picking
this up in a new chat: **pull first** — everything described below is on
`origin/master` already, not sitting uncommitted in some other session's
working copy. Read this whole file before touching the code, so you don't
re-derive what's already verified.

## What this feature is

"Works Enabler" is a new reminder-app menu item: an open-source PDF/Word/
PowerPoint/Spreadsheet toolkit — create new files, open/read/edit existing
ones, OCR, PDF⇄Word conversion, and compression. It's genuinely one of the
largest features this app could take on (functionally a small office suite),
so it's being built in phases. **Phase 1 (PDF tools + OCR) is implemented
below but has never been compiled** — this sandbox has no Android SDK and no
reachable Google Maven repo, so nothing past careful manual API verification
was possible. Treat it the same as this repo's existing "CI-compiled but not
hardware-verified" caveat for the Notes feature (see `ARCHITECTURE.md`) —
except this hasn't even cleared a CI build yet.

## Done (Phase 1)

- **Menu wiring**: `action_works_enabler` in
  `reminder-app/app/src/main/res/menu/main_menu.xml`, a branch in
  `MainActivity.onOptionsItemSelected`, `title_works_enabler` string — same
  one-line shape as every other menu entry.
- **`WorksEnablerActivity`** (hub) — two cards (PDF, Scan/OCR) routing to the
  screens below, plus a non-clickable "Word, PowerPoint, Spreadsheet — coming
  in a later update" card.
- **`PdfToolsActivity`** — open a PDF (SAF), create one from picked photos,
  merge multiple PDFs, rotate/delete/reorder pages, compress (recompresses
  embedded page images), save-as (SAF). Page thumbnails render via Android's
  built-in `PdfRenderer`; everything else uses PdfBox-Android. `PdfPageAdapter`
  is the page-list RecyclerView adapter.
- **`OcrScanActivity`** — take a photo or pick an image, run on-device OCR via
  Tesseract4Android, show editable recognized text, save as `.txt`.
- **Gradle**: added to `reminder-app/app/build.gradle.kts`:
  `com.tom-roush:pdfbox-android:2.0.27.0` and
  `cz.adaptech.tesseract4android:tesseract4android:4.9.0`. Added a JitPack
  repository to root `settings.gradle.kts` (Tesseract4Android is **only**
  published there, not Maven Central — a wrong assumption from the initial
  plan that got caught and fixed before writing any Kotlin).
- **Manifest**: `WorksEnablerActivity` / `PdfToolsActivity` / `OcrScanActivity`
  entries; a new `works_enabler_camera` cache-path added to the existing
  `journal_file_paths.xml` FileProvider config, reused for OCR's camera
  capture (no new provider needed).
- **`ARCHITECTURE.md`**: a "Works Enabler" entry describing all of the above,
  including the `com.tom_roush` (underscore) vs `com.tom-roush` (hyphen)
  package/coordinate mismatch, since that's an easy thing to get wrong.

## Not done yet

1. ~~`eng.traineddata` is missing.~~ **Fixed**: `reminder-app/app/build.gradle.kts`
   now has a `downloadTessdata` task wired into `preBuild` that fetches it
   from `raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata`
   automatically (no-op once the file exists) — so a normal
   `./gradlew :reminder-app:assembleDebug` or CI run needs no manual step,
   and the repo still doesn't vendor the binary. Verified the URL resolves
   and returns a real trained-data file (4 MB, starts with the expected
   Tesseract version-header bytes) by curling it directly, since this
   sandbox can't resolve the Android Gradle Plugin from Google's Maven (see
   point 2) and so can't run the Gradle task itself end-to-end. Manual
   fallback instructions are still in `assets/tessdata/README.md` for
   offline builds.
2. **No confirmed real build yet.** This sandbox has no Android SDK and can't
   resolve `com.android.application` from Google's Maven repo (confirmed
   again this session — `./gradlew :reminder-app:downloadTessdata` fails at
   plugin resolution before reaching any app code), so a local build still
   isn't possible here. This session's changes went up as a PR from
   `master-iny4en` (not a direct push to `master`), so `reminder-app.yml`
   CI runs on the PR itself via its `pull_request` trigger — check that PR's
   Actions run before assuming anything else. If CI hasn't run or its result
   isn't known, that's the first thing to check in a new session, ahead of
   anything else on this list. Every PdfBox-Android/Tesseract4Android API
   used was checked against the actual upstream source on GitHub (see the
   verified-API list below) rather than assumed from memory, but that's
   still not a substitute for a real compile.
3. **No device/emulator test at all.** Once it compiles, install it and walk
   through: open a real PDF from Drive/Downloads, merge two PDFs, rotate/
   delete/reorder pages, compress and confirm the file shrinks, create a new
   PDF from photos, photograph a printed page and check OCR text quality,
   save recognized text as `.txt`.
4. **Phases 2–4 (Spreadsheet, Word/PowerPoint, conversion) are un-started** —
   full plan below. Re-confirm scope before starting Phase 2, once Phase 1's
   actual engineering cost is known from a real build/device pass.

## Git state

Everything is committed and pushed to `origin/master`:

- `0f9d0c1` — "Add Works Enabler hub screen scaffolding (WIP)": menu entry,
  hub Activity/layout, manifest entries, Gradle deps, most string resources.
  Explicitly noted in its own message that it wouldn't compile yet.
- `e1ac1a8` — merge of an unrelated `origin/master` update (a new "Notes"
  feature) into this branch. Already resolved before it landed; nothing in
  Works Enabler conflicted with it.
- `16b04a3` — "Complete Works Enabler Phase 1: PDF tools + OCR": adds
  `PdfToolsActivity.kt`, `OcrScanActivity.kt`, `PdfPageAdapter.kt`, their
  three layouts, the `tessdata/README.md`, this status doc, and the
  `ARCHITECTURE.md` entry. This is the commit that makes the hub's links
  actually resolve.

If a new session reports these files "don't exist" or "were never
committed," that session is almost certainly working from a stale clone or
one that hasn't fetched `origin/master` yet — check `git log --oneline -5`
and `git fetch && git status` before concluding anything is missing.

## Verified PdfBox-Android APIs

Checked against `github.com/TomRoush/PdfBox-Android` (`master`), so a future
session doesn't need to re-verify these:

- Package is **`com.tom_roush.pdfbox.*`** (underscore) even though the Maven
  coordinate is `com.tom-roush:pdfbox-android`.
- `PDFBoxResourceLoader.init(context)` (package `com.tom_roush.pdfbox.android`)
  — required once before any other PdfBox call.
- `PDDocument`: `.load(File)` (static), `.save(File)` / `.save(OutputStream)`,
  `.close()`, `.addPage(PDPage)`, `.removePage(Int)`, `.getPage(Int): PDPage`,
  `.numberOfPages: Int`, `.importPage(PDPage): PDPage`.
- `PDPage`: `PDPage()`, `PDPage(PDRectangle)`, `.rotation` (mutable, degrees),
  `.resources: PDResources`.
- `PDRectangle.A4` (and other standard sizes), `.width`, `.height`.
- `PDPageContentStream(document, page)` — `Closeable`;
  `.drawImage(PDImageXObject, x, y, width, height)`.
- `JPEGFactory.createFromImage(document, bitmap: Bitmap, quality: Float 0f..1f): PDImageXObject`.
- `PDImageXObject.image: Bitmap` (Kotlin property from `getImage()`, throws `IOException`).
- `PDResources`: `.xObjectNames: Iterable<COSName>`, `.isImageXObject(COSName): Boolean`,
  `.getXObject(COSName): PDXObject`, `.put(COSName, PDXObject)` — this last one
  is how `PdfToolsActivity.compressPageImages()` swaps a recompressed image
  back in under the same resource name.
- `PDFMergerUtility().appendDocument(destination, source)`.

## Verified Tesseract4Android APIs

Checked against `github.com/adaptech-cz/Tesseract4Android` (`master`):

- Published on **JitPack** (`https://jitpack.io`), not Maven Central.
- Package `com.googlecode.tesseract.android.TessBaseAPI` (kept from the
  library's tess-two lineage, despite being a full rewrite).
- `TessBaseAPI()`, `.init(dataPath: String, language: String): Boolean`,
  `.setImage(Bitmap)`, `.getUTF8Text(): String`, `.recycle()`.
- **Not thread-safe** — one instance per thread. Fine here since
  `OcrScanActivity` only ever touches it from its single background executor.
- Needs `<dataPath>/tessdata/<lang>.traineddata` on the real filesystem, not
  inside the APK's assets — hence `OcrScanActivity.ensureTrainedData()`
  copying the bundled asset to `filesDir/tesseract/tessdata/` on first use.

## Full phased plan (Phases 2–4 — not started)

Two engine choices were confirmed with the user before Phase 1 was built and
still apply:

- **OCR: Tesseract4Android** (open-source, on-device) over Google ML Kit —
  keeps the whole feature genuinely open source.
- **Word/PPT/Excel: a hand-rolled minimal OOXML engine**, not Apache POI —
  docx/pptx/xlsx are just ZIP+XML, the app already depends on `zip4j` for
  exactly this kind of zip manipulation (`ZipExtractorActivity`), and POI
  isn't built for Android (AWT dependencies, huge method count).

### Phase 2 — Spreadsheet (most tractable of the three Office formats)

- `XlsxEngine` (non-UI) — hand-rolled XLSX reader/writer: parses/writes
  `xl/worksheets/sheet1.xml`, `xl/sharedStrings.xml`, `[Content_Types].xml`
  etc. via Android's built-in `XmlPullParser`, using `zip4j` for the
  container. Scope: cell text/number values + basic number formatting — no
  formulas, charts, or rich per-cell styling in v1.
- `SpreadsheetActivity` — grid editor (RecyclerView-based table) over
  `XlsxEngine`; create blank sheet, open/edit, save; compress (rezip at max
  compression + downsample embedded images), reusing the same walk-the-zip
  shape as `ZipExtractorActivity`.

### Phase 3 — Word + PowerPoint (basic text/paragraph editing, not full fidelity)

- `DocxEngine` / `PptxEngine` (non-UI) — same hand-rolled OOXML approach.
  DOCX: paragraphs/runs (bold/italic/font size/color), simple tables, inline
  images. PPTX: slides with title/body text placeholders and images,
  add/remove/reorder slides.
- `DocxEditorActivity`, `PptxEditorActivity` — open/create/edit/save over the
  engines above.

### Phase 4 — Conversion + remaining compression

- PDF → Word: extract text via PdfBox, reflow into simple paragraphs via
  `DocxEngine`.
- Word → PDF: walk the `DocxEngine`-parsed model, draw it into a PDF via
  PdfBox's content-stream/text APIs.
- Exposed as a "Convert" action on `PdfToolsActivity` / `DocxEditorActivity`,
  not a separate activity.
- DOCX/PPTX/XLSX compression: same rezip + embedded-image-recompression pass
  as Phase 2, applied to `word/media` / `ppt/media` entries.

## Next-session checklist

1. ~~Download `eng.traineddata` into `assets/tessdata/`.~~ Done — it's now
   fetched automatically by the `downloadTessdata` Gradle task (see above).
2. Check the CI run on this session's PR (branch `master-iny4en`) and fix any
   compile errors it surfaces — still the first real build this feature has
   cleared, if it passes.
3. Install on a device/emulator and walk the Phase 1 verification steps.
4. Re-scope Phase 2 with the user before starting it.
5. The `origin/master` merge noted in earlier versions of this doc is already
   resolved — `git log` shows `e1ac1a8` cleanly in this branch's history and
   `git status` is clean. Nothing left to do there.
