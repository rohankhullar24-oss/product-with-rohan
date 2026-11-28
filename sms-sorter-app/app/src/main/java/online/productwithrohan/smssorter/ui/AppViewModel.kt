package online.productwithrohan.smssorter.ui

import android.app.Application
import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import online.productwithrohan.smssorter.core.Conversation
import online.productwithrohan.smssorter.core.Organizer
import online.productwithrohan.smssorter.core.Reminders
import online.productwithrohan.smssorter.core.Sms
import online.productwithrohan.smssorter.core.Transaction
import online.productwithrohan.smssorter.core.TransactionParser
import online.productwithrohan.smssorter.data.ContactEntry
import online.productwithrohan.smssorter.data.Prefs
import online.productwithrohan.smssorter.data.SmsRepository
import online.productwithrohan.smssorter.data.UpdateChecker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate

data class TxnItem(val sms: Sms, val txn: Transaction)

data class UiState(
    val loading: Boolean = true,
    val canRead: Boolean = false,
    val isDefaultApp: Boolean = false,
    val messages: List<Sms> = emptyList(),
    val byThread: Map<Long, List<Sms>> = emptyMap(),
    val conversations: List<Conversation> = emptyList(),
    val names: Map<String, String> = emptyMap(),
    val starred: Set<Long> = emptySet(),
    val reminders: Reminders = Reminders(emptyList(), emptyList()),
    val transactions: List<TxnItem> = emptyList(),
    val seenThreads: Set<Long> = emptySet(),
    /** versionCode of a newer published build, if there is one. */
    val updateAvailable: Long? = null,
    /** Phone contacts for the New message screen, loaded when it opens. */
    val contacts: List<ContactEntry> = emptyList(),
    val canReadContacts: Boolean = false,
    /** versionCode of this install (= CI build number), shown in the menu. */
    val installedVersion: Long = 0,
    /** One-off result of a manual "Check for updates", shown as a snackbar. */
    val updateMessage: String? = null,
) {
    fun unread(c: Conversation) = if (c.threadId in seenThreads) 0 else c.unread
    fun displayName(address: String) = names[address] ?: address
}

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = SmsRepository(app)
    private val prefs = Prefs(app)
    private val _state = MutableStateFlow(UiState(starred = prefs.starred))
    val state: StateFlow<UiState> = _state.asStateFlow()

    private var reloadJob: Job? = null
    private val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) = scheduleReload()
    }

    private var lastUpdateCheck = 0L

    init {
        app.contentResolver.registerContentObserver(Telephony.Sms.CONTENT_URI, true, observer)
        refresh()
        checkForUpdate()
    }


    /**
     * Looks for a newer build on launch and on every resume (at most every 15 minutes), or
     * right away when [manual]. A failed check (offline) doesn't count, so it retries next time.
     */
    fun checkForUpdate(manual: Boolean = false) {
        val now = System.currentTimeMillis()
        if (!manual && now - lastUpdateCheck < 15 * 60 * 1000L) return
        viewModelScope.launch {
            val app = getApplication<Application>()
            val installed = UpdateChecker.installedVersion(app)
            val latest = withContext(Dispatchers.IO) { UpdateChecker.latestVersion() }
            if (latest != null) lastUpdateCheck = System.currentTimeMillis()
            _state.update {
                it.copy(
                    installedVersion = installed,
                    updateAvailable = if (latest != null) latest.takeIf { v -> v > installed } else it.updateAvailable,
                    updateMessage = when {
                        !manual -> it.updateMessage
                        latest == null -> "Couldn't check for updates. Check your internet connection."
                        latest > installed -> null // the Update banner shows instead
                        else -> "You're on the latest version (build $installed)."
                    },
                )
            }
        }
    }

    fun clearUpdateMessage() = _state.update { it.copy(updateMessage = null) }
    }

    override fun onCleared() {
        getApplication<Application>().contentResolver.unregisterContentObserver(observer)
    }

    private fun scheduleReload() {
        reloadJob?.cancel()
        reloadJob = viewModelScope.launch { delay(300); reload() }
    }

    fun refresh() {
        reloadJob?.cancel()
        reloadJob = viewModelScope.launch { reload() }
    }

    private suspend fun reload() {
        val done = prefs.doneReminders
        val loaded = withContext(Dispatchers.IO) {
            val messages = repo.loadAll()
            val conversations = Organizer.conversations(messages)
            val names = repo.contactNames(conversations.map { it.address }.distinct().take(1000))
            val reminders = Organizer.reminders(messages, LocalDate.now(), done)
            val txns = messages.asSequence()
                .filter { it.incoming }
                .mapNotNull { sms -> TransactionParser.parse(sms.body)?.let { TxnItem(sms, it) } }
                .toList()
            UiState(
                loading = false,
                canRead = repo.canRead(),
                isDefaultApp = repo.isDefaultSmsApp(),
                messages = messages,
                byThread = messages.groupBy { it.threadId },
                conversations = conversations,
                names = names,
                reminders = reminders,
                transactions = txns,
            )
        }
        _state.update {
            it.copy(
                loading = loaded.loading,
                canRead = loaded.canRead,
                isDefaultApp = loaded.isDefaultApp,
                messages = loaded.messages,
                byThread = loaded.byThread,
                conversations = loaded.conversations,
                names = loaded.names,
                reminders = loaded.reminders,
                transactions = loaded.transactions,
            )
        }
    }

    fun loadContacts() {
        viewModelScope.launch {
            val contacts = withContext(Dispatchers.IO) { repo.allContacts() }
            _state.update { it.copy(contacts = contacts, canReadContacts = repo.canReadContacts()) }
        }
    }

    fun toggleStar(id: Long) {
        val next = _state.value.starred.let { if (id in it) it - id else it + id }
        prefs.starred = next
        _state.update { it.copy(starred = next) }
    }

    fun markSeen(threadId: Long) {
        _state.update { it.copy(seenThreads = it.seenThreads + threadId) }
        viewModelScope.launch(Dispatchers.IO) { runCatching { repo.markThreadRead(threadId) } }
    }

    fun markReminderDone(key: String) {
        prefs.doneReminders = prefs.doneReminders + key
        refresh()
    }

    data class DeleteResult(val deleted: Int, val keptStarred: Int)

    /** Deletes the selected conversations. Starred messages are kept unless [includeStarred]. */
    fun deleteThreads(threadIds: Set<Long>, includeStarred: Boolean, onDone: (DeleteResult) -> Unit) {
        val s = _state.value
        val ids = Organizer.idsToDelete(s.messages, threadIds, s.starred, includeStarred)
        val kept = s.messages.count { it.threadId in threadIds && it.id in s.starred && !includeStarred }
        viewModelScope.launch {
            val deleted = withContext(Dispatchers.IO) { repo.delete(ids) }
            if (includeStarred) {
                val next = s.starred - ids.toSet()
                prefs.starred = next
                _state.update { it.copy(starred = next) }
            }
            reload()
            onDone(DeleteResult(deleted, kept))
        }
    }

    fun send(address: String, body: String) {
        viewModelScope.launch(Dispatchers.IO) { repo.send(address, body) }
    }
}
