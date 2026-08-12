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

rootProject.name = "product-with-rohan-android"

// The two Android apps keep their existing directories so no source moves and
// no APK output paths change; only the build files were lifted to the root.
// usage-core is the shared Claude usage layer both of them depend on.
include(":usage-core")

include(":reminder-app")
project(":reminder-app").projectDir = file("reminder-app/app")

include(":claude-limits-app")
project(":claude-limits-app").projectDir = file("claude-limits-app/app")
