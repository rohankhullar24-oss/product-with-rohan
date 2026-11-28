package online.productwithrohan.smssorter

import android.Manifest
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import online.productwithrohan.smssorter.data.Notifier
import online.productwithrohan.smssorter.ui.AppViewModel
import online.productwithrohan.smssorter.ui.ComposeScreen
import online.productwithrohan.smssorter.ui.FinanceScreen
import online.productwithrohan.smssorter.ui.MessagesScreen
import online.productwithrohan.smssorter.ui.RemindersScreen
import online.productwithrohan.smssorter.ui.SmsSorterTheme
import online.productwithrohan.smssorter.ui.ThreadScreen
import online.productwithrohan.smssorter.ui.UiState

private sealed interface Route {
    data object Home : Route
    data class Thread(val threadId: Long, val address: String) : Route
    data class Compose(val address: String) : Route
}

private enum class HomeTab { MESSAGES, REMINDERS, FINANCE }

class MainActivity : ComponentActivity() {
    private val vm: AppViewModel by viewModels()

    /** Address from a notification tap or an sms:/smsto: link, consumed by the UI. */
    private val pendingAddress = mutableStateOf<String?>(null)

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { vm.refresh() }
    private val roleLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { vm.refresh() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Notifier.ensureChannels(this)
        handleIntent(intent)
        setContent {
            SmsSorterTheme {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
                    App(vm, pendingAddress, ::requestSmsPermissions, ::requestDefaultSmsApp)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        vm.refresh()
        vm.checkForUpdate()
    }

    private fun handleIntent(intent: Intent?) {
        intent ?: return
        intent.getStringExtra(Notifier.EXTRA_ADDRESS)?.let { pendingAddress.value = it; return }
        val data = intent.data ?: return
        if (data.scheme in setOf("sms", "smsto", "mms", "mmsto")) {
            pendingAddress.value = data.schemeSpecificPart.substringBefore('?')
        }
    }

    private fun requestSmsPermissions() {
        val perms = mutableListOf(
            Manifest.permission.READ_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_CONTACTS,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) perms += Manifest.permission.POST_NOTIFICATIONS
        permissionLauncher.launch(perms.toTypedArray())
    }

    private fun requestDefaultSmsApp() {
        val rm = getSystemService(RoleManager::class.java) ?: return
        if (rm.isRoleAvailable(RoleManager.ROLE_SMS) && !rm.isRoleHeld(RoleManager.ROLE_SMS)) {
            roleLauncher.launch(rm.createRequestRoleIntent(RoleManager.ROLE_SMS))
        }
    }
}

@Composable
private fun App(
    vm: AppViewModel,
    pendingAddress: MutableState<String?>,
    requestPermissions: () -> Unit,
    requestDefault: () -> Unit,
) {
    val state by vm.state.collectAsStateWithLifecycle()
    var route by androidx.compose.runtime.remember { mutableStateOf<Route>(Route.Home) }
    var tab by rememberSaveable { mutableStateOf(HomeTab.MESSAGES) }

    if (!state.loading && !state.canRead) {
        PermissionScreen(requestPermissions)
        return
    }

    // Open whatever a notification or sms: link pointed at, once messages are loaded.
    val pending = pendingAddress.value
    LaunchedEffect(pending, state.loading) {
        if (pending != null && !state.loading) {
            pendingAddress.value = null
            val convo = state.conversations.firstOrNull { samePhone(it.address, pending) }
            route = if (convo != null) Route.Thread(convo.threadId, convo.address) else Route.Compose(pending)
        }
    }

    fun openMessage(id: Long) {
        state.messages.firstOrNull { it.id == id }?.let { sms ->
            val address = state.conversations.firstOrNull { it.threadId == sms.threadId }?.address ?: sms.address
            route = Route.Thread(sms.threadId, address)
        }
    }

    BackHandler(enabled = route != Route.Home) { route = Route.Home }

    when (val r = route) {
        is Route.Thread -> ThreadScreen(r.threadId, r.address, state, vm, onBack = { route = Route.Home }, requestDefault)
        is Route.Compose -> ComposeScreen(
            initialAddress = r.address,
            isDefault = state.isDefaultApp,
            onBack = { route = Route.Home },
            requestDefault = requestDefault,
            onSend = { to, body -> vm.send(to, body); route = Route.Home },
        )
        Route.Home -> HomeScaffold(
            state = state,
            tab = tab,
            onTab = { tab = it },
        ) {
            when (tab) {
                HomeTab.MESSAGES -> MessagesScreen(
                    state = state,
                    vm = vm,
                    onOpenThread = { route = Route.Thread(it.threadId, it.address) },
                    onOpenMessage = { openMessage(it.id) },
                    onCompose = { route = Route.Compose("") },
                    requestDefault = requestDefault,
                )
                HomeTab.REMINDERS -> RemindersScreen(state, vm, onOpenSource = ::openMessage)
                HomeTab.FINANCE -> FinanceScreen(state, onOpenSource = ::openMessage)
            }
        }
    }
}

@Composable
private fun HomeScaffold(state: UiState, tab: HomeTab, onTab: (HomeTab) -> Unit, content: @Composable () -> Unit) {
    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == HomeTab.MESSAGES, onClick = { onTab(HomeTab.MESSAGES) },
                    icon = { Icon(Icons.AutoMirrored.Outlined.Chat, null) }, label = { Text("Messages") },
                )
                NavigationBarItem(
                    selected = tab == HomeTab.REMINDERS, onClick = { onTab(HomeTab.REMINDERS) },
                    icon = { Icon(Icons.Outlined.Notifications, null) },
                    label = { Text(if (state.reminders.upcoming.isEmpty()) "Reminders" else "Reminders (${state.reminders.upcoming.size})") },
                )
                NavigationBarItem(
                    selected = tab == HomeTab.FINANCE, onClick = { onTab(HomeTab.FINANCE) },
                    icon = { Icon(Icons.Outlined.AccountBalanceWallet, null) }, label = { Text("Finance") },
                )
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding)) { content() }
    }
}

@Composable
private fun PermissionScreen(onGrant: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("SMS Sorter", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(12.dp))
        Text(
            "To sort your inbox into Personal, Transactions and Promotions, and to find bills and trips, " +
                "SMS Sorter needs to read your messages. Everything stays on your phone.",
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = onGrant) { Text("Allow access") }
    }
}

private fun samePhone(a: String, b: String): Boolean {
    val da = a.filter(Char::isDigit)
    val db = b.filter(Char::isDigit)
    return if (da.length >= 7 && db.length >= 7) da.takeLast(10) == db.takeLast(10) else a.equals(b, ignoreCase = true)
}
