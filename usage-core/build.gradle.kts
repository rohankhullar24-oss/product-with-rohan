plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "online.productwithrohan.usagecore"
    compileSdk = 34

    defaultConfig {
        minSdk = 26
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
    // api, not implementation: both apps use these types directly, so they
    // should not have to re-declare the dependency to compile against them.
    api("androidx.core:core-ktx:1.13.1")
    api("androidx.appcompat:appcompat:1.7.0")
    api("androidx.work:work-runtime-ktx:2.9.1")
    api("androidx.security:security-crypto:1.1.0-alpha06")
    api("com.google.android.material:material:1.12.0")
}
