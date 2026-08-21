package online.productwithrohan.reminders

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.core.content.ContextCompat
import java.util.Locale

/** Captures a one-shot current location and reverse-geocodes it to a short place name. */
object JournalLocation {

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /** [onResult] and [onFailure] may be called back on a background thread. */
    fun requestCurrent(
        context: Context,
        onResult: (latitude: Double, longitude: Double, placeName: String?) -> Unit,
        onFailure: () -> Unit,
    ) {
        if (!hasPermission(context)) {
            onFailure()
            return
        }
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (manager == null) {
            onFailure()
            return
        }
        val candidates = listOfNotNull(
            if (Build.VERSION.SDK_INT >= 31) LocationManager.FUSED_PROVIDER else null,
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
        )
        val provider = candidates.firstOrNull {
            try {
                manager.isProviderEnabled(it)
            } catch (e: Exception) {
                false
            }
        }
        if (provider == null) {
            onFailure()
            return
        }
        try {
            manager.requestSingleUpdate(provider, object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    Thread {
                        val placeName = reverseGeocode(context, location.latitude, location.longitude)
                        onResult(location.latitude, location.longitude, placeName)
                    }.start()
                }
            }, Looper.getMainLooper())
        } catch (e: SecurityException) {
            onFailure()
        }
    }

    @Suppress("DEPRECATION")
    private fun reverseGeocode(context: Context, latitude: Double, longitude: Double): String? = try {
        val results = Geocoder(context, Locale.getDefault()).getFromLocation(latitude, longitude, 1)
        results?.firstOrNull()?.let { address ->
            listOfNotNull(address.locality ?: address.subAdminArea, address.adminArea)
                .joinToString(", ")
                .ifBlank { null }
        }
    } catch (e: Exception) {
        null
    }
}
