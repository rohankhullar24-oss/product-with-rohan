@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)

package online.productwithrohan.smssorter.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SelectAll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import online.productwithrohan.smssorter.core.Category
import online.productwithrohan.smssorter.core.Conversation
import online.productwithrohan.smssorter.core.Sms
import online.productwithrohan.smssorter.data.UpdateChecker
import kotlinx.coroutines.launch

enum class InboxTab(val label: String, val category: Category?) {
    PERSONAL("Personal", Category.PERSONAL),
    TRANSACTIONS("Transactions", Category.TRANSACTIONS),
    PROMOTIONS("Promotions", Category.PROMOTIONS),
    STARRED("Starred", null),
}

@Composable
fun MessagesScreen(
    state: UiState,
    vm: AppViewModel,
    onOpenThread: (Conversation) -> Unit,
    onOpenMessage: (Sms) -> Unit,
    onCompose: () -> Unit,
    requestDefault: () -> Unit,
) {
    var tab by rememberSaveable { mutableStateOf(InboxTab.PERSONAL) }
    var searching by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var selection by remember { mutableStateOf(setOf<Long>()) }
    var showDelete by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val q = query.trim()
    val visible = state.conversations.filter { c ->
        if (q.isNotEmpty()) {
            state.displayName(c.address).contains(q, ignoreCase = true) ||
                state.byThread[c.threadId].orEmpty().any { it.body.contains(q, ignoreCase = true) }
        } else {
            c.category == tab.category
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            when {
                selection.isNotEmpty() -> TopAppBar(
                    navigationIcon = {
                        IconButton(onClick = { selection = emptySet() }) { Icon(Icons.Filled.Close, "Cancel selection") }
                    },
                    title = { Text("${selection.size}") },
                    actions = {
                        IconButton(onClick = { selection = visible.map { it.threadId }.toSet() }) {
                            Icon(Icons.Filled.SelectAll, "Select all")
                        }
                        IconButton(onClick = { showDelete = true }) { Icon(Icons.Filled.Delete, "Delete") }
                    },
                )
                searching -> TopAppBar(
                    navigationIcon = {
                        IconButton(onClick = { searching = false; query = "" }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Close search")
                        }
                    },
                    title = {
                        TextField(
                            value = query,
                            onValueChange = { query = it },
                            placeholder = { Text("Search all messages") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                            ),
                        )
                    },
                )
                else -> TopAppBar(
                    title = { Text("Messages", style = MaterialTheme.typography.headlineMedium) },
                    actions = { IconButton(onClick = { searching = true }) { Icon(Icons.Filled.Search, "Search") } },
                )
            }
        },
        floatingActionButton = {
            if (selection.isEmpty()) {
                FloatingActionButton(onClick = onCompose, shape = CircleShape) { Icon(Icons.Filled.Edit, "New message") }
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            state.updateAvailable?.let { UpdateBanner(it) }
            if (!state.isDefaultApp) DefaultAppBanner(requestDefault)
            if (q.isEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(InboxTab.entries) { t ->
                        val hasUnread = t.category != null &&
                            state.conversations.any { it.category == t.category && state.unread(it) > 0 }
                        FilterChip(
                            selected = tab == t,
                            onClick = { tab = t; selection = emptySet() },
                            label = {
                                Text(t.label)
                                if (hasUnread) {
                                    Spacer(Modifier.width(4.dp))
                                    Box(Modifier.size(6.dp).background(MaterialTheme.colorScheme.error, CircleShape))
                                }
                            },
                            shape = RoundedCornerShape(50),
                        )
                    }
                }
            }

            when {
                state.loading -> CenterText("Loading messages…")
                q.isEmpty() && tab == InboxTab.STARRED -> StarredList(state, onOpenMessage, vm::toggleStar)
                visible.isEmpty() -> CenterText(if (q.isEmpty()) "Nothing in ${tab.label} yet" else "No matches")
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    items(visible, key = { it.threadId }) { c ->
                        ConversationRow(
                            c = c,
                            name = state.displayName(c.address),
                            unread = state.unread(c),
                            selected = c.threadId in selection,
                            onClick = {
                                if (selection.isNotEmpty()) selection = selection.toggle(c.threadId) else onOpenThread(c)
                            },
                            onLongClick = { selection = selection.toggle(c.threadId) },
                        )
                    }
                }
            }
        }
    }

    if (showDelete) {
        DeleteDialog(
            state = state,
            threadIds = selection,
            onDismiss = { showDelete = false },
            requestDefault = { showDelete = false; requestDefault() },
            onConfirm = { includeStarred ->
                showDelete = false
                val ids = selection
                selection = emptySet()
                vm.deleteThreads(ids, includeStarred) { r ->
                    val msg = buildString {
                        append("Deleted ${r.deleted} message${if (r.deleted == 1) "" else "s"}")
                        if (r.keptStarred > 0) append(" · kept ${r.keptStarred} starred")
                    }
                    scope.launch { snackbar.showSnackbar(msg) }
                }
            },
        )
    }
}

