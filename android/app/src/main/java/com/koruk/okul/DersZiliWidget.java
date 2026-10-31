package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * DersZiliWidget — "Şimdi" (4×2): aktif ders / teneffüs / gün dışı için geri sayım halkası.
 * Kalan süre JS'den hazır gelmez; her çizimde GÜNCEL saate göre DersZiliHesaplayici hesaplar,
 * böylece uygulama kapalıyken de sayaç doğru kalır (bkz. GorselWidget.alarmMs).
 */
public class DersZiliWidget extends GorselWidget {

    public static final String PREFS_NAME = "DersZiliWidgetPrefs";
    public static final String KEY_JSON = "dz_ham_json";

    @Override protected Bitmap ciz(Context c, int id, WidgetTheme.Palet p, float d, float fs, int w, int h, Calendar simdi) {
        return WidgetCizici.simdi(p, d, fs, DersZiliHesaplayici.hesapla(ham(c), simdi), w, h);
    }

    @Override protected String sozlu(Context c, Calendar simdi) {
        JSONObject s = DersZiliHesaplayici.hesapla(ham(c), simdi);
        return "Ders zili. " + s.optString("baslik", "") + ". " + s.optString("rozet", "");
    }

    @Override protected String hedefSayfa() { return "schedule"; }
    @Override protected int istekKodu() { return 1; }
    @Override protected int varsayilanGenislik() { return 290; }
    @Override protected int varsayilanYukseklik() { return 130; }
    @Override protected long alarmMs() { return 60_000L; }

    /** JavaScript tarafından (WidgetPlugin üzerinden) çağrılır — HAM programı kaydeder ve widget'ları yeniler. */
    public static void veriGuncelle(Context c, String jsonStr) {
        c.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putString(KEY_JSON, jsonStr).apply();
        GorselWidget.hepsiniGuncelle(c);
    }
}
