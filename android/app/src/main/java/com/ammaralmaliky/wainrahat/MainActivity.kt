package com.ammaralmaliky.wainrahat

import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.net.Uri
import android.webkit.ValueCallback
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.view.View
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import kotlin.math.max
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import org.json.JSONTokener

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var rootLayout: android.widget.LinearLayout
    private val appOrigin = "https://appassets.androidplatform.net"
    private val startupBackground = Color.rgb(8, 15, 32)
    private var androidSafeTopCss = 0f

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setBackgroundDrawable(ColorDrawable(startupBackground))
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        webView = WebView(this).apply {
            setBackgroundColor(startupBackground)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            isHorizontalScrollBarEnabled = false
            webViewClient = OfflineAssetClient(
                WebViewAssetLoader.Builder()
                    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this@MainActivity))
                    .build(),
                appOrigin,
                ::syncAppBackground
            )
        }
        val backup = BackupControls(this, webView)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "BackupHost", setOf(appOrigin)) { _, message, origin, isMainFrame, _ ->
                handleAppMessage(backup, message.data, origin, isMainFrame)
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean = backup.handleWebFileChooser(filePathCallback, fileChooserParams)
        }
        rootLayout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            layoutDirection = View.LAYOUT_DIRECTION_RTL
            addView(webView, android.widget.LinearLayout.LayoutParams(-1, 0, 1f))
        }
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, insets ->
            val cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val topBar = if (insets.isVisible(WindowInsetsCompat.Type.statusBars())) bars.top else 0
            val navBar = if (insets.isVisible(WindowInsetsCompat.Type.navigationBars())) bars.bottom else 0
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(cutout.left, 0, cutout.right, max(cutout.bottom, max(navBar, ime.bottom)))
            applyTopSafeArea(max(cutout.top, topBar))
            insets
        }
        rootLayout.setBackgroundColor(startupBackground)
        setContentView(rootLayout)
        applyImmersiveMode(rootLayout)
        ViewCompat.requestApplyInsets(rootLayout)
        if (savedInstanceState == null) {
            webView.loadUrl("$appOrigin/assets/index.html?shell=android")
        } else {
            webView.restoreState(savedInstanceState)
        }

        if (savedInstanceState == null) ReleaseUpdater(this).check()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && ::webView.isInitialized) applyImmersiveMode(webView.rootView)
    }

    private fun applyImmersiveMode(view: View) {
        if (ViewCompat.getRootWindowInsets(view)?.isVisible(WindowInsetsCompat.Type.ime()) == true) return
        WindowInsetsControllerCompat(window, view).apply {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    private fun syncAppBackground(view: WebView) {
        if (!isAppPage(view.url)) return
        view.evaluateJavascript("""(function(){
          document.documentElement.style.setProperty('--android-safe-top','${androidSafeTopCss}px');
          var read=function(){return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()};
          var send=function(){var c=read();if(/^#[0-9a-f]{6}$/i.test(c)&&window.BackupHost)window.BackupHost.postMessage(JSON.stringify({action:'theme',color:c}));return c};
          if(!window.__wainrahatShellThemeObserver){window.__wainrahatShellThemeObserver=new MutationObserver(send);window.__wainrahatShellThemeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}
          return send();
        })()""") { raw ->
            val value = runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull()
            applyShellBackground(value)
        }
    }

    private fun applyTopSafeArea(insetPx: Int) {
        androidSafeTopCss = insetPx / resources.displayMetrics.density
        if (::webView.isInitialized && isAppPage(webView.url)) {
            val cssPixels = String.format(java.util.Locale.US, "%.2f", androidSafeTopCss)
            webView.evaluateJavascript("document.documentElement.style.setProperty('--android-safe-top', '${cssPixels}px')", null)
        }
    }

    private fun handleAppMessage(backup: BackupControls, data: String?, origin: Uri, isMainFrame: Boolean) {
        if (!isMainFrame || origin.scheme != "https" || origin.host != "appassets.androidplatform.net" ||
            !isAppPage(webView.url) || data.isNullOrBlank()) return
        val request = runCatching { JSONObject(data) }.getOrNull() ?: return
        when (request.optString("action")) {
            "save" -> backup.handleBackupMessage(data, origin, isMainFrame)
            "theme" -> applyShellBackground(request.optString("color"))
        }
    }

    private fun applyShellBackground(value: String?) {
        if (value == null || !value.matches(Regex("#[0-9a-fA-F]{6}"))) return
        val color = runCatching { Color.parseColor(value) }.getOrNull() ?: return
        rootLayout.setBackgroundColor(color)
        webView.setBackgroundColor(color)
        window.setBackgroundDrawable(ColorDrawable(color))
    }

    private fun isAppPage(url: String?): Boolean {
        val uri = url?.let { runCatching { Uri.parse(it) }.getOrNull() } ?: return false
        return uri.scheme == "https" && uri.host == "appassets.androidplatform.net" && uri.path == "/assets/index.html"
    }

    private class OfflineAssetClient(
        private val assetLoader: WebViewAssetLoader,
        private val appOrigin: String,
        private val onAppPageFinished: (WebView) -> Unit
    ) : WebViewClient() {
        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest
        ): WebResourceResponse? {
            return if (request.url.scheme == "https" && request.url.host == "appassets.androidplatform.net") {
                assetLoader.shouldInterceptRequest(request.url)
            } else {
                WebResourceResponse("text/plain", "UTF-8", null)
            }
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            return request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net"
        }

        override fun onPageFinished(view: WebView, url: String) {
            view.settings.textZoom = 100
            onAppPageFinished(view)
            super.onPageFinished(view, url)
        }
    }
}
