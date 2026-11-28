package online.productwithrohan.smssorter.core

object OtpParser {
    private val trigger = Regex(
        "\\b(otp|one[- ]time password|verification code|security code|login code|auth(?:entication)? code)\\b|\\bcode is\\b",
        RegexOption.IGNORE_CASE,
    )
    private val code = Regex("(?<![\\d,.])(\\d{4,8})(?![\\d,])")

    /** The OTP in [body], or null if the message isn't an OTP. Picks the code closest to the trigger word. */
    fun find(body: String): String? {
        val t = trigger.find(body) ?: return null
        return code.findAll(body)
            .minByOrNull { m -> kotlin.math.abs(m.range.first - t.range.first) }
            ?.groupValues?.get(1)
    }
}
