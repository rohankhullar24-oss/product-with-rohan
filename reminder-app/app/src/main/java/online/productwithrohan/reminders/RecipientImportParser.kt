package online.productwithrohan.reminders

/**
 * Parses a CSV or vCard file's text into [RecipientEntry] rows, for
 * "Import from file" in [EditRecipientListActivity]. Deliberately tolerant —
 * this reads exports from contacts apps and spreadsheets, which vary a lot in
 * header naming and quoting, so it favors extracting *something* usable over
 * strict format validation.
 */
object RecipientImportParser {

    fun parse(text: String): List<RecipientEntry> =
        if (text.trimStart().startsWith("BEGIN:VCARD", ignoreCase = true)) parseVCard(text) else parseCsv(text)

    /**
     * One contact per row: `name,phone` (or `phone,name` — whichever column
     * looks like a phone number wins), extra columns ignored. A header row
     * (no column contains a phone-shaped value) is skipped automatically.
     */
    private fun parseCsv(text: String): List<RecipientEntry> {
        val entries = mutableListOf<RecipientEntry>()
        for (rawLine in text.lineSequence()) {
            val line = rawLine.trim()
            if (line.isEmpty()) continue
            val columns = splitCsvLine(line).map { it.trim().trim('"') }
            val phone = columns.firstOrNull { looksLikePhone(it) } ?: continue
            val name = columns.firstOrNull { it.isNotBlank() && it != phone } ?: ""
            entries.add(RecipientEntry(name = name, phone = phone))
        }
        return entries
    }

    private fun splitCsvLine(line: String): List<String> {
        val result = mutableListOf<String>()
        val current = StringBuilder()
        var inQuotes = false
        for (c in line) {
            when {
                c == '"' -> inQuotes = !inQuotes
                (c == ',' || c == '\t' || c == ';') && !inQuotes -> {
                    result.add(current.toString())
                    current.clear()
                }
                else -> current.append(c)
            }
        }
        result.add(current.toString())
        return result
    }

    /** At least 5 digits once separators/formatting are stripped. */
    private fun looksLikePhone(value: String): Boolean {
        val digits = value.filter { it.isDigit() }
        if (digits.length < 5) return false
        val cleaned = value.trim().removePrefix("+")
        return cleaned.all { it.isDigit() || it in " -()." }
    }

    /** Handles the common `FN:`/`N:` and `TEL...:` lines across vCard 2.1/3.0/4.0. */
    private fun parseVCard(text: String): List<RecipientEntry> {
        val entries = mutableListOf<RecipientEntry>()
        var name = ""
        val phones = mutableListOf<String>()

        fun flush() {
            phones.forEach { entries.add(RecipientEntry(name = name, phone = it)) }
            name = ""
            phones.clear()
        }

        for (rawLine in text.lineSequence()) {
            val line = rawLine.trim()
            when {
                line.equals("BEGIN:VCARD", ignoreCase = true) -> { name = ""; phones.clear() }
                line.equals("END:VCARD", ignoreCase = true) -> flush()
                line.startsWith("FN", ignoreCase = true) && line.contains(':') ->
                    name = line.substringAfter(':').trim()
                line.startsWith("TEL", ignoreCase = true) && line.contains(':') ->
                    line.substringAfter(':').trim().takeIf { it.isNotBlank() }?.let { phones.add(it) }
            }
        }
        return entries
    }
}
