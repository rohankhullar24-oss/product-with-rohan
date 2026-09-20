package online.productwithrohan.reminders

import android.graphics.Color

/** Maps a [Note.color] key to an actual ARGB color for the card/editor background (light theme; dark-theme-aware tones). */
object NoteColors {

    private val LIGHT = mapOf(
        "default" to Color.TRANSPARENT,
        "red" to Color.parseColor("#FAAFA8"),
        "orange" to Color.parseColor("#F39F76"),
        "yellow" to Color.parseColor("#FFF8B8"),
        "green" to Color.parseColor("#E2F6D3"),
        "teal" to Color.parseColor("#B4DDD3"),
        "blue" to Color.parseColor("#D4E4ED"),
        "dark_blue" to Color.parseColor("#AECBFA"),
        "purple" to Color.parseColor("#D3BFDB"),
        "pink" to Color.parseColor("#F6E2DD"),
        "brown" to Color.parseColor("#E9E3D4"),
        "gray" to Color.parseColor("#EFEFF1"),
    )

    private val DARK = mapOf(
        "default" to Color.TRANSPARENT,
        "red" to Color.parseColor("#5C2B29"),
        "orange" to Color.parseColor("#594A42"),
        "yellow" to Color.parseColor("#635D19"),
        "green" to Color.parseColor("#345920"),
        "teal" to Color.parseColor("#16504B"),
        "blue" to Color.parseColor("#2D555E"),
        "dark_blue" to Color.parseColor("#1E3A5F"),
        "purple" to Color.parseColor("#42275E"),
        "pink" to Color.parseColor("#5B2245"),
        "brown" to Color.parseColor("#442F19"),
        "gray" to Color.parseColor("#3C3F43"),
    )

    fun colorFor(key: String, isDarkTheme: Boolean): Int =
        (if (isDarkTheme) DARK else LIGHT)[key] ?: Color.TRANSPARENT

    fun swatchFor(key: String): Int = LIGHT[key] ?: Color.TRANSPARENT

    fun labelRes(key: String): Int = when (key) {
        "red" -> R.string.note_color_red
        "orange" -> R.string.note_color_orange
        "yellow" -> R.string.note_color_yellow
        "green" -> R.string.note_color_green
        "teal" -> R.string.note_color_teal
        "blue" -> R.string.note_color_blue
        "dark_blue" -> R.string.note_color_dark_blue
        "purple" -> R.string.note_color_purple
        "pink" -> R.string.note_color_pink
        "brown" -> R.string.note_color_brown
        "gray" -> R.string.note_color_gray
        else -> R.string.note_color_default
    }
}
