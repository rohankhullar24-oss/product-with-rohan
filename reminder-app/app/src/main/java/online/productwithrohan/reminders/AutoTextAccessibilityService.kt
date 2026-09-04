package online.productwithrohan.reminders

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Finishes a WhatsApp send that [AutoTaskAlarmReceiver] started: it opens
 * WhatsApp straight to the target chat with the message pre-filled (via the
 * wa.me deep link), so this service's only job is to find and tap Send once
 * that chat window is on screen. [AutoTaskWatchdogReceiver] handles the
 * "never found it" case since accessibility events aren't guaranteed.
 *
 * Deliberately narrow in scope (see accessibility_service_config.xml —
 * WhatsApp only) since UI-automating a chat app's contact picker or message
 * list would be far more fragile than this single "tap Send" step.
 */
class AutoTextAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName != "com.whatsapp") return
        val taskId = currentPending(this) ?: return
        val task = AutoTaskStore.get(this, taskId) ?: return
        if (task.status != AutoTaskStatus.PENDING) {
            clearPending(this)
            return
        }

        val root = rootInActiveWindow ?: return
        val sendButton = findSendButton(root) ?: return

        if (sendButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            task.status = AutoTaskStatus.DONE
            task.failureReason = null
            task.updatedAt = System.currentTimeMillis()
            AutoTaskStore.upsert(this, task)
            clearPending(this)
            AutoTaskWatchdogReceiver.cancel(this, taskId)
        }
    }

    private fun findSendButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val byId = node.findAccessibilityNodeInfosByViewId("com.whatsapp:id/send")
        val direct = byId.firstOrNull { it.isClickable }
        if (direct != null) return direct
        return findByDescription(node, "Send")
    }

    private fun findByDescription(node: AccessibilityNodeInfo, desc: String): AccessibilityNodeInfo? {
        if (node.isClickable && node.contentDescription?.toString()?.equals(desc, ignoreCase = true) == true) {
            return node
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            findByDescription(child, desc)?.let { return it }
        }
        return null
    }

    override fun onInterrupt() {}

    companion object {
        private const val PREFS = "auto_text_pending"
        private const val KEY_PENDING_TASK_ID = "pending_task_id"

        fun startPending(context: Context, taskId: String) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_PENDING_TASK_ID, taskId).apply()
        }

        fun clearPending(context: Context) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .remove(KEY_PENDING_TASK_ID).apply()
        }

        fun currentPending(context: Context): String? =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PENDING_TASK_ID, null)

        fun isEnabled(context: Context): Boolean {
            val expected = "${context.packageName}/${AutoTextAccessibilityService::class.java.name}"
            val enabledServices = Settings.Secure.getString(
                context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            return enabledServices.split(':').any { it.equals(expected, ignoreCase = true) }
        }
    }
}
