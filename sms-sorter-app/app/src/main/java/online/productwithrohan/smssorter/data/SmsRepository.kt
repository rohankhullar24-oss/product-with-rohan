package online.productwithrohan.smssorter.data

import android.Manifest
import android.app.role.RoleManager
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.provider.Telephony
import android.telephony.SmsManager
import online.productwithrohan.smssorter.core.Classifier
import online.productwithrohan.smssorter.core.Sms

data class ContactEntry(val name: String, val number: String)

/** Reads and writes the phone's SMS store. Writes only succeed while we are the default SMS app. */
class SmsRepository(private val context: Context) {
    private val resolver get() = context.contentResolver

    /**
     * Whether we hold the SMS role. RoleManager is the source of truth on Android 10+;
     * getDefaultSmsPackage() can keep reporting the previous app on some phones, which left
     * the "make default" banner stuck after the user had already switched.
     */
    fun isDefaultSmsApp(): Boolean {
        val rm = context.getSystemService(RoleManager::class.java)
        if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_SMS)) return rm.isRoleHeld(RoleManager.ROLE_SMS)
        return Telephony.Sms.getDefaultSmsPackage(context) == context.packageName
    }

    fun canRead(): Boolean =
        context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED

    fun loadAll(limit: Int = 20_000): List<Sms> {
        if (!canRead()) return emptyList()
        val projection = arrayOf(
            Telephony.Sms._ID, Telephony.Sms.THREAD_ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY,
            Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.READ,
        )
        val out = ArrayList<Sms>()
        resolver.query(Telephony.Sms.CONTENT_URI, projection, null, null, "${Telephony.Sms.DATE} DESC")?.use { c ->
            val id = c.getColumnIndexOrThrow(Telephony.Sms._ID)
            val thread = c.getColumnIndexOrThrow(Telephony.Sms.THREAD_ID)
            val address = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val body = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val date = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
            val type = c.getColumnIndexOrThrow(Telephony.Sms.TYPE)
            val read = c.getColumnIndexOrThrow(Telephony.Sms.READ)
            while (c.moveToNext() && out.size < limit) {
                out += Sms(
                    id = c.getLong(id),
                    threadId = c.getLong(thread),
                    address = c.getString(address) ?: "Unknown",
                    body = c.getString(body) ?: "",
                    timestamp = c.getLong(date),
                    incoming = c.getInt(type) == Telephony.Sms.MESSAGE_TYPE_INBOX,
                    read = c.getInt(read) == 1,
                )
            }
        }
        return out
    }

    /** Deletes the given message ids. Returns how many were removed. */
    fun delete(ids: List<Long>): Int {
        if (ids.isEmpty() || !isDefaultSmsApp()) return 0
        return ids.chunked(500).sumOf { chunk ->
            resolver.delete(Telephony.Sms.CONTENT_URI, "${Telephony.Sms._ID} IN (${chunk.joinToString(",")})", null)
        }
    }

    fun markThreadRead(threadId: Long) {
        if (!isDefaultSmsApp()) return
        val values = ContentValues().apply {
            put(Telephony.Sms.READ, 1)
            put(Telephony.Sms.SEEN, 1)
        }
        resolver.update(
            Telephony.Sms.CONTENT_URI, values,
            "${Telephony.Sms.THREAD_ID} = ? AND ${Telephony.Sms.READ} = 0", arrayOf(threadId.toString()),
        )
    }

    fun insertIncoming(address: String, body: String, timestamp: Long): Uri? {
        val values = ContentValues().apply {
            put(Telephony.Sms.ADDRESS, address)
            put(Telephony.Sms.BODY, body)
            put(Telephony.Sms.DATE, System.currentTimeMillis())
            put(Telephony.Sms.DATE_SENT, timestamp)
            put(Telephony.Sms.READ, 0)
            put(Telephony.Sms.SEEN, 0)
            put(Telephony.Sms.TYPE, Telephony.Sms.MESSAGE_TYPE_INBOX)
        }
        return resolver.insert(Telephony.Sms.Inbox.CONTENT_URI, values)
    }

    /** Sends an SMS and, as the default app is required to, records it in the Sent box. */
    fun send(address: String, body: String) {
        val manager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION") SmsManager.getDefault()
        }
        val parts = manager.divideMessage(body)
        manager.sendMultipartTextMessage(address, null, parts, null, null)
        if (isDefaultSmsApp()) {
            val values = ContentValues().apply {
                put(Telephony.Sms.ADDRESS, address)
                put(Telephony.Sms.BODY, body)
                put(Telephony.Sms.DATE, System.currentTimeMillis())
                put(Telephony.Sms.READ, 1)
                put(Telephony.Sms.SEEN, 1)
                put(Telephony.Sms.TYPE, Telephony.Sms.MESSAGE_TYPE_SENT)
            }
            resolver.insert(Telephony.Sms.Sent.CONTENT_URI, values)
        }
    }

    fun canReadContacts(): Boolean =
        context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED

    /** Every contact phone number, A–Z, one row per distinct number (needs READ_CONTACTS). */
    fun allContacts(): List<ContactEntry> {
        if (!canReadContacts()) return emptyList()
        val out = ArrayList<ContactEntry>()
        val seen = HashSet<String>()
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
        )
        runCatching {
            resolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI, projection, null, null,
                "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} COLLATE NOCASE ASC",
            )?.use { c ->
                while (c.moveToNext()) {
                    val name = c.getString(0) ?: continue
                    val number = c.getString(1) ?: continue
                    val key = number.filter(Char::isDigit).takeLast(10)
                    if (key.isNotEmpty() && seen.add(key)) out += ContactEntry(name, number)
                }
            }
        }
        return out
    }

    /** Contact names for phone-number senders (needs READ_CONTACTS; empty otherwise). */
    fun contactNames(addresses: Collection<String>): Map<String, String> {
        if (context.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return emptyMap()
        }
        val out = HashMap<String, String>()
        for (address in addresses) {
            if (!Classifier.isPhoneNumber(address)) continue
            val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(address))
            runCatching {
                resolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)?.use { c ->
                    if (c.moveToFirst()) c.getString(0)?.let { out[address] = it }
                }
            }
        }
        return out
    }
}
