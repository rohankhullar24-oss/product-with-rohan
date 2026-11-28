package online.productwithrohan.smssorter.core

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

object ReminderParser {
    private val dueWord = Regex("\\bdue\\b|\\bpay(?:able)? by\\b|\\blast date\\b", RegexOption.IGNORE_CASE)
    private val billWord = Regex("\\b(bill|statement|due|payment)\\b", RegexOption.IGNORE_CASE)
    private val alreadyPaid = Regex(
        "\\b(received|thank you for (?:your )?payment|has been paid|payment of .* (?:is )?successful|credited|debited)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val cardWord = Regex("\\bcredit card\\b|\\bcard\\b", RegexOption.IGNORE_CASE)
    private val phoneWord = Regex("\\b(mobile|postpaid|prepaid|recharge|airtel|jio|vi|broadband|fiber|fibre)\\b", RegexOption.IGNORE_CASE)
    private val masked = Regex("(?:XX|xx|\\*{2,}|ending(?:\\s*(?:with|in))?\\s*)(\\d{4})\\b")
    private val number = Regex("\\b(?:no\\.?|number)\\s*:?\\s*(\\d{6,12})\\b", RegexOption.IGNORE_CASE)

    private val pnr = Regex("\\bPNR\\s*(?:no\\.?)?[\\s:-]*(\\d{10})\\b", RegexOption.IGNORE_CASE)
    private val trainNo = Regex("\\b(?:TRN|Train(?:\\s*No\\.?)?)[\\s:.-]*(\\d{5})\\b", RegexOption.IGNORE_CASE)
    private val doj = Regex("\\b(?:DOJ|Date of Journey|Journey Date|Dt)[\\s:.-]*", RegexOption.IGNORE_CASE)
    private val route = Regex("\\b([A-Z]{2,5})\\s*-\\s*([A-Z]{2,5})\\b")
    private val notStations = setOf("PNR", "TRN", "DOJ", "SL", "AC", "CC", "UPI")

    fun parse(sms: Sms, zone: ZoneId = ZoneId.systemDefault()): Reminder? {
        val ref = Instant.ofEpochMilli(sms.timestamp).atZone(zone).toLocalDate()
        return parseTrain(sms, ref) ?: parseBill(sms, ref)
    }

    private fun parseTrain(sms: Sms, ref: LocalDate): Reminder? {
        val body = sms.body
        val p = pnr.find(body) ?: return null
        val train = trainNo.find(body)?.groupValues?.get(1)
        val date = doj.find(body)?.let { DateParser.firstAfter(body, it.range.last, ref) }
            ?: DateParser.findAll(body, ref).firstOrNull()?.date
            ?: return null
        val stations = route.findAll(body)
            .map { it.groupValues[1] to it.groupValues[2] }
            .firstOrNull { (a, b) -> a !in notStations && b !in notStations }
        val title = stations?.let { "${it.first} - ${it.second}" } ?: train?.let { "Train $it" } ?: "Train journey"
        return Reminder(
            key = "train:${p.groupValues[1]}",
            kind = ReminderKind.TRAIN,
            title = title,
            subtitle = train,
            amount = null,
            date = date,
            sourceMessageId = sms.id,
        )
    }

    private fun parseBill(sms: Sms, ref: LocalDate): Reminder? {
        val body = sms.body
        if (!billWord.containsMatchIn(body) || alreadyPaid.containsMatchIn(body)) return null
        val due = dueWord.find(body) ?: return null
        val date = DateParser.firstAfter(body, due.range.first, ref) ?: return null
        val amount = Amounts.first(body)

        val kind = when {
            cardWord.containsMatchIn(body) -> ReminderKind.CARD
            phoneWord.containsMatchIn(body) -> ReminderKind.PHONE
            else -> ReminderKind.BILL
        }
        val brand = Brands.nameFor(sms.address) ?: Brands.headerOrAddress(sms.address)
        val ref4 = masked.find(body)?.groupValues?.get(1)
        val subtitle = when {
            ref4 != null && kind == ReminderKind.CARD -> "XX$ref4"
            ref4 != null -> ref4
            else -> number.find(body)?.groupValues?.get(1)?.takeLast(4)
        }
        return Reminder(
            key = "bill:${brand.lowercase()}:${subtitle ?: ""}:$date",
            kind = kind,
            title = brand.uppercase(),
            subtitle = subtitle,
            amount = amount,
            date = date,
            sourceMessageId = sms.id,
        )
    }
}
