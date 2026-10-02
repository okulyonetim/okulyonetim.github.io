package com.koruk.okul;

import android.webkit.JavascriptInterface;

public final class ReportFileBridge {
    public interface Handler { String save(String base64, String fileName, String mimeType, boolean share); }
    private final Handler handler;
    public ReportFileBridge(Handler handler) { this.handler = handler; }
    @JavascriptInterface
    public String uygulamaDosyaKaydet(String base64, String fileName, String mimeType, boolean share) {
        return handler.save(base64, fileName, mimeType, share);
    }
}
