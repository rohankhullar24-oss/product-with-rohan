package online.productwithrohan.smssorter.core

import java.time.LocalDate
import java.time.ZoneId

/** One row in the conversation list. */
data class Conversation(
    val address: String,
    val threadId: Long,
    val category: Category,
    val latest: Sms,
    val unread: Int,
    val messageCount: Int,
)

data class Reminders(val upcoming: List<Reminder>, val history: List<Reminder>)

object Organizer {
    /** Groups messages into conversations (newest first), classified by sender. */
    fun conversations(messages: List<Sms>): List<Conversation> =
        messages.groupBy { it.threadId }
            .map { (threadId, msgs) ->
                val sorted = msgs.sortedByDescending { it.timestamp }
                val latest = sorted.first()
                val address = sorted.firstOrNull { it.incoming }?.address ?: latest.address
                val sample = sorted.firstOrNull { it.incoming }?.body ?: latest.body
                Conversation(
                    address = address,
                    threadId = threadId,
                    category = Classifier.classify(address, sample),
                    latest = latest,
                    unread = msgs.count { it.incoming && !it.read },
                    messageCount = msgs.size,
                )
            }
            .sortedByDescending { it.latest.timestamp }

    /**
     * Extracts reminders, keeping the newest message per reminder (e.g. a repeated bill alert),
     * and splits them into upcoming and history. Anything in [done] counts as history.
     */
    fun reminders(
        messages: List<Sms>,
        today: LocalDate,
        done: Set<String> = emptySet(),
        zone: ZoneId = ZoneId.systemDefault(),
    ): Reminders {
        val all = messages.sortedByDescending { it.timestamp }
            .mapNotNull { ReminderParser.parse(it, zone) }
            .distinctBy { it.key }
        val (upcoming, history) = all.partition { !it.date.isBefore(today) && it.key !in done }
        return Reminders(upcoming.sortedBy { it.date }, history.sortedByDescending { it.date })
    }

    /**
     * Which message ids to delete when the user deletes [threadIds].
     * Starred messages are kept unless [includeStarred] is true.
     */
    fun idsToDelete(
        messages: List<Sms>,
        threadIds: Set<Long>,
        starred: Set<Long>,
        includeStarred: Boolean,
    ): List<Long> = messages
        .filter { it.threadId in threadIds }
        .filter { includeStarred || it.id !in starred }
        .map { it.id }
}
