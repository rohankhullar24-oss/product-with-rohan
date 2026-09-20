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

// Works Enabler: fetch Tesseract's English trained-data file at build time
// instead of committing a ~15 MB binary to the repo. See
// src/main/assets/tessdata/README.md for why and for the manual fallback.
val tessdataFile = layout.projectDirectory.file("src/main/assets/tessdata/eng.traineddata").asFile
val downloadTessdata by tasks.registering {
    outputs.file(tessdataFile)
    onlyIf { !tessdataFile.exists() }
    doLast {
        tessdataFile.parentFile.mkdirs()
        val url = java.net.URI("https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata").toURL()
        url.openStream().use { input ->
            tessdataFile.outputStream().use { output -> input.copyTo(output) }
        }
    }
}

tasks.named("preBuild") {
    dependsOn(downloadTessdata)
}

dependencies {
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Device biometric/lock-screen gate for the Journal section.
    implementation("androidx.biometric:biometric:1.1.0")

    // Watch Sync: on-device QR scanner (Google Play services system UI —
    // no camera permission or custom camera code needed in this app).
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")

    // Zip Extractor: java.util.zip has no password support at all, so a real
    // library is needed for both plain and password-protected (ZipCrypto and
    // AES) archives. DocumentFile drives writing the extracted files into a
    // user-picked SAF destination tree (scoped storage; no storage permission).
    // Also reused by Works Enabler for docx/pptx/xlsx, which are zip containers.
    implementation("net.lingala.zip4j:zip4j:2.11.5")
    implementation("androidx.documentfile:documentfile:1.0.1")

    // Works Enabler: PDF read/write/merge/compress. Apache-2.0 Android port of
    // Apache PDFBox — needs PDFBoxResourceLoader.init() before first use.
    implementation("com.tom-roush:pdfbox-android:2.0.27.0")

    // Works Enabler: on-device OCR. Apache-2.0 wrapper around the open-source
    // Tesseract engine (kept open source deliberately, instead of ML Kit).
    // Published on JitPack, not Maven Central — see settings.gradle.kts.
    implementation("cz.adaptech.tesseract4android:tesseract4android:4.9.0")

    // The Claude usage layer, plus the AndroidX/Material dependencies it
    // exposes as api() — core-ktx, appcompat, material, work, security-crypto.
    implementation(project(":usage-core"))
}
