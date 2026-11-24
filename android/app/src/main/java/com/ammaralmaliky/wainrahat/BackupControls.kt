package com.ammaralmaliky.wainrahat

import android.app.AlertDialog
import android.net.Uri
import android.webkit.ValueCallback
import android.webkit.WebView
import android.webkit.WebChromeClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONTokener
import org.json.JSONObject

/** Native SAF backup controls; no JavaScript interface is exposed to page frames. */
class BackupControls(private val activity: ComponentActivity, private val web: WebView) {
    private var exporting: String? = null
    private var incoming: String? = null
    private var busy = false
    private var currentEmpty = false
    private var webCallback: ValueCallback<Array<Uri>>? = null
    private fun message(text: String) { Toast.makeText(activity, text, Toast.LENGTH_LONG).show() }
    private fun reset() { exporting = null; incoming = null; currentEmpty = false; busy = false }
    private fun finishWebPicker() { webCallback?.onReceiveValue(null); webCallback = null }
    fun handleWebFileChooser(callback: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams): Boolean {
        if (busy || params.isCaptureEnabled || !isAppPage() ||
            params.acceptTypes.any { it.isNotBlank() && !it.contains("json", true) && !it.contains("octet-stream", true) }) {
            callback.onReceiveValue(null); return true
        }
        webCallback?.onReceiveValue(null); webCallback = callback; busy = true
        open.launch(arrayOf("application/json", "text/plain", "application/octet-stream")); return true
    }
    private fun isAppPage() = web.url?.let { it == "https://appassets.androidplatform.net/assets/index.html" || it.startsWith("https://appassets.androidplatform.net/assets/index.html#") } == true
    private fun js(code: String, result: (String?) -> Unit) {
        if (web.url != "https://appassets.androidplatform.net/assets/index.html" &&
            web.url?.startsWith("https://appassets.androidplatform.net/assets/index.html#") != true) {
            reset(); message("انتظر اكتمال فتح التطبيق"); return
        }
        web.evaluateJavascript(code) { raw ->
            result(runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull())
        }
    }
    private val save = activity.registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val text = exporting
        if (uri == null || text == null) { reset(); finishWebPicker(); return@registerForActivityResult }
        activity.lifecycleScope.launch {
            val saved = withContext(Dispatchers.IO) {
                runCatching {
                    activity.contentResolver.openOutputStream(uri, "wt")!!.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                    val actual = activity.contentResolver.openInputStream(uri)!!.use { it.readBytesLimited(10_000_000) }
                    require(actual.contentEquals(text.toByteArray(Charsets.UTF_8)))
                }.isSuccess
            }
            if (!saved) { message("تعذر حفظ النسخة والتحقق منها؛ لم تُستبدل بياناتك"); reset(); finishWebPicker() }
            else if (incoming != null) confirmImport()
            else { message("تم حفظ النسخة والتحقق منها"); reset() }
        }
    }
    private val open = activity.registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) { reset(); finishWebPicker(); return@registerForActivityResult }
        activity.lifecycleScope.launch {
            val text = withContext(Dispatchers.IO) {
                runCatching {
                    activity.contentResolver.openInputStream(uri)!!.use {
                        val bytes = it.readBytesLimited(10_000_000)
                        bytes.toString(Charsets.UTF_8)
                    }
                }.getOrNull()
            }
            if (text == null) { message("تعذر قراءة الملف أو حجمه أكبر من 10 ميغابايت"); reset(); finishWebPicker(); return@launch }
            js("""(function(){try { return WR.store.backupText(WR.store.parseBackup(${JSONObject.quote(text)}).state); } catch(e) { return null; }})()""") { normalized ->
                if (normalized == null) { message("ملف JSON تالف أو غير صالح"); reset(); finishWebPicker() }
                else {
                    incoming = normalized
                    exportCurrent(true)
                }
            }
        }
    }
    private fun exportCurrent(beforeImport: Boolean) {
        js("""(function(){try { var raw=localStorage.getItem(WR.store.KEY); if(raw===null) return 'EMPTY'; return 'VALID:' + WR.store.backupText(WR.store.parseBackup(raw).state); } catch(e) { return 'CORRUPT'; }})()""") { text ->
            when {
                text == "EMPTY" && beforeImport -> { currentEmpty = true; confirmImport() }
                text == "EMPTY" -> { message("لا توجد بيانات محفوظة لنسخها بعد"); reset() }
                text == "CORRUPT" || text == null -> { message("تعذر التحقق من البيانات الحالية؛ أُوقفت العملية لحمايتها"); reset(); finishWebPicker() }
                text.startsWith("VALID:") -> {
                    exporting = text.removePrefix("VALID:")
                    if (beforeImport) {
                        val stamp = java.text.SimpleDateFormat("yyyyMMdd-HHmmss", java.util.Locale.US).format(java.util.Date())
                        save.launch("wain-rahat-before-restore-$stamp.json")
                    } else save.launch("wain-rahat-backup.json")
                }
            }
        }
    }
    private fun confirmImport() {
        AlertDialog.Builder(activity).setTitle("استعادة النسخة؟")
            .setMessage(if (currentEmpty) "تحقق التطبيق من عدم وجود بيانات حالية. هل تريد الاستعادة؟" else "حُفظت نسخة أمان مستقلة وتم التحقق منها. ستُستبدل السجلات بالنسخة.")
            .setNegativeButton("إلغاء") { _, _ -> reset(); finishWebPicker() }
            .setOnCancelListener { reset(); finishWebPicker() }
            .setPositiveButton("استعادة") { _, _ ->
                val text = incoming ?: return@setPositiveButton
                val expectedEmpty = currentEmpty
                val previousJson = JSONObject.quote(exporting ?: "")
                val incomingJson = JSONObject.quote(text)
                js("""(function(){try {
                    var raw=localStorage.getItem(WR.store.KEY);
                    if($expectedEmpty ? raw!==null : raw===null) return 'changed';
                    if(!$expectedEmpty) {
                      var current=WR.store.backupText(WR.store.parseBackup(raw).state);
                      if(JSON.stringify(JSON.parse(current).data)!==JSON.stringify(JSON.parse($previousJson).data)) return 'changed';
                    }
                    var s=WR.store.parseBackup($incomingJson).state;
                    WR.store.save(s); WR.app.state=s; WR.app.monthKey=null; WR.render(); return 'ok';
                } catch(e) { return 'error'; }})()""") { outcome ->
                    message(if (outcome == "ok") "تمت الاستعادة؛ نسختك السابقة محفوظة في الملف الذي اخترته" else "لم تكتمل الاستعادة؛ أعد المحاولة مع نسخة حديثة من بياناتك")
                    reset()
                    finishWebPicker()
                }
            }.show()
    }
    fun view(): LinearLayout = LinearLayout(activity).apply {
        orientation = LinearLayout.HORIZONTAL
        addView(Button(activity).apply { text = "نسخة احتياطية"; setOnClickListener { if (!busy) { busy=true; exportCurrent(false) } } }, LinearLayout.LayoutParams(0, -2, 1f))
        addView(Button(activity).apply { text = "استعادة JSON"; setOnClickListener { if (!busy) { busy=true; open.launch(arrayOf("application/json", "text/plain", "application/octet-stream")) } } }, LinearLayout.LayoutParams(0, -2, 1f))
    }
    private fun java.io.InputStream.readBytesLimited(limit: Int): ByteArray {
        val out=java.io.ByteArrayOutputStream(); val buffer=ByteArray(8192)
        while(true) { val n=read(buffer); if(n<0) break; require(out.size()+n<=limit); out.write(buffer,0,n) }
        return out.toByteArray()
    }
}
