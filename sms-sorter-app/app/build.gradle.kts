plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "online.productwithrohan.smssorter"
    compileSdk = 35

    defaultConfig {
        applicationId = "online.productwithrohan.smssorter"
        minSdk = 29
        targetSdk = 35
        // CI run number, so an installed build can be traced back to its commit (same as the other apps).
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1
        versionName = "0.1.0"
    }

    // CI signs every build with one fixed key (from the SMS_SORTER_* repo secrets), so each new
    // APK installs over the previous one and keeps your stars. Without it, Android's per-machine
    // debug key changes every run and an update would need an uninstall.
    val stableKeystore = System.getenv("SMS_SORTER_KEYSTORE")?.let { file(it) }?.takeIf { it.exists() }
    signingConfigs {
        if (stableKeystore != null) {
            create("stable") {
                storeFile = stableKeystore
                storePassword = System.getenv("SMS_SORTER_KEY_PASSWORD")
                keyAlias = "smssorter"
                keyPassword = System.getenv("SMS_SORTER_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            if (stableKeystore != null) signingConfig = signingConfigs.getByName("stable")
        }
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            signingConfig = signingConfigs.findByName("stable") ?: signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    implementation(project(":core"))

    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
}
