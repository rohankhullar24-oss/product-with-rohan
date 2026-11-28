package online.productwithrohan.smssorter.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import online.productwithrohan.smssorter.core.Classifier
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs

private val avatarColors = listOf(
    Color(0xFFFDE7E4), Color(0xFFEDE7FB), Color(0xFFE3F4EA), Color(0xFFE6EBF7),
    Color(0xFFF6E6F6), Color(0xFFE0F4F1), Color(0xFFFFF1DC),
)

@Composable
fun Avatar(name: String, selected: Boolean = false, size: Dp = 48.dp) {
    val bg = if (selected) MaterialTheme.colorScheme.primary else avatarColors[abs(name.hashCode()) % avatarColors.size]
    Box(
        Modifier.size(size).background(bg, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        when {
            selected -> Icon(Icons.Filled.Check, contentDescription = "Selected", tint = MaterialTheme.colorScheme.onPrimary)
            else -> {
                val initial = if (Classifier.isPhoneNumber(name)) "#" else name.firstOrNull { it.isLetterOrDigit() }?.uppercase() ?: "?"
                Text(initial, color = Color(0xFF555566), fontSize = (size.value * 0.4f).sp)
            }
        }
    }
}

private val zone: ZoneId get() = ZoneId.systemDefault()
private val timeFmt = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)
private val dayMonth = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)
private val dayMonthYear = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)
private val longDate = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH)

fun Long.toLocalDate(): LocalDate = Instant.ofEpochMilli(this).atZone(zone).toLocalDate()

/** "11:05 AM" today, "27 Nov" this year, "27 Nov 2025" otherwise. */
fun listTime(ts: Long): String {
    val dt = Instant.ofEpochMilli(ts).atZone(zone)
    val today = LocalDate.now(zone)
    return when {
        dt.toLocalDate() == today -> dt.format(timeFmt)
        dt.year == today.year -> dt.format(dayMonth)
        else -> dt.format(dayMonthYear)
    }
}

fun clockTime(ts: Long): String = Instant.ofEpochMilli(ts).atZone(zone).format(timeFmt)
fun longDate(ts: Long): String = Instant.ofEpochMilli(ts).atZone(zone).format(longDate)
fun shortDate(d: LocalDate): String = d.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH))

private val rupees = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"))

fun rupees(amount: Double): String {
    rupees.maximumFractionDigits = if (amount % 1.0 == 0.0) 0 else 2
    rupees.minimumFractionDigits = rupees.maximumFractionDigits
    return rupees.format(amount)
}
