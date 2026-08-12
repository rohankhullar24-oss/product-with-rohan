package online.productwithrohan.usagecore


/** The two limit windows that can reset, and how each is announced. */
enum class ResetWindow(
    val key: String,
    val requestCode: Int,
    val titleRes: Int,
) {
    SESSION("session", 4101, R.string.window_session),
    WEEKLY("weekly", 4102, R.string.window_weekly);

    companion object {
        fun fromKey(key: String?): ResetWindow? = entries.firstOrNull { it.key == key }
    }
}
