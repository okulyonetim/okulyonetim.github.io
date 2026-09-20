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

        // Uygulama genelinde WebView pinch/double-tap zoomunu kapat.
        // Belge/Yıllık Plan gibi ekranların kendi CSS transform zoomları bundan etkilenmez.
        WebView anaWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (anaWebView != null) {
            anaWebView.getSettings().setSupportZoom(false);
            anaWebView.getSettings().setBuiltInZoomControls(false);
            anaWebView.getSettings().setDisplayZoomControls(false);
            // Capacitor'ın WebView parent'ı bazı cihazlarda ilk onCreate anında
            // henüz tamamlanmamış olabilir. Kurulumu birkaç frame boyunca güvenle
            // tekrar dene; tek seferlik post ile PTR'ın hiç kurulmadan kalmasına
            // izin verme.
            anaWebView.post(this::setupPullToRefresh);
        }

        handleIntent(getIntent());
        // Pull-to-refresh APK/PWA/web için js/core/core.js tarafından tek merkezden yönetilir.
        kenarJestiniAyir();
    }

    /**
     * Android APK'da WebView'in kendi touch/scroll motoruyla yarışmak yerine
     * gerçek native pull-to-refresh katmanını WebView'in mevcut parent'ına ekler.
     * Tarayıcı sürümünde bu katman yoktur; Chrome/Safari kendi PTR davranışını kullanır.
     */
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
            // Android'da pull gesture'ı kesin olarak gerçek WebView yenilemesine bağla.
            // SyncEngine yalnız veri senkronu yapar; WebView.reload() ise sayfanın
            // tüm modüllerini yeniden başlatır ve eski DOM durumunu da temizler.
            currentWebView.post(() -> {
            appHazir = false;
            webView.reload();
                // reload() sonrasında WebView yeniden kurulurken göstergenin
                // takılı kalmaması için kısa bir güvenlik kapatması.
                currentWebView.postDelayed(() -> runOnUiThread(() -> {
                    if (nativePullRefresh != null) nativePullRefresh.setRefreshing(false);
                }), 1200);
            });
        });
        parent.addView(nativePullRefresh, index);
    }

    private void retryPullToRefreshSetup(final WebView webView) {
        if (nativePullRefresh != null || webView == null) return;
        webView.postDelayed(() -> setupPullToRefresh(), 250);
    }

    /* Android 10+ (API 29) sistem "geri" hareket algılaması, ekranın sol
       kenarına yakın başlayan sağa kaydırmaları WebView'e ULAŞTIRMADAN
       kendi başına yutuyor — bu yüzden uygulama içindeki "kaydırınca menü
       aç" jesti hiç tetiklenmiyordu. setSystemGestureExclusionRects ile
       sol kenardan ~36dp'lik bir şeridi sistem hareketinden muaf tutup
       dokunuşun WebView'e (ve dolayısıyla JS'e) ulaşmasını sağlıyoruz. */
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

    /* Android geri tuşunun tek sahibi uygulama içindeki ShellUI'dir.
       Burada ikinci bir geri/geçmiş/çıkış mekanizması çalıştırılmıyor.

       Önceki uygulamada evaluateJavascript() sonucundan "handled" bekleniyordu.
       Ancak ShellUI.back() async olduğu için Java tarafına Promise sonucu ("{}")
       dönüyor, Java bunu "işlenmedi" kabul edip kendi geri/çıkış akışını çalıştırıyordu.
       Bunun sonucu modal kapanması gereken yerde alttaki sayfa etkilenebiliyor veya
       uygulama çıkış akışına girebiliyordu.

       Native katman artık yalnızca olayı JS'e iletiyor. Modal, menü, alt sayfa,
       navigation stack ve uygulamadan çıkış kararlarının tamamı ShellUI'de kalıyor. */
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

    /* Native WebView'e özel küçük runtime düzeltmelerini ana bundle'dan
       ayırıyoruz. Script yalnız uygulama JS tarafı hazır olduktan sonra
       enjekte edilir; yenilemeden sonra da tekrar güvenle yüklenebilir. */
    private void nativeRuntimeDuzeltmeleriniYukle() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        webView.evaluateJavascript(
            "(function(){try{if(document.getElementById('koruk-native-runtime-fixes'))return 'loaded';var s=document.createElement('script');s.id='koruk-native-runtime-fixes';s.src='js/core/platform/mobile-runtime-fixes.js?v=914';document.head.appendChild(s);return 'loading';}catch(e){return 'error';}})()",
            null
        );
    }

    /* PullToRefreshPlugin geriye dönük uyumluluk için ayrı tutulur; gesture'ın sahibi
       Android APK'da nativePullRefresh, web'de tarayıcının kendi scroll motorudur. */

    /** JS tarafındaki çıkış onayından sonra Android Activity'yi gerçekten kapatır. */
    @JavascriptInterface
    public void uygulamadanCik() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) finishAndRemoveTask();
            else finish();
        });
    }

    /* JS'in (auth.js → PullToRefreshPlugin.appHazir()) gerçek hazır sinyali.
       Aynı sinyal artık bekleyen widget/bildirim deep-linklerini de açar. */
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
