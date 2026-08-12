package online.productwithrohan.usagecore

import android.content.Context
import android.content.Intent

/**
 * How the library tells its host app that the stored snapshot changed.
 *
 * The action is namespaced per app via the package name so the two apps that
 * embed this library never receive each other's broadcasts, and the intent is
 * explicitly scoped to the sending package for the same reason.
 */
object UsageEvents {

    private const val ACTION_SUFFIX = ".USAGE_UPDATED"

    fun action(context: Context): String = context.packageName + ACTION_SUFFIX

    fun broadcastUpdated(context: Context) {
        context.sendBroadcast(
            Intent(action(context)).setPackage(context.packageName)
        )
    }
}
