package online.productwithrohan.smssorter.core

/**
 * Indian commercial SMS headers look like `AD-SBIPSG-S`:
 *  - 2-letter operator/circle prefix (AD, VM, JX, ...)
 *  - 6-ish character header registered by the business (SBIPSG)
 *  - optional TRAI suffix: P = promotional, S = service, T = transactional, G = government
 */
data class SenderId(val prefix: String, val header: String, val suffix: Char?) {
    companion object {
        private val PATTERN = Regex("^([A-Z]{2})-([A-Z0-9]{3,11})(?:-([PSTG]))?$")

        fun parse(address: String): SenderId? {
            val m = PATTERN.matchEntire(address.trim().uppercase()) ?: return null
            val (prefix, header, suffix) = m.destructured
            return SenderId(prefix, header, suffix.firstOrNull())
        }
    }
}

object Brands {
    private val known = linkedMapOf(
        "AIRTEL" to "Airtel", "AIRINF" to "Airtel", "AIRBIL" to "Airtel", "ARTLTD" to "Airtel",
        "JIOINF" to "Jio", "JIOPAY" to "Jio", "VIINFO" to "Vi",
        "ICICIB" to "ICICI", "ICICIT" to "ICICI", "HDFCBK" to "HDFC Bank", "HDFCCC" to "HDFC Bank",
        "SBIINB" to "SBI", "SBIPSG" to "SBI", "SBICRD" to "SBI Card", "SBMSMS" to "SBI",
        "KOTAKB" to "Kotak", "AXISBK" to "Axis Bank", "AXISMR" to "Axis Bank",
        "IRCTCI" to "IRCTC", "IRCTC" to "IRCTC", "EPFOHO" to "EPFO", "ITDCPC" to "Income Tax",
        "PTNNPS" to "NPS", "VAAHAN" to "Vahan",
    )

    /** Friendly name for a sender address, or null when we don't know the brand. */
    fun nameFor(address: String): String? {
        val header = SenderId.parse(address)?.header ?: return null
        return known[header] ?: known.entries.firstOrNull { header.startsWith(it.key) }?.value
    }

    fun headerOrAddress(address: String): String = SenderId.parse(address)?.header ?: address
}
