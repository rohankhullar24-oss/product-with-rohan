package online.productwithrohan.reminders

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import java.util.Calendar
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.view.View
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import java.util.UUID

/**
 * Standalone-ish BLE tool: scan for nearby watches, connect, and try to push
 * the phone's current time via the standard Bluetooth Current Time Service.
 * Whether that actually works depends on whether the watch's firmware
 * exposes CTS at all — plenty of budget watches gate everything behind a
 * proprietary vendor service instead, so this also dumps every discovered
 * service/characteristic UUID to the log, which is the next thing to go on
 * if CTS isn't there.
 */
class WatchSyncActivity : AppCompatActivity() {

    companion object {
        private val CTS_SERVICE_UUID = UUID.fromString("00001805-0000-1000-8000-00805f9b34fb")
        private val CTS_CHAR_UUID = UUID.fromString("00002a2b-0000-1000-8000-00805f9b34fb")
        private val BATTERY_SERVICE_UUID = UUID.fromString("0000180f-0000-1000-8000-00805f9b34fb")
        private val BATTERY_CHAR_UUID = UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb")
        private const val SCAN_TIMEOUT_MS = 12_000L
        private val MAC_ADDRESS_REGEX = Regex("([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}")
    }

    private lateinit var adapter: SimpleListAdapter<BluetoothDevice>
    private lateinit var scanButton: Button
    private lateinit var logView: TextView
    private lateinit var logScroll: ScrollView

    private val handler = Handler(Looper.getMainLooper())
    private val foundDevices = LinkedHashMap<String, BluetoothDevice>()
    private var gatt: BluetoothGatt? = null
    private var scanning = false

    private val bluetoothManager by lazy { getSystemService(BluetoothManager::class.java) }
    private val bleScanner by lazy { bluetoothManager?.adapter?.bluetoothLeScanner }

