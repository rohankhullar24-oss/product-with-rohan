# Missing: eng.traineddata

OCR (`OcrScanActivity`) needs Tesseract's English trained-data file at
`eng.traineddata` in this directory. It isn't committed here — it's a ~15 MB
binary and this repo doesn't vendor large binary assets that can be fetched
at build/setup time instead.

To enable OCR, download the "fast" English model from Tesseract's official
tessdata repo and place it here:

https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata

(`tessdata_fast` trades a little accuracy for a much smaller file than the
main `tessdata` repo's `eng.traineddata` — either works with Tesseract4Android
4.9.0, since both are v4 trained-data files.)

Without this file, `OcrScanActivity` still runs, but shows
`ocr_language_missing` instead of recognizing text — it fails gracefully
rather than crashing.
