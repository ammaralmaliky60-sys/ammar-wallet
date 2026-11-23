package com.ammaralmaliky.wainrahat

import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val appOrigin = "https://appassets.androidplatform.net"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
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
                appOrigin
            )
        }
        setContentView(webView)
        if (savedInstanceState == null) {
            webView.loadUrl("$appOrigin/assets/index.html")
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

    private class OfflineAssetClient(
        private val assetLoader: WebViewAssetLoader,
        private val appOrigin: String
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
            super.onPageFinished(view, url)
        }
    }
}
