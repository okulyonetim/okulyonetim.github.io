package com.koruk.okul;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

public class MainActivity extends BridgeActivity {

    private LogoSwipeRefreshLayout nativePullRefresh;
    private volatile boolean jsChildCanScrollUp = false;
    private volatile boolean interactiveTouchActive = false;

    /* Pull-to-refresh platforma göre çalışır: Chrome/Safari tarayıcıda native,
       Android APK'da LogoSwipeRefreshLayout, veri senkronunda ortak SyncEngine. */

    /* Widget / bildirim hedefleri artık sabit 300/800 ms gecikmeyle JS'e
       fırlatılmıyor. JS auth + sekme sistemi gerçekten hazır olana kadar
       native tarafta tutuluyor; markAppReady() geldiğinde güvenle gönderiliyor. */
    private volatile boolean appHazir = false;
    private String bekleyenPage = null;
    private String bekleyenKategori = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(StatusBarPlugin.class);
        registerPlugin(SavePlugin.class);
        registerPlugin(PullToRefreshPlugin.class);
        registerPlugin(UpdatePlugin.class);
        super.onCreate(savedInstanceState);

        WebView anaWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (anaWebView != null) {
            anaWebView.addJavascriptInterface(new PullRefreshScrollBridge(), "KorukNativePull");
            anaWebView.addJavascriptInterface(new ExitBridge(), "AndroidUygulamadanCikKopru");
            anaWebView.getSettings().setSupportZoom(false);
            anaWebView.getSettings().setBuiltInZoomControls(false);
            anaWebView.getSettings().setDisplayZoomControls(false);
            anaWebView.post(this::setupPullToRefresh);
        }

