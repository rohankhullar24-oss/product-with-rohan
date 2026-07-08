# The Product Manager Handbook — build scripts

Merges 93 raw chapter `.docx` files into one professionally formatted
"The Product Manager Handbook" (Word + PDF), organized into 5 volumes with
front matter, appendices, glossary, and index.

## Files

- `content.py` — all hand-written content: front matter (foreword, preface,
  about the author, etc.), the 5 volume titles/descriptions, and the 8
  appendices + glossary + index term list.
- `build_handbook.py` — reads the 93 source chapter `.docx` files, extracts
  each paragraph/table into a neutral format, and re-emits everything into a
  brand-new `python-docx` document with its own style definitions (so
  typography is guaranteed consistent), 5 volumes, front/back matter, TOC and
  INDEX fields, and per-volume sections with running headers/footers.
- `convert_to_pdf.py` — converts the built `.docx` to PDF via a headless
  LibreOffice Basic macro that forces a full field update (TOC + Index +
  page numbers) before exporting, since a plain
  `soffice --headless --convert-to pdf` does **not** recalculate those
  fields.
- `finalize_manifest.py` — adds PDF page count and file sizes to
  `manifest.json` after the PDF is built.
- `manifest.json` — generated output: book title/subtitle, volume
  descriptions, chapter titles per volume, appendix titles, page count, file
  sizes. Used to build the website's download page.

## Regenerating

The 93 source chapter files are **not** stored in this repo (per project
policy) — they live in a scratch path referenced at the top of
`build_handbook.py` (`SRC_DIR`). If you need to regenerate the handbook from
scratch, get the 93 source `.docx` files back into that path (or update
`SRC_DIR` to point at wherever they live), then:

```bash
cd scripts/handbook

# 1. Merge the 93 chapters into one .docx with front/back matter, styles, fields.
python3 build_handbook.py

# 2. Convert to PDF, forcing TOC/Index field resolution.
python3 convert_to_pdf.py \
    ../../public/handbook/The-Product-Manager-Handbook.docx \
    ../../public/handbook/The-Product-Manager-Handbook.pdf

# 3. Update manifest.json with the final page count / file sizes.
python3 finalize_manifest.py
```

Requirements: `python-docx`, LibreOffice with the `libreoffice-writer`
component installed (`apt-get install libreoffice-writer`; a `libreoffice-core`
only install can *open* documents via `--convert-to` but several UNO calls used
here need the Writer component), and `poppler-utils` (`pdfinfo`/`pdftotext`)
if you want to spot-check the output.

## Notable implementation details / gotchas

- **Why rebuild from scratch instead of splicing OOXML**: copying `w:p`/`w:tbl`
  XML between 93 differently-styled documents is fragile and easily corrupts
  the result. Instead, each chapter is parsed into `(style_name, runs)` /
  `(table rows)` blocks and re-emitted into one new document using a single
  set of style definitions (`define_styles()` in `build_handbook.py`).
- **Field resolution (TOC/INDEX/PAGE)**: `python-docx` can insert the raw field
  codes, but nothing then computes the page numbers. `set_update_fields()`
  sets `<w:updateFields w:val="true"/>` in `word/settings.xml` so Word (or a
  compliant viewer) recalculates on open, but LibreOffice's plain
  `--convert-to pdf` conversion path ignores that flag. `convert_to_pdf.py`
  works around this by driving LibreOffice through a one-shot Basic macro
  that: loads the doc, dispatches `.uno:UpdateAll` (the same command as
  Tools > Update > Update All / Ctrl+A, F9 in the UI), then exports to PDF.
  Calling `document.getDocumentIndexes()` / `.update()` directly via UNO
  reliably crashed this environment's headless LibreOffice install (core +
  writer only, no full desktop); the `.uno:UpdateAll` dispatch path avoids
  that crash and produces fully resolved page numbers for both TOC and Index.
- **A fresh LibreOffice user profile resets custom Basic macros on its first
  launch.** `convert_to_pdf.py` does a throwaway "bootstrap" launch first (to
  let LibreOffice finish initializing a brand-new profile directory), then
  re-writes the macro module and launches again for the run that actually
  matters. Skipping this step causes the macro to silently do nothing on the
  very first invocation against a fresh profile.
- **No listening sockets.** An earlier approach used a `soffice --accept=
  socket,...;urp;` listener + python-uno client, which is the standard way to
  script LibreOffice. In this sandboxed environment, any process that opens a
  listening socket (TCP or named pipe) gets killed outright, so the working
  approach here avoids `--accept=` entirely and drives everything through a
  single one-shot `vnd.sun.star.script:` macro invocation instead.
- **Page numbering across volume sections.** Each volume gets its own
  `w:sectPr` (for per-volume header text). `set_page_number_format()` must
  explicitly clear an inherited `w:start` attribute when a section should
  *continue* numbering from the previous section — `python-docx`'s
  `add_section()` clones the previous section's `sectPr`, so simply not
  passing a `start` value is not enough; the stale attribute has to be
  deleted or every volume silently restarts at page 1.
- **Index terms** (`content.INDEX_TERMS`, 60 entries) and **glossary terms**
  (`content.GLOSSARY_TERMS`, ~94 entries) were selected by grepping the
  concatenated text of all 93 chapters for candidate framework/PM/AI terms
  and keeping only ones verified to actually occur (case-insensitively,
  allowing space/hyphen variation) in the body — see the term lists in
  `content.py` for the final selections.
