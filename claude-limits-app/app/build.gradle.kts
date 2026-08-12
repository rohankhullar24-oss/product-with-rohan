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
    // Brings the Claude usage layer plus the AndroidX/Material dependencies it
    // exposes as api(), so they aren't restated here.
    implementation(project(":usage-core"))
}
