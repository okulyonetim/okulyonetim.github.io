package com.koruk.okul;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * PrintPlugin – Android WebView'de window.print() güvenilir olmadığı için
 * HTML çıktısını ayrı bir WebView'de hazırlayıp Android PrintManager'a verir.
 *
 * Önemli ayrıntılar:
 * - Yazdırma WebView'i sınıf alanında tutulur; yöntem bittiğinde GC tarafından
 *   toplanıp önizlemenin sessizce kapanması engellenir.
 * - Plugin çağrısı, yalnız PrintManager gerçek PrintJob oluşturduktan sonra
 *   başarılı sayılır.
 * - loadDataWithBaseURL gerçek uygulama adresini kullanır; göreli görsel/font
 *   yolları rapor önizlemesinde çözülebilir.
 */
@CapacitorPlugin(name = "PrintPlugin")
public class PrintPlugin extends Plugin {

    private WebView aktifYazdirmaWebView;

    @PluginMethod
    public void yazdir(PluginCall call) {
        String html = call.getString("html");
        String isAdi = call.getString("isAdi", "Koruk_Okul_Belge");
        String yon = call.getString("yon", "dikey");

        if (html == null || html.trim().isEmpty()) {
            call.reject("html parametresi gerekli");
            return;
        }

        final String belgeAdi = isAdi;
        final boolean yatayMi = "yatay".equals(yon);

        getActivity().runOnUiThread(() -> {
            try {
                if (aktifYazdirmaWebView != null) {
                    aktifYazdirmaWebView.stopLoading();
                    aktifYazdirmaWebView.destroy();
                    aktifYazdirmaWebView = null;
                }

                WebView webView = new WebView(getContext());
                aktifYazdirmaWebView = webView;

                WebSettings ayarlar = webView.getSettings();
                ayarlar.setJavaScriptEnabled(false);
                ayarlar.setDomStorageEnabled(false);
                ayarlar.setDefaultTextEncodingName("UTF-8");

                webView.setWebViewClient(new WebViewClient() {
                    private boolean yazdirmaBaslatildi = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (yazdirmaBaslatildi) return;
                        yazdirmaBaslatildi = true;

                        try {
                            PrintJob job = yazdirDiyaloguAc(view, belgeAdi, yatayMi);
                            if (job == null) {
                                call.reject("Android yazdırma servisi kullanılamıyor.");
                                return;
                            }
                            call.resolve();
                        } catch (Exception e) {
                            call.reject("Yazdırma önizlemesi açılamadı: " + e.getMessage(), e);
                        }
                    }
                });

                webView.loadDataWithBaseURL(
                    "https://sedonet23.github.io/okul/",
                    html,
                    "text/html",
                    "UTF-8",
                    null
                );
            } catch (Exception e) {
                call.reject("Yazdırma hazırlanamadı: " + e.getMessage(), e);
            }
        });
    }

    private PrintJob yazdirDiyaloguAc(WebView webView, String isAdi, boolean yatayMi) {
        PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) return null;

        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(isAdi);
        PrintAttributes.Builder ozellikler = new PrintAttributes.Builder();
        ozellikler.setMediaSize(yatayMi
            ? PrintAttributes.MediaSize.ISO_A4.asLandscape()
            : PrintAttributes.MediaSize.ISO_A4);

        return printManager.print(isAdi, adapter, ozellikler.build());
    }

    @Override
    protected void handleOnDestroy() {
        if (aktifYazdirmaWebView != null) {
            aktifYazdirmaWebView.stopLoading();
            aktifYazdirmaWebView.destroy();
            aktifYazdirmaWebView = null;
        }
        super.handleOnDestroy();
    }
}
