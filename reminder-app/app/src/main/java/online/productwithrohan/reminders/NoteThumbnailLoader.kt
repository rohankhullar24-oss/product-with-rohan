package online.productwithrohan.reminders

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.view.View
import android.widget.ImageView
import java.util.concurrent.Executors

/** Same pattern as [ThumbnailLoader], but reads through [NoteMediaStore] for note image attachments. */
object NoteThumbnailLoader {

    private val cache = LruCache<String, Bitmap>(30)
    private val executor = Executors.newFixedThreadPool(2)
    private val mainHandler = Handler(Looper.getMainLooper())

    fun load(imageView: ImageView, filename: String?) {
        if (filename == null) {
            imageView.tag = null
            imageView.setImageDrawable(null)
            imageView.visibility = View.GONE
            return
        }
        imageView.visibility = View.VISIBLE
        imageView.tag = filename

        val cached = cache.get(filename)
        if (cached != null) {
            imageView.setImageBitmap(cached)
            return
        }

        imageView.setImageDrawable(null)
        val appContext = imageView.context.applicationContext
        executor.execute {
            val bytes = NoteMediaStore.readBytes(appContext, filename)
            val bitmap = bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
            if (bitmap != null) cache.put(filename, bitmap)
            mainHandler.post {
                if (imageView.tag == filename) {
                    if (bitmap != null) {
                        imageView.setImageBitmap(bitmap)
                    } else {
                        imageView.visibility = View.GONE
                    }
                }
            }
        }
    }
}
