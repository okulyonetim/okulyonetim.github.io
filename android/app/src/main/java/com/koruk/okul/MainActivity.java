package com.koruk.okul;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;
// (androidx SwipeRefreshLayout artık kullanılmıyor — bkz. LogoSwipeRefreshLayout)
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

public class MainActivity extends BridgeActivity {

    private LogoSwipeRefreshLayout swipeRefresh;
    private long sonGeriTusuZamani = 0;

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
        }

        handleIntent(getIntent());
        // Pull-to-refresh APK/PWA/web için js/core/core.js tarafından tek merkezden yönetilir.
        kenarJestiniAyir();
    }

    // NOT: Ekranın ortasında dönen bir "Bağlanıyor…" başlangıç göstergesi
    // denendi (setupBaslangicYuklemesi + WebViewListener) ama üstte duran
    // bu yeni katman, ALTINDAKİ LogoSwipeRefreshLayout'un dokunuş
    // olaylarını (aşağı çekince yenileme jesti) kapatıyordu — önceden
    // ÇALIŞAN bir özelliği bozdu. Geri alındı. İleride tekrar denenirse,
    // katmanın dokunuşları GEÇİRMESİ (setClickable(false) + touch olaylarını
    // SwipeRefreshLayout'a iletmesi, ya da tamamen ayrı/dokunuş-şeffaf bir
    // pencere/overlay olması) sağlanmalı.

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

    /* Donanım geri tuşu: önce web tarafındaki geriTusuIsle() fonksiyonuna
       sor — açık bir modal/detay panel/menü varsa veya sekme geçmişi
       boş değilse JS tarafı kendi içinde geri gider ve 'handled' döner.
       Web tarafı zaten en üst seviyedeyse ('exit') çift basışla çıkış
       uygulanır: ilk basışta uyarı gösterilir, 2 saniye içinde tekrar
       basılırsa uygulama kapanır. */
    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) { super.onBackPressed(); return; }

        webView.evaluateJavascript(
            "(function(){ try { return (typeof geriTusuIsle==='function') ? geriTusuIsle() : 'exit'; } catch(e){ return 'exit'; } })()",
            (String sonuc) -> {
                String temiz = sonuc != null ? sonuc.replace("\"", "") : "exit";
                if ("handled".equals(temiz)) return;

                long simdi = System.currentTimeMillis();
                if (simdi - sonGeriTusuZamani < 2000) {
                    finish();
                } else {
                    sonGeriTusuZamani = simdi;
                    android.widget.Toast.makeText(MainActivity.this, "Çıkmak için tekrar geri tuşuna basın", android.widget.Toast.LENGTH_SHORT).show();
                }
            }
        );
    }

    /* JS tarafından (bkz. PullToRefreshPlugin) modal/detay paneli açıkken
       yenileme jestini geçici olarak kapatmak/açmak için çağrılır. */
    public void setPullToRefreshEnabled(boolean enabled) {
        if (swipeRefresh != null) swipeRefresh.setPullEnabled(enabled);
    }

    /* İç kaydırılabilir panellerin gerçek kaydırma durumunu native tarafa
       senkron olarak bildirir. */
    @JavascriptInterface
    public void innerScrollBildir(boolean icerikKaydirilmisMi) {
        if (swipeRefresh != null) swipeRefresh.setInnerContentKaydirilmis(icerikKaydirilmisMi);
    }

    private static final long FALLBACK_TIMEOUT_MS = 8000;
    private final android.os.Handler _readyHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private Runnable _fallbackRunnable;

    /* JS'in (auth.js → PullToRefreshPlugin.appHazir()) gerçek hazır sinyali.
       Aynı sinyal artık bekleyen widget/bildirim deep-linklerini de açar. */
    public void markAppReady() {
        appHazir = true;
        if (_fallbackRunnable != null) {
            _readyHandler.removeCallbacks(_fallbackRunnable);
            _fallbackRunnable = null;
        }
        if (swipeRefresh != null) swipeRefresh.setRefreshing(false);
        bekleyenHedefleriGonder();
    }

    private void setupPullToRefresh() {
        WebView webView = getBridge().getWebView();
        android.view.ViewGroup parent = (android.view.ViewGroup) webView.getParent();
        if (parent == null) return;

        int index = parent.indexOfChild(webView);
        parent.removeView(webView);

        swipeRefresh = new LogoSwipeRefreshLayout(this, webView);
        webView.addJavascriptInterface(this, "AndroidPullToRefreshKopru");

        android.widget.FrameLayout.LayoutParams lp = new android.widget.FrameLayout.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        );
        swipeRefresh.setLayoutParams(lp);
        parent.addView(swipeRefresh, index);

        swipeRefresh.setOnRefreshListener(() -> {
            /* Yenilenen sayfanın önceki hazır durumunu miras almaması gerekir. */
            appHazir = false;
            webView.reload();
            if (_fallbackRunnable != null) _readyHandler.removeCallbacks(_fallbackRunnable);
            _fallbackRunnable = () -> { if (swipeRefresh != null) swipeRefresh.setRefreshing(false); };
            _readyHandler.postDelayed(_fallbackRunnable, FALLBACK_TIMEOUT_MS);
        });
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
