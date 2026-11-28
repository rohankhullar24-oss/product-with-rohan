package online.productwithrohan.smssorter.core

import java.time.LocalDate

/** A single SMS as read from the phone. Kept free of Android types so it can be unit tested. */
data class Sms(
    val id: Long,
    val threadId: Long,
    val address: String,
    val body: String,
    val timestamp: Long,
    val incoming: Boolean = true,
    val read: Boolean = true,
)

enum class Category(val label: String) {
    PERSONAL("Personal"),
    TRANSACTIONS("Transactions"),
    PROMOTIONS("Promotions"),
}

enum class TxnType { CREDIT, DEBIT }

data class Transaction(
    val amount: Double,
    val type: TxnType,
    val account: String?,
    val counterparty: String?,
)

enum class ReminderKind { BILL, CARD, PHONE, TRAIN }

data class Reminder(
    /** Stable key used to remember "mark as paid / done" across reloads. */
    val key: String,
    val kind: ReminderKind,
    val title: String,
    val subtitle: String?,
    val amount: Double?,
    val date: LocalDate,
    val sourceMessageId: Long,
)
