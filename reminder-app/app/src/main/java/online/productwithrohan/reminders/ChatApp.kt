package online.productwithrohan.reminders

import android.net.Uri

/**
 * A chat app [ChatAppSender] can drive via a pre-fill deep link + the
 * accessibility service tapping Send. WhatsApp is keyed by phone number
 * (wa.me); Telegram doesn't offer an equivalent by phone number, so it's
 * keyed by username instead (tg://resolve).
 */
enum class ChatApp(val packageName: String) {
    WHATSAPP("com.whatsapp") {
        override fun buildUri(recipient: String, message: String): Uri? {
            val digits = recipient.filter { it.isDigit() || it == '+' }
            if (digits.isBlank()) return null
            return Uri.parse("https://wa.me/$digits?text=${Uri.encode(message)}")
        }
    },
    TELEGRAM("org.telegram.messenger") {
        override fun buildUri(recipient: String, message: String): Uri? {
            val handle = recipient.trim().removePrefix("@")
            if (handle.isBlank()) return null
            return Uri.parse("tg://resolve?domain=$handle&text=${Uri.encode(message)}")
        }
    };

    /** Null means [recipient] isn't usable (blank number/username). */
    abstract fun buildUri(recipient: String, message: String): Uri?

    companion object {
        fun forChannel(channel: AutoTaskChannel): ChatApp? = when (channel) {
            AutoTaskChannel.WHATSAPP -> WHATSAPP
            AutoTaskChannel.TELEGRAM -> TELEGRAM
            else -> null
        }
    }
}
