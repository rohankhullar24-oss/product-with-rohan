@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)

package online.productwithrohan.smssorter.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import online.productwithrohan.smssorter.core.Classifier
import online.productwithrohan.smssorter.core.OtpParser
import online.productwithrohan.smssorter.core.Sms
import online.productwithrohan.smssorter.data.ContactEntry

private sealed interface Entry {
    val key: Any
    data class Header(val text: String) : Entry { override val key get() = "h$text" }
    data class Msg(val sms: Sms) : Entry { override val key get() = sms.id }
}

@Composable
fun ThreadScreen(
    threadId: Long,
    address: String,
    state: UiState,
    vm: AppViewModel,
    onBack: () -> Unit,
    requestDefault: () -> Unit,
) {
    val context = LocalContext.current
    val name = state.displayName(address)
    val messages = state.byThread[threadId].orEmpty().sortedBy { it.timestamp }
    val entries = buildList {
        var lastDay = ""
        for (m in messages) {
            val day = longDate(m.timestamp)
            if (day != lastDay) { add(Entry.Header(day)); lastDay = day }
            add(Entry.Msg(m))
        }
    }
    val listState = rememberLazyListState()
    LaunchedEffect(threadId) { vm.markSeen(threadId) }
    LaunchedEffect(entries.size) { if (entries.isNotEmpty()) listState.scrollToItem(entries.lastIndex) }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(name, size = 36.dp)
                        Text(name, Modifier.padding(start = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                },
                actions = {
                    if (Classifier.isPhoneNumber(address)) {
                        IconButton(onClick = {
                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(address)}")))
                        }) { Icon(Icons.Filled.Call, "Call") }
                    }
                },
            )
        },
        bottomBar = {
            ReplyBar(
                canReply = Classifier.isPhoneNumber(address),
                isDefault = state.isDefaultApp,
                requestDefault = requestDefault,
                onSend = { vm.send(address, it) },
            )
        },
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(entries, key = { it.key }) { e ->
                when (e) {
                    is Entry.Header -> DateHeader(e.text)
                    is Entry.Msg -> MessageBubble(
                        sms = e.sms,
                        starred = e.sms.id in state.starred,
                        onToggleStar = { vm.toggleStar(e.sms.id) },
                        modifier = Modifier.combinedClickable(onClick = {}, onLongClick = { vm.toggleStar(e.sms.id) }),
                    )
                }
            }
        }
    }
}

@Composable
fun MessageBubble(
    sms: Sms,
    starred: Boolean,
    onToggleStar: () -> Unit,
    modifier: Modifier = Modifier,
    sender: String? = null,
) {
    val clipboard = LocalClipboardManager.current
    val otp = remember(sms.body) { if (sms.incoming) OtpParser.find(sms.body) else null }
    Box(Modifier.fillMaxWidth(), contentAlignment = if (sms.incoming) Alignment.CenterStart else Alignment.CenterEnd) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = if (sms.incoming) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer,
            modifier = modifier.widthIn(max = 320.dp),
        ) {
            Column(Modifier.padding(start = 14.dp, end = 14.dp, top = 10.dp, bottom = 4.dp)) {
                Text(sms.body, style = MaterialTheme.typography.bodyLarge)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (starred) Icons.Filled.Star else Icons.Filled.StarBorder,
                        contentDescription = if (starred) "Unstar" else "Star",
                        tint = if (starred) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(32.dp).clickable(onClick = onToggleStar).padding(6.dp),
                    )
                    Text(
                        listOfNotNull(clockTime(sms.timestamp), sender).joinToString("   "),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (otp != null) {
                        Spacer(Modifier.weight(1f, fill = false).size(8.dp))
                        TextButton(onClick = { clipboard.setText(AnnotatedString(otp)) }) {
                            Icon(Icons.Filled.ContentCopy, null, Modifier.size(16.dp))
                            Text(" Copy $otp")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReplyBar(canReply: Boolean, isDefault: Boolean, requestDefault: () -> Unit, onSend: (String) -> Unit) {
    Surface(tonalElevation = 2.dp, modifier = Modifier.navigationBarsPadding().imePadding()) {
        Box(Modifier.fillMaxWidth().padding(12.dp)) {
            when {
                !canReply -> Text(
                    "This sender doesn't accept replies",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.Center),
                )
                !isDefault -> Button(onClick = requestDefault, modifier = Modifier.align(Alignment.Center)) {
                    Text("Set as default SMS app to reply")
                }
                else -> MessageInput(onSend)
            }
        }
    }
}

@Composable
fun MessageInput(onSend: (String) -> Unit) {
    var text by rememberSaveable { mutableStateOf("") }
    Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = { Text("Message…") },
            modifier = Modifier.weight(1f),
            maxLines = 5,
            shape = RoundedCornerShape(24.dp),
        )
        IconButton(
            onClick = { onSend(text.trim()); text = "" },
            enabled = text.isNotBlank(),
        ) { Icon(Icons.AutoMirrored.Filled.Send, "Send") }
    }
}

@Composable
fun ComposeScreen(
    initialAddress: String,
    isDefault: Boolean,
    contacts: List<ContactEntry>,
    canReadContacts: Boolean,
    onOpen: () -> Unit,
    requestContacts: () -> Unit,
    onBack: () -> Unit,
    requestDefault: () -> Unit,
    onSend: (address: String, body: String) -> Unit,
) {
    var to by rememberSaveable { mutableStateOf(initialAddress) }
    var chosenName by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { onOpen() }

    val picked = chosenName
    val query = to.trim()
    val digits = query.filter(Char::isDigit)
    val matches = remember(query, contacts) {
        if (query.isEmpty()) contacts
        else contacts.filter {
            it.name.contains(query, ignoreCase = true) ||
                (digits.length >= 3 && it.number.filter(Char::isDigit).contains(digits))
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                title = { Text("New message") },
            )
        },
        bottomBar = {
            Surface(tonalElevation = 2.dp, modifier = Modifier.navigationBarsPadding().imePadding()) {
                Box(Modifier.fillMaxWidth().padding(12.dp)) {
                    if (isDefault) {
                        MessageInput { body -> if (to.isNotBlank()) onSend(to.trim(), body) }
                    } else {
                        Button(onClick = requestDefault, modifier = Modifier.align(Alignment.Center)) {
                            Text("Set as default SMS app to send")
                        }
                    }
                }
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = to,
                onValueChange = { to = it; chosenName = null },
                label = { Text("To: name or number") },
                supportingText = if (picked != null) { { Text(picked) } } else null,
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )
            when {
                !canReadContacts -> Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    TextButton(onClick = requestContacts) { Text("Allow access to contacts to pick a recipient") }
                }
                chosenName != null -> Unit
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    items(matches, key = { it.number }) { c ->
                        Row(
                            Modifier.fillMaxWidth()
                                .clickable { to = c.number; chosenName = c.name }
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Avatar(c.name, size = 40.dp)
                            Column(Modifier.padding(start = 14.dp)) {
                                Text(c.name, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(c.number, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}
