plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ammaralmaliky.wainrahat"
    compileSdk = 35

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.ammaralmaliky.wainrahat"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/webAssets"))
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.0")
    implementation("androidx.webkit:webkit:1.12.1")
}

val webSource = rootProject.projectDir.parentFile
val webAssets = layout.buildDirectory.dir("generated/webAssets")

tasks.register<Sync>("syncWebAssets") {
    from(webSource) {
        include("index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png")
        include("*.css", "report-pdf.js", "src/core/**", "src/app/**", "fonts/**")
    }
    into(webAssets)
}

tasks.named("preBuild").configure {
    dependsOn("syncWebAssets")
}
