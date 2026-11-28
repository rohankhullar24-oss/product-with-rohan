pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// A standalone build, separate from the repo-root Android build, because this app
// uses Kotlin 2 + Compose while reminder-app / claude-limits-app stay on Kotlin 1.9.
rootProject.name = "sms-sorter"
include(":core")
// The Android module needs the Android SDK. Skip it with -PcoreOnly to run
// just the pure-Kotlin parser tests on a machine without the SDK.
if (!providers.gradleProperty("coreOnly").isPresent) {
    include(":app")
}