private fun Set<Long>.toggle(id: Long) = if (id in this) this - id else this + id

@Composable
private fun UpdateBanner(version: Long) {
    val context = androidx.compose.ui.platform.LocalContext.current
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "A new version of SMS Sorter is available (build $version).",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = {
                context.startActivity(
                    android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(UpdateChecker.APK_URL)),
                )
            }) { Text("Update") }
        }
    }
}

@Composable
private fun DefaultAppBanner(onClick: () -> Unit) {
    Surface(
        color = MaterialTheme.colorScheme.secondaryContainer,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Make SMS Sorter your default SMS app to receive, reply to and delete messages.",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = onClick) { Text("Set") }
        }
    }
}

@Composable
private fun ConversationRow(
    c: Conversation,
    name: String,
    unread: Int,
    selected: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    val bg = if (selected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else Color.Transparent
    Column(Modifier.background(bg).combinedClickable(onClick = onClick, onLongClick = onLongClick)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Avatar(name, selected)
            Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
                Text(
                    name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (unread > 0) FontWeight.Bold else FontWeight.Normal,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                Text(
                    c.latest.body.replace('\n', ' '),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    listTime(c.latest.timestamp),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (unread > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (unread > 0) {
                    Spacer(Modifier.size(4.dp))
                    Badge(containerColor = MaterialTheme.colorScheme.primary) { Text("$unread") }
                }
            }
        }
        HorizontalDivider(Modifier.padding(start = 78.dp, end = 16.dp))
    }
}

@Composable
private fun StarredList(state: UiState, onOpen: (Sms) -> Unit, onToggleStar: (Long) -> Unit) {
    val starred = state.messages.filter { it.id in state.starred }
    if (starred.isEmpty()) {
        CenterText("Star a message to keep it here. Starred messages are kept when you delete a conversation.")
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        var lastDay = ""
        starred.forEach { sms ->
            val day = longDate(sms.timestamp)
            if (day != lastDay) {
                lastDay = day
                item(key = "h$day") { DateHeader(day) }
            }
            item(key = sms.id) {
                MessageBubble(
                    sms = sms,
                    starred = true,
                    sender = state.displayName(sms.address),
                    onToggleStar = { onToggleStar(sms.id) },
                    modifier = Modifier.clickable { onOpen(sms) },
                )
            }
        }
    }
}

@Composable
fun DateHeader(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
}

@Composable
fun CenterText(text: String) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun DeleteDialog(
    state: UiState,
    threadIds: Set<Long>,
    onDismiss: () -> Unit,
    requestDefault: () -> Unit,
    onConfirm: (includeStarred: Boolean) -> Unit,
) {
    if (!state.isDefaultApp) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Set SMS Sorter as default?") },
            text = { Text("Android only lets your default SMS app delete messages.") },
            confirmButton = { Button(onClick = requestDefault) { Text("Set as default") } },
            dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        )
        return
    }
    var includeStarred by remember { mutableStateOf(false) }
    val starredCount = threadIds.sumOf { t -> state.byThread[t].orEmpty().count { it.id in state.starred } }
    val n = threadIds.size
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete $n conversation${if (n == 1) "" else "s"}?") },
        text = {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Delete starred messages", Modifier.weight(1f))
                    Switch(checked = includeStarred, onCheckedChange = { includeStarred = it }, enabled = starredCount > 0)
                }
                if (starredCount > 0) {
                    Text(
                        if (includeStarred) "$starredCount starred message${if (starredCount == 1) "" else "s"} will be deleted too."
                        else "$starredCount starred message${if (starredCount == 1) "" else "s"} will be kept.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
        confirmButton = { Button(onClick = { onConfirm(includeStarred) }) { Text("Delete") } },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
