@file:OptIn(ExperimentalMaterial3Api::class)

package online.productwithrohan.smssorter.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import online.productwithrohan.smssorter.core.Brands
import online.productwithrohan.smssorter.core.TxnType
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

private val Green = Color(0xFF1B873F)

@Composable
fun FinanceScreen(state: UiState, onOpenSource: (Long) -> Unit) {
    var month by remember { mutableStateOf(YearMonth.now()) }
    val inMonth = state.transactions.filter { YearMonth.from(it.sms.timestamp.toLocalDate()) == month }
    val moneyIn = inMonth.filter { it.txn.type == TxnType.CREDIT }.sumOf { it.txn.amount }
    val moneyOut = inMonth.filter { it.txn.type == TxnType.DEBIT }.sumOf { it.txn.amount }
    val accounts = state.transactions.mapNotNull { it.txn.account?.let { a -> a to it } }
        .distinctBy { it.first }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = { TopAppBar(title = { Text("Finance", style = MaterialTheme.typography.headlineMedium) }) },
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { month = month.minusMonths(1) }) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Previous month")
                    }
                    Text(
                        month.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                    IconButton(onClick = { month = month.plusMonths(1) }, enabled = month < YearMonth.now()) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Next month")
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SummaryCard("Money in", rupees(moneyIn), Green, Modifier.weight(1f))
                    SummaryCard("Money out", rupees(moneyOut), MaterialTheme.colorScheme.error, Modifier.weight(1f))
                }
            }
            if (accounts.isNotEmpty()) {
                item { Text("Accounts & cards", style = MaterialTheme.typography.titleMedium) }
                items(accounts, key = { "a" + it.first }) { (acct, latest) ->
                    Card(Modifier.fillMaxWidth().clickable { onOpenSource(latest.sms.id) }) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(Brands.nameFor(latest.sms.address) ?: Brands.headerOrAddress(latest.sms.address))
                                Text(acct, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text("Last activity ${listTime(latest.sms.timestamp)}", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
            item { Text("Transactions", style = MaterialTheme.typography.titleMedium) }
            if (inMonth.isEmpty()) {
                item { Text("No transactions found this month.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(inMonth, key = { "t" + it.sms.id }) { item ->
                val credit = item.txn.type == TxnType.CREDIT
                Column(Modifier.clickable { onOpenSource(item.sms.id) }) {
                    Row(Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                item.txn.counterparty ?: Brands.nameFor(item.sms.address) ?: item.sms.address,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                listOfNotNull(listTime(item.sms.timestamp), item.txn.account).joinToString(" · "),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            (if (credit) "+" else "−") + rupees(item.txn.amount),
                            color = if (credit) Green else MaterialTheme.colorScheme.onSurface,
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(label: String, value: String, color: Color, modifier: Modifier) {
    Card(modifier) {
        Column(Modifier.padding(16.dp)) {
            Text(label, style = MaterialTheme.typography.labelLarge)
            Text(value, style = MaterialTheme.typography.titleLarge, color = color, maxLines = 1)
        }
    }
}
