@file:OptIn(ExperimentalMaterial3Api::class)

package online.productwithrohan.smssorter.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Train
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import online.productwithrohan.smssorter.core.Reminder
import online.productwithrohan.smssorter.core.ReminderKind
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Composable
fun RemindersScreen(state: UiState, vm: AppViewModel, onOpenSource: (Long) -> Unit) {
    var history by rememberSaveable { mutableStateOf(false) }
    val list = if (history) state.reminders.history else state.reminders.upcoming

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = { TopAppBar(title = { Text("Reminders", style = MaterialTheme.typography.headlineMedium) }) },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item { FilterChip(!history, { history = false }, { Text("Upcoming") }, shape = RoundedCornerShape(50)) }
                item { FilterChip(history, { history = true }, { Text("History") }, shape = RoundedCornerShape(50)) }
            }
            if (list.isEmpty()) {
                CenterText(
                    if (history) "Past bills and trips will show up here."
                    else "No upcoming bills or trips. They're picked up automatically from your messages.",
                )
            } else {
                LazyColumn {
                    items(list, key = { it.key }) { r ->
                        ReminderRow(
                            r = r,
                            upcoming = !history,
                            onClick = { onOpenSource(r.sourceMessageId) },
                            onDone = { vm.markReminderDone(r.key) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ReminderRow(r: Reminder, upcoming: Boolean, onClick: () -> Unit, onDone: () -> Unit) {
    val icon = when (r.kind) {
        ReminderKind.TRAIN -> Icons.Filled.Train
        ReminderKind.CARD -> Icons.Filled.CreditCard
        ReminderKind.PHONE -> Icons.Filled.PhoneAndroid
        ReminderKind.BILL -> Icons.Filled.Receipt
    }
    val daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), r.date)
    Column(Modifier.clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp, end = 16.dp))
            Column(Modifier.weight(1f)) {
                Text(r.title, style = MaterialTheme.typography.titleMedium)
                r.subtitle?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(shortDate(r.date), style = MaterialTheme.typography.bodyLarge)
                if (upcoming) {
                    Text(
                        when (daysLeft) { 0L -> "Today"; 1L -> "Tomorrow"; else -> "in $daysLeft days" },
                        style = MaterialTheme.typography.labelMedium,
                        color = if (daysLeft <= 3) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        if (upcoming && (r.amount != null || r.kind != ReminderKind.TRAIN)) {
            Row(Modifier.fillMaxWidth().padding(start = 40.dp, top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    if (r.amount != null) {
                        Text("Bill amount", style = MaterialTheme.typography.bodyMedium)
                        Text(rupees(r.amount!!), style = MaterialTheme.typography.titleMedium)
                    }
                }
                OutlinedButton(onClick = onDone) { Text(if (r.kind == ReminderKind.TRAIN) "Done" else "Mark paid") }
            }
        }
        HorizontalDivider(Modifier.padding(start = 40.dp, top = 12.dp))
    }
}
