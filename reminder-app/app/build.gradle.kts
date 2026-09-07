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
