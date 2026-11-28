package online.productwithrohan.smssorter.core

object Amounts {
    val PATTERN = Regex(
        "(?:INR|Rs\\.?|₹)\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)",
        RegexOption.IGNORE_CASE,
    )

    fun parse(raw: String): Double? = raw.replace(",", "").trimEnd('.').toDoubleOrNull()

    fun first(text: String, from: Int = 0): Double? =
        PATTERN.find(text, from)?.groupValues?.get(1)?.let(::parse)
}
