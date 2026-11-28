package online.productwithrohan.smssorter.core

object Classifier {
    private val PHONE = Regex("^\\+?[0-9][0-9 ()-]{6,}$")

    private val txnWords = Regex(
        "\\b(otp|one time password|verification code|credited|debited|a/c|acct|txn|transaction|" +
            "upi|neft|imps|rtgs|bill|due|statement|pnr|booked|booking|ticket|delivered|shipped|" +
            "out for delivery|order|refund|balance|emi|policy|premium|tds|uan|pran)\\b",
        RegexOption.IGNORE_CASE,
    )
    private val promoWords = Regex(
        "\\b(offer|sale|deal|discount|cashback|free|% ?off|upto|up to|hurry|limited time|shop now|" +
            "click|buy|coupon|voucher|win|exclusive|lifetime free|pre-approved|t&c)\\b|%",
        RegexOption.IGNORE_CASE,
    )

    fun isPhoneNumber(address: String) = PHONE.matches(address.trim())

    fun classify(address: String, body: String): Category {
        if (isPhoneNumber(address)) return Category.PERSONAL

        when (SenderId.parse(address)?.suffix) {
            'P' -> return Category.PROMOTIONS
            'S', 'T', 'G' -> return Category.TRANSACTIONS
        }

        // Old-style headers (AD-HDFCBK), short codes, or unknown alphanumeric senders: use the text.
        if (OtpParser.find(body) != null || TransactionParser.parse(body) != null) return Category.TRANSACTIONS
        val txn = txnWords.findAll(body).count()
        val promo = promoWords.findAll(body).count()
        return if (promo > txn) Category.PROMOTIONS else Category.TRANSACTIONS
    }
}
