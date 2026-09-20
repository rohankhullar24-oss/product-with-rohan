# Works Enabler — implementation status (handoff)

Written 2026-09-20, at the end of the session that built Phase 1, updated
same day once Phase 1 was committed/pushed and again once it cleared a real
CI build for the first time (PR #111), and updated again same day once
Phases 2–4 (Spreadsheet, Word, PowerPoint, PDF⇄Word conversion, generic
compression) were built on top of that. If you're picking this up in a new
chat: **pull first** and check which branch has what — see "Git state"
below — and read this whole file before touching the code, so you don't
re-derive what's already verified.

## What this feature is

"Works Enabler" is a reminder-app menu item: an open-source PDF/Word/
PowerPoint/Spreadsheet toolkit — create new files, open/read/edit existing
ones, OCR, PDF⇄Word conversion, and compression. It's genuinely one of the
largest features this app could take on (functionally a small office suite).
**All four planned phases are now implemented and (per PR #111 for Phase 1)
at least Phase 1 has cleared a real CI build.** Phases 2–4 were built in the
same session that fixed Phase 1's build and are pushed alongside it, but
**have not yet had their own CI run confirmed** — check the Actions run on
the current branch before assuming they compile. **No phase has been
installed on a device or emulator** — treat all of it as CI-compiled (once
confirmed) but hardware-unverified, the same caveat this repo already uses
for Notes and Watch Sync's non-BLE parts (see `ARCHITECTURE.md`).

## Done (Phase 1 — PDF + OCR)

- **Menu wiring**: `action_works_enabler` in
  `reminder-app/app/src/main/res/menu/main_menu.xml`, a branch in
  `MainActivity.onOptionsItemSelected`, `title_works_enabler` string — same
  one-line shape as every other menu entry.
- **`WorksEnablerActivity`** (hub) — five cards (PDF, Scan/OCR, Spreadsheet,
  Word, PowerPoint) routing to the screens below.
- **`PdfToolsActivity`** — open a PDF (SAF), create one from picked photos,
  merge multiple PDFs, rotate/delete/reorder pages, compress (recompresses
  embedded page images), convert to Word (Phase 4), save-as (SAF). Page
  thumbnails render via Android's built-in `PdfRenderer`; everything else
  uses PdfBox-Android. `PdfPageAdapter` is the page-list RecyclerView
  adapter.
- **`OcrScanActivity`** — take a photo or pick an image, run on-device OCR via
  Tesseract4Android, show editable recognized text, save as `.txt`.
- **Gradle**: `com.tom-roush:pdfbox-android:2.0.27.0` and
  `cz.adaptech.tesseract4android:tesseract4android:4.9.0`, plus a JitPack
  repository in root `settings.gradle.kts` (Tesseract4Android is **only**
  published there). A `downloadTessdata` task fetches `eng.traineddata`
  automatically at build time — see the Phase 1 CI section below.
- **Manifest**: entries for every Works Enabler activity; a new
  `works_enabler_camera` cache-path added to the existing
  `journal_file_paths.xml` FileProvider config, reused for OCR's camera
  capture (no new provider needed).

## Done (Phases 2–4 — Spreadsheet, Word, PowerPoint, conversion, compression)

Built in one session on top of Phase 1's PR #111. Scope was deliberately
narrowed from the original Phase 2–4 sketch further down this doc (kept
below, struck through where superseded) — see each engine's own doc comment
for the exact narrowing and why:

- **`XlsxEngine`** (non-UI) — hand-rolled XLSX reader/writer: cell
  text/number values and sheet names only, no formulas/charts/styling.
  `SpreadsheetActivity` is a grid editor over it — plain (non-recycled)
  `EditText` cells rather than a RecyclerView-based table (deliberate: a 2D
  recycling grid is easy to get subtly wrong with no device to catch it on),
  capped at `XlsxEngine.MAX_ROWS` (100) / `MAX_COLS` (20). Only the first
  sheet of a loaded workbook is shown/edited; other sheets round-trip
  unchanged.
- **`DocxEngine`** (non-UI) — paragraphs of text with a **whole-paragraph**
  bold/italic flag — narrower than the original sketch's per-run
  bold/italic/font-size/color, tables, and inline images.
  `DocxEditorActivity` is a RecyclerView list of paragraphs
  (`DocxParagraphAdapter`), each with its own bold/italic toggle and delete
  button, plus "Convert to PDF".
- **`PptxEngine`** (non-UI) — slides with a title and body placeholder text
  only — narrower than the original sketch's images. Unlike the other two
  engines, it writes a full minimal slide master/layout/slide chain (not
  just one top-level part), because PowerPoint risks a "repair" prompt on a
  pptx missing those. `PptxEditorActivity` is a RecyclerView list of slides
  (`PptxSlideAdapter`) with title/body fields, reorder, and delete.
- **`DocumentConverter`** (Phase 4) — PDF → Word via PdfBox's
  `PDFTextStripper` (whole-document plain text, one paragraph per line) and
  Word → PDF by drawing `DocxEngine`'s paragraphs into a new PDF with
  `PDPageContentStream`'s text operators and `PDType1Font`'s standard-14
  fonts, word-wrapped to the page width via `PDFont.getStringWidth`.
  Exposed as "Convert to Word (.docx)" on `PdfToolsActivity` and "Convert to
  PDF" on `DocxEditorActivity`, per the original plan (not a separate
  activity). No PDF⇄PowerPoint conversion — never planned.
- **`OoxmlCompressor`** (Phase 4) — the actually-useful compression story:
  it works directly on a picked file's raw zip bytes, never through the
  lossy engines above, so it can shrink *any* real-world docx/pptx/xlsx
  (with styles/formulas/images intact) rather than just what this app
  itself wrote. Rezips every entry at max DEFLATE and recompresses embedded
  JPEGs (only JPEGs — see its doc comment for why PNGs etc. are left alone).
  Exposed as "Compress a file…" on all three of `SpreadsheetActivity` /
  `DocxEditorActivity` / `PptxEditorActivity`, as a picker-driven flow
  independent of whatever document is currently loaded in that screen. No
  xlsx/docx/pptx "compress what I've edited" button exists — see below for
  why that would be dishonest.

### Deliberate scope decisions worth knowing

- **No xlsx/docx/pptx "compress the loaded document" button.** Since
  `XlsxEngine`/`DocxEngine`/`PptxEngine` only round-trip cell text,
  paragraph text, and slide text, saving through them already strips
  everything else (styles, formulas, images) — that's not compression, it's
  data loss, and a "Compress" button implying otherwise would be dishonest.
  `OoxmlCompressor`'s raw-zip-bytes approach is the only compression path,
  and it's deliberately independent of the loaded/edited document.
- **`java.util.zip`, not `zip4j`, for all four new files.** The original
  Phase 2 sketch (below) assumed reusing `zip4j` since the app already
  depends on it for `ZipExtractorActivity`. That was revised: these OOXML
  files are never password-protected, so `zip4j`'s extra capability isn't
  needed, and `java.util.zip` is a JDK stdlib API that needs no
  upstream-source verification the way pulling in a new dependency's API
  surface would. `build.gradle.kts`'s comment on the `zip4j` dependency was
  updated to stop claiming Works Enabler reuses it.
- **Namespace-unaware XML parsing throughout.** All four engines use
  `android.util.Xml.newPullParser()` without enabling
  `FEATURE_PROCESS_NAMESPACES`, so tag/attribute names are matched as their
  raw strings including prefix (e.g. `"w:p"`, `"r:id"`, `"p:sldId"`) rather
  than resolved namespace URIs — this is simpler and was judged lower-risk
  than getting namespace-aware attribute lookup right with no way to test
  it against a real parser run.
- **PdfBox text-drawing APIs were verified against upstream source before
  use**, the same due-diligence Phase 1 did for the image APIs: cloned
  `github.com/TomRoush/PdfBox-Android` read-only and grepped
  `PDPageContentStream.java` / `PDType1Font.java` / `PDFTextStripper.java`
  for `beginText`/`endText`/`setFont`/`showText`/`setLeading`/`newLine`/
  `newLineAtOffset`, `PDFont.getStringWidth` (returns 1/1000 text-space
  units — confirmed from its doc comment, not assumed), the `HELVETICA*`
  static fields, and `PDRectangle.LETTER`. All confirmed to exist with the
  signatures used. `PDFont.encode()` (used internally by `showText`) throws
  `IllegalArgumentException` for characters outside a standard-14 font's
  WinAnsiEncoding, so `DocumentConverter` sanitizes text to that range
  before drawing rather than letting an unusual character abort a whole
  conversion.
- **pptx output is the least-verified part of this feature.** Its
  master/layout/slide XML structure was written from memory of the
  ECMA-376 spec, not checked against a real pptx or opened in PowerPoint or
  LibreOffice (neither is available in this sandbox, and this session had
  no device either). If pptx files this app produces fail to open or
  trigger a "repair" prompt, start by diffing against a real
  PowerPoint-produced pptx's `ppt/slideMasters/slideMaster1.xml` and
  `ppt/presentation.xml`.

## Not done yet

1. **No CI confirmation yet for Phases 2–4.** Phase 1's PR #111 cleared
   `reminder-app.yml`'s `build` check (see the "Phase 1 CI" section below),
   but the Phase 2–4 commits on top of it have not yet had their own CI run
   checked in this session — check the Actions run on the current branch/PR
   before assuming any of `XlsxEngine`/`DocxEngine`/`PptxEngine`/
   `DocumentConverter`/`OoxmlCompressor` or their Activities actually
   compile. If CI is red, the PdfBox text-drawing APIs and the OOXML
   writers' string-building code are the most likely places for a real
   error (this sandbox has no Android SDK, so none of this was compiled
   locally — see Phase 1's own `java.net.URI` shadowing bug for what that
   kind of gap can miss).
2. **No device/emulator test at all**, for any phase. Once everything
   compiles, install it and walk through: Phase 1's PDF/OCR checklist
   (below), then for Phases 2–4 — create/open/edit/save a spreadsheet, a
   Word doc, and a PowerPoint (does the pptx actually open in a real
   PowerPoint or LibreOffice without a repair prompt?), convert a PDF to
   Word and back, and compress a real-world xlsx/docx/pptx someone else
   created and confirm it still opens correctly afterward.
3. **Nothing beyond what's listed above as "Done."** Formulas, charts,
   tables, inline images, per-run rich text, multi-sheet editing, and
   PDF⇄PowerPoint conversion are all out of scope for what's built — see
   "Deliberate scope decisions" above before assuming any of those exist.

## Phase 1 CI (already resolved, kept for context)

PR #111 (`master-iny4en` → `master`) got Phase 1's first real CI compile.
First push (`51152f1`) failed with a genuine Kotlin error: `java.net.URI(...)`
in the new `downloadTessdata` task resolved to `Unresolved reference: net`,
because the Android/Kotlin Gradle plugins expose a `java` extension property
on `Project` that shadows the `java` package prefix inside build scripts —
`java.net.URI` was being parsed as a member access on that extension, not the
`java.net` package. Fixed by adding `import java.net.URI` and using the bare
`URI(...)` (commit `19c4de2`); the `build` check
(`reminder-app.yml`'s `./gradlew :reminder-app:assembleDebug`) passed after
that. `eng.traineddata` is fetched automatically by that `downloadTessdata`
task (a `preBuild` dependency, no-op once the file exists) rather than
vendored in the repo — see `assets/tessdata/README.md` for the manual
fallback if the automatic fetch ever fails.

## Git state

- `0f9d0c1`, `16b04a3`, `997f44a` — Phase 1 scaffolding and completion, on
  `origin/master`.
- PR #111, branch `master-iny4en`: `51152f1` (build-time tessdata fetch,
  broke CI), `19c4de2` (fixed the `java.net.URI` bug, CI green), `c70975a`
  (status doc update), then this session's Phase 2–4 commits on top.

If a new session reports any of these files "don't exist" or "were never
committed," check `git log --oneline` and `git fetch && git status` on the
right branch before concluding anything is missing — Phase 1 is on
`origin/master`, Phases 2–4 are on top of PR #111's branch until that PR
merges.

## Verified PdfBox-Android APIs

Checked against `github.com/TomRoush/PdfBox-Android` (`master`), so a future
session doesn't need to re-verify these:

- Package is **`com.tom_roush.pdfbox.*`** (underscore) even though the Maven
  coordinate is `com.tom-roush:pdfbox-android`.
- `PDFBoxResourceLoader.init(context)` (package `com.tom_roush.pdfbox.android`)
  — required once before any other PdfBox call.
- `PDDocument`: `.load(File)` (static), `.save(File)` / `.save(OutputStream)`,
  `.close()`, `.addPage(PDPage)`, `.removePage(Int)`, `.getPage(Int): PDPage`,
  `.numberOfPages: Int`, `.importPage(PDPage): PDPage`. Implements
  `Closeable`.
- `PDPage`: `PDPage()`, `PDPage(PDRectangle)`, `.rotation` (mutable, degrees),
  `.resources: PDResources`.
- `PDRectangle.A4`, `PDRectangle.LETTER` (and other standard sizes), `.width`,
  `.height` (both `Float`).
- `PDPageContentStream(document, page)` — `Closeable`;
  `.drawImage(PDImageXObject, x, y, width, height)`; text operators
  `.beginText()`, `.endText()`, `.setFont(PDFont, Float)`, `.showText(String)`,
  `.setLeading(Double)` / `.setLeading(Float)`, `.newLine()`,
  `.newLineAtOffset(Float, Float)` — all `throws IOException`.
- `JPEGFactory.createFromImage(document, bitmap: Bitmap, quality: Float 0f..1f): PDImageXObject`.
- `PDImageXObject.image: Bitmap` (Kotlin property from `getImage()`, throws `IOException`).
- `PDResources`: `.xObjectNames: Iterable<COSName>`, `.isImageXObject(COSName): Boolean`,
  `.getXObject(COSName): PDXObject`, `.put(COSName, PDXObject)` — this last one
  is how `PdfToolsActivity.compressPageImages()` swaps a recompressed image
  back in under the same resource name.
- `PDFMergerUtility().appendDocument(destination, source)`.
- `PDType1Font`: static instances `TIMES_ROMAN`/`TIMES_BOLD`/`TIMES_ITALIC`/
  `TIMES_BOLD_ITALIC`, `HELVETICA`/`HELVETICA_BOLD`/`HELVETICA_OBLIQUE`/
  `HELVETICA_BOLD_OBLIQUE`, `COURIER*`, `SYMBOL`, `ZAPF_DINGBATS`.
  `.getStringWidth(String): Float` — width in **1/1000 units of text
  space** (so `width_in_points = getStringWidth(text) / 1000f * fontSize`),
  throws `IOException`/`IllegalArgumentException` for unsupported
  characters (encoding is WinAnsiEncoding for the standard 14 fonts).
- `PDFTextStripper()` (throws `IOException`), `.getText(PDDocument): String`
  (throws `IOException`) — package `com.tom_roush.pdfbox.text`.

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

## Original Phase 2–4 sketch (kept for context — see "Deliberate scope decisions" above for what actually shipped)

Two engine choices were confirmed with the user before Phase 1 was built and
still apply:

- **OCR: Tesseract4Android** (open-source, on-device) over Google ML Kit —
  keeps the whole feature genuinely open source.
- **Word/PPT/Excel: a hand-rolled minimal OOXML engine**, not Apache POI —
  docx/pptx/xlsx are just ZIP+XML, ~~the app already depends on `zip4j` for
  exactly this kind of zip manipulation (`ZipExtractorActivity`)~~ *(revised:
  the engines use `java.util.zip` instead — see above)*, and POI isn't built
  for Android (AWT dependencies, huge method count).

~~`XlsxEngine`: cell text/number values + basic number formatting.~~ Built
without number formatting — see "Done" above.

~~`DocxEngine`/`PptxEngine`: DOCX paragraphs/runs (bold/italic/font
size/color), simple tables, inline images; PPTX slides with title/body text
placeholders and images.~~ Built narrower — whole-paragraph bold/italic only,
no tables/images for docx; title/body text only, no images, for pptx — see
"Deliberate scope decisions" above.

~~DOCX/PPTX/XLSX compression: same rezip + embedded-image-recompression pass
as Phase 2, applied to `word/media` / `ppt/media` entries.~~ Built as a
single shared `OoxmlCompressor`, not per-format logic, and deliberately not
wired to "compress what I've edited" — see "Deliberate scope decisions"
above for why.

## Next-session checklist

1. Check the CI run on the current branch/PR and fix any compile errors it
   surfaces in the Phase 2–4 files — this is the first real build any of
   that code will have cleared.
2. If PR #111 is still open, merge it (Phase 1 was already confirmed green
   and mergeable) — or if Phases 2–4 rode in on the same PR, get that whole
   PR green and merge it.
3. Install on a device/emulator and walk through both the Phase 1 checklist
   and the Phase 2–4 checklist under "Not done yet" above. The pptx writer
   especially needs a real open-in-PowerPoint-or-LibreOffice check.
4. Nothing further is planned beyond the four phases — re-confirm with the
   user before adding scope (formulas, tables, images, rich per-run
   formatting, PDF⇄PowerPoint) rather than assuming it's wanted.
