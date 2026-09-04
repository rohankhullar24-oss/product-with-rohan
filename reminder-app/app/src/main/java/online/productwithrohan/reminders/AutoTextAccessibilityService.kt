package online.productwithrohan.reminders

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.UUID

/** What kind of pending chat-app action this service is waiting to finish. */
enum class PendingActionKind { TASK, REPLY, FORWARD }

/**
 * One outstanding "do something in the chat-app window that's about to
 * open" request. [typeText] is null when the message was already pre-filled
 * via a deep link (scheduled sends, forwards); non-null means this service
 * must type it into the compose box itself (auto-reply, since we only have
 * the sender's open notification, not their number).
 */
data class PendingAction(
    val token: String,
    val kind: PendingActionKind,
    val taskId: String? = null,
    val typeText: String? = null,
)

/**
 * Finishes a WhatsApp/Telegram send that something else started:
 * [AutoTaskAlarmReceiver] for scheduled sends/forwards (message already
 * pre-filled via a deep link — just tap Send), or
 * [AutoTextNotificationListenerService] for WhatsApp auto-replies (type the
 * reply into the sender's already-open chat, then tap Send). Deliberately
 * narrow in scope (see accessibility_service_config.xml — WhatsApp and
 * Telegram only) since UI-automating a chat app's contact picker would be
 * far more fragile than these two steps.
 */
class AutoTextAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName?.toString() !in SUPPORTED_PACKAGES) return
        val pending = currentPending(this) ?: return
        val root = rootInActiveWindow ?: return

        if (pending.typeText != null) {
            val input = findComposeBox(root) ?: return
            val args = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, pending.typeText)
            }
            // Re-issuing the same text on a later event (e.g. before Send becomes
            // enabled) is harmless — it's idempotent.
            input.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        }

        val sendButton = findSendButton(root) ?: return
        if (sendButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            onSent(pending)
        }
    }

    private fun onSent(pending: PendingAction) {
        if (pending.kind == PendingActionKind.TASK && pending.taskId != null) {
            AutoTaskStore.get(this, pending.taskId)?.let { task ->
                if (task.status == AutoTaskStatus.PENDING) {
                    AutoTaskFireRecorder.recordFire(this, task, true, null)
                }
            }
        }
        if (pending.kind == PendingActionKind.REPLY && AutoReplySettings.notifyOnSend(this)) {
            AutoTextNotify.show(this, getString(R.string.auto_reply_sent_title), getString(R.string.auto_reply_sent_text))
        }
        if (pending.kind == PendingActionKind.FORWARD && AutoForwardSettings.notifyOnSend(this)) {
            AutoTextNotify.show(this, getString(R.string.auto_forward_sent_title), getString(R.string.auto_forward_sent_text))
        }
        clearIfToken(this, pending.token)
        PendingActionWatchdogReceiver.cancel(this, pending.token)
    }

    /**
     * WhatsApp's long-standing send-button id, else a content-description
     * fallback — the same fallback is all Telegram gets, since it doesn't
     * expose a stable resource id for its send button.
     */
    private fun findSendButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val byId = node.findAccessibilityNodeInfosByViewId("com.whatsapp:id/send")
        val direct = byId.firstOrNull { it.isClickable }
        if (direct != null) return direct
        return findByDescription(node, "Send")
    }

    /** WhatsApp's long-standing compose-box id; falls back to the first editable field (also Telegram's path). */
    private fun findComposeBox(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val byId = node.findAccessibilityNodeInfosByViewId("com.whatsapp:id/entry")
        byId.firstOrNull()?.let { return it }
        return findByClassName(node, "android.widget.EditText")
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

    private fun findByClassName(node: AccessibilityNodeInfo, className: String): AccessibilityNodeInfo? {
        if (node.className?.toString() == className) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            findByClassName(child, className)?.let { return it }
        }
        return null
    }

    override fun onInterrupt() {}

    companion object {
        private val SUPPORTED_PACKAGES = ChatApp.entries.map { it.packageName }.toSet()
        private const val PREFS = "auto_text_pending"
        private const val KEY_TOKEN = "pending_token"
        private const val KEY_KIND = "pending_kind"
        private const val KEY_TASK_ID = "pending_task_id"
        private const val KEY_TYPE_TEXT = "pending_type_text"

        /** A message already pre-filled via wa.me — this service just taps Send. */
        fun startPendingTask(context: Context, taskId: String): String =
            startPending(context, PendingActionKind.TASK, taskId = taskId)

        /** Types [message] into the currently-open chat (opened by the caller), then taps Send. */
        fun startPendingReply(context: Context, message: String): String =
            startPending(context, PendingActionKind.REPLY, typeText = message)

        /** A forwarded message already pre-filled via wa.me — this service just taps Send. */
        fun startPendingForward(context: Context): String =
            startPending(context, PendingActionKind.FORWARD)

        private fun startPending(
            context: Context, kind: PendingActionKind, taskId: String? = null, typeText: String? = null,
        ): String {
            val token = UUID.randomUUID().toString()
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_TOKEN, token)
                .putString(KEY_KIND, kind.name)
                .putString(KEY_TASK_ID, taskId)
                .putString(KEY_TYPE_TEXT, typeText)
                .apply()
            return token
        }

        /** Only clears if [token] is still the current pending action (a newer one may have replaced it). */
        fun clearIfToken(context: Context, token: String) {
            if (currentPending(context)?.token != token) return
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
        }

        fun currentPending(context: Context): PendingAction? {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val token = prefs.getString(KEY_TOKEN, null) ?: return null
            val kind = prefs.getString(KEY_KIND, null)?.let { runCatching { PendingActionKind.valueOf(it) }.getOrNull() }
                ?: return null
            return PendingAction(
                token = token,
                kind = kind,
                taskId = prefs.getString(KEY_TASK_ID, null),
                typeText = prefs.getString(KEY_TYPE_TEXT, null),
            )
        }

        fun isEnabled(context: Context): Boolean {
            val expected = "${context.packageName}/${AutoTextAccessibilityService::class.java.name}"
            val enabledServices = Settings.Secure.getString(
                context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            return enabledServices.split(':').any { it.equals(expected, ignoreCase = true) }
        }
    }
}
