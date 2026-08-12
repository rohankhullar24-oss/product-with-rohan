plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "online.productwithrohan.claudelimits"
    compileSdk = 34

    defaultConfig {
        applicationId = "online.productwithrohan.claudelimits"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
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
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")

    // Background refresh of the usage snapshot.
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Keystore-backed storage for the claude.ai session cookies.
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
}
