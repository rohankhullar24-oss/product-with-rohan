plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "online.productwithrohan.reminders"
    compileSdk = 34

    defaultConfig {
        applicationId = "online.productwithrohan.reminders"
        minSdk = 26
        targetSdk = 34
        // CI's run number for this workflow only ever increases, so every published
        // build gets a genuinely higher versionCode automatically — no more manual
        // bumps, and no more every build silently sharing the same version.
        // Local (non-CI) builds fall back to a fixed baseline above the last manual value.
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 13
        versionName = "3.12"

        // TEMPORARY, for the Watch Sync cmd18 bind-persistence experiment: the real Noise
        // account user ID, injected at build time from the NOISE_ACCOUNT_USER_ID env var /
        // Gradle property (a GitHub Actions repository secret in CI) rather than committed as a
        // literal, so a personal account ID never lands in this public repo's source or history.
        // Empty string if unset — WatchSyncActivity logs a clear error and skips cmd 18 rather
        // than silently sending a blank userId.
        buildConfigField(
            "String",
            "NOISE_ACCOUNT_USER_ID",
            "\"${(project.findProperty("noiseAccountUserId") as String? ?: System.getenv("NOISE_ACCOUNT_USER_ID") ?: "")}\"",
        )
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Device biometric/lock-screen gate for the Journal section.
    implementation("androidx.biometric:biometric:1.1.0")

    // Watch Sync: on-device QR scanner (Google Play services system UI —
    // no camera permission or custom camera code needed in this app).
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")

    // The Claude usage layer, plus the AndroidX/Material dependencies it
    // exposes as api() — core-ktx, appcompat, material, work, security-crypto.
    implementation(project(":usage-core"))
}
