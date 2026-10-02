package com.koruk.okul;

import android.webkit.JavascriptInterface;

/**
 * Android rapor/görsel kaydetme-paylaşma köprüsü için küçük JS arayüzü.
 * Asıl dosya işlemi mevcut SavePlugin tarafından yapılır; bu sınıf yalnızca
 * Capacitor plugin proxy'sinin hazır olmadığı eski WebView çalışma anlarında
 * güvenli bir fallback noktası sağlar.
 */
public final class ReportFileBridge {
    public interface Handler {
        String save(String base64, String fileName, String mimeType, boolean share);
    }

    private final Handler handler;

    public ReportFileBridge(Handler handler) {
        this.handler = handler;
    }

    @JavascriptInterface
    public String uygulamaDosyaKaydet(String base64, String fileName, String mimeType, boolean share) {
        return handler.save(base64, fileName, mimeType, share);
    }
}