        handleIntent(getIntent());
        kenarJestiniAyir();
    }

    private void setupPullToRefresh() {
        if (nativePullRefresh != null || getBridge() == null) return;
        final WebView webView = getBridge().getWebView();
        if (webView == null) {
            retryPullToRefreshSetup(webView);
            return;
        }
        final ViewParent rawParent = webView.getParent();
        if (!(rawParent instanceof ViewGroup)) {
            retryPullToRefreshSetup(webView);
            return;
        }
        final ViewGroup parent = (ViewGroup) rawParent;
        final int index = parent.indexOfChild(webView);
        if (index < 0) return;
        final ViewGroup.LayoutParams webViewLp = webView.getLayoutParams();
        parent.removeView(webView);
        nativePullRefresh = new LogoSwipeRefreshLayout(this, webView);
        nativePullRefresh.setLayoutParams(webViewLp);
        nativePullRefresh.setOnRefreshListener(() -> {
            final WebView currentWebView = getBridge() != null ? getBridge().getWebView() : webView;
            if (currentWebView == null) {
                if (nativePullRefresh != null) nativePullRefresh.setRefreshing(false);
                return;
            }
            currentWebView.post(() -> {
                appHazir = false;
                webView.reload();
                currentWebView.postDelayed(() -> runOnUiThread(() -> {
                    if (nativePullRefresh != null) nativePullRefresh.setRefreshing(false);
                }), 1200);
            });
        });
        parent.addView(nativePullRefresh, index);
    }

    private final class PullRefreshScrollBridge {
        @JavascriptInterface
        public void setChildCanScrollUp(boolean canScrollUp) {
            jsChildCanScrollUp = canScrollUp;
            if (nativePullRefresh != null) nativePullRefresh.setJsChildCanScrollUp(canScrollUp);
        }

        @JavascriptInterface
        public void setInteractiveTouch(boolean active) {
            interactiveTouchActive = active;
            if (nativePullRefresh != null) nativePullRefresh.setInteractiveTouchActive(active);
        }
    }

    private void retryPullToRefreshSetup(final WebView webView) {
        if (nativePullRefresh != null || webView == null) return;
        webView.postDelayed(() -> setupPullToRefresh(), 250);
    }

    private void kenarJestiniAyir() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        Runnable uygula = () -> {
            int yukseklik = webView.getHeight();
            if (yukseklik <= 0) return;
            float yogunluk = getResources().getDisplayMetrics().density;
            int genislikPx = Math.round(36 * yogunluk);
            webView.setSystemGestureExclusionRects(
                java.util.Collections.singletonList(new android.graphics.Rect(0, 0, genislikPx, yukseklik))
            );
        };
        webView.post(uygula);
        webView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or_, ob) -> uygula.run());
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
            "(function(){try{if(window.ShellUI&&typeof window.ShellUI.back==='function'){window.ShellUI.back();return;}if(typeof geriTusuIsle==='function'){geriTusuIsle();}}catch(e){console.error('[NativeBack]',e);}})()",
            null
        );
    }

    private final class ExitBridge {
        @JavascriptInterface
        public void uygulamadanCik() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) finishAndRemoveTask();
                else finish();
            });
        }
    }

    /* Android WebView, <a download> ile blob URL indirmeyi desteklemez.
       Rapor motoru PNG'yi önce blob URL ile hazırlıyor. Android APK'da bu
       anchor tıklamasını yakalayıp aynı blob'u base64'e çevirerek mevcut
       SavePlugin'e gönderiyoruz. Paylaşım zaten aynı plugin üzerinden çalışıyor. */
    private void nativeRuntimeDuzeltmeleriniYukle() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        webView.evaluateJavascript(
            "(function(){try{" +
            "if(!window.__korukNativePngDownload){" +
            "window.__korukNativePngDownload=true;" +
            "document.addEventListener('click',function(e){" +
            "try{" +
            "var a=e.target&&e.target.closest?e.target.closest('a[download]'):null;" +
            "if(!a)return;" +
            "var name=String(a.getAttribute('download')||'Koruk_Rapor.png');" +
            "if(!/\\.png$/i.test(name))return;" +
            "var href=String(a.href||'');" +
            "if(href.indexOf('blob:')!==0)return;" +
            "e.preventDefault();e.stopImmediatePropagation();" +
            "fetch(href).then(function(r){return r.blob()}).then(function(blob){" +
            "return new Promise(function(resolve,reject){" +
            "var fr=new FileReader();fr.onload=function(){resolve(String(fr.result||'').split(',')[1]||'')};" +
            "fr.onerror=reject;fr.readAsDataURL(blob);" +
            "})" +
            "}).then(function(b64){" +
            "if(typeof window.uygulamaDosyaKaydet!=='function')throw new Error('Android dosya kaydetme servisi hazır değil.');" +
            "return window.uygulamaDosyaKaydet(b64,name,'image/png',false);" +
            "}).then(function(){try{window.toast&&window.toast('Görsel İndirilenler klasörüne kaydedildi.')}catch(_){}})" +
            ".catch(function(err){console.error('[NativePngDownload]',err);try{window.toast&&window.toast('Görsel kaydedilemedi: '+(err&&err.message||err))}catch(_){}});" +
            "}catch(err){console.error('[NativePngDownload]',err)}} ,true);" +
            "}" +
            "if(typeof window.uygulamaDosyaKaydet!=='function'){" +
            "window.uygulamaDosyaKaydet=function(base64,dosyaAdi,mimeTuru,paylas){" +
            "try{" +
            "var p=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.SavePlugin;" +
            "if(!p||typeof p.kaydet!=='function')return Promise.reject(new Error('Android dosya kaydetme servisi hazır değil.'));" +
            "return p.kaydet({base64:base64,dosyaAdi:dosyaAdi,mimeTuru:mimeTuru,paylas:!!paylas});" +
            "}catch(e){return Promise.reject(e)}" +
            "};" +
            "}" +
            "if(!document.getElementById('koruk-native-runtime-fixes')){" +
            "var s=document.createElement('script');s.id='koruk-native-runtime-fixes';s.src='js/core/platform/mobile-runtime-fixes.js?v=917';document.head.appendChild(s);" +
            "}" +
            "return 'ready';" +
            "}catch(e){console.error('[NativeRuntimeBridge]',e);return 'error';}})()",
            null
        );
    }

    @JavascriptInterface
    public void uygulamadanCik() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) finishAndRemoveTask();
            else finish();
        });
    }

    public void markAppReady() {
        appHazir = true;
        nativeRuntimeDuzeltmeleriniYukle();
        bekleyenHedefleriGonder();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private synchronized void handleIntent(Intent intent) {
        if (intent == null) return;
        String page = intent.getStringExtra("page");
        if (page != null && !page.trim().isEmpty()) bekleyenPage = page;
        String kategori = intent.getStringExtra("kategori");
        if (kategori != null && !kategori.trim().isEmpty()) bekleyenKategori = kategori;
        if (appHazir) bekleyenHedefleriGonder();
    }

    private synchronized void bekleyenHedefleriGonder() {
        if (!appHazir || getBridge() == null || getBridge().getWebView() == null) return;
        final String page = bekleyenPage;
        final String kategori = bekleyenKategori;
        bekleyenPage = null;
        bekleyenKategori = null;
        if (page == null && kategori == null) return;
        runOnUiThread(() -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView == null) return;
            if (page != null) {
                String jsPage = JSONObject.quote(page);
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('widgetSayfaAc',{detail:{page:" + jsPage + "}}));",
                    null
                );
            }
            if (kategori != null) {
                String jsKategori = JSONObject.quote(kategori);
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('bildirimAcildi',{detail:{kategori:" + jsKategori + "}}));",
                    null
                );
            }
        });
    }
}
