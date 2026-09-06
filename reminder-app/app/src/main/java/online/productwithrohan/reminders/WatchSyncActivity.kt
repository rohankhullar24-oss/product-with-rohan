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
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import java.util.Calendar
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
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

        // "zhbraceletsdk" vendor protocol (com.zjw.zhbraceletsdk / com.zhapp.ble in the NoiseFit
        // app, decompiled from the real app APK): a protobuf-based command channel used by
        // watches whose firmware doesn't implement the standard Current Time Service. Commands
        // are SEWear{id, <payload>} protobuf messages, prefixed with a 2-byte little-endian
        // packet-index header, written to CHAR_02. Cmd id 48 = SEWear{ systemTime: SESystemTime{
        // timeSet: SETimeSet{ timestamp, offset } } }.
        private val ZH_PROTOBUF_SERVICE_UUID = UUID.fromString("16186f00-0000-1000-8000-00807f9b34fb")
        private val ZH_PROTOBUF_CHAR_01_UUID = UUID.fromString("16186f01-0000-1000-8000-00807f9b34fb")
        private val ZH_PROTOBUF_CHAR_02_UUID = UUID.fromString("16186f02-0000-1000-8000-00807f9b34fb")
        private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        private const val ZH_CMD_SET_TIME = 48
        private const val ZH_CMD_SEND_APP_NOTIFICATION = 179
        private const val ZH_CMD_GET_BATTERY = 33
        // App-level "device binding" handshake — separate from BLE's own pairing/bonding
        // (BluetoothDevice.createBond(), which is what makes the watch show its native pairing
        // prompt). Confirmed against the real app's own consumer code
        // (com.noisefit_zhsdk.handler.ZhConnectHandler): cmd 16 checks the bind state; if the
        // response's bindCheckResult is SUCCESS, cmd 18 confirms the bind with an app-generated
        // random token (not anything derived from the watch). Cmd 17 ("bindDevice") is only ever
        // called by the real app with a null argument, so it isn't part of this confirmation step.
        private const val ZH_CMD_REQUEST_BIND_STATE = 16
        private const val ZH_CMD_SEND_APP_BIND_RESULT = 18

        // Real-time heart rate: cmd 731 (setRealTimeHeartRateConfig), confirmed against the real
        // NoiseFit app's own generated protobuf classes (com.zh.ble.wear.protobuf.SettingMenuProtos,
        // decompiled from a later NoiseFit build than the one WATCH_SYNC_PROTOCOL.md was originally
        // written against). SEWear.settingMenu is field 15; SESettingMenu.realTimeHeartRateSettings
        // is field 38 (the enable/config request); the watch pushes readings back, unsolicited, as
        // SESettingMenu.realTimeHeartRateData, field 39 (SERealTimeHeartRateData{ timestamp: field 1
        // uint32, value: field 2 uint32 } — both confirmed via SettingMenuProtos' writeTo()).
        private const val ZH_CMD_SET_REALTIME_HEART_RATE = 731
        private const val ZH_SETTING_MENU_FIELD = 15
        private const val ZH_REALTIME_HR_SETTINGS_FIELD = 38
        private const val ZH_REALTIME_HR_DATA_FIELD = 39

        // Fixed 6-byte ACKs the SDK writes back on CHAR_01 while receiving a multi-packet reply
        // (decompiled from com.zhapp.ble.a: a.d() / outer a()) — [0,0,1,X,0,0] where X=1 means
        // "header received, send data" and X=0 means "all packets received".
        private val ZH_ACK_READY_FOR_DATA = byteArrayOf(0, 0, 1, 1, 0, 0)
        private val ZH_ACK_ALL_RECEIVED = byteArrayOf(0, 0, 1, 0, 0, 0)

        private const val SCAN_TIMEOUT_MS = 12_000L
        private const val BIND_RESPONSE_TIMEOUT_MS = 8_000L
        private val MAC_ADDRESS_REGEX = Regex("([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}")
    }

    private lateinit var adapter: SimpleListAdapter<BluetoothDevice>
    private lateinit var scanButton: Button
    private lateinit var logView: TextView
    private lateinit var logScroll: ScrollView
    private lateinit var logToggle: TextView
    private lateinit var statusHeadline: TextView
    private lateinit var statusSubtitle: TextView
    private lateinit var cardDevices: View
    private lateinit var sectionControls: View
    private lateinit var timeResult: TextView
    private lateinit var notificationResult: TextView
    private lateinit var batteryResult: TextView
    private lateinit var heartRateResult: TextView
    private lateinit var heartRateButton: Button

    private val handler = Handler(Looper.getMainLooper())
    private val foundDevices = LinkedHashMap<String, BluetoothDevice>()
    private var gatt: BluetoothGatt? = null
    private var scanning = false

    // CHAR_01 multi-packet response reassembly state (mirrors the decompiled SDK's fields).
    private var expectedPacketCount = 0
    private var receivedPackets: Array<ByteArray?>? = null
    private var receivedPacketNum = 0
    private var heartRateStreaming = false

    // Requests that expect an async reply over CHAR_01 (bind-state check, battery) are matched
    // to their response FIFO, in send order — a single shared field here would let a manual
    // battery check clobber an in-flight automatic bind-state request's expected id, and
    // mis-route whichever reply arrives second into the wrong handler.
    private val pendingResponseCmdIds = ArrayDeque<Int>()

    @Synchronized
    private fun pushPendingResponse(cmdId: Int) {
        pendingResponseCmdIds.addLast(cmdId)
    }

    @Synchronized
    private fun popPendingResponse(): Int? = pendingResponseCmdIds.removeFirstOrNull()

    // Android's BluetoothGatt allows only ONE outstanding write/read/descriptor-write at a
    // time — issuing a second before the first's callback fires silently drops it (this is
    // exactly what was happening: enabling notifications, the bind request, and time sync were
    // all fired back-to-back in onServicesDiscovered, so most of them never actually went out).
    // Every raw GATT operation must go through this queue instead of calling the API directly.
    // Each queued op carries the vendor cmd id it corresponds to (or null) so
    // onCharacteristicWrite can tell which write just completed — a single shared "last cmd id"
    // field would get overwritten by a second op queued before the first one's callback fires.
    private val gattOpQueue = ArrayDeque<Pair<Int?, () -> Unit>>()
    private var gattOpInFlight = false
    private var currentGattOpCmdId: Int? = null

    // GATT callbacks land on their own dispatch thread, not the main thread these functions are
    // otherwise called from (button clicks) — synchronize queue mutation against that race.
    @Synchronized
    private fun enqueueGattOp(cmdId: Int? = null, op: () -> Unit) {
        gattOpQueue.addLast(cmdId to op)
        if (!gattOpInFlight) runNextGattOpLocked()
    }

    @Synchronized
    private fun runNextGattOp() = runNextGattOpLocked()

    private fun runNextGattOpLocked() {
        val next = gattOpQueue.removeFirstOrNull()
        if (next == null) {
            gattOpInFlight = false
            currentGattOpCmdId = null
            return
        }
        gattOpInFlight = true
        currentGattOpCmdId = next.first
        try {
            next.second()
        } catch (e: Exception) {
            // An op that throws (e.g. a GATT call racing a connection that just closed) must
            // still release the queue, or every op behind it stalls for the rest of this
            // connection's lifetime.
            runNextGattOpLocked()
        }
    }

    @Synchronized
    private fun resetGattOpQueue() {
        gattOpQueue.clear()
        gattOpInFlight = false
        currentGattOpCmdId = null
        pendingResponseCmdIds.clear()
    }

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
                cardDevices.visibility = View.VISIBLE
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
        logToggle = findViewById(R.id.log_toggle)
        statusHeadline = findViewById(R.id.status_headline)
        statusSubtitle = findViewById(R.id.status_subtitle)
        cardDevices = findViewById(R.id.card_devices)
        sectionControls = findViewById(R.id.section_controls)
        timeResult = findViewById(R.id.time_result)
        notificationResult = findViewById(R.id.notification_result)
        batteryResult = findViewById(R.id.battery_result)
        heartRateResult = findViewById(R.id.heart_rate_result)
        heartRateButton = findViewById(R.id.button_toggle_heart_rate)

        findViewById<Button>(R.id.button_scan_qr).setOnClickListener { scanQrCode() }
        findViewById<Button>(R.id.button_send_notification).setOnClickListener { sendTestNotification() }
        findViewById<Button>(R.id.button_read_battery).setOnClickListener { requestVendorBattery() }
        heartRateButton.setOnClickListener { toggleRealTimeHeartRate() }
        logToggle.setOnClickListener {
            val show = logScroll.visibility != View.VISIBLE
            logScroll.visibility = if (show) View.VISIBLE else View.GONE
            logToggle.setText(if (show) R.string.watch_sync_hide_log else R.string.watch_sync_show_log)
        }

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

        ContextCompat.registerReceiver(
            this,
            bondStateReceiver,
            IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        stopScan()
        gatt?.close()
        unregisterReceiver(bondStateReceiver)
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
        cardDevices.visibility = View.GONE
        if (!isLocationEnabled()) {
            appendLog(getString(R.string.watch_sync_log_location_off))
        }
        appendLog(getString(R.string.watch_sync_log_scanning))
        scanning = true
        updateScanButton()
        statusHeadline.setText(R.string.watch_sync_status_not_connected)
        statusSubtitle.setText(R.string.watch_sync_status_scanning)
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

    /**
     * Android's BLE scan silently returns zero results while system Location is
     * off (this used to be unconditional; SCAN_MODE + neverForLocation lifts it on
     * S+, but pre-S devices are still gated on this regardless of permissions).
     */
    private fun isLocationEnabled(): Boolean {
        val lm = getSystemService(LocationManager::class.java) ?: return true
        return try {
            LocationManagerCompat.isLocationEnabled(lm)
        } catch (e: Exception) {
            true
        }
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
        val name = deviceName(device) ?: device.address
        appendLog(getString(R.string.watch_sync_log_connecting, name))
        statusSubtitle.text = getString(R.string.watch_sync_status_connecting, name)
        sectionControls.visibility = View.GONE
        resetGattOpQueue()
        gatt?.close()
        gatt = try {
            device.connectGatt(this, false, gattCallback)
        } catch (e: SecurityException) {
            appendLog(getString(R.string.watch_sync_log_permission_error))
            null
        }
        // requestBondIfNeeded() is called once GATT actually reaches STATE_CONNECTED (see
        // gattCallback.onConnectionStateChange), not here. Calling createBond() while a
        // connectGatt() is still in flight is a known-flaky Android BLE pattern — many stacks
        // let it return true / transition through BOND_BONDED without ever showing the watch's
        // own confirmation prompt, so the app reports "paired" while the watch never did.
    }

    /**
     * Real OS-level Bluetooth pairing (distinct from GATT connect, and from the vendor-protocol
     * "device binding" handshake above) — confirmed on real hardware: the watch shows a native
     * "Pair with this device?" confirmation on its own screen only when the phone actually calls
     * createBond(). This is what makes the watch show up as paired at all; our GATT reads/writes
     * work without it, which is why this was easy to miss.
     */
    @Suppress("DEPRECATION")
    private fun requestBondIfNeeded(device: BluetoothDevice) {
        try {
            if (device.bondState == BluetoothDevice.BOND_BONDED) {
                appendLog(getString(R.string.watch_sync_log_already_bonded))
                return
            }
            appendLog(getString(R.string.watch_sync_log_bonding_requested))
            device.createBond()
        } catch (e: SecurityException) {
            appendLog(getString(R.string.watch_sync_log_permission_error))
        }
    }

    private val bondStateReceiver = object : BroadcastReceiver() {
        @Suppress("DEPRECATION")
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != BluetoothDevice.ACTION_BOND_STATE_CHANGED) return
            val device: BluetoothDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE) ?: return
            if (device.address != gatt?.device?.address) return
            when (intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.BOND_NONE)) {
                BluetoothDevice.BOND_BONDING -> appendLog(getString(R.string.watch_sync_log_bonding_in_progress))
                BluetoothDevice.BOND_BONDED -> appendLog(getString(R.string.watch_sync_log_bonded))
                BluetoothDevice.BOND_NONE -> appendLog(getString(R.string.watch_sync_log_bond_failed_or_removed))
            }
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            // This callback instance is shared across reconnects; a late callback from a GATT
            // that onDeviceSelected already superseded and closed must not touch the new
            // connection's queue/UI state (e.g. a stray DISCONNECTED from the old gatt
            // resetting the op queue mid-operation on the new one).
            if (g !== gatt) return
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                runOnUiThread {
                    appendLog(getString(R.string.watch_sync_log_connected))
                    val name = deviceName(g.device) ?: g.device.address
                    statusHeadline.text = getString(R.string.watch_sync_status_connected_headline, name)
                    statusSubtitle.setText(R.string.watch_sync_status_connected_subtitle)
                }
                requestBondIfNeeded(g.device)
                try {
                    g.discoverServices()
                } catch (e: SecurityException) {
                    runOnUiThread { appendLog(getString(R.string.watch_sync_log_permission_error)) }
                }
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                resetGattOpQueue()
                heartRateStreaming = false
                runOnUiThread {
                    appendLog(getString(R.string.watch_sync_log_disconnected))
                    statusHeadline.setText(R.string.watch_sync_status_not_connected)
                    statusSubtitle.setText(R.string.watch_sync_status_disconnected_subtitle)
                    sectionControls.visibility = View.GONE
                    heartRateButton.setText(R.string.watch_sync_start_heart_rate)
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (g !== gatt) return
            runOnUiThread {
                logServices(g.services)
                sectionControls.visibility = View.VISIBLE
                timeResult.setText(R.string.watch_sync_card_time_pending)
                notificationResult.setText(R.string.watch_sync_card_notification_subtitle)
                batteryResult.setText(R.string.watch_sync_card_battery_subtitle)
                heartRateResult.setText(R.string.watch_sync_card_heart_rate_subtitle)
                heartRateButton.setText(R.string.watch_sync_start_heart_rate)
            }
            heartRateStreaming = false

            val ctsChar = g.getService(CTS_SERVICE_UUID)?.getCharacteristic(CTS_CHAR_UUID)
            val zhTimeChar = g.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_02_UUID)

            if (zhTimeChar != null) {
                enableVendorResponseNotifications(g)
                requestDeviceBindState(g, zhTimeChar)
            }

            if (ctsChar != null) {
                writeCurrentTime(g, ctsChar)
            } else if (zhTimeChar != null) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_vendor_protocol)) }
                writeVendorTimeSync(g, zhTimeChar)
            } else {
                runOnUiThread {
                    appendLog(getString(R.string.watch_sync_log_no_cts))
                    timeResult.setText(R.string.watch_sync_card_time_no_standard_service)
                }
            }

            val batteryChar = g.getService(BATTERY_SERVICE_UUID)?.getCharacteristic(BATTERY_CHAR_UUID)
            if (batteryChar == null) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_no_battery)) }
            } else {
                enqueueGattOp {
                    try {
                        g.readCharacteristic(batteryChar)
                    } catch (e: SecurityException) {
                        runOnUiThread { appendLog(getString(R.string.watch_sync_log_permission_error)) }
                        runNextGattOp()
                    }
                }
            }
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            if (g !== gatt) return
            // Capture before runNextGattOp() below advances the queue to the next op.
            val cmdId = currentGattOpCmdId
            runOnUiThread {
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    appendLog(getString(R.string.watch_sync_log_write_failed, status))
                    if (characteristic.uuid == CTS_CHAR_UUID ||
                        (characteristic.uuid == ZH_PROTOBUF_CHAR_02_UUID && cmdId == ZH_CMD_SET_TIME)
                    ) {
                        timeResult.setText(R.string.watch_sync_card_time_failed)
                    }
                } else if (characteristic.uuid == CTS_CHAR_UUID) {
                    appendLog(getString(R.string.watch_sync_log_time_synced))
                    timeResult.setText(R.string.watch_sync_card_time_synced)
                } else if (characteristic.uuid == ZH_PROTOBUF_CHAR_02_UUID) {
                    // This characteristic only supports write-without-response, so GATT_SUCCESS
                    // here only means the phone's Bluetooth stack sent the packet — the watch
                    // gives no acknowledgment either way. Check the watch's own display to confirm.
                    appendLog(getString(R.string.watch_sync_log_vendor_write_sent))
                    if (cmdId == ZH_CMD_SET_TIME) {
                        timeResult.setText(R.string.watch_sync_card_time_sent_unconfirmed)
                    }
                }
            }
            runNextGattOp()
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            if (g !== gatt) return
            if (characteristic.uuid == BATTERY_CHAR_UUID) {
                runOnUiThread {
                    val percent = characteristic.value?.firstOrNull()?.toInt()?.and(0xFF)
                    if (status == BluetoothGatt.GATT_SUCCESS && percent != null) {
                        appendLog(getString(R.string.watch_sync_log_battery, percent))
                        batteryResult.text = getString(R.string.watch_sync_log_vendor_battery, percent)
                    } else {
                        appendLog(getString(R.string.watch_sync_log_battery_failed, status))
                    }
                }
            }
            runNextGattOp()
        }

        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: android.bluetooth.BluetoothGattDescriptor, status: Int) {
            if (g !== gatt) return
            if (descriptor.uuid == CCCD_UUID) {
                runOnUiThread { appendLog(getString(R.string.watch_sync_log_cccd_write_result, status)) }
            }
            runNextGattOp()
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            if (g !== gatt) return
            if (characteristic.uuid != ZH_PROTOBUF_CHAR_01_UUID) return
            handleVendorResponsePacket(g, characteristic.value ?: return)
        }
    }

    private fun logServices(services: List<BluetoothGattService>) {
        appendLog(getString(R.string.watch_sync_log_services_header, services.size))
        for (service in services) {
            appendLog("  service ${service.uuid}")
            for (c in service.characteristics) {
                appendLog("    char ${c.uuid} [${characteristicPropsLabel(c)}]")
            }
        }
        appendLog(getString(R.string.watch_sync_steps_note))
    }

    /** Which operations a characteristic supports — narrows down which ones a vendor protocol likely uses for commands vs. responses. */
    private fun characteristicPropsLabel(c: BluetoothGattCharacteristic): String {
        val props = mutableListOf<String>()
        if (c.properties and BluetoothGattCharacteristic.PROPERTY_READ != 0) props += "read"
        if (c.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0) props += "write"
        if (c.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0) props += "write-no-response"
        if (c.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) props += "notify"
        if (c.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0) props += "indicate"
        return if (props.isEmpty()) "none" else props.joinToString(",")
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
        enqueueGattOp {
            try {
                @Suppress("DEPRECATION")
                characteristic.value = payload
                @Suppress("DEPRECATION")
                g.writeCharacteristic(characteristic)
            } catch (e: SecurityException) {
                appendLog(getString(R.string.watch_sync_log_permission_error))
                runNextGattOp()
            }
        }
    }

    /**
     * Builds and writes the vendor "zhbraceletsdk" time-sync command (cmd id 48): a
     * SEWear{ id: 48, systemTime: SESystemTime{ timeSet: SETimeSet{ timestamp, offset } } }
     * protobuf message, hand-encoded to the exact wire format the decompiled NoiseFit app
     * produces (field numbers/types confirmed from its generated *Protos.java sources),
     * prefixed with the SDK's 2-byte little-endian single-packet header.
     */
    private fun writeVendorTimeSync(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        val timestampSeconds = System.currentTimeMillis() / 1000
        val offsetQuarterHours = (java.util.TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000) / 15

        val timeSet = mutableListOf<Byte>()
        appendProtoTag(timeSet, 1, 0); appendVarint(timeSet, timestampSeconds) // timestamp (uint32)
        appendProtoTag(timeSet, 2, 0); appendVarint(timeSet, zigzagEncode32(offsetQuarterHours).toLong()) // offset (sint32)

        val systemTime = mutableListOf<Byte>()
        appendProtoTag(systemTime, 1, 2); appendVarint(systemTime, timeSet.size.toLong()); systemTime.addAll(timeSet)

        val wear = mutableListOf<Byte>()
        appendProtoTag(wear, 1, 0); appendVarint(wear, ZH_CMD_SET_TIME.toLong()) // id
        appendProtoTag(wear, 5, 2); appendVarint(wear, systemTime.size.toLong()); wear.addAll(systemTime) // systemTime

        // SDK packet framing: 2-byte little-endian packet index, "1" since this fits in one packet.
        writeVendorRaw(g, characteristic, byteArrayOf(1, 0) + wear.toByteArray(), ZH_CMD_SET_TIME)
    }

    private fun appendProtoTag(out: MutableList<Byte>, fieldNumber: Int, wireType: Int) =
        appendVarint(out, ((fieldNumber shl 3) or wireType).toLong())

    private fun appendVarint(out: MutableList<Byte>, valueIn: Long) {
        var value = valueIn
        while (true) {
            if (value and 0x7FL.inv() == 0L) {
                out.add(value.toByte())
                return
            }
            out.add(((value and 0x7F) or 0x80).toByte())
            value = value ushr 7
        }
    }

    private fun zigzagEncode32(n: Int): Int = (n shl 1) xor (n shr 31)

    // --- vendor protocol: notifications + battery read -----------------------------------

    /**
     * Every request/response exchange (bind-state, battery, real-time HR) depends entirely on
     * this succeeding — if the watch never actually notifies, every write still reports success
     * (write-without-response gives no peripheral ack either way) while every response silently
     * never arrives, which is indistinguishable from "the watch ignored us" without the logging
     * added here. Previously this bailed out with NO log line at all if the characteristic had no
     * standard 0x2902 CCCD descriptor — plausible on a cheap BLE SoC that streams notifications
     * once the phone's local stack has registered for them via setCharacteristicNotification(),
     * without requiring (or even exposing) the over-the-air descriptor write. That local
     * registration is now unconditional; the CCCD write only happens if the descriptor exists.
     */
    @Suppress("DEPRECATION")
    private fun enableVendorResponseNotifications(g: BluetoothGatt) {
        val char01 = g.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_01_UUID)
        if (char01 == null) {
            appendLog(getString(R.string.watch_sync_log_no_notify_char))
            return
        }
        val cccd = char01.getDescriptor(CCCD_UUID)
        enqueueGattOp {
            try {
                val registered = g.setCharacteristicNotification(char01, true)
                appendLog(getString(R.string.watch_sync_log_notify_registered, registered))
                if (cccd != null) {
                    cccd.value = android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    g.writeDescriptor(cccd)
                } else {
                    appendLog(getString(R.string.watch_sync_log_no_cccd))
                    runNextGattOp()
                }
            } catch (e: SecurityException) {
                appendLog(getString(R.string.watch_sync_log_permission_error))
                runNextGattOp()
            }
        }
    }

    /**
     * SEWear{ id: 16 } — bare request. Reply: SEWear{ bindAccount: SEBindAccount{
     * bindCheck: SEBindCheck{ bindCheckResult, ... } } } — see handleBindStateResponse.
     */
    private fun requestDeviceBindState(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        val wear = mutableListOf<Byte>()
        appendProtoTag(wear, 1, 0); appendVarint(wear, ZH_CMD_REQUEST_BIND_STATE.toLong())
        pushPendingResponse(ZH_CMD_REQUEST_BIND_STATE)
        writeVendorPacket(g, characteristic, wear.toByteArray(), ZH_CMD_REQUEST_BIND_STATE)
        appendLog(getString(R.string.watch_sync_log_bind_request_sent))
        // This is the request whose response gates the watch's own "Download App & Pair" screen
        // (its reply is what triggers the cmd-18 confirmation that actually completes binding) —
        // if it never gets a reply, the watch never leaves that screen. Surface that explicitly
        // instead of leaving it indistinguishable from "still waiting".
        val bindGatt = g
        handler.postDelayed({
            if (bindGatt === gatt && pendingResponseCmdIds.contains(ZH_CMD_REQUEST_BIND_STATE)) {
                appendLog(getString(R.string.watch_sync_log_no_bind_response, BIND_RESPONSE_TIMEOUT_MS / 1000))
            }
        }, BIND_RESPONSE_TIMEOUT_MS)
    }

    /**
     * Confirmed against the real NoiseFit app's own consumer code (com.noisefit_zhsdk.handler.
     * ZhConnectHandler.T()/bindDevice$1.onDeviceInfo) — this replaces an earlier, incorrect guess
     * that echoed the response's bindRandomKey field back via cmd 17. The real gating field is
     * bindCheck.bindCheckResult (field 3, enum SEBindCheckResult; SUCCESS = 0), not the random
     * key. On SUCCESS the app generates its OWN random token locally (not derived from the watch
     * at all) and sends it via cmd 18 (sendAppBindResult) to actually complete the bind.
     */
    private fun handleBindStateResponse(wearBytes: ByteArray) {
        val bindAccountBytes = parseProtoFields(wearBytes)[3]?.firstOrNull()?.bytes
        val bindCheckBytes = bindAccountBytes?.let { parseProtoFields(it)[2]?.firstOrNull()?.bytes }
        val bindCheckResult = bindCheckBytes?.let { parseProtoFields(it)[3]?.firstOrNull()?.varintValue }
        runOnUiThread { appendLog(getString(R.string.watch_sync_log_bind_state_received, bindCheckResult?.toString() ?: "?")) }
        val g = gatt
        val char02 = g?.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_02_UUID)
        if (g == null || char02 == null || bindCheckResult != 0L) { // 0 = SEBindCheckResult.SUCCESS
            runOnUiThread { appendLog(getString(R.string.watch_sync_log_bind_no_key)) }
            return
        }
        sendAppBindResult(g, char02)
    }

    /**
     * SEWear{ id: 18, bindAccount: SEBindAccount{ bindResult: SEBindResult{
     * bindResultType: SUCCESS(0), userId: <locally-generated token>, phoneType: ANDROID(0) } } }
     * — the actual bind-confirmation command (cmd 17/"bindDevice" itself is only ever called
     * with a null string in the real app, so it's not the confirmation step).
     *
     * Token recipe per WATCH_SYNC_PROTOCOL.md, confirmed against the real app's own code:
     * UUID.randomUUID() + Random(10,10000) + userId, then substring(30). We have no real
     * account/userId here, so ANDROID_ID stands in for that component.
     */
    @Suppress("HardwareIds")
    private fun sendAppBindResult(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
        val userId = android.provider.Settings.Secure.getString(
            contentResolver,
            android.provider.Settings.Secure.ANDROID_ID,
        ) ?: ""
        val randomComponent = (10 until 10000).random()
        val token = (java.util.UUID.randomUUID().toString() + randomComponent + userId).substring(30)

        val bindResult = mutableListOf<Byte>()
        appendProtoTag(bindResult, 1, 0); appendVarint(bindResult, 0) // bindResultType = SUCCESS
        appendProtoString(bindResult, 2, token) // userId
        appendProtoTag(bindResult, 3, 0); appendVarint(bindResult, 0) // phoneType = ANDROID

        val bindAccount = mutableListOf<Byte>()
        appendProtoTag(bindAccount, 3, 2); appendVarint(bindAccount, bindResult.size.toLong()); bindAccount.addAll(bindResult)

        val wear = mutableListOf<Byte>()
        appendProtoTag(wear, 1, 0); appendVarint(wear, ZH_CMD_SEND_APP_BIND_RESULT.toLong())
        appendProtoTag(wear, 3, 2); appendVarint(wear, bindAccount.size.toLong()); wear.addAll(bindAccount)

        writeVendorPacket(g, characteristic, wear.toByteArray(), ZH_CMD_SEND_APP_BIND_RESULT)
        appendLog(getString(R.string.watch_sync_log_bind_device_sent))
    }

    /**
     * SEWear{ id: 731, settingMenu: SESettingMenu{ realTimeHeartRateSettings: SERealTimeHeartRateSettings{
     *   switch: <bool>, frequency: <uint32 seconds>, overtime: <uint32 seconds, auto-shutoff> } } }
     * — field numbers confirmed from the real NoiseFit app's generated protobuf classes
     * (SettingMenuProtos.SEWear.SETTING_MENU_FIELD_NUMBER=15, SESettingMenu.
     * REAL_TIME_HEART_RATE_SETTINGS_FIELD_NUMBER=38, and SERealTimeHeartRateSettings' own
     * switch/frequency/automaticShutdownTime = fields 1/2/3, all confirmed via writeTo()). The
     * watch streams readings back unsolicited over CHAR_01 (see handleVendorResponsePacket) as
     * long as the config stays enabled; there's no separate "get one reading" request.
     */
    private fun toggleRealTimeHeartRate() {
        val g = gatt
        if (g == null) {
            appendLog(getString(R.string.watch_sync_log_not_connected))
            return
        }
        val char02 = g.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_02_UUID)
        if (char02 == null) {
            appendLog(getString(R.string.watch_sync_log_no_vendor_service))
            return
        }
        val enable = !heartRateStreaming
        heartRateStreaming = enable

        val settings = mutableListOf<Byte>()
        appendProtoTag(settings, 1, 0); appendVarint(settings, if (enable) 1 else 0) // switch (bool)
        appendProtoTag(settings, 2, 0); appendVarint(settings, 5) // frequency: every 5 seconds
        appendProtoTag(settings, 3, 0); appendVarint(settings, 0) // overtime: 0 = no auto-shutoff

        val settingMenu = mutableListOf<Byte>()
        appendProtoTag(settingMenu, ZH_REALTIME_HR_SETTINGS_FIELD, 2)
        appendVarint(settingMenu, settings.size.toLong())
        settingMenu.addAll(settings)

        val wear = mutableListOf<Byte>()
        appendProtoTag(wear, 1, 0); appendVarint(wear, ZH_CMD_SET_REALTIME_HEART_RATE.toLong())
        appendProtoTag(wear, ZH_SETTING_MENU_FIELD, 2)
        appendVarint(wear, settingMenu.size.toLong())
        wear.addAll(settingMenu)

        writeVendorPacket(g, char02, wear.toByteArray(), ZH_CMD_SET_REALTIME_HEART_RATE)
        heartRateButton.setText(if (enable) R.string.watch_sync_stop_heart_rate else R.string.watch_sync_start_heart_rate)
        if (enable) {
            appendLog(getString(R.string.watch_sync_log_heart_rate_enable_sent))
            heartRateResult.setText(R.string.watch_sync_card_heart_rate_enabling)
        } else {
            appendLog(getString(R.string.watch_sync_log_heart_rate_disable_sent))
            heartRateResult.setText(R.string.watch_sync_card_heart_rate_subtitle)
        }
    }

    /**
     * Unsolicited push from the watch (no request/response correlation — arrives any time real-time
     * HR streaming is enabled): SEWear{ settingMenu: SESettingMenu{ realTimeHeartRateData:
     * SERealTimeHeartRateData{ timestamp: <uint32>, value: <uint32 bpm> } } }, fields confirmed the
     * same way as the enable request above. Returns true if this message was a heart-rate reading
     * (so the caller can skip its normal request/response dispatch).
     */
    private fun handlePossibleRealTimeHeartRate(wearBytes: ByteArray): Boolean {
        val settingMenuBytes = parseProtoFields(wearBytes)[ZH_SETTING_MENU_FIELD]?.firstOrNull()?.bytes ?: return false
        val hrDataBytes = parseProtoFields(settingMenuBytes)[ZH_REALTIME_HR_DATA_FIELD]?.firstOrNull()?.bytes ?: return false
        val bpm = parseProtoFields(hrDataBytes)[2]?.firstOrNull()?.varintValue ?: return false
        runOnUiThread {
            appendLog(getString(R.string.watch_sync_log_heart_rate_reading, bpm.toInt()))
            heartRateResult.text = getString(R.string.watch_sync_card_heart_rate_live, bpm.toInt())
        }
        return true
    }

    private fun sendTestNotification() {
        val g = gatt
        if (g == null) {
            appendLog(getString(R.string.watch_sync_log_not_connected))
            return
        }
        val char02 = g.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_02_UUID)
        if (char02 == null) {
            appendLog(getString(R.string.watch_sync_log_no_vendor_service))
            return
        }
        // SEWear{ id: 179, notification: SENotification{ appNotification: SEAppNotification{
        //   appName=1, pageName=2, title=3, text=4, tickerText=5 } } } — field numbers confirmed
        // from the decompiled NoiseFit app's NotificationProtos.java.
        val appNotification = mutableListOf<Byte>()
        appendProtoString(appNotification, 1, "Reminders")
        appendProtoString(appNotification, 3, "Test notification")
        appendProtoString(appNotification, 4, "Sent from Watch Sync")

        val notification = mutableListOf<Byte>()
        appendProtoTag(notification, 2, 2); appendVarint(notification, appNotification.size.toLong()); notification.addAll(appNotification)

        val wear = mutableListOf<Byte>()
        appendProtoTag(wear, 1, 0); appendVarint(wear, ZH_CMD_SEND_APP_NOTIFICATION.toLong())
        appendProtoTag(wear, 13, 2); appendVarint(wear, notification.size.toLong()); wear.addAll(notification)

        writeVendorPacket(g, char02, wear.toByteArray(), ZH_CMD_SEND_APP_NOTIFICATION)
        appendLog(getString(R.string.watch_sync_log_notification_sent))
        notificationResult.setText(R.string.watch_sync_card_notification_result)
    }

    private fun requestVendorBattery() {
        val g = gatt
        if (g == null) {
            appendLog(getString(R.string.watch_sync_log_not_connected))
            return
        }
        val char02 = g.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_02_UUID)
        if (char02 == null) {
            appendLog(getString(R.string.watch_sync_log_no_vendor_service))
            return
        }
        // SEWear{ id: 33 } — a bare request with no payload; the watch replies asynchronously
        // over CHAR_01 with a SEWear{ device: SEDevice{ deviceBatteryStatus: { capacity } } }.
        val wear = mutableListOf<Byte>()
        appendProtoTag(wear, 1, 0); appendVarint(wear, ZH_CMD_GET_BATTERY.toLong())
        pushPendingResponse(ZH_CMD_GET_BATTERY)
        writeVendorPacket(g, char02, wear.toByteArray(), ZH_CMD_GET_BATTERY)
        appendLog(getString(R.string.watch_sync_log_battery_request_sent))
        batteryResult.setText(R.string.watch_sync_card_battery_checking)
    }

    private fun writeVendorPacket(
        g: BluetoothGatt,
        characteristic: BluetoothGattCharacteristic,
        wearBytes: ByteArray,
        cmdId: Int? = null,
    ) {
        // SDK packet framing: 2-byte little-endian packet index, "1" since this fits in one packet.
        writeVendorRaw(g, characteristic, byteArrayOf(1, 0) + wearBytes, cmdId)
    }

    /**
     * Reassembles a multi-packet CHAR_01 reply (decompiled from BluetoothService.i(byte[])):
     * a header packet (4 zero bytes + 2-byte LE packet count) triggers a "ready" ACK, then each
     * data packet (2-byte LE index + payload) is stored; once all arrive, a "done" ACK is sent
     * and the merged bytes are parsed as a SEWear message.
     */
    private fun handleVendorResponsePacket(g: BluetoothGatt, data: ByteArray) {
        val char01 = g.getService(ZH_PROTOBUF_SERVICE_UUID)?.getCharacteristic(ZH_PROTOBUF_CHAR_01_UUID) ?: return
        if (data.size >= 6 && data[0] == 0.toByte() && data[1] == 0.toByte() && data[2] == 0.toByte() && data[3] == 0.toByte()) {
            val count = ((data[4].toInt() and 0xFF)) or ((data[5].toInt() and 0xFF) shl 8)
            expectedPacketCount = count
            receivedPackets = arrayOfNulls(count)
            receivedPacketNum = 0
            writeAckFrame(g, char01, ZH_ACK_READY_FOR_DATA)
            return
        }
        val packets = receivedPackets ?: return
        if (data.size < 2) return
        val index = ((data[0].toInt() and 0xFF)) or ((data[1].toInt() and 0xFF) shl 8)
        if (index <= 0 || index > packets.size) return
        packets[index - 1] = data.copyOfRange(2, data.size)
        receivedPacketNum++
        if (receivedPacketNum < expectedPacketCount) return

        writeAckFrame(g, char01, ZH_ACK_ALL_RECEIVED)
        val merged = packets.fold(ByteArray(0)) { acc, chunk -> acc + (chunk ?: ByteArray(0)) }
        receivedPackets = null
        expectedPacketCount = 0
        receivedPacketNum = 0

        if (handlePossibleRealTimeHeartRate(merged)) return

        val cmdId = popPendingResponse()
        if (cmdId == ZH_CMD_GET_BATTERY) {
            handleBatteryResponse(merged)
        } else if (cmdId == ZH_CMD_REQUEST_BIND_STATE) {
            handleBindStateResponse(merged)
        }
    }

    private fun writeAckFrame(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic, ack: ByteArray) {
        writeVendorRaw(g, characteristic, ack)
    }

    /**
     * Confirmed on real hardware: all five vendor characteristics (16186f01-05) only declare
     * the write-no-response property, not write-with-response — set the write type explicitly
     * rather than relying on Android's undocumented fallback behavior. Note this means a
     * successful GATT_SUCCESS callback only confirms the phone's local stack sent the packet,
     * NOT that the watch received or processed it (write-without-response gets no peripheral ack).
     */
    private fun writeVendorRaw(
        g: BluetoothGatt,
        characteristic: BluetoothGattCharacteristic,
        bytes: ByteArray,
        cmdId: Int? = null,
    ) {
        enqueueGattOp(cmdId) {
            try {
                @Suppress("DEPRECATION")
                characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                @Suppress("DEPRECATION")
                characteristic.value = bytes
                @Suppress("DEPRECATION")
                g.writeCharacteristic(characteristic)
            } catch (e: SecurityException) {
                appendLog(getString(R.string.watch_sync_log_permission_error))
                runNextGattOp()
            }
        }
    }

    private fun handleBatteryResponse(wearBytes: ByteArray) {
        val wearFields = parseProtoFields(wearBytes)
        val deviceBytes = wearFields[4]?.firstOrNull()?.bytes
        val batteryStatusBytes = deviceBytes?.let { parseProtoFields(it)[2]?.firstOrNull()?.bytes }
        val capacity = batteryStatusBytes?.let { parseProtoFields(it)[1]?.firstOrNull()?.varintValue }
        runOnUiThread {
            if (capacity != null) {
                appendLog(getString(R.string.watch_sync_log_vendor_battery, capacity.toInt()))
                batteryResult.text = getString(R.string.watch_sync_log_vendor_battery, capacity.toInt())
            } else {
                appendLog(getString(R.string.watch_sync_log_vendor_response_unparseable))
                batteryResult.setText(R.string.watch_sync_log_vendor_response_unparseable)
            }
        }
    }

    // --- minimal protobuf wire-format helpers (encode + decode, no runtime dependency) ------

    private class ProtoField(val varintValue: Long?, val bytes: ByteArray?)

    private fun parseProtoFields(data: ByteArray): Map<Int, MutableList<ProtoField>> {
        val result = mutableMapOf<Int, MutableList<ProtoField>>()
        var pos = 0
        while (pos < data.size) {
            val (tag, tagLen) = readVarintAt(data, pos)
            pos += tagLen
            val fieldNumber = (tag shr 3).toInt()
            when ((tag and 0x7).toInt()) {
                0 -> {
                    val (v, l) = readVarintAt(data, pos)
                    pos += l
                    result.getOrPut(fieldNumber) { mutableListOf() }.add(ProtoField(v, null))
                }
                2 -> {
                    val (len, l) = readVarintAt(data, pos)
                    pos += l
                    val end = pos + len.toInt()
                    if (end > data.size) return result
                    result.getOrPut(fieldNumber) { mutableListOf() }.add(ProtoField(null, data.copyOfRange(pos, end)))
                    pos = end
                }
                1 -> pos += 8
                5 -> pos += 4
                else -> return result
            }
        }
        return result
    }

    private fun readVarintAt(data: ByteArray, start: Int): Pair<Long, Int> {
        var result = 0L
        var shift = 0
        var pos = start
        while (pos < data.size) {
            val b = data[pos].toInt() and 0xFF
            result = result or ((b.toLong() and 0x7F) shl shift)
            pos++
            if (b and 0x80 == 0) break
            shift += 7
        }
        return Pair(result, pos - start)
    }

    private fun appendProtoString(out: MutableList<Byte>, fieldNumber: Int, value: String) {
        val bytes = value.toByteArray(Charsets.UTF_8)
        appendProtoTag(out, fieldNumber, 2)
        appendVarint(out, bytes.size.toLong())
        out.addAll(bytes.toList())
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
