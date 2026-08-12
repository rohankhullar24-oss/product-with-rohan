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
        versionCode = 8
        versionName = "3.3"
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

    // The Claude usage layer, plus the AndroidX/Material dependencies it
    // exposes as api() — core-ktx, appcompat, material, work, security-crypto.
    implementation(project(":usage-core"))
}
