// Runs before openGym boots, inside the Reminders app's Open Gym screen (OpenGymActivity).
// window.OpenGymHost is the Kotlin side (OpenGymActivity.HostBridge).
//
// openGym keeps its whole training log in the WebView's localStorage. That store is not part
// of the app's Android backup and can be cleared with "Clear cache", so a second copy is kept
// in a plain file in the app's data directory (opengym_state.json, which the backup rules do
// list): written whenever the state changes, read back when localStorage comes up empty.
(function () {
  var host = window.OpenGymHost
  if (!host) return
  var KEY = 'gym_state_v1'
  try {
    if (!localStorage.getItem(KEY)) {
      var kept = host.loadState()
      if (kept) localStorage.setItem(KEY, kept)
    }
  } catch (e) { /* nothing kept, or storage unavailable: openGym starts empty */ }

  var last = null
  try { last = localStorage.getItem(KEY) } catch (e) { /* as above */ }
  function mirror() {
    try {
      var now = localStorage.getItem(KEY)
      if (now && now !== last) { host.saveState(now); last = now }
    } catch (e) { /* the next tick tries again */ }
  }
  window.__openGymMirror = mirror
  setInterval(mirror, 10000)
  document.addEventListener('visibilitychange', mirror)
  window.addEventListener('pagehide', mirror)
})()
