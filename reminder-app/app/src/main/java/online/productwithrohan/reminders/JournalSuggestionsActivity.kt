package online.productwithrohan.reminders

import android.Manifest
import android.content.ContentResolver
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.LruCache
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.util.concurrent.Executors

/**
 * Candidate moments to drop into an entry: recent photos from the device's
 * media store, and the current location. There's no on-device data source
 * for workouts or now-playing songs in this app (unlike Apple Journal), so
 * those are intentionally left out rather than faked.
 */
class JournalSuggestionsActivity : AppCompatActivity() {

    private lateinit var recycler: RecyclerView
    private lateinit var noPhotosText: TextView
    private lateinit var adapter: SuggestionAdapter

    private val photoPermission =
        if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE

    private val photoPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) loadPhotos() else showNoPhotos()
        }

    private val locationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                useCurrentLocation()
            } else {
                Toast.makeText(this, R.string.journal_location_permission_denied, Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_journal_suggestions)
        title = getString(R.string.journal_action_suggestions)

        recycler = findViewById(R.id.recycler_photos)
        noPhotosText = findViewById(R.id.text_no_photos)
        adapter = SuggestionAdapter { uri ->
            setResult(RESULT_OK, Intent().putExtra(EXTRA_PHOTO_URI, uri.toString()))
            finish()
        }
        recycler.layoutManager = GridLayoutManager(this, 3)
        recycler.adapter = adapter

        findViewById<Button>(R.id.button_use_location).setOnClickListener { onUseLocationTapped() }

        if (ContextCompat.checkSelfPermission(this, photoPermission) == PackageManager.PERMISSION_GRANTED) {
            loadPhotos()
        } else {
            photoPermissionLauncher.launch(photoPermission)
        }
    }

    private fun onUseLocationTapped() {
        if (JournalLocation.hasPermission(this)) {
            useCurrentLocation()
        } else {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    private fun useCurrentLocation() {
        Toast.makeText(this, R.string.journal_locating, Toast.LENGTH_SHORT).show()
        JournalLocation.requestCurrent(
            this,
            onResult = { lat, lng, place ->
                runOnUiThread {
                    val data = Intent()
                        .putExtra(EXTRA_USE_LOCATION, true)
                        .putExtra(EXTRA_LATITUDE, lat)
                        .putExtra(EXTRA_LONGITUDE, lng)
                        .putExtra(EXTRA_PLACE_NAME, place)
                    setResult(RESULT_OK, data)
                    finish()
                }
            },
            onFailure = {
                runOnUiThread {
                    Toast.makeText(this, R.string.journal_location_failed, Toast.LENGTH_SHORT).show()
                }
            },
        )
    }

    private fun loadPhotos() {
        Thread {
            val uris = queryRecentPhotos()
            runOnUiThread {
                if (uris.isEmpty()) showNoPhotos() else adapter.submit(uris)
            }
        }.start()
    }

    private fun showNoPhotos() {
        noPhotosText.visibility = View.VISIBLE
    }

    private fun queryRecentPhotos(): List<Uri> {
        val uris = mutableListOf<Uri>()
        val projection = arrayOf(MediaStore.Images.Media._ID)
        val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"
        try {
            contentResolver.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, null, null, sortOrder)
                ?.use { cursor ->
                    val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                    while (cursor.moveToNext() && uris.size < MAX_SUGGESTIONS) {
                        val id = cursor.getLong(idColumn)
                        uris.add(ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id))
                    }
                }
        } catch (e: Exception) {
            // No access or store unavailable — the empty state covers this.
        }
        return uris
    }

    private class SuggestionAdapter(private val onClick: (Uri) -> Unit) :
        RecyclerView.Adapter<SuggestionAdapter.Holder>() {

        private val items = mutableListOf<Uri>()
        private val cache = LruCache<String, Bitmap>(40)
        private val executor = Executors.newFixedThreadPool(2)
        private val mainHandler = Handler(Looper.getMainLooper())

        fun submit(list: List<Uri>) {
            items.clear()
            items.addAll(list)
            notifyDataSetChanged()
        }

        class Holder(val imageView: ImageView) : RecyclerView.ViewHolder(imageView)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_suggestion_photo, parent, false) as ImageView
            return Holder(view)
        }

        override fun getItemCount(): Int = items.size

        override fun onBindViewHolder(holder: Holder, position: Int) {
            val uri = items[position]
            val key = uri.toString()
            holder.imageView.tag = key
            holder.imageView.setOnClickListener { onClick(uri) }

            val cached = cache.get(key)
            if (cached != null) {
                holder.imageView.setImageBitmap(cached)
                return
            }
            holder.imageView.setImageDrawable(null)
            val resolver = holder.imageView.context.contentResolver
            executor.execute {
                val bitmap = decodeSampledBitmap(resolver, uri, 220)
                if (bitmap != null) cache.put(key, bitmap)
                mainHandler.post {
                    if (holder.imageView.tag == key && bitmap != null) {
                        holder.imageView.setImageBitmap(bitmap)
                    }
                }
            }
        }

        private fun decodeSampledBitmap(resolver: ContentResolver, uri: Uri, targetPx: Int): Bitmap? = try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            var sample = 1
            while (bounds.outWidth / (sample * 2) >= targetPx && bounds.outHeight / (sample * 2) >= targetPx) {
                sample *= 2
            }
            val options = BitmapFactory.Options().apply { inSampleSize = sample }
            resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
        } catch (e: Exception) {
            null
        }
    }

    companion object {
        const val EXTRA_PHOTO_URI = "photo_uri"
        const val EXTRA_USE_LOCATION = "use_location"
        const val EXTRA_LATITUDE = "latitude"
        const val EXTRA_LONGITUDE = "longitude"
        const val EXTRA_PLACE_NAME = "place_name"
        private const val MAX_SUGGESTIONS = 30
    }
}
