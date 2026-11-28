package online.productwithrohan.smssorter.core

import java.time.LocalDate

object DateParser {
    private const val MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?"
    private val dayMonYear = Regex(
        "\\b(\\d{1,2})(?:st|nd|rd|th)?[-/ .]?$MON(?:[-/ .,']+(\\d{4}|\\d{2}(?![:\\d])))?",
        RegexOption.IGNORE_CASE,
    )
    private val monDayYear = Regex(
        "\\b$MON\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![:\\d])(?:,?\\s*(\\d{4}))?",
        RegexOption.IGNORE_CASE,
    )
    private val numeric = Regex("\\b(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{4}|\\d{2})\\b")
    private val months = listOf("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")

    data class Found(val start: Int, val date: LocalDate)

    /** All dates in [text], in order. Missing years are filled in relative to [reference]. */
    fun findAll(text: String, reference: LocalDate): List<Found> {
        val out = mutableListOf<Found>()
        dayMonYear.findAll(text).forEach { m ->
            build(m.groupValues[1], month(m.groupValues[2]), m.groupValues[3], reference)?.let { out += Found(m.range.first, it) }
        }
        monDayYear.findAll(text).forEach { m ->
            build(m.groupValues[2], month(m.groupValues[1]), m.groupValues[3], reference)?.let { out += Found(m.range.first, it) }
        }
        numeric.findAll(text).forEach { m ->
            build(m.groupValues[1], m.groupValues[2].toInt(), m.groupValues[3], reference)?.let { out += Found(m.range.first, it) }
        }
        return out.distinctBy { it.start }.sortedBy { it.start }
    }

    /** First date that appears after [index] in [text]. */
    fun firstAfter(text: String, index: Int, reference: LocalDate): LocalDate? =
        findAll(text, reference).firstOrNull { it.start >= index }?.date

    private fun month(name: String) = months.indexOf(name.take(3).lowercase()) + 1

    private fun build(day: String, month: Int, year: String, ref: LocalDate): LocalDate? {
        if (month !in 1..12) return null
        val d = day.toIntOrNull() ?: return null
        val y = when (year.length) {
            4 -> year.toInt()
            2 -> 2000 + year.toInt()
            else -> ref.year
        }
        val date = runCatching { LocalDate.of(y, month, d) }.getOrNull() ?: return null
        // "13 Dec" written in late December may mean next year's date.
        return if (year.isEmpty() && date.isBefore(ref.minusMonths(6))) date.plusYears(1) else date
    }
}
