package online.productwithrohan.smssorter.core

object TransactionParser {
    private val credit = Regex("\\b(credited|received|deposited|refunded)\\b", RegexOption.IGNORE_CASE)
    private val debit = Regex("\\b(debited|spent|withdrawn|paid|sent|purchase)\\b", RegexOption.IGNORE_CASE)
    // Messages that mention money but aren't a completed transaction.
    private val notATxn = Regex(
        "\\b(otp|will be debited|is due|due on|due date|request(?:ed)?|offer|eligible|pre-approved|limit of)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val account = Regex(
        "(?:A/c|Acct|Account|Card)(?:\\s*(?:No\\.?|number))?(?:\\s*ending(?:\\s*with)?)?[\\s:.]*([Xx*]*\\d{3,6})",
        RegexOption.IGNORE_CASE,
    )
    private val party = Regex(
        "\\b(?:by|to|at|from|towards)\\s+([A-Za-z0-9&.' ]{3,60}?)(?=\\s*(?:[,;]|\\.\\s|\\s+on\\s|\\s+via\\s|\\s+ref|\\s+UPI|\\s+Avl|$))",
        RegexOption.IGNORE_CASE,
    )
    private val notAParty = Regex("^(your|you|a/c|ac|acct|account|card|the|rs|inr)\\b", RegexOption.IGNORE_CASE)

    fun parse(body: String): Transaction? {
        if (notATxn.containsMatchIn(body)) return null
        val amountMatch = Amounts.PATTERN.find(body) ?: return null
        val amount = Amounts.parse(amountMatch.groupValues[1]) ?: return null

        val c = credit.find(body)
        val d = debit.find(body)
        val type = when {
            c != null && d != null -> if (c.range.first < d.range.first) TxnType.CREDIT else TxnType.DEBIT
            c != null -> TxnType.CREDIT
            d != null -> TxnType.DEBIT
            else -> return null
        }

        val acct = account.find(body)?.groupValues?.get(1)?.let { "XX" + it.takeLast(4) }
        val who = party.findAll(body)
            .map { it.groupValues[1].trim() }
            .firstOrNull { !notAParty.containsMatchIn(it) && it.any(Char::isLetter) }
        return Transaction(amount, type, acct, who)
    }
}