    private val enableBtLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == Activity.RESULT_OK) startScan()
        }

    private var pendingMacFromQr: String? = null

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
            if (!granted.values.all { it }) {
                Toast.makeText(this, R.string.watch_sync_permission_denied, Toast.LENGTH_LONG).show()
                return@registerForActivityResult
            }
            val mac = pendingMacFromQr
            pendingMacFromQr = null
            if (mac != null) connectByMac(mac) else ensureBluetoothOnThenScan()
        }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            // device.name relies on the OS's cached device info and is often null for a
            // device that's never been paired, even though it IS broadcasting a name —
            // the raw advertisement/scan-record name is the reliable source during a scan.
            val name = result.scanRecord?.deviceName ?: deviceName(device)
            if (foundDevices.put(device.address, device) == null) {
                appendLog(getString(R.string.watch_sync_log_found, name ?: getString(R.string.watch_sync_unknown_device), device.address))
                refreshDeviceList()
            }
        }

        override fun onScanFailed(errorCode: Int) {
            scanning = false
            updateScanButton()
            appendLog(getString(R.string.watch_sync_log_scan_failed, errorCode))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_watch_sync)
        title = getString(R.string.title_watch_sync)

        scanButton = findViewById(R.id.button_scan)
        logView = findViewById(R.id.log_view)
        logScroll = findViewById(R.id.log_scroll)
        findViewById<Button>(R.id.button_scan_qr).setOnClickListener { scanQrCode() }

        adapter = SimpleListAdapter(
            title = { deviceName(it) ?: getString(R.string.watch_sync_unknown_device) },
            subtitle = { it.address },
            onClick = { device -> onDeviceSelected(device) },
        )
        findViewById<RecyclerView>(R.id.recycler).apply {
            layoutManager = LinearLayoutManager(this@WatchSyncActivity)
            adapter = this@WatchSyncActivity.adapter
        }

        scanButton.setOnClickListener {
            if (scanning) stopScan() else requestPermissionsThenScan()
        }

        appendLog(getString(R.string.watch_sync_log_intro))
    }

    override fun onDestroy() {
        super.onDestroy()
        stopScan()
        gatt?.close()
    }

    // --- permissions & scanning -------------------------------------------------

    private fun requiredPermissions(): Array<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
    } else {
        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    private fun hasPermissions(): Boolean = requiredPermissions().all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermissionsThenScan() {
        if (hasPermissions()) ensureBluetoothOnThenScan() else permissionLauncher.launch(requiredPermissions())
    }

    private fun ensureBluetoothOnThenScan() {
        val adapter = bluetoothManager?.adapter
        if (adapter == null) {
            Toast.makeText(this, R.string.watch_sync_no_bluetooth, Toast.LENGTH_LONG).show()
            return
        }
        if (!adapter.isEnabled) {
            enableBtLauncher.launch(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE))
            return
        }
        startScan()
    }

    private fun startScan() {
        if (!hasPermissions() || scanning) return
        foundDevices.clear()
        refreshDeviceList()
        appendLog(getString(R.string.watch_sync_log_scanning))
        scanning = true
        updateScanButton()
        try {
            bleScanner?.startScan(scanCallback)
        } catch (e: SecurityException) {
            scanning = false
            updateScanButton()
            return
        }
        handler.postDelayed({ stopScan() }, SCAN_TIMEOUT_MS)
    }

    private fun stopScan() {
        if (!scanning) return
        scanning = false
        updateScanButton()
        try {
            bleScanner?.stopScan(scanCallback)
        } catch (e: SecurityException) {
            // permission was revoked mid-scan; nothing more to clean up
        }
        appendLog(getString(R.string.watch_sync_log_scan_done, foundDevices.size))
    }

    private fun updateScanButton() {
        scanButton.setText(if (scanning) R.string.watch_sync_stop_scan else R.string.watch_sync_start_scan)
    }

    private fun refreshDeviceList() {
        adapter.submit(foundDevices.values.toList())
    }

    private fun deviceName(device: BluetoothDevice): String? = try {
        device.name
    } catch (e: SecurityException) {
        null
    }

    // --- QR pairing -----------------------------------------------------

    /**
     * Most watches' "Download App & Pair" QR is just a dynamically-generated
     * app-download link (why it looks different every scan), not a pairing
     * secret — real BLE pairing still happens by device discovery. This is
     * here as a fallback for watches that DO embed their MAC in the code, and
     * as a diagnostic: the raw payload gets logged either way so we can see
     * which case we're in.
     */
    private fun scanQrCode() {
        GmsBarcodeScanning.getClient(this).startScan()
            .addOnSuccessListener { barcode ->
                val raw = barcode.rawValue
                if (raw.isNullOrBlank()) {
                    appendLog(getString(R.string.watch_sync_log_qr_empty))
                } else {
                    handleQrResult(raw)
                }
            }
            .addOnFailureListener { e ->
                appendLog(getString(R.string.watch_sync_log_qr_failed, e.message ?: e.toString()))
            }
    }

    private fun handleQrResult(raw: String) {
        appendLog(getString(R.string.watch_sync_log_qr_result, raw))
        val mac = MAC_ADDRESS_REGEX.find(raw)?.value
        if (mac == null) {
            appendLog(getString(R.string.watch_sync_log_qr_no_mac))
            return
        }
        appendLog(getString(R.string.watch_sync_log_qr_mac_found, mac))
        if (hasPermissions()) {
            connectByMac(mac)
        } else {
            pendingMacFromQr = mac
            permissionLauncher.launch(requiredPermissions())
        }
    }

    private fun connectByMac(mac: String) {
        val device = try {
            bluetoothManager?.adapter?.getRemoteDevice(mac)
        } catch (e: IllegalArgumentException) {
            null
        }
        if (device == null) {
            appendLog(getString(R.string.watch_sync_log_qr_no_mac))
            return
        }
        onDeviceSelected(device)
    }

    // --- connect & sync -----------------------------------------------------

    private fun onDeviceSelected(device: BluetoothDevice) {
        stopScan()
        appendLog(getString(R.string.watch_sync_log_connecting, deviceName(device) ?: device.address))
        gatt?.close()
        gatt = try {
            device.connectGatt(this, false, gattCallback)
        } catch (e: SecurityException) {
            appendLog(getString(R.string.watch_sync_log_permission_error))
            null
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_connected)) }
                try {
                    g.discoverServices()
                } catch (e: SecurityException) {
                    runOnUiThread { appendLog(getString(R.string.watch_sync_log_permission_error)) }
                }
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_disconnected)) }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            runOnUiThread { logServices(g.services) }

            val ctsChar = g.getService(CTS_SERVICE_UUID)?.getCharacteristic(CTS_CHAR_UUID)
            if (ctsChar == null) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_no_cts)) }
            } else {
                writeCurrentTime(g, ctsChar)
            }

            val batteryChar = g.getService(BATTERY_SERVICE_UUID)?.getCharacteristic(BATTERY_CHAR_UUID)
            if (batteryChar == null) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_no_battery)) }
            } else {
                try {
                    g.readCharacteristic(batteryChar)
                } catch (e: SecurityException) {
                    runOnUiThread { appendLog(getString(R.string.watch_sync_log_permission_error)) }
                }
            }
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            runOnUiThread {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    appendLog(getString(R.string.watch_sync_log_time_synced))
                } else {
                    appendLog(getString(R.string.watch_sync_log_write_failed, status))
                }
            }
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            if (characteristic.uuid != BATTERY_CHAR_UUID) return
            runOnUiThread {
                val percent = characteristic.value?.firstOrNull()?.toInt()?.and(0xFF)
                if (status == BluetoothGatt.GATT_SUCCESS && percent != null) {
                    appendLog(getString(R.string.watch_sync_log_battery, percent))
                } else {
                    appendLog(getString(R.string.watch_sync_log_battery_failed, status))
                }
            }
        }
    }

    private fun logServices(services: List<BluetoothGattService>) {
        appendLog(getString(R.string.watch_sync_log_services_header, services.size))
        for (service in services) {
            appendLog("  service ${service.uuid}")
            for (c in service.characteristics) {
                appendLog("    char ${c.uuid}")
            }
        }
        appendLog(getString(R.string.watch_sync_steps_note))
    }

    /** Bluetooth SIG "Current Time Service" exact_time_256 payload (10 bytes). */
    private fun writeCurrentTime(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        val cal = Calendar.getInstance()
        val year = cal.get(Calendar.YEAR)
        val payload = byteArrayOf(
            (year and 0xFF).toByte(),
            ((year shr 8) and 0xFF).toByte(),
            (cal.get(Calendar.MONTH) + 1).toByte(),
            cal.get(Calendar.DAY_OF_MONTH).toByte(),
            cal.get(Calendar.HOUR_OF_DAY).toByte(),
            cal.get(Calendar.MINUTE).toByte(),
            cal.get(Calendar.SECOND).toByte(),
            // Bluetooth day-of-week is 1=Monday..7=Sunday; Calendar is 1=Sunday..7=Saturday.
            (((cal.get(Calendar.DAY_OF_WEEK) + 5) % 7) + 1).toByte(),
            0, // fractions256
            0, // adjust reason: manual time update
        )
        try {
            @Suppress("DEPRECATION")
            characteristic.value = payload
            @Suppress("DEPRECATION")
            g.writeCharacteristic(characteristic)
        } catch (e: SecurityException) {
            appendLog(getString(R.string.watch_sync_log_permission_error))
        }
    }

    private fun appendLog(line: String) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            handler.post { appendLog(line) }
            return
        }
        logView.append(line + "\n")
        logScroll.post { logScroll.fullScroll(View.FOCUS_DOWN) }
    }
}
