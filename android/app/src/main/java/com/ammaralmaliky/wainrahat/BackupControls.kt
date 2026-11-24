package com.ammaralmaliky.wainrahat

import android.app.AlertDialog
import android.webkit.WebView
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
    private fun message(text: String) { Toast.makeText(activity, text, Toast.LENGTH_LONG).show() }
    private fun reset() { exporting = null; incoming = null; busy = false }
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
        if (uri == null || text == null) { reset(); return@registerForActivityResult }
        activity.lifecycleScope.launch {
            val saved = withContext(Dispatchers.IO) {
                runCatching {
                    activity.contentResolver.openOutputStream(uri, "wt")!!.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                    val actual = activity.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                    require(actual.contentEquals(text.toByteArray(Charsets.UTF_8)))
                }.isSuccess
            }
            if (!saved) { message("تعذر حفظ النسخة والتحقق منها؛ لم تُستبدل بياناتك"); reset() }
            else if (incoming != null) confirmImport()
            else { message("تم حفظ النسخة والتحقق منها"); reset() }
        }
    }
    private val open = activity.registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) { reset(); return@registerForActivityResult }
        activity.lifecycleScope.launch {
            val text = withContext(Dispatchers.IO) {
                runCatching {
                    activity.contentResolver.openInputStream(uri)!!.use {
                        val bytes = it.readBytesLimited(10_000_000)
                        bytes.toString(Charsets.UTF_8)
                    }
                }.getOrNull()
            }
            if (text == null) { message("تعذر قراءة الملف أو حجمه أكبر من 10 ميغابايت"); reset(); return@launch }
            js("""(function(){try { return WR.store.backupText(WR.store.parseBackup(${JSONObject.quote(text)}).state); } catch(e) { return null; }})()""") { normalized ->
                if (normalized == null) { message("الملف ليس نسخة احتياطية صالحة"); reset() }
                else {
                    incoming = normalized
                    exportCurrent(true)
                }
            }
        }
    }
    private fun exportCurrent(beforeImport: Boolean) {
        js("""(function(){try { var raw=localStorage.getItem(WR.store.KEY); if(!raw) return null; return WR.store.backupText(WR.store.parseBackup(raw).state); } catch(e) { return null; }})()""") { text ->
            if (text == null) { message("تعذر التحقق من البيانات الحالية؛ أُوقفت العملية لحمايتها"); reset() }
            else {
                exporting = text
                if (beforeImport) message("احفظ نسخة من بياناتك الحالية أولاً؛ إلغاء الحفظ يلغي الاستعادة")
                save.launch(if (beforeImport) "wain-rahat-before-restore.json" else "wain-rahat-backup.json")
            }
        }
    }
    private fun confirmImport() {
        AlertDialog.Builder(activity).setTitle("استعادة النسخة؟")
            .setMessage("حُفظت نسخة مستقلة من سجلاتك الحالية وتم التحقق منها. الاستعادة تستبدل السجلات ولا تدمجها. تستطيع الرجوع باستيراد النسخة المحفوظة.")
            .setNegativeButton("إلغاء") { _, _ -> reset() }
            .setOnCancelListener { reset() }
            .setPositiveButton("استعادة") { _, _ ->
                val text = incoming ?: return@setPositiveButton
                val previous = exporting ?: return@setPositiveButton
                js("""(function(){try {
                    var current=WR.store.backupText(WR.store.parseBackup(localStorage.getItem(WR.store.KEY)).state);
                    if(JSON.stringify(JSON.parse(current).data)!==JSON.stringify(JSON.parse(${JSONObject.quote(previous)}).data)) return 'changed';
                    var s=WR.store.parseBackup(${JSONObject.quote(text)}).state;
                    WR.store.save(s); WR.app.state=s; WR.app.monthKey=null; WR.render(); return 'ok';
                } catch(e) { return 'error'; }})()""") { outcome ->
                    message(if (outcome == "ok") "تمت الاستعادة؛ نسختك السابقة محفوظة في الملف الذي اخترته" else "لم تكتمل الاستعادة؛ أعد المحاولة مع نسخة حديثة من بياناتك")
                    reset()
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
