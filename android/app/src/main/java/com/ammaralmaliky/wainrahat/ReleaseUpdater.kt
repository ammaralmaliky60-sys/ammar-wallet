package com.ammaralmaliky.wainrahat

import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.security.MessageDigest
import javax.net.ssl.HttpsURLConnection

/** Checks only public releases. Android's installer remains the final consent boundary. */
class ReleaseUpdater(private val activity: ComponentActivity) {
    private val repository = "https://api.github.com/repos/ammaralmaliky60-sys/ammar-wallet/releases/latest"
    private val flags = if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
    private fun code(info: android.content.pm.PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
    @Suppress("DEPRECATION")
    private fun signers(info: android.content.pm.PackageInfo): Set<String> =
        (if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners else info.signatures)
            ?.map { signature -> MessageDigest.getInstance("SHA-256").digest(signature.toByteArray()).joinToString("") { "%02x".format(it) } }?.toSet() ?: emptySet()

    private fun connection(url: String): HttpsURLConnection {
        val parsed = URL(url)
        require(parsed.protocol == "https")
        require(parsed.host in setOf("api.github.com", "github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"))
        return (parsed.openConnection() as HttpsURLConnection).apply {
            connectTimeout = 15000; readTimeout = 20000
            instanceFollowRedirects = false
            setRequestProperty("User-Agent", "WainRahat-Android")
        }
    }
    private fun read(url: String, limit: Long, sink: java.io.OutputStream) {
        var current = url
        repeat(6) {
            val c = connection(current)
            try {
                if (c.responseCode in 300..399) {
                    current = URL(URL(current), c.getHeaderField("Location") ?: error("redirect")).toString()
                } else {
                    require(c.responseCode == 200)
                    c.inputStream.use { input ->
                        val buffer = ByteArray(8192); var total = 0L
                        while (true) {
                            val n = input.read(buffer); if (n < 0) break
                            total += n; require(total <= limit); sink.write(buffer, 0, n)
                        }
                    }
                    return
                }
            } finally { c.disconnect() }
        }
        error("redirect limit")
    }
    fun check() {
        activity.lifecycleScope.launch {
            val release = withContext(Dispatchers.IO) {
                runCatching {
                    val out = java.io.ByteArrayOutputStream()
                    read(repository, 2_000_000, out)
                    val json = JSONObject(out.toString("UTF-8"))
                    require(!json.getBoolean("draft") && !json.getBoolean("prerelease"))
                    // Publishing contract: android-v<versionCode>, one named APK asset.
                    val tag = json.getString("tag_name")
                    require(Regex("android-v[1-9][0-9]*").matches(tag))
                    val version = tag.removePrefix("android-v").toLong()
                    val installed = activity.packageManager.getPackageInfo(activity.packageName, flags)
                    require(version > code(installed))
                    val assets = json.getJSONArray("assets")
                    val matches = (0 until assets.length()).map { assets.getJSONObject(it) }
                        .filter { it.getString("name") == "wain-rahat-release.apk" }
                    require(matches.size == 1)
                    val url = matches.single().getString("browser_download_url")
                    require(url.startsWith("https://github.com/ammaralmaliky60-sys/ammar-wallet/releases/download/"))
                    version to url
                }.getOrNull()
            } ?: return@launch // Offline / no release: the wallet continues normally.
            if (activity.isFinishing || activity.isDestroyed) return@launch
            AlertDialog.Builder(activity).setTitle("تحديث جديد متوفر")
                .setMessage("يتوفر إصدار أحدث من وين راحت؟. يمكنك تنزيله الآن، وسيطلب Android موافقتك قبل التثبيت.")
                .setNegativeButton("لاحقاً", null)
                .setPositiveButton("تحديث الآن") { _, _ -> download(release.first, release.second) }.show()
        }
    }
    private fun download(expectedCode: Long, url: String) {
        activity.lifecycleScope.launch {
            val file = withContext(Dispatchers.IO) {
                val directory = File(activity.cacheDir, "updates").apply { mkdirs() }
                val file = File.createTempFile("update-", ".apk", directory)
                runCatching {
                    file.parentFile?.mkdirs()
                    file.outputStream().use { read(url, 150_000_000, it) }
                    val pm = activity.packageManager
                    val candidate = pm.getPackageArchiveInfo(file.path, flags) ?: error("invalid APK")
                    val installed = pm.getPackageInfo(activity.packageName, flags)
                    require(candidate.packageName == activity.packageName)
                    require(code(candidate) == expectedCode && code(candidate) > code(installed))
                    require(signers(installed).isNotEmpty() && signers(candidate) == signers(installed))
                    file
                }.getOrElse { file.delete(); null }
            }
            if (activity.isFinishing || activity.isDestroyed) return@launch
            if (file == null) {
                AlertDialog.Builder(activity).setTitle("تعذر اعتماد التحديث")
                    .setMessage("تعذر التنزيل أو التحقق من هوية النسخة وتوقيعها. بقي التطبيق وبياناتك كما هما. لا تحذف نسخة Debug للانتقال إلى Release قبل حفظ بياناتك والتحقق من استعادتها.")
                    .setPositiveButton("حسناً", null).show()
            } else install(file)
        }
    }
    private fun install(file: File) {
        if (Build.VERSION.SDK_INT >= 26 && !activity.packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(activity).setTitle("السماح بتثبيت التحديث")
                .setMessage("فعّل السماح لهذا التطبيق من إعدادات Android، ثم افتح التطبيق واختر التحديث مجدداً.")
                .setNegativeButton("لاحقاً", null)
                .setPositiveButton("فتح الإعدادات") { _, _ ->
                    activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}")))
                }.show()
            return
        }
        val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.updates", file)
        runCatching {
            activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        }.onFailure {
            AlertDialog.Builder(activity).setMessage("تعذر فتح مثبّت Android على هذا الجهاز.").setPositiveButton("حسناً", null).show()
        }
    }
}
